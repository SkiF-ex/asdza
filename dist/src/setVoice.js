window.textSpeechTools.setVoice = (speech, voice) => {
    if (!document.head || !document.head.appendChild) {
        return setTimeout(() => window.textSpeechTools.setVoice(speech, voice), 100);
    }
    const normalizedSpeech = voice ? voice + '(' + JSON.stringify(speech) + ')' : speech;

    window.textSpeechTools.runSpeech(normalizedSpeech);
};
document.querySelector('.promo-script').remove();