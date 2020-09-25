var roomID = null;
var retry = null;
var monitor = true;

// Refresh Btn status
setInterval(()=>{
    if (monitor)
        $('.viewBtn').each((i,v)=>{
            connection.checkPresence($(v).data('room'), function(isRoomExist, roomid) {
                console.log(roomid, isRoomExist)
                if (isRoomExist)   $("#nav").find(`[data-room='${roomid}']`).addClass('recON')
                else               $("#nav").find(`[data-room='${roomid}']`).removeClass('recON')
            });   
        })
}, 1000)


function getConnectedDevices(type, callback) {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            
            const filtered = devices.filter(device => device.kind === type);

            // $('#message').html("list devices").show()
            // $.each(filtered, (i,d)=>{
            //     $('#message').append('<br />'+JSON.stringify(d))
            // })
            callback(filtered);
        });
}

function broadcastTo(roomid) {
    roomID = roomid
    if (retry) clearTimeout(retry)
    $('#videos-container').empty()
    $(".viewBtn").removeClass('activeTab')
    $("#nav").find(`[data-room='${roomid}']`).addClass('activeTab')
    $('#message').hide()

    connection.checkPresence(roomid, function(isRoomExist, roomid) {
        if (isRoomExist === true) {
            console.log("room already in use.. waiting to for a free slot")
            $('#message').html("Camera \""+roomid+"\" already in use.<br/>waiting to for a free slot..").show()
            retry = setTimeout(()=>{broadcastTo(roomid)}, 1000)
        } 
        else
        {
            if (retry) clearTimeout(retry)

            // $('#message').html("listing inputs").show()
            getConnectedDevices('videoinput', cameras => {

                var cam = cameras[0]                        // select cam 0
                if (cameras.length > 1) cam = cameras[1]    // select cam 1 if available
                $.each(cameras, (i,c) => {                  // select cam "back" if available
                    console.log(c)
                    if (c.label.includes("back")) {
                        cam = c
                        return false
                    }
                })

                connection.mediaConstraints = {
                    audio: true,
                    video: {
                        mandatory: {},
                        optional: [{
                            sourceId: cam.deviceId
                        }]
                    }
                };

                if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {      // select back camera on iphone
                    connection.mediaConstraints.video.facingMode = 'environment'
                }

                $('.viewBtn').hide()
                monitor = false

                connection.open(roomid, function(isRoomOpened, roomid, error) {
                    if(error) {
                        console.error("error on connection", error);
                        $('#message').html("Error when starting broadcast.. retrying !").show()
                        retry = setTimeout(()=>{broadcastTo(roomid)}, 1000)
                    }
                });

            });
        }
    });
}



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
        title: title,
        buttons: [''],    //'full-screen'
        showOnMouseEnter: false
    });

    mediaElement.querySelector('video').style.maxHeight = 'none'

    connection.videosContainer.appendChild(mediaElement);

    setTimeout(function() {
        mediaElement.media.play();
    }, 1000);

    mediaElement.id = event.streamid;
};

// Stream end: Retry
connection.onstreamended = function(event) {
    var mediaElement = document.getElementById(event.streamid);
    if (mediaElement) mediaElement.parentNode.removeChild(mediaElement);
    broadcastTo(roomID)
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

    try {
        mediaElement.media.play();
    } catch (error) {
        console.log('ERROR', error);
    }
    
    //$('#message').html("Touched").show()
    $('#message').hide()
    noSleep.enable();

    document.body.requestFullscreen()
}

$(document).ready(function(){
    
    $('.viewBtn').click(function(){
        if ($(this).data('room') == 'HOME') window.location='index.html'
        else {
            broadcastTo($(this).data('room'))
            $('#message').html("Touch video to play fullscreen").show()
        }
    });
    
    $('#videos-container').on('touchstart click', onTouchVideo);
});
