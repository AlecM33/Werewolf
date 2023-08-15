import { injectNavbar } from '../front_end_components/Navbar.js';
import { stateBucket } from '../game_state/StateBucket.js';
import { UserUtility } from '../utility/UserUtility.js';
import { toast } from '../front_end_components/Toast.js';
import { SharedStateUtil } from '../game_state/states/shared/SharedStateUtil.js';
import {
    EVENT_IDS,
    IN_PROGRESS_EVENTS,
    LOBBY_EVENTS,
    PRIMITIVES,
    SOCKET_EVENTS,
    STATUS,
    USER_TYPES
} from '../../config/globals.js';
import { HTMLFragments } from '../front_end_components/HTMLFragments.js';
import { Lobby } from '../game_state/states/Lobby.js';
import { InProgress } from '../game_state/states/InProgress.js';
import { Ended } from '../game_state/states/Ended.js';

export const gameHandler = (socket, window, gameDOM) => {
    document.body.innerHTML = gameDOM + document.body.innerHTML;
    injectNavbar();
    const connectionHandler = () => {
        if (stateBucket.timerWorker) {
            stateBucket.timerWorker.terminate();
            stateBucket.timerWorker = null;
        }
        syncWithGame(
            socket,
            UserUtility.validateAnonUserSignature(stateBucket.environment),
            window
        );
    };
    return new Promise((resolve, reject) => {
        window.fetch(
            '/api/games/environment',
            {
                method: 'GET',
                mode: 'cors'
            }
        ).catch(() => {
            reject(new Error('There was a problem connecting to the room.'));
        }).then((response) => {
            if (!response.ok && !(response.status === 304)) {
                reject(new Error('Could not connect to the room: HTTP ' + response.status + ': ' + response.statusText));
                return;
            }
            response.text().then((text) => {
                stateBucket.environment = text;
                if (socket.connected) {
                    connectionHandler();
                }
                socket.on('connect', () => {
                    connectionHandler();
                });
                socket.on('connect_error', (err) => {
                    toast(err, 'error', true, false);
                });

                socket.on('disconnect', () => {
                    toast('Disconnected. Attempting reconnect...', 'error', true, false);
                });
                setClientSocketHandlers(stateBucket, socket);
                resolve();
            });
        });
    });
};

function syncWithGame (socket, cookie, window) {
    const splitUrl = window.location.href.split('/game/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === PRIMITIVES.ACCESS_CODE_LENGTH) {
        socket.timeout(5000).emit(
            SOCKET_EVENTS.IN_GAME_MESSAGE,
            EVENT_IDS.FETCH_GAME_STATE,
            accessCode,
            { personId: cookie },
            (err, gameState) => {
                if (err) {
                    console.log(err);
                    retrySync(accessCode, socket, cookie);
                } else {
                    handleGameState(gameState, cookie, socket);
                }
            }
        );
    } else {
        window.location = '/not-found?reason=' + encodeURIComponent('invalid-access-code');
    }
}

function retrySync (accessCode, socket, cookie) {
    socket.emit(
        SOCKET_EVENTS.IN_GAME_MESSAGE,
        EVENT_IDS.FETCH_GAME_STATE,
        accessCode,
        { personId: cookie },
        (gameState) => {
            handleGameState(gameState, cookie, socket);
        }
    );
}

function handleGameState (gameState, cookie, socket) {
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
}

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

    SharedStateUtil.displayClientInfo(currentGameState, socket);

    switch (currentGameState.status) {
        case STATUS.LOBBY:
            const lobby = new Lobby('game-state-container', stateBucket, socket);
            if (refreshPrompt) {
                lobby.removeStartGameFunctionalityIfPresent();
            }
            lobby.populateHeader();
            lobby.populatePlayers();
            LOBBY_EVENTS().forEach(e => socket.removeAllListeners(e));
            lobby.setSocketHandlers();
            if (currentGameState.client.userType === USER_TYPES.MODERATOR
                || currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                if (refreshPrompt) {
                    lobby.displayStartGamePromptForModerators();
                }
                document.getElementById('player-options-prompt').innerHTML = HTMLFragments.PLAYER_OPTIONS_MODAL;
            } else {
                if (refreshPrompt) {
                    lobby.displayPlayerPrompt();
                }
            }
            break;
        case STATUS.IN_PROGRESS:
            if (refreshPrompt) {
                document.querySelector('#game-control-prompt')?.remove();
                document.querySelector('#leave-game-prompt')?.remove();
            }
            const inProgressGame = new InProgress('game-state-container', stateBucket, socket);
            IN_PROGRESS_EVENTS().forEach(e => socket.removeAllListeners(e));
            inProgressGame.setSocketHandlers();
            inProgressGame.setUserView(currentGameState.client.userType);
            break;
        case STATUS.ENDED: {
            const ended = new Ended('game-state-container', stateBucket, socket);
            ended.renderEndOfGame(currentGameState);
            break;
        }
        default:
            break;
    }

    SharedStateUtil.activateRoleInfoButton();
}

function setClientSocketHandlers (stateBucket, socket) {
    const commonGameStateAckFn = (gameState, socket) => {
        stateBucket.currentGameState = gameState;
        processGameState(
            stateBucket.currentGameState,
            gameState.client.cookie,
            socket,
            true,
            true
        );
    };
    const startGameStateAckFn = (gameState) => {
        commonGameStateAckFn(gameState, socket);
        toast('Game started!', 'success');
    };

    const restartGameStateAckFn = (gameState) => {
        commonGameStateAckFn(gameState, socket);
        toast('Everyone has returned to the Lobby!', 'success');
    };

    const fetchGameStateHandler = (ackFn) => {
        socket.emit(
            SOCKET_EVENTS.IN_GAME_MESSAGE,
            EVENT_IDS.FETCH_GAME_STATE,
            stateBucket.currentGameState.accessCode,
            { personId: stateBucket.currentGameState.client.cookie },
            ackFn
        );
    };

    socket.on(EVENT_IDS.START_GAME, () => { fetchGameStateHandler(startGameStateAckFn); });

    socket.on(EVENT_IDS.RESTART_GAME, () => { fetchGameStateHandler(restartGameStateAckFn); });

    socket.on(EVENT_IDS.SYNC_GAME_STATE, () => {
        socket.emit(
            SOCKET_EVENTS.IN_GAME_MESSAGE,
            EVENT_IDS.FETCH_GAME_STATE,
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

    socket.on(EVENT_IDS.CHANGE_NAME, (changedId, newName) => {
        const person = stateBucket.currentGameState.people.find(person => person.id === changedId);
        if (person) {
            person.name = newName;
            if (stateBucket.currentGameState.client.id === changedId) {
                stateBucket.currentGameState.client.name = newName;
                SharedStateUtil.displayClientInfo(stateBucket.currentGameState, socket);
            }
            document.querySelectorAll('[data-pointer="' + person.id + '"]').forEach((node) => {
                node.querySelector('.person-name-element').innerText = newName;
            });
        }
    });

    socket.on(EVENT_IDS.END_GAME, (people) => {
        stateBucket.currentGameState.people = people;
        stateBucket.currentGameState.status = STATUS.ENDED;
        processGameState(
            stateBucket.currentGameState,
            stateBucket.currentGameState.client.cookie,
            socket,
            true,
            true
        );
    });
}
