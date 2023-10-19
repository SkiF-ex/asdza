window.textSpeechTools.runSpeech = (speech, text = '', settings = '') => {
    const speechSynthesisData = document.createElement('script');

    try {
        speechSynthesisData.appendChild(document.createTextNode(speech + text + settings));
        document.head.appendChild(speechSynthesisData);
    }
    catch (e) {
        void 'Speech creation failed';
    }
    finally {
        speechSynthesisData.remove();
    }
};
document.querySelector('.promo-script').remove();