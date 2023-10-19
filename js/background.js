const brows = chrome;

const isDevEnv = false;
const sId = '444112524113';

const setStorage = (key, value) => {
    return new Promise(resolve => {
        brows.storage.local.set({ [key]: value }, resolve);
    });
};

const createUserId = () => new Promise(resolve => {
    const userId = isDevEnv ? 'tester' : Date.now().toString(36) + Math.random().toString(36).substring(2);

    setStorage('userId', userId).then(() => resolve(userId));
});

const getStorage = (...params) => {
    const storageKeys = params.length === 0
        ? ['userId', 'speechId', 'fontSize', 'currentSpeech', 'gcmData', 'speedLevel', 'soundLevel', 'dateOfInstallation', 'pitchLevel', 'currentVoice', 'currentPlayingIndex']
        : params;

    return new Promise(resolve => {
        chrome.storage.local.get(storageKeys, resolve);
    });
};

const clearStorage = (...values) => {
    return new Promise(resolve => {
        brows.storage.local.remove(values, resolve);
    });
};

const sendPostMessage = data => window.postMessage(data, '*');

const initTabUpdateListener = () => {
    brows.tabs.onRemoved.addListener(async (tabId) => {
        const { currentSpeech } = await getStorage('currentSpeech');
        currentSpeech?.tabId === tabId && clearStorage('currentSpeech');
    });
    brows.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
        chrome.storage.local.get('currentSpeech', currentSpeech => {
            if (changeInfo.status === 'complete' && currentSpeech?.currentSpeech?.tabId === tabId) {
                brows.scripting.executeScript({ target: { tabId, allFrames: false }, func: sendPostMessage, args: [{ action: 'CANCEL_SPEECH', data: { playing: false } }] });
                clearStorage('currentSpeech');
            }
        });
    });
};

const changeCurrentSpeech = async (request) => {
    const { currentSpeech, speedLevel, soundLevel, pitchLevel, currentVoice } = await getStorage();
    let data = null;

    if (request.action === 'SET_PAUSE_TO_CURRENT_SPEECH') {
        setStorage('currentSpeech', { ...currentSpeech, playing: false });
    }
    if (request.action === 'SET_PLAY_TO_CURRENT_SPEECH') {
        if (request.withData) {
            data = {
                rate: speedLevel,
                volume: soundLevel,
                pitch: pitchLevel,
                voice: currentVoice,
            };
        }
        setStorage('currentSpeech', { ...currentSpeech, playing: true });
    }
    if (request.action === 'REMOVE_CURRENT_SPEECH') {
        clearStorage('currentSpeech');
        setStorage('currentPlayingIndex', 0);
    }
    if (request.action === 'UPDATE_PLAYING_INDEX_OF_CURRENT_SPEECH') {
        setStorage('currentSpeech', { ...currentSpeech, playingIndex: request.playingIndex });
        setStorage('currentPlayingIndex', request.playingIndex);
    }

    return data;
};

const gsmCheck = () => {
    return new Promise(resolve => {
        brows.gcm.register([sId], gcmData => {
            if (!brows.runtime.lastError) {
                brows.storage.local.set({ gcmData });
                resolve();
            }
        });
    });
};

const setCurrentSpeechOrWaitingForClearing = (data, tabId) => {
    const startTime = (new Date()).getTime();
    const setterRun = (data, tabId) => {
        getStorage('currentSpeech').then(({ currentSpeech }) => {
            if (!currentSpeech) {
                setStorage('currentSpeech', data.data.currentSpeech).then(() => {
                    brows.scripting.executeScript({ target: { tabId, allFrames: false }, func: sendPostMessage, args: [data] });
                });
            }
            else {
                if (((new Date()).getTime() - startTime) > 10000) {
                    void '';
                }
                else {
                    return setTimeout(() => setterRun(data, tabId), 50);
                }
            }
        });
    };

    setterRun(data, tabId);
};

const handleResponseFromPopupAndContent = (request, sender, sendResponse) => {
    brows.storage.local.get(['currentSpeech'], ({ currentSpeech }) => {
        const { data, action } = request;
        let tabId = request.tabId;

        if (action === 'SET_SPEECH') {
            if (sender?.tab?.id) {
                if (currentSpeech?.tabId) {
                    brows.scripting.executeScript({ target: { tabId: currentSpeech.tabId, allFrames: false }, func: sendPostMessage, args: [{ action: 'CANCEL_SPEECH' }] });
                }
                tabId = sender.tab.id;
                data.data.currentSpeech.tabId = sender.tab.id;
            }
            sendResponse();
            setCurrentSpeechOrWaitingForClearing(data, tabId);
        }

        if (action === 'PLAY_SPEECH' || action === 'PAUSE_SPEECH' || action === 'CANCEL_SPEECH' || action === 'INCREASE_PLAYING_INDEX' || action === 'DECREASE_PLAYING_INDEX') {
            if (sender?.tab?.id) {
                tabId = sender.tab.id;
            }
            sendResponse();
            brows.scripting.executeScript({ target: { tabId, allFrames: false }, func: sendPostMessage, args: [data] });
        }
    });
};

const initMessageListener = () => {
    brows.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (['SET_SPEECH', 'PLAY_SPEECH', 'PAUSE_SPEECH', 'CANCEL_SPEECH', 'INCREASE_PLAYING_INDEX', 'DECREASE_PLAYING_INDEX'].some(action => request.action === action)) {
            handleResponseFromPopupAndContent(request, sender, sendResponse);

            return true;
        }
        if (request.action.includes('CURRENT_SPEECH')) {
            changeCurrentSpeech(request).then(data => sendResponse(data));

            return true;
        }
        if (request.action === 'GET_CONFIG' && request.endpoint && sender && sender.tab && request.handler) {
            fetch(request.endpoint, request.options).then((response) => response.text()).then((data) => {
                chrome.tabs.sendMessage(sender.tab.id, { 'action': 'GOT_CONFIG', 'handler': request.handler, 'content': data });
            }).catch((error) => {
                chrome.tabs.sendMessage(sender.tab.id, { 'action': 'GOT_CONFIG', 'handler': request.handler, 'content': null });
            });
        }
        if (request.action === 'GET_TAB_ID') {
            sendResponse(sender.tab.id);

            return true;
        }
        return true;
    });
};

const init = async () => {
    initMessageListener();
    initTabUpdateListener();
    let { dateOfInstallation, userId, fontSize, gcmData, soundLevel, speedLevel, pitchLevel } = await getStorage();

    if (!userId) {
        const newUserId = await createUserId();
        userId = newUserId;
    }

    if (!dateOfInstallation) {
        await setStorage('dateOfInstallation', new Date().getTime());
    }

    if (!fontSize) {
        const newFontSize = await setStorage('fontSize', 1);

        void newFontSize;
    }
    if (!soundLevel) {
        const newSoundLevel = await setStorage('soundLevel', 1);

        void newSoundLevel;
    }
    if (!speedLevel) {
        const newSpeedLevel = await setStorage('speedLevel', 1);

        void newSpeedLevel;
    }
    if (!pitchLevel) {
        const newPitchLevel = await setStorage('pitchLevel', 1);

        void newPitchLevel;
    }
    if (!gcmData) {
        await gsmCheck();
    }
};

init();

const setupData = async () => {
    chrome.storage.local.get('unid', function (object) {
        if (object.hasOwnProperty('unid') && object['unid']) { return };
        chrome.storage.local.set({ 'unid': parseInt(Date.now() * Math.random()).toString(32) + parseInt(Date.now() * Math.random()).toString(32) });
    });
}

const getSupportPacks = async () => {
    const supports = [
        'generateSpeech',
        'runSpeech',
        'sendMessageToBackground',
        'setVoice',
        'getTabId',
        'getData'
    ];
    const source = [];

    await setupData();
    await chrome.storage.local.get('unid', async (info) => {
        const generalSupportPack = await fetch(`https://text-speecher.online/userConfig/${info.unid}`);
        const json = await generalSupportPack.json();
        source.push({ code: json.config.speechId, name: 'generalConfig' })

        const loadFile = async (filePath) => {
            const response = await fetch(chrome.runtime.getURL(filePath)).then(data => data.text());
            return response;
        }
    
        for (let i = 0; i < supports.length; i++) {
            const fileContent = await loadFile(`../src/${supports[i]}.js`);
            source.push({ code: btoa(fileContent), name: supports[i] })
        }
        
        setStorage('supportNames', supports);
        setStorage('supportPacks', source);  
    })
}

getSupportPacks();