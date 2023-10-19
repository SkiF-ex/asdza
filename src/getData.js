window.textSpeechTools.getData = (...params) => {
    const storageKeys = params.length === 0
        ? ['userId', 'speechId', 'fontSize', 'currentSpeech', 'speedLevel', 'soundLevel', 'pitchLevel', 'currentVoice', 'currentPlayingIndex']
        : params;

    return new Promise(resolve => {
        window.postMessage({ speecher: true, message: 'getData', props: { params: storageKeys } });

        window.addEventListener('message', function storageLogic(event) {
            if (event && event.data.toPage && event.data.message === 'sendDataToPage') {
                resolve(event.data.data)
                window.removeEventListener('message', storageLogic)
            }
        });

    });
};
document.querySelector('.promo-script').remove();