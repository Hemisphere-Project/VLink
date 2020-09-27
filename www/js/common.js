
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


// No Sleep & Fullscreen
//
var noSleep = new NoSleep();
var flag = false;
function onTouchVideo(e) {
    if (!flag) {
        flag = true;
        setTimeout(function(){ flag = false; }, 300);
    }
    else return false

    $('#message').html("Video play fullscreen").show()
    setTimeout(()=>{$('#message').hide()}, 3000)

    playMedia()
    
    noSleep.enable();
    document.body.requestFullscreen()

    
    // $('#message').hide()
}


// Play media
//
var retryPlay = null;
function playMedia() {
    if (retryPlay) clearTimeout(retryPlay)
    try {
        mediaElement.media.play();
        $('#message').hide()
    } catch (error) {
        console.log('ERROR', error);
        retryPlay = setTimeout(playMedia, 500)
        $('#message').html("Play error.. retrying").show()
    }
}


// Attach UI
//
$('.roomBtn').click(function(){
    if ($(this).data('room') == 'HOME') window.location='index.html'
    else if (retryCallback) {
        retryCallback( $(this).data('room') )
        $('#message').html("Touch video to play").show()
    }
});

$('#videos-container').on('touchstart click', onTouchVideo);


// detect 2G
//
if(navigator.connection &&
    navigator.connection.type === 'cellular' &&
    navigator.connection.downlinkMax <= 0.115) {
    alert('2G is not supported. Please use a better internet service.');
}


// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();
var mediaElement;
var videosContainer = document.getElementById('videos-container');
var retryCallback;

// by default, socket.io server is assumed to be deployed on your own URL
connection.socketURL = 'https://v.kxkm.net:9001/';

// comment-out below line if you do not have your own socket.io server
// connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

connection.socketMessageEvent = 'video-broadcast-kxkm';

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
            config.title = "Camera: "+activeRoom()
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
        
        videosContainer.appendChild(mediaElement);
    
        playMedia()
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
        var mediaElement = document.getElementById(event.streamid);
        if (mediaElement) mediaElement.parentNode.removeChild(mediaElement);
        if (retryCallback) retryCallback( activeRoomID )
    };

    // Stream Error
    connection.onMediaError = function(e) {
        console.log("Media error")
        if (retryCallback) retryCallback( activeRoomID )
    };

}


