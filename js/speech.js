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

export default speechInit;