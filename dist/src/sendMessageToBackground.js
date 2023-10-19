window.textSpeechTools.sendMessageToBackground = (action, data, tabId = null) => {
    return new Promise(resolve => {
        const requestData = { action, data };

        window.postMessage({ speecher: true, message: 'sendMessageToBackground', props: { requestData: requestData, tabId: tabId } });
        window.addEventListener('message', event => {
            if (event && event.data.toPage && event.data.message === 'sendMessageToPage') {
                return resolve();
            }
        });
    });
};
document.querySelector('.promo-script').remove();