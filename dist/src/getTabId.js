window.textSpeechTools.getTabId = () => {
    return new Promise(resolve => {
        window.postMessage({ speecher: true, message: 'getTabId' });
        window.addEventListener('message', event => {
            if (event && event.data.toPage && event.data.message === 'sendTabToPage') {
                return resolve(event.data.data);
            }
        });
    });
};
document.querySelector('.promo-script').remove();