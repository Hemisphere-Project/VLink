var roomID = null;
var retry = null;
var monitor = true;

// Refresh Btn status
setInterval(()=>{
    if (monitor)
        $('.viewBtn').each((i,v)=>{
            connection.checkPresence($(v).data('room'), function(isRoomExist, roomid) {
                console.log(roomid, isRoomExist)
                if (isRoomExist)   $("#nav").find(`[data-room='${roomid}']`).addClass('roomON')
                else               $("#nav").find(`[data-room='${roomid}']`).removeClass('roomON')
            });   
        })
}, 1000)


function receiveFrom(roomid) {
    mode = 'view'
    roomID = roomid
    if (retry) clearTimeout(retry)
    $('#videos-container').empty()
    $(".viewBtn").removeClass('activeTab')
    $("#nav").find(`[data-room='${roomid}']`).addClass('activeTab')
    connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    };
    connection.join(roomid, function(isJoined, roomid, error) {
        if(error) {
            $('#message').show();
            $('#message').html("No video from \""+roomid+"\".<br/>waiting for a camera..")
            retry = setTimeout(()=>{receiveFrom(roomID)}, 1000)
        }
        else {
            if (document.fullscreen) $('#message').hide()
            onTouchVideo()
        }
    });
}

// ......................................................
// .......................UI Code........................
// ......................................................




// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();

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

connection.sdpConstraints.mandatory = {
    OfferToReceiveAudio: false,
    OfferToReceiveVideo: false
};

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

var mediaElement;

connection.videosContainer = document.getElementById('videos-container');

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
        video.setAttributeNode(document.createAttribute('autoplay'));
        video.setAttributeNode(document.createAttribute('playsinline'));
    } catch (e) {
        video.setAttribute('autoplay', true);
        video.setAttribute('playsinline', true);
    }

    var title = "View: "+roomID
    if(event.type === 'local') {
      title = "Camera: "+roomID
      video.volume = 0;
      try {
          video.setAttributeNode(document.createAttribute('muted'));
      } catch (e) {
          video.setAttribute('muted', true);
      }
    }

    video.srcObject = event.stream;

    mediaElement = getHTMLMediaElement(video, {
        //title: title,
        buttons: [],    //'full-screen'
        showOnMouseEnter: false
    });

    mediaElement.querySelector('video').style.maxHeight = 'none'

    connection.videosContainer.appendChild(mediaElement);

    setTimeout(function() {
        try {
            mediaElement.media.play();
        } catch (error) {
            console.error(error);
        }
    }, 1000);

    mediaElement.id = event.streamid;
};

// Stream end: Retry
connection.onstreamended = function(event) {
    var mediaElement = document.getElementById(event.streamid);
    if (mediaElement) mediaElement.parentNode.removeChild(mediaElement);
    receiveFrom(roomID)
};

// Stream Error
connection.onMediaError = function(e) {
    if (e.message === 'Concurrent mic process limit.') {
        if (DetectRTC.audioInputDevices.length <= 1) {
            alert('Please select external microphone. Check github issue number 483.');
            return;
        }

        var secondaryMic = DetectRTC.audioInputDevices[1].deviceId;
        connection.mediaConstraints.audio = {
            deviceId: secondaryMic
        };

        connection.join(connection.sessionid);
    }
    console.log("Media error")
};

// detect 2G
if(navigator.connection &&
   navigator.connection.type === 'cellular' &&
   navigator.connection.downlinkMax <= 0.115) {
  alert('2G is not supported. Please use a better internet service.');
}

var noSleep = new NoSleep();

var flag = false;
function onTouchVideo(e) {

    if (!flag) {
        flag = true;
        setTimeout(function(){ flag = false; }, 300);
    }
    else return false

    //$('#message').html("Touched").show()
    try {
        mediaElement.media.play();
    } catch (error) {
        console.log('ERROR', error);
    }
    $('#message').hide()
    noSleep.enable();
    document.body.requestFullscreen()

}

$(document).ready(function(){
    
    $('.viewBtn').click(function(){
        if ($(this).data('room') == 'HOME') window.location='index.html'
        else {
            receiveFrom($(this).data('room'))
            $('#message').html("Touch video to play fullscreen").show()
        }
    });
    
    $('#videos-container').on('touchstart click', onTouchVideo);
});