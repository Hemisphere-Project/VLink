var monitor = true;
var countInterval
var heartbeatInterval

// Refresh room Buttons status
setInterval(()=>{
    if (monitor) roomStateUpdate('recON')
}, 1000)
roomStateUpdate('recON')

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

// Connect
//
function broadcastTo(roomid) 
{    
    cameraUnlink()
    selectRoom(roomid)    

    if (!isConnected()) {
        console.error('No link to chat server')
        toastr.error('retrying..', "No connection available")
    }
    
    connection.checkPresence(roomid, function(isRoomExist, roomid) {
        console.warn('Checking presence...')

        if (isRoomExist === true) {
            console.log("room already in use.. waiting to for a free slot")
            toastr.warning('waiting to for a free slot..', "Cam \""+roomid+"\" already in use")
        } 
        else
        {
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

                $('.roomBtn').hide()
                monitor = false

                connection.open(activeRoomID, function(isRoomOpened, roomid, error) {
                    if(error) {
                        console.error("error on connection", error);
                        toastr.error('retrying..', "Error when starting broadcast", {timeOut: 4000})
                    }
                    else cameraLink()
                });

            });
        }
    })
}

// Follow subscribers (cam only)
//

function cameraLink() 
{
    watchConnectionLost()

    function reCount() {
        if (!isConnected()) return
        var participants = connection.getAllParticipants()
        var count = 0
        $.each(participants, (i,participantId)=>{
            if (connection.peers[participantId] 
                && connection.peers[participantId].activeRoom == activeRoomID ) count += 1
        })
        if (refreshPeersCount(count)) 
            toastr.info(count+' viewers', 'Peers count', {timeOut: 1000})
        connection.socket.emit('peers-info', {'cmd': 'room-count', 'roomid': activeRoomID, 'count': count});
    }

    if (connection.socket) {
        connection.socket.off('peers-info')
        connection.socket.on('peers-info', (data) => 
        {   
            if (data.cmd == 'stream-join') 
            {
                if (connection.peers[data.userid]) {
                    connection.peers[data.userid].activeRoom = data.room
                    console.log(data.userid, "joined room", data.room)
                }
                reCount()
            }
        });
    }

    heartbeatInterval = setInterval(() => {
        connection.socket.emit('peers-info', {'cmd': 'heartbeat', 'roomid': activeRoomID});
    }, 2000)
    
    countInterval = setInterval(reCount, 5000) // also detect wild exit (does not triggers stream-join)
}

function cameraUnlink() {
    if (countInterval) clearInterval(countInterval)
    if (heartbeatInterval) clearInterval(heartbeatInterval)
}


initConnection( 'cam', broadcastTo )


