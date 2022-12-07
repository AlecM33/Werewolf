import { toast } from './Toast.js';

export const Confirmation = (message, onYes) => {
    document.querySelector('#confirmation')?.remove();
    document.querySelector('#confirmation-background')?.remove();

    let confirmation = document.createElement('div');
    confirmation.setAttribute('id', 'confirmation');
    confirmation.innerHTML =
        `<div id="confirmation-message"></div>
         <div class="confirmation-buttons">
            <button id="confirmation-cancel-button" class="app-button cancel">Cancel</button>
            <button id="confirmation-yes-button" class="app-button">Yes</button>
        </div>`;

    confirmation.querySelector('#confirmation-message').innerText = message;

    let background = document.createElement('div');
    background.setAttribute('id', 'confirmation-background');

    const cancelHandler = () => {
        confirmation.remove();
        background.remove();
        confirmation = null;
        background = null;
    };

    const confirmHandler = () => {
        const button = confirmation.querySelector('#confirmation-yes-button');
        button.classList.add('disabled');
        button.innerText = '...';
        button.removeEventListener('click', confirmHandler);
        new Promise((resolve, reject) => {
            try {
                resolve(onYes());
            } catch (e) {
                reject(e);
            }
        }).then((res) => {
            if (res && typeof res === 'string') {
                toast(res, 'success', true, true, 'medium', false);
            }
            confirmation.remove();
            background.remove();
            confirmation = null;
            background = null;
        }).catch((e) => {
            if (typeof e === 'string') {
                toast(e, 'error', true, true, 'medium', false);
            }
            button.addEventListener('click', confirmHandler);
            button.classList.remove('disabled');
            button.innerText = 'Yes';
        });
    };

    confirmation.querySelector('#confirmation-cancel-button').addEventListener('click', cancelHandler);
    confirmation.querySelector('#confirmation-yes-button').addEventListener('click', confirmHandler);
    background.addEventListener('click', cancelHandler);

    document.body.appendChild(background);
    document.body.appendChild(confirmation);
};
