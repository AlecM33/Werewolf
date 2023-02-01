import { XHRUtility } from '../../../utility/XHRUtility.js';
import { UserUtility } from '../../../utility/UserUtility.js';
import { globals } from '../../../../config/globals.js';
import { toast } from '../../../front_end_components/Toast.js';
import { Confirmation } from '../../../front_end_components/Confirmation.js';
import { Lobby } from '../Lobby.js';
import { stateBucket } from '../../StateBucket.js';
import { InProgress } from '../InProgress.js';
import { Ended } from '../Ended.js';
import { HTMLFragments } from '../../../front_end_components/HTMLFragments.js';
import { ModalManager } from '../../../front_end_components/ModalManager.js';

// This constant is meant to house logic that is utilized by more than one game state
export const SharedStateUtil = {
    gameStateAckFn: (gameState, socket) => {
        stateBucket.currentGameState = gameState;
        processGameState(
            stateBucket.currentGameState,
            gameState.client.cookie,
            socket,
            true,
            true
        );
    },

    restartHandler: (stateBucket) => {
        XHRUtility.xhr(
            '/api/games/' + stateBucket.currentGameState.accessCode + '/restart',
            'PATCH',
            null,
            JSON.stringify({
                playerName: stateBucket.currentGameState.client.name,
                accessCode: stateBucket.currentGameState.accessCode,
                sessionCookie: UserUtility.validateAnonUserSignature(globals.ENVIRONMENT.LOCAL),
                localCookie: UserUtility.validateAnonUserSignature(globals.ENVIRONMENT.PRODUCTION)
            })
        )
            .then((res) => {})
            .catch((res) => {
                toast(res.content, 'error', true, true, 'medium');
            });
    },

    createRestartButton: (stateBucket) => {
        const restartGameButton = document.createElement('button');
        restartGameButton.classList.add('app-button');
        restartGameButton.setAttribute('id', 'restart-game-button');
        restartGameButton.innerText = 'Restart';
        restartGameButton.addEventListener('click', () => {
            Confirmation('Restart the game, dealing everyone new roles?', () => {
                SharedStateUtil.restartHandler(stateBucket);
            });
        });

        return restartGameButton;
    },

    setClientSocketHandlers: (stateBucket, socket) => {
        const startGameStateAckFn = (gameState) => {
            SharedStateUtil.gameStateAckFn(gameState, socket);
            toast('Game started!', 'success');
        };

        const restartGameStateAckFn = (gameState) => {
            SharedStateUtil.gameStateAckFn(gameState, socket);
            toast('Game restarted!', 'success');
        };

        const fetchGameStateHandler = (ackFn) => {
            socket.emit(
                globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                globals.EVENT_IDS.FETCH_GAME_STATE,
                stateBucket.currentGameState.accessCode,
                { personId: stateBucket.currentGameState.client.cookie },
                ackFn
            );
        };

        socket.on(globals.EVENT_IDS.START_GAME, () => { fetchGameStateHandler(startGameStateAckFn); });

        socket.on(globals.EVENT_IDS.RESTART_GAME, () => { fetchGameStateHandler(restartGameStateAckFn); });

        socket.on(globals.EVENT_IDS.SYNC_GAME_STATE, () => {
            socket.emit(
                globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                globals.EVENT_IDS.FETCH_GAME_STATE,
                stateBucket.currentGameState.accessCode,
                { personId: stateBucket.currentGameState.client.cookie },
                function (gameState) {
                    const oldUserType = stateBucket.currentGameState.client.userType;
                    stateBucket.currentGameState = gameState;
                    processGameState(
                        stateBucket.currentGameState,
                        gameState.client.cookie,
                        socket,
                        true,
                        gameState.client.userType !== oldUserType
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
    },

    syncWithGame: (socket, cookie, window) => {
        const splitUrl = window.location.href.split('/game/');
        const accessCode = splitUrl[1];
        if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
            socket.timeout(5000).emit(
                globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                globals.EVENT_IDS.FETCH_GAME_STATE,
                accessCode,
                { personId: cookie },
                (err, gameState) => {
                    if (err) {
                        SharedStateUtil.retrySync(accessCode, socket, cookie)
                    } else {
                        SharedStateUtil.handleGameState(gameState, cookie, socket);
                    }
                }
            );
        } else {
            window.location = '/not-found?reason=' + encodeURIComponent('invalid-access-code');
        }
    },

    retrySync: (accessCode, socket, cookie) => {
        socket.emit(
            globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
            globals.EVENT_IDS.FETCH_GAME_STATE,
            accessCode,
            { personId: cookie },
            (gameState) => {
                SharedStateUtil.handleGameState(gameState, cookie, socket);
            }
        );
    },

    handleGameState: (gameState, cookie, socket) => {
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
    },

    buildSpectatorList (people) {
        const list = document.createElement('div');
        const spectators = people.filter(p => p.userType === globals.USER_TYPES.SPECTATOR);
        if (spectators.length === 0) {
            list.innerHTML = '<div>Nobody currently spectating.</div>';
        } else {
            for (const spectator of spectators) {
                const spectatorEl = document.createElement('div');
                spectatorEl.classList.add('spectator');
                spectatorEl.innerHTML = '<div class=\'spectator-name\'></div>' +
                    '<div>' + 'spectator' + globals.USER_TYPE_ICONS.spectator + '</div>';
                spectatorEl.querySelector('.spectator-name').innerText = spectator.name;
                list.appendChild(spectatorEl);
            }
        }

        return list;
    },

    setNumberOfSpectators: (number, el) => {
        el.innerText = '+ ' + (number === 1
            ? number + ' Spectator'
            : number + ' Spectators');
    }
};

function processGameState (
    currentGameState,
    userId,
    socket,
    refreshPrompt = true,
    animateContainer = false
) {
    if (animateContainer) {
        document.getElementById('game-state-container').animate(
            [
                { opacity: '0', transform: 'translateY(10px)' },
                { opacity: '1', transform: 'translateY(0px)' }
            ], {
                duration: 500,
                easing: 'ease-in-out',
                fill: 'both'
            });
        document.getElementById('client-container').animate([
            { opacity: '0' },
            { opacity: '1' }
        ], {
            duration: 500,
            easing: 'ease-out',
            fill: 'both'
        });
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
            globals.LOBBY_EVENTS().forEach(e => socket.removeAllListeners(e));
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
                document.querySelector('#game-control-prompt')?.remove();
            }
            const inProgressGame = new InProgress('game-state-container', stateBucket, socket);
            globals.IN_PROGRESS_EVENTS().forEach(e => socket.removeAllListeners(e));
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
