import { UserUtility } from '../../../utility/UserUtility.js';
import {
    STATUS,
    EVENT_IDS,
    ENVIRONMENTS,
    SOCKET_EVENTS,
    USER_TYPE_ICONS,
    USER_TYPES,
    ALIGNMENT
} from '../../../../config/globals.js';
import { toast } from '../../../front_end_components/Toast.js';
import { Confirmation } from '../../../front_end_components/Confirmation.js';
import { stateBucket } from '../../StateBucket.js';
import { HTMLFragments } from '../../../front_end_components/HTMLFragments.js';
import { ModalManager } from '../../../front_end_components/ModalManager.js';

// This constant is meant to house logic that is utilized by more than one game state
export const SharedStateUtil = {

    restartHandler: (stateBucket, status = STATUS.IN_PROGRESS) => {
        fetch(
            '/api/games/' + stateBucket.currentGameState.accessCode + '/restart',
            {
                method: 'PATCH',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerName: stateBucket.currentGameState.client.name,
                    accessCode: stateBucket.currentGameState.accessCode,
                    sessionCookie: UserUtility.validateAnonUserSignature(ENVIRONMENTS.LOCAL),
                    localCookie: UserUtility.validateAnonUserSignature(ENVIRONMENTS.PRODUCTION)
                })
            }
        ).catch((res) => {
            toast(res.content, 'error', true, true, 'medium');
        });
        toast('Resetting to Lobby...', 'neutral', true, false);
    },

    createReturnToLobbyButton: (stateBucket) => {
        const returnToLobbyButton = document.createElement('button');
        returnToLobbyButton.classList.add('app-button');
        returnToLobbyButton.setAttribute('id', 'return-to-lobby-button');
        returnToLobbyButton.innerText = 'Reset to Lobby';
        returnToLobbyButton.addEventListener('click', () => {
            Confirmation('Return everyone to the Lobby?', () => {
                SharedStateUtil.restartHandler(stateBucket, STATUS.LOBBY);
            });
        });

        return returnToLobbyButton;
    },

    addPlayerOptions: (personEl, person, socket, gameState) => {
        const optionsButton = document.createElement('img');
        const optionsHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                document.querySelector('#player-options-modal-title').innerText = person.name + USER_TYPE_ICONS[person.userType];
                document.getElementById('player-options-modal-content').innerHTML = '';
                const kickOption = document.createElement('button');
                kickOption.setAttribute('class', 'player-option');
                kickOption.innerText = 'Kick Person';
                kickOption.addEventListener('click', () => {
                    ModalManager.dispelModal('player-options-modal', 'player-options-modal-background');
                    Confirmation('Kick \'' + person.name + '\'?', () => {
                        socket.emit(
                            SOCKET_EVENTS.IN_GAME_MESSAGE,
                            EVENT_IDS.KICK_PERSON,
                            gameState.accessCode,
                            { personId: person.id }
                        );
                    });
                });
                document.getElementById('player-options-modal-content').appendChild(kickOption);
                ModalManager.displayModal(
                    'player-options-modal',
                    'player-options-modal-background',
                    'close-player-options-modal-button'
                );
            }
        };

        optionsButton.addEventListener('click', optionsHandler);
        optionsButton.addEventListener('keyup', optionsHandler);
        optionsButton.setAttribute('tabIndex', '0');
        optionsButton.setAttribute('className', 'role-remove');
        optionsButton.setAttribute('src', '../images/3-vertical-dots-icon.svg');
        optionsButton.setAttribute('title', 'Player Options');
        optionsButton.setAttribute('alt', 'Player Options');

        personEl.appendChild(optionsButton);
    },

    buildSpectatorList (people, client, socket, gameState) {
        const list = document.createElement('div');
        const spectators = people.filter(p => p.userType === USER_TYPES.SPECTATOR);
        if (spectators.length === 0) {
            list.innerHTML = '<div>Nobody currently spectating.</div>';
        } else {
            for (const spectator of spectators) {
                const spectatorEl = document.createElement('div');
                spectatorEl.dataset.pointer = spectator.id;
                spectatorEl.classList.add('spectator');
                spectatorEl.innerHTML = '<div class=\'spectator-name person-name-element\'></div>' +
                    '<div>' + 'spectator' + USER_TYPE_ICONS.spectator + '</div>';
                spectatorEl.querySelector('.spectator-name').innerText = spectator.name;
                list.appendChild(spectatorEl);

                if (client.userType === USER_TYPES.MODERATOR || client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                    this.addPlayerOptions(spectatorEl, spectator, socket, gameState);
                    spectatorEl.dataset.pointer = spectator.id;
                }
            }
        }

        return list;
    },

    setNumberOfSpectators: (number, el) => {
        el.innerText = '+ ' + (number === 1
            ? number + ' Spectator'
            : number + ' Spectators');
    },

    displayCurrentModerator: (moderator) => {
        document.getElementById('current-moderator').dataset.pointer = moderator.id;
        document.getElementById('current-moderator-name').innerText = moderator.name;
        document.getElementById('current-moderator-type').innerText = moderator.userType + USER_TYPE_ICONS[moderator.userType];
    },

    returnHumanReadableTime: (milliseconds, tenthsOfSeconds = false) => {
        const tenths = Math.floor((milliseconds / 100) % 10);
        let seconds = Math.floor((milliseconds / 1000) % 60);
        let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
        let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        return tenthsOfSeconds
            ? hours + ':' + minutes + ':' + seconds + '.' + tenths
            : hours + ':' + minutes + ':' + seconds;
    },

    activateRoleInfoButton: () => {
        document.getElementById('role-info-button').addEventListener('click', (e) => {
            const deck = stateBucket.currentGameState.deck;
            deck.sort((a, b) => {
                return a.team === ALIGNMENT.GOOD ? -1 : 1;
            });
            e.preventDefault();
            document.getElementById('role-info-prompt').innerHTML = HTMLFragments.ROLE_INFO_MODAL;
            const modalContent = document.getElementById('game-role-info-container');
            for (const card of deck) {
                const roleDiv = document.createElement('div');
                const roleNameDiv = document.createElement('div');

                roleNameDiv.classList.add('role-info-name');

                const roleName = document.createElement('h5');
                const roleQuantity = document.createElement('h5');
                const roleDescription = document.createElement('p');

                roleDescription.innerText = card.description;
                roleName.innerText = card.role;
                roleQuantity.innerText = card.quantity + 'x';

                if (card.team === ALIGNMENT.GOOD) {
                    roleName.classList.add(ALIGNMENT.GOOD);
                } else {
                    roleName.classList.add(ALIGNMENT.EVIL);
                }

                roleNameDiv.appendChild(roleQuantity);
                roleNameDiv.appendChild(roleName);

                roleDiv.appendChild(roleNameDiv);
                roleDiv.appendChild(roleDescription);

                modalContent.appendChild(roleDiv);
            }
            ModalManager.displayModal('role-info-modal', 'role-info-modal-background', 'close-role-info-modal-button');
        });
    },

    displayClientInfo: (gameState, socket) => {
        document.getElementById('client-name').innerText = gameState.client.name;
        document.getElementById('client-user-type').innerText = gameState.client.userType;
        document.getElementById('client-user-type').innerText += USER_TYPE_ICONS[gameState.client.userType];
        const nameForm = document.createElement('form');
        nameForm.setAttribute('id', 'name-change-form');
        nameForm.onsubmit = (e) => {
            e.preventDefault();
            document.getElementById('confirmation-yes-button').click();
        };
        nameForm.innerHTML = HTMLFragments.NAME_CHANGE_FORM;
        nameForm.querySelector('#client-new-name').value = gameState.client.name;
        document.getElementById('edit-name-button').addEventListener('click', () => {
            Confirmation(nameForm, () => {
                socket.emit(
                    SOCKET_EVENTS.IN_GAME_MESSAGE,
                    EVENT_IDS.CHANGE_NAME,
                    gameState.accessCode,
                    { personId: gameState.client.id, newName: document.getElementById('client-new-name').value },
                    (response) => {
                        toast(response.message, response.errorFlag === 1 ? 'error' : 'success', true);
                    }
                );
            }, true, 'Update');
        });
    }
};
