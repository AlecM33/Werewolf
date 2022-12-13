import { injectNavbar } from '../front_end_components/Navbar.js';
import { stateBucket } from '../game_state/StateBucket.js';
import { UserUtility } from '../utility/UserUtility.js';
import { toast } from '../front_end_components/Toast.js';
import { globals } from '../../config/globals.js';
import { HTMLFragments } from '../front_end_components/HTMLFragments.js';
import { ModalManager } from '../front_end_components/ModalManager.js';
import { Lobby } from '../game_state/states/Lobby.js';
import { InProgress } from '../game_state/states/InProgress.js';
import { Ended } from '../game_state/states/Ended.js';

export const gameHandler = async (socket, XHRUtility, window, gameDOM) => {
    document.body.innerHTML = gameDOM + document.body.innerHTML;
    injectNavbar();

    const response = await XHRUtility.xhr(
        '/api/games/environment',
        'GET',
        null,
        null
    ).catch((res) => {
        toast(res.content, 'error', true);
    });

    stateBucket.environment = response.content;

    socket.on('connect', function () {
        syncWithGame(
            stateBucket,
            socket,
            UserUtility.validateAnonUserSignature(response.content),
            window
        );
    });

    socket.on('connect_error', (err) => {
        toast(err, 'error', true, false);
    });

    socket.on('disconnect', () => {
        toast('Disconnected. Attempting reconnect...', 'error', true, false);
    });

    setClientSocketHandlers(stateBucket, socket);
};

function syncWithGame (stateBucket, socket, cookie, window) {
    const splitUrl = window.location.href.split('/game/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
        socket.emit(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, globals.EVENT_IDS.FETCH_GAME_STATE, accessCode, { personId: cookie }, function (gameState) {
            if (gameState === null) {
                window.location = '/not-found?reason=' + encodeURIComponent('game-not-found');
            } else {
                stateBucket.currentGameState = gameState;
                document.querySelector('.spinner-container')?.remove();
                document.querySelector('.spinner-background')?.remove();
                document.getElementById('game-content').innerHTML = HTMLFragments.INITIAL_GAME_DOM;
                toast('You are connected.', 'success', true, true, 'short');
                processGameState(stateBucket.currentGameState, cookie, socket, true, true);
            }
        });
    } else {
        window.location = '/not-found?reason=' + encodeURIComponent('invalid-access-code');
    }
}

function processGameState (
    currentGameState,
    userId,
    socket,
    refreshPrompt = true,
    animateContainer = false
) {
    const containerAnimation = document.getElementById('game-state-container').animate(
        [
            { opacity: '0', transform: 'translateY(10px)' },
            { opacity: '1', transform: 'translateY(0px)' }
        ], {
            duration: 500,
            easing: 'ease-in-out',
            fill: 'both'
        });
    if (animateContainer) {
        containerAnimation.play();
    }

    displayClientInfo(currentGameState.client.name, currentGameState.client.userType);

    switch (currentGameState.status) {
        case globals.STATUS.LOBBY:
            const lobby = new Lobby('game-state-container', stateBucket, socket);
            if (refreshPrompt) {
                lobby.removeStartGameFunctionalityIfPresent();
            }
            lobby.populateHeader();
            lobby.populatePlayers();
            lobby.setSocketHandlers();
            if ((
                currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                    || currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            )
                && refreshPrompt
            ) {
                lobby.displayStartGamePromptForModerators();
            }
            break;
        case globals.STATUS.IN_PROGRESS:
            if (refreshPrompt) {
                document.querySelector('#end-game-prompt')?.remove();
            }
            const inProgressGame = new InProgress('game-state-container', stateBucket, socket);
            inProgressGame.setSocketHandlers();
            inProgressGame.setUserView(currentGameState.client.userType);
            break;
        case globals.STATUS.ENDED: {
            const ended = new Ended('game-state-container', stateBucket, socket);
            ended.renderEndOfGame(currentGameState);
            break;
        }
        default:
            break;
    }

    activateRoleInfoButton(stateBucket.currentGameState.deck);
}

function activateRoleInfoButton (deck) {
    deck.sort((a, b) => {
        return a.team === globals.ALIGNMENT.GOOD ? -1 : 1;
    });
    document.getElementById('role-info-button').addEventListener('click', (e) => {
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

            if (card.team === globals.ALIGNMENT.GOOD) {
                roleName.classList.add(globals.ALIGNMENT.GOOD);
            } else {
                roleName.classList.add(globals.ALIGNMENT.EVIL);
            }

            roleNameDiv.appendChild(roleQuantity);
            roleNameDiv.appendChild(roleName);

            roleDiv.appendChild(roleNameDiv);
            roleDiv.appendChild(roleDescription);

            modalContent.appendChild(roleDiv);
        }
        ModalManager.displayModal('role-info-modal', 'role-info-modal-background', 'close-role-info-modal-button');
    });
}

function displayClientInfo (name, userType) {
    document.getElementById('client-name').innerText = name;
    document.getElementById('client-user-type').innerText = userType;
    document.getElementById('client-user-type').innerText += globals.USER_TYPE_ICONS[userType];
}

// Should be reserved for socket events not specific to any one game state (Lobby, In Progress, etc.)
function setClientSocketHandlers (stateBucket, socket) {
    socket.on(globals.EVENT_IDS.START_GAME, () => {
        socket.emit(
            globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
            globals.EVENT_IDS.FETCH_GAME_STATE,
            stateBucket.currentGameState.accessCode,
            { personId: stateBucket.currentGameState.client.cookie },
            function (gameState) {
                stateBucket.currentGameState = gameState;
                processGameState(
                    stateBucket.currentGameState,
                    gameState.client.cookie,
                    socket,
                    true,
                    true
                );
            }
        );
    });

    socket.on(globals.EVENT_IDS.SYNC_GAME_STATE, () => {
        socket.emit(
            globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
            globals.EVENT_IDS.FETCH_GAME_STATE,
            stateBucket.currentGameState.accessCode,
            { personId: stateBucket.currentGameState.client.cookie },
            function (gameState) {
                stateBucket.currentGameState = gameState;
                processGameState(
                    stateBucket.currentGameState,
                    gameState.client.cookie,
                    socket,
                    true,
                    true
                );
            }
        );
    });

    socket.on(globals.COMMANDS.END_GAME, (people) => {
        stateBucket.currentGameState.people = people;
        stateBucket.currentGameState.status = globals.STATUS.ENDED;
        processGameState(
            stateBucket.currentGameState,
            stateBucket.currentGameState.client.cookie,
            socket,
            true,
            true
        );
    });
}
