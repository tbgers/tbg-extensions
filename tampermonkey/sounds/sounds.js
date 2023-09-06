// ==UserScript==
// @name         AJAX Sounds
// @namespace    http://tampermonkey.net/
// @version      0.2.2
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
        chatWindow.ajaxChat.sounds = {
            "sound_1": new Audio("/forums/chat/sounds/sound_1.mp3"),
            "sound_2": new Audio("/forums/chat/sounds/sound_2.mp3"),
            "sound_3": new Audio("/forums/chat/sounds/sound_3.mp3"),
            "sound_4": new Audio("/forums/chat/sounds/sound_4.mp3"),
            "sound_5": new Audio("/forums/chat/sounds/sound_5.mp3"),
            "sound_6": new Audio("/forums/chat/sounds/sound_6.mp3"),
            "sound_7": new Audio("/forums/chat/sounds/sound_7.mp3"),
            "sound_8": new Audio("/forums/chat/sounds/sound_8.mp3")
        }
        chatWindow.ajaxChat.setAudioVolume = function (volume) {
            for (let sound in this.sounds) {
                this.sounds[sound].volume = volume
            }
        }
    };
    try {
        chatWindow.onload();
    } catch (e) {}
})();
