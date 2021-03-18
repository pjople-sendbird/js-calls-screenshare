
/**
 * SendBird main object
 */
var sb;

/**
 * Main call object
 */
var currentCall;

/**
 * Flag to check if SendBird Calls is init
 */
var callsInit = false;

var appId;
var userId;

var toUserId;
var screenShared = false;

/**
 * Define your unique ID for Calls Handler
 */
const UNIQUE_HANDLER_ID = 'ANY-' + new Date().getTime();


/**
 * Connect to Sendbird SDK
 */
function connect() {
    appId = getElement('app_id').val();
    userId = getElement('user_id').val();
    sb = new SendBird({
        appId
    });
    sb.connect(userId, function(user, error) {
        if (error) {
            console.dir(error);
            getElement('logError').html('Error connecting to sendbird: ' + error); 
        } else {
            startListeningMessages();
            connectCalls();
            setTimeout(() => {
                getElement('logSuccess').html(''); 
                toggleVisibility('loginDiv', false);
                setTimeout(() => {
                    toggleVisibility('mainMenu', true);
                }, 500)
            }, 1000)
        }
    });
}

/**
 * Calls - Connects with Sendbird Calls
 */
function connectCalls() {
    SendBirdCall.init(appId);
    askBrowserPermission();
    authorizeSignedUser();
}

/**
 * When this is called, Browser will ask for Audio and Video permission
 */
function askBrowserPermission() {
    SendBirdCall.useMedia({ audio: true, video: true });
}

/**
 * Calls - Authorize signed user
 */
function authorizeSignedUser() {
    const authOption = { 
        userId
    };
    SendBirdCall.authenticate(authOption, (res, error) => {
        if (error) {
            getElement('logError').html("Calls Authentication failed: " + error);
        } else {
            getElement('logSuccess').html('Calls authorized!');
            /**
             * Establishing websocket connection
             */
            SendBirdCall.connectWebSocket()
                .then(() => {
                    /**
                     * Wait for calls once connected
                     */
                    waitForCalls();
                })
                .catch(() => {
                    getElement('logError').html('Failed to connect to Socket server');
                });
        }
    });
}

function notifyScreenSharng(callingUserId) {
    var userIds = [callingUserId];
    sb.GroupChannel.createChannelWithUserIds(userIds, false, 'SCREENSHARING', '', '', (groupChannel, error) => {
        if (error) {
            // Handle error.
        } else {
            const params = new sb.UserMessageParams();
            params.message = 'START-SCREENSHARE';
            groupChannel.sendUserMessage(params, function(userMessage, error) {
                if (error) {
                    // Handle error.
                }
            });        
        }
    });
}

function notifyStopScreenSharng(callingUserId) {
    var userIds = [callingUserId];
    sb.GroupChannel.createChannelWithUserIds(userIds, false, 'SCREENSHARING', '', '', (groupChannel, error) => {
        if (error) {
            // Handle error.
        } else {
            const params = new sb.UserMessageParams();
            params.message = 'STOP-SCREENSHARE';
            groupChannel.sendUserMessage(params, function(userMessage, error) {
                if (error) {
                    // Handle error.
                }
            });        
        }
    });
}

/**
 * Wait for calls once authorized with Calls SDK
 */
function waitForCalls() {
    SendBirdCall.addListener(UNIQUE_HANDLER_ID, {
        onRinging: (call) => {
            console.log('onRinging');
            currentCall = call;
            toggleVisibility('isRinging', true);
            toggleVisibility('butMakeCall', false);
            toggleVisibility('butAcceptCall', true);

           call. onEstablished = (call) => {
                console.log('onEstablished');
                toggleVisibility('isRinging', false);
                toggleVisibility('butAcceptCall', false);
                toggleVisibility('butShareScreen', true);
                toggleVisibility('butEndCall', true);
            }
            call.onConnected = (call) => {
                console.log('onConnected');
                getElement('logSuccess').html('Call connected!');
            }
            call.onEnded = (call) => {
                console.log('onEnded');
                currentCall = null;
                toggleVisibility('butMakeCall', true);
                toggleVisibility('butAcceptCall', false);
                toggleVisibility('butShareScreen', false);
                toggleVisibility('butEndCall', false);
            }            
            call.onRemoteAudioSettingsChanged = (call) => {
                console.log('Remote audio settings changed');
            }
            call.onRemoteVideoSettingsChanged = (call) => {
                console.log('Remote video settings changed');
            }        
        }
    });
}

/**
 * Accept coming call
 */
function acceptCall() {
    if (!currentCall) {
        return;
    }
    const acceptParams = {
        callOption: {
            localMediaView: getVideoObjectCaller(),
            remoteMediaView: getVideoObjectCallee(),
            videoEnabled: true,
            audioEnabled: true
        }
    };
    currentCall.accept(acceptParams);
    toggleVisibility('isRinging', false);
    toggleVisibility('butAcceptCall', false);
    toggleVisibility('butShareScreen', true);
    toggleVisibility('butEndCall', true);        
}

function makeCall() {
    toUserId = prompt("ENTER USER TO CALL");
    if (!toUserId) {
        return;
    }
    const dialParams = {
        userId: toUserId,
        isVideoCall: true,
        callOption: {
            localMediaView: getVideoObjectCaller(),
            remoteMediaView: getVideoObjectCallee(),
            videoEnabled: true,
            audioEnabled: true
        }
    };
    const call = SendBirdCall.dial(dialParams, (call, error) => {
        if (error) {
            getElement('logError').html('Dial Failed!');
        } else {
            getElement('logSuccess').html('Dial Success');
        }    
    });    
    call.onEstablished = (call) => {
        console.log('onEstablished');
        currentCall = call;  
    };
    call.onConnected = (call) => {
        console.log('onConnected');
        toggleVisibility('butMakeCall', false);
        toggleVisibility('butEndCall', true);
        toggleVisibility('butShareScreen', true);        
    };
    call.onEnded = (call) => {
        console.log('onEnded');
        currentCall = null;
        toggleVisibility('butMakeCall', true);
        toggleVisibility('butEndCall', false);
        toggleVisibility('butShareScreen', false);
    };    
    call.onRemoteAudioSettingsChanged = (call) => {
        console.log('Remote user changed audio settings');
    };    
    call.onRemoteVideoSettingsChanged = (call) => {
        console.log('Remote user changed video settings');
    };
}

/**
 * End your call
 */
function endCall() {
    if (currentCall) {
        currentCall.end();
    }
    if (screenShared) {
        getElement('local_video_element_id').animate({
            width: '300px'
        }, 500, () => {
            toggleVisibility('butMakeCall', true);
            toggleVisibility('butEndCall', false);
            toggleVisibility('butShareScreen', false);        
        })
    } else {
        toggleVisibility('butMakeCall', true);
        toggleVisibility('butEndCall', false);
        toggleVisibility('butShareScreen', false);    
    }
}


/**
 * UI Helper functions
 */
function getVideoObjectCaller() {
    return document.getElementById('local_video_element_id');
}
function getVideoObjectCallee() {
    return document.getElementById('remote_video_element_id');
}

function toggleVisibility(id, show) {
    show ? getElement(id).fadeIn('fast') : getElement(id).fadeOut('fast');
}
function getElement(id) {
    return $('#' + id);
}
function getElementValue(id) {
    return document.getElementById(id).value;
}

function shareScreen() {
    if (!currentCall) {
        alert('No current call in progress');
        return;
    }
    screenShared = true;
    // Enlarge my video
    getElement('local_video_element_id').animate({
        width: '800px'
    }, 500, () => {
        shareScreenAsync();
        toggleVisibility('butShareScreen', false)
        toggleVisibility('butStopShareScreen', true)    
    })
    // Inform we're screen sharing
    notifyScreenSharng(toUserId);
}

async function shareScreenAsync() {
    try{
        await currentCall.startScreenShare();
        currentCall.onScreenSharingStopped = () => {
            // add your process for screen share stop.
        }
    } catch (e) {
        // add your process for start screen share fail.
    }
}

function stopScreenShare() {
    if (!currentCall) {
        alert('No current call in progress');
        return;
    }
    screenShared = false;
    getElement('local_video_element_id').animate({
        width: '300px'
    }, 500, () => {
        currentCall.stopScreenShare();
        toggleVisibility('butEndCall', true);
        toggleVisibility('butStopShareScreen', false);        
        toggleVisibility('butShareScreen', true);        
    })
    // Inform we're NO screen sharing
    notifyStopScreenSharng(toUserId);
}

function startListeningMessages() {
    var channelHandler = new sb.ChannelHandler();
    channelHandler.onMessageReceived = function(channel, message) {
        if (message.message == 'START-SCREENSHARE') {
            // enlarge remove video element
            getElement('remote_video_element_id').animate({
                width: '800px'
            }, 500, () => {
            })
        }
        if (message.message == 'STOP-SCREENSHARE') {
            // reduce remove video element
            getElement('remote_video_element_id').animate({
                width: '300px'
            }, 500, () => {
            })
        }
    };
    sb.addChannelHandler('CHANNEL-' + new Date().getTime(), channelHandler);    
}
