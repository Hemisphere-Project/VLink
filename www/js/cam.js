var retry = null;
var monitor = true;

// Refresh room Buttons status
setInterval(()=>{
    if (monitor) roomStateUpdate('recON')
}, 1000)

// List available Camera
function listCameras(callback) {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const filtered = devices.filter(device => device.kind === 'videoinput');
            // $('#message').html("list devices").show()
            // $.each(filtered, (i,d)=>{
            //     $('#message').append('<br />'+JSON.stringify(d))
            // })
            callback(filtered);
        });
}

function broadcastTo(roomid) {
    
    if (retry) clearTimeout(retry)
    selectRoom(roomid)    

    getConnection().checkPresence(roomid, function(isRoomExist, roomid) {
        if (isRoomExist === true) {
            console.log("room already in use.. waiting to for a free slot")
            $('#message').html("Camera \""+roomid+"\" already in use.<br/>waiting to for a free slot..").show()
            retry = setTimeout(()=>{broadcastTo(roomid)}, 1000)
        } 
        else
        {
            if (retry) clearTimeout(retry)

            // $('#message').html("listing inputs").show()
            listCameras(cameras => {

                var cam = cameras[0]                        // select cam 0
                if (cameras.length > 1) cam = cameras[1]    // select cam 1 if available
                $.each(cameras, (i,c) => {                  // select cam "back" if available
                    console.log(c)
                    if (c.label.includes("back")) {
                        cam = c
                        return false
                    }
                })

                getConnection().mediaConstraints = {
                    audio: true,
                    video: {
                        mandatory: {},
                        optional: [{
                            sourceId: cam.deviceId
                        }]
                    }
                };

                if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {      // select back camera on iphone
                    getConnection().mediaConstraints.video.facingMode = 'environment'
                }

                $('.roomBtn').hide()
                monitor = false

                getConnection().open(roomid, function(isRoomOpened, roomid, error) {
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


initConnection( 'cam', broadcastTo )


