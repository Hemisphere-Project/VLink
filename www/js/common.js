var activeRoomID = null

var watchdog = null
var streamOK = false

// Connected to socketIO
//
function isConnected() {
    var is = connection.socket && connection.socket.connected
    return is
}




// Select a room
//
function startRoom(roomid) 
{    
    // SET Room
    if (roomid !== undefined) activeRoomID = roomid
    console.log('start room', activeRoomID)

    // KILL watchdog
    clearTimeout(watchdog)

    // STOP all
    connection.attachStreams.forEach(function(localStream) {
        localStream.stop();
        console.log('stopped stream', localStream)
    });

    // CLEAR All
    $('#videos-container').off('touchstart click')
    videosContainer.empty()
    
    // LEAVE rooms
    if (isConnected())
        connection.socket.emit('peers-info', {'cmd': 'stream-join', 'userid': connection.userid, 'room': ''});
    
    // START action
    retryCallback( activeRoomID )
}

// Stream watchdog 
//
function startWatchdog() {
    watchdog = setTimeout(()=>{
        if (!streamOK) {
            toastr.error('retrying..', 'No Stream')
            retryRoom(0, 'watchdog kick')
        }
    }, 5000)
}

// Retry on error (with timeout)
//
var timeoutRetry = null
function retryRoom(delay, reason) {
    clearTimeout(timeoutRetry)
    if (reason) console.warn('RETRY', reason)
    if (delay === undefined) delay = 0
    setTimeout(startRoom, delay)
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
function playMedia() 
{   
    mediaElement.media.play()
        .then(()=>{
            // toastr.info('Playback started', '', {timeOut: 1000})
            console.log('playing stream')
        })
        .catch( error => {
            console.warn('Playback error', error);
            //toastr.error(JSON.stringify(error), 'Playback error', {timeOut: 1000})
            // retryRoom(0, 'play error')
        })  
}



// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();
var videosContainer = $('#videos-container');
var mediaElement;
var retryCallback;
var viewersRefresh


// by default, socket.io server is assumed to be deployed on your own URL
connection.socketURL = 'https://v.kxkm.net:9001/';

// comment-out below line if you do not have your own socket.io server
// connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

connection.socketMessageEvent = 'video-broadcast-kxkm';
connection.autoCloseEntireSession = true;
connection.enableLogs = false;

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
    connection.onstream = function(event) 
    {
        streamOK = true
        console.log("new stream available", event.streamid, event)

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
            config.title = '<span class="tools">Camera: '+activeRoomID+'<br />Viewers: <span id="peerCount">0</span></span>'
            video.volume = 0;
            try {           video.setAttributeNode(document.createAttribute('muted')); } 
            catch (e) {     video.setAttribute('muted', true); }
        }
        else if (mode == 'view') {
            config.title = '<span class="tools">Channel: '+activeRoomID+'<br />Viewers: <span id="peerCount">1</span></span>'
        }
    
        video.srcObject = event.stream;
    
        mediaElement = getHTMLMediaElement(video, config);
    
        mediaElement.querySelector('video').style.maxHeight = 'none'
        mediaElement.id = event.streamid;
        
        playMedia()

        videosContainer.empty()
        videosContainer.append(mediaElement);    

        // Info
        toastr.clear()
        toastr.success('Touch to play fullscreen!', 'Connected to '+activeRoomID, {timeout: 2000})
        
        // Tools
        $('.tools').hide() 

        // SocketIO controls
        connection.socket.off('disconnect')
        connection.socket.on('disconnect', () =>  { 
            toastr.error('', 'SocketIO lost')
            retryRoom(0, 'sio disconnect')
        });         
        connection.socket.emit('peers-info', {'cmd': 'stream-join', 'userid': connection.userid, 'room': activeRoomID});
        
        // Fullscreen
        videosContainer.off('touchstart click')
        videosContainer.on('touchstart click', (e)=>{
            if (debounce()) {
                playMedia()
                ui_fullscreen()
            }
        });
    };

    // Stream end: Retry
    connection.onstreamended = function(event) {
        console.log("Stream end")
        toastr.clear()
        toastr.error('retrying to connect..', 'Stream lost')
        retryRoom(0, 'stream end')
    };

    // Stream Error
    connection.onMediaError = function(e) {
        console.log("Media error")
        toastr.clear()
        toastr.error('retrying to connect..', 'Media error')
        retryRoom(0, 'media error')
    };

    // Start from URL
    startConnection()
}


function startConnection() {
    if ('room' in urlParams)
    {
        if (isConnected()) {
            activeRoomID = urlParams['room']
        
            // Select button
            $(".roomBtn").removeClass('activeTab')
            $("#nav").find(`[data-room='${activeRoomID}']`).addClass('activeTab')
            toastr.clear()

            // START ROOM
            startRoom()
        }
        else setTimeout(startConnection, 200)   // WAIT for socket to be available        
    }
}