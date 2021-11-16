export const toast = (message, type, positionAtTop = true) => {
    if (message && type) {
        buildAndInsertMessageElement(message, type, positionAtTop);
    }
};

function buildAndInsertMessageElement (message, type, positionAtTop) {
    cancelCurrentToast();
    let backgroundColor;
    const position = positionAtTop ? 'top:4rem;' : 'bottom: 35px;';
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
    const messageEl = document.createElement("div");
    messageEl.setAttribute("id", "current-info-message");
    messageEl.setAttribute("style", 'background-color:' + backgroundColor + ';' + position)
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
