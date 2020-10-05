// Debug
function showError(error, fileline) {
    alert("ERROR: " + error+"\n " + fileline+" \n\n Please report to DEV Team !");
}

window.onerror = function (message, file, line, col, error) {
    showError(error.message, file+":"+line)
    return false;
 };
 window.addEventListener("error", function (e) {
    showError(e.error.message)
    return false;
 })
 window.addEventListener('unhandledrejection', function (e) {
    //if (e.reason.stack.includes('fullscreen error')) return
    var msg = e.reason.message
    var stack = e.reason.stack.replace(e.reason.message,'');
    showError(msg, stack)
})

// Message
//
toastr.options.preventDuplicates = true;
toastr.options.positionClass = "toast-bottom-right";

var activeRoomID = null

// Connectefd chat server
//
function isConnected() {
    var is = connection.socket && connection.socket.connected
    return is
}

// Update Room Buttons
//
function roomStateUpdate(classToAppy) {
    $('.roomBtn').each((i,v)=>{
        connection.checkPresence($(v).data('room'), function(isRoomExist, roomid) {
            // console.log(roomid, isRoomExist)
            if (isRoomExist)   $("#nav").find(`[data-room='${roomid}']`).addClass(classToAppy)
            else               $("#nav").find(`[data-room='${roomid}']`).removeClass(classToAppy)
        });   
    })
}

// Select a room
//
function selectRoom(roomid) 
{    
    streamOFF()
    activeRoomID = roomid
    $(".roomBtn").removeClass('activeTab')
    $("#nav").find(`[data-room='${roomid}']`).addClass('activeTab')
    toastr.clear()
    wachForStream()
}

// Refresh peers count
//
function refreshPeersCount(count) 
{
    if ($('#peerCount').html() != count) {
        // toastr.info(count+' viewers', 'Peers count', {timeOut: 1000})
        $('#peerCount').html(count)
        return true
    }
    return false
}

// Clear active streams
//
function resetStream() {
    connection.attachStreams.forEach(function(localStream) {
        localStream.stop();
        console.log('stopped stream', localStream)
    });    
    streamOFF()
    if (retryCallback) retryCallback( activeRoomID )
}

// Watch Socketio lost link
//
function watchConnectionLost()
{
    if (connection.socket) {
        connection.socket.off('disconnect')
        connection.socket.on('disconnect', (data) => 
        {
            console.log("Lost SIO link", data)
            toastr.clear()
            toastr.error(data, 'Connection lost')
            resetStream()
        }); 
    }
}


// Touch debounce
//
var flag = false;
function debounce() {
    if (!flag) {
        flag = true;
        setTimeout(function(){ flag = false; }, 300);
        return true
    }
    return false    
}


// Play media
//
var retryPlay = null;
function playMedia() 
{   
    mediaElement.media.play()
        .then(()=>{
            toastr.info('Playback started', '', {timeOut: 1000})
        })
        .catch( error => {
            console.log('ERROR', error);
            retryPlay = setTimeout(playMedia, 1000)
            toastr.warning('retrying...', 'Playback error', {timeOut: 1000})
        })    
}

function streamOFF()
{   
    // leave room
    if (isConnected())
        connection.socket.emit('peers-info', {'cmd': 'stream-join', 'userid': connection.userid, 'room': ''});

    if (retryPlay) clearTimeout(retryPlay)
    $('#videos-container').off('touchstart click')
    videosContainer.empty()
}


// Stream ready
function streamON() {
    
    toastr.clear()
    toastr.success('Touch to play fullscreen!', 'Connected to '+activeRoomID)


    streamOFF()
    playMedia()
    
    // join room
    connection.socket.emit('peers-info', {'cmd': 'stream-join', 'userid': connection.userid, 'room': activeRoomID});

    $('#videos-container').on('touchstart click', (e)=>{
        if (debounce()) 
        {
            playMedia()
            
            // already fullscreen ?
            if((window.fullScreen) ||
            (window.innerWidth == screen.width && window.innerHeight == screen.height)) return
            
            var rfs = document.body.requestFullscreen
            // if (!rfs) rfs = document.body.webkitRequestFullScreen 

            if (document.body.requestFullscreen)
                document.body.requestFullscreen()
                    .then(()=>{
                        toastr.clear()
                        toastr.info('Fullscreen set', '', {timeOut: 1000})
                    })
                    .catch( error => {
                        toastr.error('Touch again please', 'Fullscreen error')
                    })
            else if (document.body.webkitRequestFullscreen)
                document.body.webkitRequestFullscreen()
                    .then(()=>{
                        toastr.clear()
                        toastr.info('Fullscreen set', '', {timeOut: 1000})
                    })
                    .catch( error => {
                        toastr.error('Touch again please', 'Fullscreen error')
                    })
        }
    });
}


// Attach UI
//
var noSleep = new NoSleep();
$('.roomBtn').click(function(){
    if ($(this).data('room') == 'HOME') window.location='index.html'
    else if (retryCallback) {
        retryCallback( $(this).data('room') )
        noSleep.enable();
    }
});


// STREAM watcher
//
var reJoin
function wachForStream() {
    if (!reJoin)
        reJoin = setInterval(()=>{
            console.warn('no stream received.. renegociating')
            resetStream()
        }, 2000)
}


// detect 2G
//
if(navigator.connection &&
    navigator.connection.type === 'cellular' &&
    navigator.connection.downlinkMax <= 0.115) {
    alert('2G is not supported. Please use a better internet service.');
}

// watch IP change
var myIP = null
setInterval(()=>{
    $.get('https://www.cloudflare.com/cdn-cgi/trace', function(data) {
        $.each(data.split('\n'), (i,v)=>{
            if (v.startsWith('ip')) {
                var newIP = v.split('=')[1]
                if (myIP && newIP != myIP) {
                    toastr.clear()
                    toastr.error("Reloading stream ...", "IP changed !")
                    connection.closeSocket()
                    connection.connectSocket( resetStream )
                }
                myIP = newIP
                return false
            }
        })
        // toastr.info(data)
    })
}, 5000)


// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();
var videosContainer = $('#videos-container');
var mediaElement;
var retryCallback;
var viewersRefresh


connection.enableLogs = true

// by default, socket.io server is assumed to be deployed on your own URL
connection.socketURL = 'https://v.kxkm.net:9001/';

// comment-out below line if you do not have your own socket.io server
// connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

connection.socketMessageEvent = 'video-broadcast-kxkm';
connection.autoCloseEntireSession = true;

connection.setCustomSocketEvent('peers-info');

connection.session = {
    audio: true,
    video: true,
    oneway: true
};


/*connection.bandwidth = {
    audio: 64,  
    video: 2000 // 256 kbps
};*/




// https://www.rtcmulticonnection.org/docs/iceServers/
// use your own TURN-server here!
connection.iceServers = [{
    'urls': [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.l.google.com:19302?transport=udp',
    ]
}];



function initConnection(mode, retryClbck) {
    retryCallback = retryClbck

    if (mode =='view') 
    {
        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        };
    }
    else if (mode == 'cam' ) 
    {
        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
        };
    }
    

    // new stream received
    connection.onstream = function(event) {

        console.log("new stream available")
        if (reJoin) {
            clearInterval(reJoin)
            reJoin = null
        }

        var existing = document.getElementById(event.streamid);
        if(existing && existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
    
        event.mediaElement.removeAttribute('src');
        event.mediaElement.removeAttribute('srcObject');
        event.mediaElement.muted = true;
        event.mediaElement.volume = 0;
    
        var video = document.createElement('video');
    
        try {
            // video.setAttributeNode(document.createAttribute('autoplay'));
            video.setAttributeNode(document.createAttribute('playsinline'));
            // video.setAttributeNode(document.createAttribute('controls'));
        } catch (e) {
            // video.setAttribute('autoplay', true);
            video.setAttribute('playsinline', true);
            // video.setAttribute('controls', true);
        }

        var config = {
            buttons: [],    //'full-screen'
            showOnMouseEnter: false
        }

        if (mode == 'cam' ) {
            config.title = 'Camera: '+activeRoomID+'<br />Viewers: <span id="peerCount">0</span>'
            video.volume = 0;
            try {           video.setAttributeNode(document.createAttribute('muted')); } 
            catch (e) {     video.setAttribute('muted', true); }
        }
        else if (mode == 'view') {
            config.title = 'Channel: '+activeRoomID+'<br />Viewers: <span id="peerCount">1</span>'
        }
    
        video.srcObject = event.stream;
    
        mediaElement = getHTMLMediaElement(video, config);
    
        mediaElement.querySelector('video').style.maxHeight = 'none'
        mediaElement.id = event.streamid;
        
        streamON()
        videosContainer.append(mediaElement);    
    };

    // Stream end: Retry
    connection.onstreamended = function(event) {
        console.log("Stream end")
        toastr.clear()
        toastr.error('retrying to connect..', 'Stream lost')
        resetStream()
    };

    // Stream Error
    connection.onMediaError = function(e) {
        console.log("Media error")
        toastr.clear()
        toastr.error('retrying to connect..', 'Media error')
        resetStream()
    };

}

