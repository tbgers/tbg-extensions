// ==UserScript==
// @name         AJAX Sounds
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  (Re-)enables AJAX Chat sounds
// @author       Gilbert189, PkmnQ
// @match        *://tbgforums.com/forums/chat*
// @icon         https://tbgforums.com/forums/chat/img/audio.png
// @grant        none
// ==/UserScript==

(function() {
    // This is a snippet from TBG Addons by PkmnQ.
    let chatWindow = document.getElementsByTagName("iframe")[0];
    if (chatWindow === undefined) chatWindow = window;
    else chatWindow = chatWindow.contentWindow;
    chatWindow.onload = () => {
        chatWindow.ajaxChat.soundFiles["sound_8"] = "sound_8.mp3";
        chatWindow.ajaxChat.sounds = {};
        for (let sound of Object.entries(chatWindow.ajaxChat.soundFiles)) {
            chatWindow.ajaxChat.sounds[sound[0]] = new Audio(`/forums/chat/sounds/${sound[1]}`);
        }
        chatWindow.ajaxChat.fillSoundSelection('soundReceiveSetting', chatWindow.ajaxChat.getSetting('soundReceive'));
        chatWindow.ajaxChat.fillSoundSelection('soundSendSetting', chatWindow.ajaxChat.getSetting('soundSend'));
        chatWindow.ajaxChat.fillSoundSelection('soundEnterSetting', chatWindow.ajaxChat.getSetting('soundEnter'));
        chatWindow.ajaxChat.fillSoundSelection('soundLeaveSetting', chatWindow.ajaxChat.getSetting('soundLeave'));
        chatWindow.ajaxChat.fillSoundSelection('soundChatBotSetting', chatWindow.ajaxChat.getSetting('soundChatBot'));
        chatWindow.ajaxChat.fillSoundSelection('soundErrorSetting', chatWindow.ajaxChat.getSetting('soundError'));
        chatWindow.ajaxChat.fillSoundSelection('soundPrivateSetting', chatWindow.ajaxChat.getSetting('soundPrivate'));
        chatWindow.ajaxChat.setAudioVolume = function (volume) {
            for (let sound in this.sounds) {
                this.sounds[sound].volume = volume;
            }
        }
    };
    try {
        chatWindow.onload();
    } catch (e) {}
})();
