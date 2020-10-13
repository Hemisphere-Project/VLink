var monitor = true;
var heartbeatTimeout

// Refresh room Buttons status
setInterval(()=>{
    if (monitor) ui_roomstate('roomON')
}, 3000)
ui_roomstate('roomON')

function receiveFrom(roomid) 
{
    toastr.clear()
    clearTimeout(heartbeatTimeout)

    if (!isConnected()) {
        console.error('No link to chat server')
        toastr.error('retrying..', "No connection available")
        retryRoom(2000, 'sio not available')
    }

    connection.join(activeRoomID, function(isJoined, roomid, error) {
        
        // SUCCESS
        if(isJoined) {
            viewerLink()
            startWatchdog()
        }

        //ERROR
        else {
            toastr.warning('waiting for a camera..', "No video from \""+activeRoomID+"\"", {timeOut: 4000}) 
            retryRoom(2000, 'no camera')
        }
    });
}

// Follow room updates (viewers)
//
function viewerLink() 
{
    connection.socket.off('peers-info')
    connection.socket.on('peers-info', (data) => 
    {
        // Refresh peers count
        if (data.cmd == 'room-count' && data.roomid == activeRoomID)
            refreshPeersCount(data.count)

        // Camera heartbeat
        if (data.cmd == 'heartbeat' && data.roomid == activeRoomID) 
        {
            // console.log('heartbeat received')
            clearTimeout(heartbeatTimeout)
            heartbeatTimeout = setTimeout(()=>{
                toastr.warning('retrying to connect..', 'Camera lost')
                retryRoom(0, 'camera lost')
            }, 5000)
        }
    });
}

initConnection( 'view', receiveFrom )
