export const toast = (message, type, positionAtTop = true, dispelAutomatically=true) => {
    if (message && type) {
        buildAndInsertMessageElement(message, type, positionAtTop, dispelAutomatically);
    }
};

function buildAndInsertMessageElement (message, type, positionAtTop, dispelAutomatically) {
    cancelCurrentToast();
    let backgroundColor;
    const position = positionAtTop ? 'top:3rem;' : 'bottom: 35px;';
    switch (type) {
        case 'warning':
            backgroundColor = '#fff5b1';
            break;
        case 'error':
            backgroundColor = '#fdaeb7';
            break;
        case 'success':
            backgroundColor = '#bef5cb';
            break;
    }

    let animation = '';
    if (dispelAutomatically) {
        animation = 'animation:fade-in-slide-down-then-exit 6s ease normal forwards';
    } else {
        animation = 'animation:fade-in-slide-down 6s ease normal forwards';
    }
    const messageEl = document.createElement("div");
    messageEl.setAttribute("id", "current-info-message");
    messageEl.setAttribute("style", 'background-color:' + backgroundColor + ';' + position + animation);
    messageEl.setAttribute("class", 'info-message');
    messageEl.innerText = message;
    document.body.prepend(messageEl);
}

export function cancelCurrentToast () {
    const currentMessage = document.getElementById('current-info-message');
    if (currentMessage !== null) {
        currentMessage.remove();
    }
}
