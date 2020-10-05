var monitor = false;
var heartbeatTimeout

// Refresh room Buttons status
setInterval(()=>{
    if (monitor) roomStateUpdate('roomON')
}, 1000)
roomStateUpdate('roomON')

function receiveFrom(roomid) 
{
    if (roomid == activeRoomID)
        toastr.warning('waiting for a camera..', "No video from \""+activeRoomID+"\"", {timeOut: 4000})
    
    viewerUnlink()   
    selectRoom(roomid)

    if (!isConnected()) {
        console.error('No link to chat server')
        toastr.error('retrying..', "No connection available")
    }

    connection.join(activeRoomID, function(isJoined, roomid, error) {
        if(isJoined) 
            viewerLink()            
    });
}

// Follow room updates (viewers)
//


function viewerLink() 
{
    watchConnectionLost()

    if (connection.socket) {
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
                if (heartbeatTimeout) clearTimeout(heartbeatTimeout)
                heartbeatTimeout = setTimeout(()=>{
                    toastr.warning('retrying to connect..', 'Camera lost')
                    resetStream()
                }, 5000)
            }
        });
    }
}

function viewerUnlink()
{
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout)
}

initConnection( 'view', receiveFrom )
