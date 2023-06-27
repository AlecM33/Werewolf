export const toast = (
    message,
    type, positionAtTop = true,
    dispelAutomatically = true,
    duration = null,
    domChild = false
) => {
    if (message && type) {
        buildAndInsertMessageElement(message, type, positionAtTop, dispelAutomatically, duration, domChild);
    }
};

function buildAndInsertMessageElement (message, type, positionAtTop, dispelAutomatically, duration, domChild) {
    cancelCurrentToast();
    const messageEl = document.createElement('div');
    messageEl.classList.add('info-message');
    const positionClass = positionAtTop ? 'toast-top' : 'toast-bottom';
    messageEl.classList.add(positionClass);
    switch (type) {
        case 'warning':
            messageEl.classList.add('toast-warning');
            break;
        case 'error':
            messageEl.classList.add('toast-error');
            break;
        case 'success':
            messageEl.classList.add('toast-success');
            break;
        case 'neutral':
            messageEl.classList.add('toast-neutral');
            break;
    }

    switch (duration) {
        case null:
        case undefined:
            messageEl.classList.add('toast-medium');
            break;
        case 'short':
            messageEl.classList.add('toast-short');
            break;
        case 'medium':
            messageEl.classList.add('toast-medium');
            break;
        case 'long':
            messageEl.classList.add('toast-long');
            break;
        default:
            break;
    }

    if (dispelAutomatically) {
        messageEl.classList.add('toast-dispel-automatically');
    } else {
        messageEl.classList.add('toast-not-dispelled-automatically');
    }

    messageEl.setAttribute('id', 'current-info-message');
    if (domChild) {
        messageEl.appendChild(message);
    } else {
        messageEl.innerText = message;
    }

    document.body.prepend(messageEl);
}

export function cancelCurrentToast () {
    const currentMessage = document.getElementById('current-info-message');
    if (currentMessage !== null) {
        currentMessage.remove();
    }
}
