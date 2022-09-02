import { injectNavbar } from '../front_end_components/Navbar.js';
import { stateBucket } from '../game_state/StateBucket.js';
import { GameTimerManager } from '../timer/GameTimerManager.js';
import { GameStateRenderer } from '../game_state/GameStateRenderer.js';
import { UserUtility } from '../utility/UserUtility.js';
import { toast } from '../front_end_components/Toast.js';
import { globals } from '../../config/globals.js';
import { HTMLFragments } from '../front_end_components/HTMLFragments.js';
import { ModalManager } from '../front_end_components/ModalManager.js';

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
    const timerWorker = new Worker(new URL('../timer/Timer.js', import.meta.url));
    const gameTimerManager = new GameTimerManager(stateBucket, socket);
    const gameStateRenderer = new GameStateRenderer(stateBucket, socket);

    socket.on('connect', function () {
        syncWithGame(
            stateBucket,
            gameTimerManager,
            gameStateRenderer,
            timerWorker,
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

    setClientSocketHandlers(stateBucket, gameStateRenderer, socket, timerWorker, gameTimerManager);
};

function syncWithGame (stateBucket, gameTimerManager, gameStateRenderer, timerWorker, socket, cookie, window) {
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
                processGameState(stateBucket.currentGameState, cookie, socket, gameStateRenderer, gameTimerManager, timerWorker, true, true);
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
    gameStateRenderer,
    gameTimerManager,
    timerWorker,
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
    if (refreshPrompt) {
        removeStartGameFunctionalityIfPresent(gameStateRenderer);
        document.querySelector('#end-game-prompt')?.remove();
    }
    switch (currentGameState.status) {
        case globals.STATUS.LOBBY:
            document.getElementById('game-state-container').innerHTML = HTMLFragments.LOBBY;
            gameStateRenderer.renderLobbyHeader();
            gameStateRenderer.renderLobbyPlayers();
            if ((
                currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                    || currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            )
                && refreshPrompt
            ) {
                displayStartGamePromptForModerators(currentGameState, gameStateRenderer);
            }
            break;
        case globals.STATUS.IN_PROGRESS:
            gameStateRenderer.renderGameHeader();
            switch (currentGameState.client.userType) {
                case globals.USER_TYPES.PLAYER:
                    document.getElementById('game-state-container').innerHTML = HTMLFragments.PLAYER_GAME_VIEW;
                    gameStateRenderer.renderPlayerView();
                    break;
                case globals.USER_TYPES.KILLED_PLAYER:

                    document.getElementById('game-state-container').innerHTML = HTMLFragments.PLAYER_GAME_VIEW;
                    gameStateRenderer.renderPlayerView(true);
                    break;
                case globals.USER_TYPES.MODERATOR:
                    document.getElementById('transfer-mod-prompt').innerHTML = HTMLFragments.TRANSFER_MOD_MODAL;
                    document.getElementById('game-state-container').innerHTML = HTMLFragments.MODERATOR_GAME_VIEW;
                    gameStateRenderer.renderModeratorView();
                    break;
                case globals.USER_TYPES.TEMPORARY_MODERATOR:
                    document.getElementById('transfer-mod-prompt').innerHTML = HTMLFragments.TRANSFER_MOD_MODAL;
                    document.getElementById('game-state-container').innerHTML = HTMLFragments.TEMP_MOD_GAME_VIEW;
                    gameStateRenderer.renderTempModView();
                    break;
                case globals.USER_TYPES.SPECTATOR:
                    document.getElementById('game-state-container').innerHTML = HTMLFragments.SPECTATOR_GAME_VIEW;
                    gameStateRenderer.renderSpectatorView();
                    break;
                default:
                    break;
            }
            if (currentGameState.timerParams) {
                socket.emit(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, globals.EVENT_IDS.GET_TIME_REMAINING, currentGameState.accessCode);
            } else {
                document.querySelector('#game-timer')?.remove();
                document.querySelector('#timer-container-moderator')?.remove();
                document.querySelector('label[for="game-timer"]')?.remove();
            }
            break;
        case globals.STATUS.ENDED: {
            const container = document.getElementById('game-state-container');
            container.innerHTML = HTMLFragments.END_OF_GAME_VIEW;
            gameStateRenderer.renderEndOfGame(currentGameState);
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

function setClientSocketHandlers (stateBucket, gameStateRenderer, socket, timerWorker, gameTimerManager) {
    socket.on(globals.EVENT_IDS.PLAYER_JOINED, (player, gameIsFull) => {
        toast(player.name + ' joined!', 'success', false, true, 'short');
        stateBucket.currentGameState.people.push(player);
        stateBucket.currentGameState.isFull = gameIsFull;
        gameStateRenderer.renderLobbyPlayers();
        if ((
            stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
            || stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        )
        ) {
            displayStartGamePromptForModerators(stateBucket.currentGameState, gameStateRenderer);
        }
    });

    socket.on(globals.EVENT_IDS.NEW_SPECTATOR, (spectator) => {
        stateBucket.currentGameState.spectators.push(spectator);
    });

    socket.on(globals.EVENT_IDS.PLAYER_LEFT, (player) => {
        removeStartGameFunctionalityIfPresent(gameStateRenderer);
        toast(player.name + ' has left!', 'error', false, true, 'short');
        const index = stateBucket.currentGameState.people.findIndex(person => person.id === player.id);
        if (index >= 0) {
            stateBucket.currentGameState.people.splice(
                index,
                1
            );
            gameStateRenderer.renderLobbyPlayers();
        }
    });

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
                    gameStateRenderer,
                    gameTimerManager,
                    timerWorker,
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
                    gameStateRenderer,
                    gameTimerManager,
                    timerWorker,
                    true,
                    true
                );
            }
        );
    });

    if (timerWorker && gameTimerManager) {
        gameTimerManager.attachTimerSocketListeners(socket, timerWorker, gameStateRenderer);
    }

    socket.on(globals.EVENT_IDS.KILL_PLAYER, (id) => {
        const killedPerson = stateBucket.currentGameState.people.find((person) => person.id === id);
        if (killedPerson) {
            killedPerson.out = true;
            if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
                toast(killedPerson.name + ' killed.', 'success', true, true, 'medium');
                gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo(stateBucket.currentGameState.status === globals.STATUS.ENDED);
            } else {
                if (killedPerson.id === stateBucket.currentGameState.client.id) {
                    const clientUserType = document.getElementById('client-user-type');
                    if (clientUserType) {
                        clientUserType.innerText = globals.USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80';
                    }
                    gameStateRenderer.updatePlayerCardToKilledState();
                    toast('You have been killed!', 'warning', true, true, 'medium');
                } else {
                    toast(killedPerson.name + ' was killed!', 'warning', true, true, 'medium');
                }
                if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    gameStateRenderer.removePlayerListEventListeners(false);
                } else {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                }
            }
        }
    });

    socket.on(globals.EVENT_IDS.REVEAL_PLAYER, (revealData) => {
        const revealedPerson = stateBucket.currentGameState.people.find((person) => person.id === revealData.id);
        if (revealedPerson) {
            revealedPerson.revealed = true;
            revealedPerson.gameRole = revealData.gameRole;
            revealedPerson.alignment = revealData.alignment;
            if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
                toast(revealedPerson.name + ' revealed.', 'success', true, true, 'medium');
                gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo(stateBucket.currentGameState.status === globals.STATUS.ENDED);
            } else {
                if (revealedPerson.id === stateBucket.currentGameState.client.id) {
                    toast('Your role has been revealed!', 'warning', true, true, 'medium');
                } else {
                    toast(revealedPerson.name + ' was revealed as a ' + revealedPerson.gameRole + '!', 'warning', true, true, 'medium');
                }
                if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                } else {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                }
            }
        }
    });

    socket.on(globals.EVENT_IDS.CHANGE_NAME, (personId, name) => {
        propagateNameChange(stateBucket.currentGameState, name, personId);
        updateDOMWithNameChange(stateBucket.currentGameState, gameStateRenderer);
        processGameState(
            stateBucket.currentGameState,
            stateBucket.currentGameState.client.cookie,
            socket,
            gameStateRenderer,
            gameTimerManager,
            timerWorker,
            false,
            false
        );
    });

    socket.on(globals.COMMANDS.END_GAME, (people) => {
        stateBucket.currentGameState.people = people;
        stateBucket.currentGameState.status = globals.STATUS.ENDED;
        processGameState(
            stateBucket.currentGameState,
            stateBucket.currentGameState.client.cookie,
            socket,
            gameStateRenderer,
            gameTimerManager,
            timerWorker,
            true,
            true
        );
    });
}

function displayStartGamePromptForModerators (gameState, gameStateRenderer) {
    const existingPrompt = document.getElementById('start-game-prompt');
    if (existingPrompt) {
        enableOrDisableStartButton(gameState, existingPrompt, gameStateRenderer.startGameHandler);
    } else {
        const newPrompt = document.createElement('div');
        newPrompt.setAttribute('id', 'start-game-prompt');
        newPrompt.innerHTML = HTMLFragments.START_GAME_PROMPT;

        document.body.appendChild(newPrompt);
        enableOrDisableStartButton(gameState, newPrompt, gameStateRenderer.startGameHandler);
    }
}

function enableOrDisableStartButton (gameState, buttonContainer, handler) {
    if (gameState.isFull) {
        buttonContainer.querySelector('#start-game-button').addEventListener('click', handler);
        buttonContainer.querySelector('#start-game-button').classList.remove('disabled');
    } else {
        buttonContainer.querySelector('#start-game-button').removeEventListener('click', handler);
        buttonContainer.querySelector('#start-game-button').classList.add('disabled');
    }
}

function removeStartGameFunctionalityIfPresent (gameStateRenderer) {
    document.querySelector('#start-game-prompt')?.removeEventListener('click', gameStateRenderer.startGameHandler);
    document.querySelector('#start-game-prompt')?.remove();
}

function propagateNameChange (gameState, name, personId) {
    if (gameState.client.id === personId) {
        gameState.client.name = name;
    }
    const matchingPerson = gameState.people.find((person) => person.id === personId);
    if (matchingPerson) {
        matchingPerson.name = name;
    }

    if (gameState.moderator.id === personId) {
        gameState.moderator.name = name;
    }

    const matchingSpectator = gameState.spectators?.find((spectator) => spectator.id === personId);
    if (matchingSpectator) {
        matchingSpectator.name = name;
    }
}

function updateDOMWithNameChange (gameState, gameStateRenderer) {
    if (gameState.status === globals.STATUS.IN_PROGRESS) {
        switch (gameState.client.userType) {
            case globals.USER_TYPES.PLAYER:
            case globals.USER_TYPES.KILLED_PLAYER:
            case globals.USER_TYPES.SPECTATOR:
                gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                break;
            case globals.USER_TYPES.MODERATOR:
                gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo(gameState.status === globals.STATUS.ENDED);
                break;
            case globals.USER_TYPES.TEMPORARY_MODERATOR:
                gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                break;
            default:
                break;
        }
    } else {
        gameStateRenderer.renderLobbyPlayers();
    }
}
