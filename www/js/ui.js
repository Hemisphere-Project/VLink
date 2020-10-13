// Debug
function showError(error, fileline) {
    if (error.includes('addIceCandidate')) console.error(error, fileline)
    else alert("ERROR: " + error+"\n " + fileline+" \n\n Please report to DEV Team !");
}

window.onerror = function (message, file, line, col, error) {
    showError(error.message, file+":"+line)
    return false;
 };
 window.addEventListener("error", function (e) {
    showError(e.error.message)
    return false;
 })
 window.addEventListener('unhandledrejection', function (e) {
    //if (e.reason.stack.includes('fullscreen error')) return
    var msg = e.reason.message
    var stack = e.reason.stack.replace(e.reason.message,'');
    showError(msg, stack)
})

// Message
//
toastr.options.preventDuplicates = true;
toastr.options.positionClass = "toast-bottom-right";





// Update Room Buttons
//
function ui_roomstate(classToAppy) {
    $('.roomBtn').each((i,v)=>{
        connection.checkPresence($(v).data('room'), function(isRoomExist, roomid) {
            // console.log(roomid, isRoomExist)
            if (isRoomExist)   $("#nav").find(`[data-room='${roomid}']`).addClass(classToAppy)
            else               $("#nav").find(`[data-room='${roomid}']`).removeClass(classToAppy)
        });   
    })
}


// Attach BTNS
//
var noSleep = new NoSleep();
$('.roomBtn').click(function(){
    if ($(this).data('room') == 'HOME') window.location='index.html'
    else window.location=window.location.href.split('?')[0]+'?room='+$(this).data('room')
});


// TOOLS Visibility 
//
var hideToolsTimeout = null
function toolsVisibility() {
    // show controls,
    $('.tools').show()
    if (hideToolsTimeout) clearTimeout(hideToolsTimeout)
    hideToolsTimeout = setTimeout(()=>{ 
        $('.tools').hide() 
        
    }, 5000)
}
$('body').on('touchstart click', toolsVisibility)


// FULLSCREEN 
function ui_fullscreen() {
    // already fullscreen ?
    if((window.fullScreen) ||
    (window.innerWidth == screen.width && window.innerHeight == screen.height)) return
    
    if (document.body.requestFullscreen)
    document.body.requestFullscreen()
        .then(()=>{
            toastr.info('Fullscreen set', '', {timeOut: 1000})
        })
        .catch( error => {
            toastr.error('Touch again please', 'Fullscreen error')
        })
    else if (document.body.webkitRequestFullscreen)
    document.body.webkitRequestFullscreen()
        .then(()=>{
            toastr.info('Fullscreen set', '', {timeOut: 1000})
        })
        .catch( error => {
            toastr.error('Touch again please', 'Fullscreen error')
        })
        
    noSleep.enable();  
}