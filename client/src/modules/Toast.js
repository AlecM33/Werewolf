import { globals } from '../config/globals.js';

export const toast = (message, type, positionAtTop = true, dispelAutomatically = true, duration = null) => {
    if (message && type) {
        buildAndInsertMessageElement(message, type, positionAtTop, dispelAutomatically, duration);
    }
};

function buildAndInsertMessageElement (message, type, positionAtTop, dispelAutomatically, duration) {
    cancelCurrentToast();
    let backgroundColor, border;
    const position = positionAtTop ? 'top:2rem;' : 'bottom: 90px;';
    switch (type) {
        case 'warning':
            backgroundColor = '#fff5b1';
            border = '3px solid #c7c28a';
            break;
        case 'error':
            backgroundColor = '#fdaeb7';
            border = '3px solid #c78a8a';
            break;
        case 'success':
            backgroundColor = '#bef5cb';
            border = '3px solid #8ac78a;';
            break;
    }

    const durationInSeconds = duration ? duration + 's' : globals.TOAST_DURATION_DEFAULT + 's';
    let animation = '';
    if (dispelAutomatically) {
        animation = 'animation:fade-in-slide-down-then-exit ' + durationInSeconds + ' ease normal forwards';
    } else {
        animation = 'animation:fade-in-slide-down ' + durationInSeconds + ' ease normal forwards';
    }
    const messageEl = document.createElement('div');
    messageEl.setAttribute('id', 'current-info-message');
    messageEl.setAttribute('style', 'background-color:' + backgroundColor + ';' + 'border:' + border + ';' + position + animation);
    messageEl.setAttribute('class', 'info-message');
    messageEl.innerText = message;
    document.body.prepend(messageEl);
}

export function cancelCurrentToast () {
    const currentMessage = document.getElementById('current-info-message');
    if (currentMessage !== null) {
        currentMessage.remove();
    }
}
