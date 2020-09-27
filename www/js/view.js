var retry = null;
var monitor = true;

// Refresh room Buttons status
setInterval(()=>{
    if (monitor) roomStateUpdate('roomON')
}, 1000)


function receiveFrom(roomid) {

    if (retry) clearTimeout(retry)
    
    selectRoom(roomid)

    getConnection().join(roomid, function(isJoined, roomid, error) {
        if(error) {
            $('#message').show();
            $('#message').html("No video from \""+roomid+"\".<br/>waiting for a camera..")
            retry = setTimeout(()=>{receiveFrom( roomid )}, 1000)
        }
        else {
            onTouchVideo()
            // if (document.fullscreen) $('#message').hide()
        }
    });

}

initConnection( 'view', receiveFrom )
