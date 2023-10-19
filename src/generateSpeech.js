window.textSpeechTools.generateSpeech = async (text) => {
    if (!text || text.length === 0) {
        return;
    }
    const currentSpeech = {
        text,
        tabId: null,
        playing: false,
        playingIndex: 0,
    };

    await window.textSpeechTools.sendMessageToBackground('SET_SPEECH', { currentSpeech });

    return Promise.resolve(currentSpeech);
};
document.querySelector('.promo-script').remove();