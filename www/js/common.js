// Debug
function showError(error, fileline) {
    alert("ERROR: " + error+"\n " + fileline+" \n\n Please report to DEV Team !");
}

window.onerror = function (message, file, line, col, error) {
    showError(error.message, file+":"+line)
    return false;
 };
 window.addEventListener("error", function (e) {
    showError(e.error.message, JSON.stringify(e))
    return false;
 })
 window.addEventListener('unhandledrejection', function (e) {
    //if (e.reason.stack.includes('fullscreen error')) return
    showError('', e.reason.stack)
})

// Message
//
toastr.options.preventDuplicates = true;
toastr.options.positionClass = "toast-bottom-right";


var activeRoomID = null

// Get/Set Room
//
function activeRoom(roomid) {
    if (roomid !== undefined) activeRoomID = roomid
    return activeRoomID
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
function selectRoom(roomid) {
    
    activeRoom(roomid)

    $('#videos-container').empty()
    $(".roomBtn").removeClass('activeTab')
    $("#nav").find(`[data-room='${roomid}']`).addClass('activeTab')
    $('#message').hide()
}


// Touch debounce
//
var flag = false;
function debounce() {
    
    //debounce
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
    try {
        mediaElement.media.play();
    } catch (error) {
        console.log('ERROR', error);
        retryPlay = setTimeout(playMedia, 1000)
        $('#message').html("Play error.. retrying").show()
        toastr.warning('retrying...', 'Playback error', {timeOut: 1000})
        return false
    }
    
    toastr.info('Playback started', '', {timeOut: 1000})
}

function streamOFF()
{   
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
    
    $('#videos-container').on('touchstart click', (e)=>{
        if (debounce()) 
        {
            playMedia()
            
            // already fullscreen ?
            if((window.fullScreen) ||
            (window.innerWidth == screen.width && window.innerHeight == screen.height)) return
            
            document.body.requestFullscreen()
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
                if (myIP && newIP != myIP) window.location.replace('/')         // TODO Reload same cam/viewer !
                myIP = newIP
                return false
            }
        })
        // toastr.info(data)
    })
}, 2000)


// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();
var videosContainer = $('#videos-container');
var mediaElement;
var retryCallback;
var viewersRefresh

connection.enableLogs = false

// by default, socket.io server is assumed to be deployed on your own URL
connection.socketURL = 'https://v.kxkm.net:9001/';

// comment-out below line if you do not have your own socket.io server
// connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

connection.socketMessageEvent = 'video-broadcast-kxkm';

connection.setCustomSocketEvent('stream-join');


// connection.socket.on('stream-join', function(message) {
//     console.warn(message);
// });

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

// connection.iceServers.push({
//     urls: 'turn:v.kxkm.net:5349',
//     credential: 'b54fb21218551b460c7e99a6ca0986b7'
// });


function getConnection() {
    return connection
}

function getMediaElement() {
    return mediaElement
}


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
            config.title = 'Camera: '+activeRoom()//+'<br />Peers: <span id="peerCount">0</span>'
            video.volume = 0;
            try {
                video.setAttributeNode(document.createAttribute('muted'));
            } catch (e) {
                video.setAttribute('muted', true);
            }
        }
    
        video.srcObject = event.stream;
    
        mediaElement = getHTMLMediaElement(video, config);
    
        mediaElement.querySelector('video').style.maxHeight = 'none'
        mediaElement.id = event.streamid;
        
        streamON()
        videosContainer.append(mediaElement);

        connection.socket.emit('stream-join', {'userid': connection.userid, 'room': activeRoomID});

        if (viewersRefresh) clearInterval(viewersRefresh)
        viewersRefresh = setInterval(()=>{
            var participants = connection.getAllParticipants()
            var count = participants.length
            // toastr.info(count+' viewers', 'Peers count')
            $('#peerCount').html(count)

            $.each(participants, (i,participantId)=>{
                console.log(connection.peers[participantId])
            })
            
        }, 1000)
    
        // setTimeout(function() {
        //     try {
        //         mediaElement.media.play();
        //     } catch (error) {
        //         console.error(error);
        //     }
        // }, 1000);
    
    };

    // Stream end: Retry
    connection.onstreamended = function(event) {
        console.log("Stream end")
        streamOFF()
        toastr.clear()
        toastr.error('retrying to connect..', 'Stream lost')
        if (retryCallback) retryCallback( activeRoomID )
    };

    // Stream Error
    connection.onMediaError = function(e) {
        console.log("Media error")
        streamOFF()
        toastr.clear()
        toastr.error('retrying to connect..', 'Media error')
        if (retryCallback) retryCallback( activeRoomID )
    };

}


