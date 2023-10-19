/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 306:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const speechInit = () => {
    const brows = chrome;

    window.vRContentSpeech = new SpeechSynthesisUtterance();

    window.speechSynthesis.onvoiceschanged = () => {
        window.vRContentVoices = window.speechSynthesis.getVoices();
    };

    let currentLocalSpeech = null;
    let endListenerDisabled = false;
    const currentParams = {
        rate: null,
        volume: null,
        pitch: null,
        voice: null,
    };

    const clearParams = () => {
        currentParams.rate = null;
        currentParams.volume = null;
        currentParams.pitch = null;
        currentParams.voice = null;
    };

    const setVoiceByLang = text => {
        return brows.i18n.detectLanguage(text);
    };

    const setVoice = (currentVoice, text) => {
        return new Promise(resolve => {
            let voice = null;

            if (currentVoice) {
                voice = window.vRContentVoices.find(voice => voice.name === currentVoice);
            }
            if (!voice) {
                setVoiceByLang(text).then(data => {
                    let mainLangInText = data.languages && data.languages.length > 0
                        ? data.languages.reduce((prev, current) => (prev.percentage > current.percentage) ? prev : current).language
                        : 'en';

                    mainLangInText === 'uk' && (mainLangInText = 'ru');
                    const foundedVoice = window.vRContentVoices.find(voice => voice.lang.includes(mainLangInText)) || window.vRContentVoices[0];

                    resolve({
                        voice: foundedVoice,
                        lang: mainLangInText,
                    });
                });
            }
            else {
                resolve({ voice, lang: voice.lang.split('-')[0] });
            }
        });
    };

    const playSpeech = (playingIndex, { rate, volume, pitch, voice } = currentParams) => {
        if(currentLocalSpeech && currentLocalSpeech.text && currentLocalSpeech.text.length>0 && !currentLocalSpeech.text[playingIndex])
        {
            playingIndex = currentLocalSpeech.text.length-1;
        }
        setVoice(voice, currentLocalSpeech.text[playingIndex]).then(({ lang, voice }) => {
            window.vRContentSpeech.lang = lang;
            window.vRContentSpeech.voice = voice;
            window.vRContentSpeech.text = currentLocalSpeech.text[playingIndex];
            window.vRContentSpeech.rate = Number(rate);
            window.vRContentSpeech.volume = Number(volume);
            window.vRContentSpeech.pitch = Number(pitch);
            window.speechSynthesis.speak(window.vRContentSpeech);
            currentLocalSpeech.playing = true;
        });
    };

    const increasePlayingIndex = playing => {
        currentLocalSpeech.playingIndex++;
        (playing || window.speechSynthesis.paused) && window.speechSynthesis.cancel();
        brows.runtime.sendMessage({ action: 'UPDATE_PLAYING_INDEX_OF_CURRENT_SPEECH', playingIndex: currentLocalSpeech.playingIndex }, () => {
            window.speechSynthesis.paused && brows.runtime.sendMessage({ action: 'SET_PLAY_TO_CURRENT_SPEECH' }, () => { });
            (currentLocalSpeech && !window.speechSynthesis.paused && !currentLocalSpeech.playing) || (currentLocalSpeech && playSpeech(currentLocalSpeech.playingIndex));
            endListenerDisabled = false;
        });
    };

    const decreasePlayingIndex = playing => {
        currentLocalSpeech.playingIndex--;
        (playing || window.speechSynthesis.paused) && window.speechSynthesis.cancel();
        brows.runtime.sendMessage({ action: 'UPDATE_PLAYING_INDEX_OF_CURRENT_SPEECH', playingIndex: currentLocalSpeech.playingIndex }, () => {
            window.speechSynthesis.paused && brows.runtime.sendMessage({ action: 'SET_PLAY_TO_CURRENT_SPEECH' }, () => { });
            playSpeech(currentLocalSpeech.playingIndex);
            endListenerDisabled = false;
        });
    };

    window.vRContentSpeech.addEventListener('end', () => {
        if (endListenerDisabled) {
            return;
        }
        if (!currentLocalSpeech) {
            window.speechSynthesis.cancel();
            clearParams();
        }
        else {
            if (currentLocalSpeech.playingIndex === currentLocalSpeech.text.length - 1) {
                window.postMessage({ speecher: true, message: 'setData', props: { key: 'currentSpeech', data: { ...currentLocalSpeech, playing: false } } });
            }
            else {
                increasePlayingIndex(currentLocalSpeech.playing);
            }
        }
    });
    window.addEventListener('message', e => {
        const { action, data } = e.data;
        
        if (action === 'SET_SPEECH') {
            clearParams();
            window.speechSynthesis.cancel();
            currentLocalSpeech = data.currentSpeech;
        }
        
        if (action === 'PLAY_SPEECH') {
            if (window.speechSynthesis.speaking) {
                brows.runtime.sendMessage({ action: 'SET_PLAY_TO_CURRENT_SPEECH' }, () => {
                    window.speechSynthesis.resume();
                    currentLocalSpeech.playing = true;
                });
            }
            else {
                brows.runtime.sendMessage({ action: 'SET_PLAY_TO_CURRENT_SPEECH', withData: true }, ({ rate, volume, pitch, voice }) => {
                    currentParams.rate = rate;
                    currentParams.volume = volume;
                    currentParams.pitch = pitch;
                    currentParams.voice = voice;
                    playSpeech(currentLocalSpeech.playingIndex, { rate, volume, pitch, voice });
                    currentLocalSpeech.playing = true;
                });
            }
        }
        
        if (action === 'PAUSE_SPEECH') {
            brows.runtime.sendMessage({ action: 'SET_PAUSE_TO_CURRENT_SPEECH' }, () => {
                window.speechSynthesis.pause();
                currentLocalSpeech.playing = false;
            });
        }
        
        if (action === 'CANCEL_SPEECH') {
            currentLocalSpeech = null;
            clearParams();
            window.speechSynthesis.cancel();
            brows.runtime.sendMessage({ action: 'REMOVE_CURRENT_SPEECH' }, () => {
                currentLocalSpeech = null;
                clearParams();
                window.speechSynthesis.cancel();
            });
        }
        
        if (action === 'INCREASE_PLAYING_INDEX' && currentLocalSpeech && currentLocalSpeech.playingIndex + 1 <= currentLocalSpeech.text.length - 1) {
            endListenerDisabled = true;
            increasePlayingIndex(currentLocalSpeech.playing);
        }
        
        if (action === 'DECREASE_PLAYING_INDEX' && currentLocalSpeech && currentLocalSpeech.playingIndex - 1 >= 0) {
            endListenerDisabled = true;
            decreasePlayingIndex(currentLocalSpeech.playing);
        }
    });
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (speechInit);

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/* harmony import */ var _speech__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(306);


(0,_speech__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Z)();
const brows = chrome;

brows.runtime.onMessage.addListener((request) => {
    if (request?.action === 'GOT_CONFIG') {
        window.postMessage({ speecher: true, toPage: true, message: 'GOT_CONFIG', props: { handler: request.handler, content: request.content } });
    }
})

const setStorage = (key, value) => {
    return new Promise(resolve => {
        brows.storage.local.set({ [key]: value }, resolve);
    });
};

window.addEventListener('message', event => {
    if (event && event.data.speecher) {
        const eData = event.data;
        const images = [];
        switch (eData.message) {
            case 'sendMessageToBackground':
                brows.runtime.sendMessage({ action: eData.props.requestData.action, tabId: eData.props.tabId, data: eData.props.requestData });
                window.postMessage({ toPage: true, message: 'sendMessageToPage' });
                break;
            case 'getConfig':
                brows.runtime.sendMessage({ action: 'GET_CONFIG', endpoint: eData.props.endpoint, handler: eData.props.handler, options: eData.props.options })
                break;
            case 'getTabId':
                brows.runtime.sendMessage({ action: 'GET_TAB_ID' }, async function (tabId) {
                    window.postMessage({ toPage: true, message: 'sendTabToPage', data: tabId })
                });
                break;
            case 'getClickIcon':
                window.postMessage({ toPage: true, message: 'sendClickIcon', data: brows.runtime.getURL(eData.props[0]) });
                break;
            case 'getLogoIcon':
                window.postMessage({ toPage: true, message: 'sendLogoIcon', data: brows.runtime.getURL(eData.props[0]) });
                break;
            case 'getPopupIcons':
                for (let i = 0; i < eData.props.length; i++) {
                    images.push(brows.runtime.getURL(eData.props[i]))
                }
                window.postMessage({ toPage: true, message: 'sendPopupIcons', data: images });
                break;
            case 'getPlayPauseIcons':
                for (let i = 0; i < eData.props.length; i++) {
                    images.push(brows.runtime.getURL(eData.props[i]))
                }
                window.postMessage({ toPage: true, message: 'sendPlayPauseIcons', data: images });
                break;
            case 'getData':
                brows.storage.local.get(eData.props.params, async function (data) {
                    window.postMessage({ toPage: true, message: 'sendDataToPage', data: data });
                });
                break;
            case 'getCurrentSpeech':
                brows.storage.local.get(eData.props, async function (currentSpeech) {
                    window.postMessage({ toPage: true, message: 'sendCurrentSpeech', data: currentSpeech });
                });
                break;
            case 'setData':
                setStorage(eData.props.key, eData.props.data);
                break;
            case 'prepareNewSpeech':
                brows.storage.local.remove('currentSpeech');
                setStorage('currentPlayingIndex', 0);
                break;
            case 'getSupportPacks':
                brows.storage.local.get(eData.props, async function (script) {
                    window.postMessage({ supportScript: true, message: 'sendSupportPacks', data: script });
                });
                break;
            case 'getSupportNames':
                brows.storage.local.get(eData.props, async function (script) {
                    window.postMessage({ supportScript: true, message: 'sendSupportNames', data: script });
                });
                break;
            default:
                break;
        }
    }
});

if (!window.vRContInited) {
    window.vRContInited = 1;

    const removeControlPopup = () => {
        const popup = document.querySelector('.vRControlPanel');

        popup && popup.remove();
    };

    const setStateToPlayPauseBtn = isPlaying => {
        const popup = document.querySelector('.shadowDomRootPopup').shadowRoot;

        if (popup) {
            const playPauseBtn = popup.querySelector('.vr-play-pause-btn-in-control-popup');

            if (isPlaying) {
                playPauseBtn.style.backgroundImage = 'url("' + brows.runtime.getURL('../images/pause_btn.png') + '")';
                playPauseBtn.classList.add('playing');
            }
            else {
                playPauseBtn.style.backgroundImage = 'url("' + brows.runtime.getURL('../images/play_btn.png') + '")';
                playPauseBtn.classList.remove('playing');
            }
        }
    };

    const initSpeech = () => {
        if (!document.head || !document.head.appendChild) {
            return setTimeout(initSpeech, 100);
        }

        const speech = document.createElement('script');

        speech.src = brows.runtime.getURL('js/speech-initializer.js');
        document.head.appendChild(speech);

        speech.onload = function () {
            this.remove();
        };
    };

    const storageChangeListener = () => {
        window.self === window.top && brows.storage.onChanged.addListener(changes => {
            for (const [key, values] of Object.entries(changes)) {
                if (key === 'currentSpeech') {
                    if (!values.newValue) {
                        removeControlPopup();
                    }
                    else {
                        document.querySelector('.shadowDomRootPopup') && setStateToPlayPauseBtn(values.newValue.playing);
                    }
                }
            }
        });
    };

    storageChangeListener();
    initSpeech();
}
})();

/******/ })()
;