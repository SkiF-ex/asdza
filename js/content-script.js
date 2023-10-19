import speechInit from "./speech";

speechInit();
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