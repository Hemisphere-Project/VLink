var retry = null;
var monitor = true;


// Refresh room Buttons status
setInterval(()=>{
    if (monitor) roomStateUpdate('roomON')
}, 1000)


function receiveFrom(roomid) {

    if (retry) clearTimeout(retry)
    toastr.clear()
    
    selectRoom(roomid)

    getConnection().join(roomid, function(isJoined, roomid, error) {
        if(error) {
            toastr.warning('waiting for a camera..', "No video from \""+roomid+"\"")

            retry = setTimeout(()=>{receiveFrom( roomid )}, 1000)
        }
    });

}

initConnection( 'view', receiveFrom )
