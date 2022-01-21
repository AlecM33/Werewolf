import { UserUtility } from '../modules/UserUtility.js';
import { globals } from '../config/globals.js';
import { templates } from '../modules/Templates.js';
import { GameStateRenderer } from '../modules/GameStateRenderer.js';
import { toast } from '../modules/Toast.js';
import { GameTimerManager } from '../modules/GameTimerManager.js';
import { ModalManager } from '../modules/ModalManager.js';
import { stateBucket } from '../modules/StateBucket.js';
import { io } from 'socket.io-client';
import { injectNavbar } from '../modules/Navbar.js';
import { XHRUtility } from '../modules/XHRUtility.js';

const game = () => {
    injectNavbar();
    XHRUtility.xhr(
        '/api/games/environment',
        'GET',
        null,
        null
    )
        .then((res) => {
            stateBucket.environment = res.content;
            const socket = io('/in-game');
            const timerWorker = new Worker(new URL('../modules/Timer.js', import.meta.url));
            const gameTimerManager = new GameTimerManager(stateBucket, socket);
            const gameStateRenderer = new GameStateRenderer(stateBucket, socket);
            socket.on('connect', () => {
                syncWithGame(
                    stateBucket,
                    gameTimerManager,
                    gameStateRenderer,
                    timerWorker,
                    socket,
                    UserUtility.validateAnonUserSignature(res.content)
                );
            });
            socket.on('disconnect', () => {
                toast('Disconnected. Attempting reconnect...', 'error', true, false);
            });
            setClientSocketHandlers(stateBucket, gameStateRenderer, socket, timerWorker, gameTimerManager);
        }).catch((res) => {
            toast(res.content, 'error', true);
        });
};

function syncWithGame (stateBucket, gameTimerManager, gameStateRenderer, timerWorker, socket, cookie) {
    const splitUrl = window.location.href.split('/game/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
        socket.emit(globals.COMMANDS.FETCH_GAME_STATE, accessCode, cookie, function (gameState) {
            cookie = gameState.client.cookie;
            UserUtility.setAnonymousUserId(cookie, stateBucket.environment);
            stateBucket.currentGameState = gameState;
            document.querySelector('.spinner-container')?.remove();
            document.querySelector('.spinner-background')?.remove();
            document.getElementById('game-content').innerHTML = templates.INITIAL_GAME_DOM;
            toast('You are connected.', 'success', true, true, 2);
            processGameState(stateBucket.currentGameState, cookie, socket, gameStateRenderer, gameTimerManager, timerWorker);
            if (!gameState.client.hasEnteredName) {
                document.getElementById('prompt').innerHTML = templates.NAME_CHANGE_MODAL;
                document.getElementById('change-name-form').onsubmit = (e) => {
                    e.preventDefault();
                    const name = document.getElementById('player-new-name').value;
                    if (validateName(name)) {
                        socket.emit(globals.COMMANDS.CHANGE_NAME, gameState.accessCode, {
                            name: name,
                            personId: gameState.client.id
                        }, (result) => {
                            switch (result) {
                                case 'taken':
                                    toast('This name is already taken.', 'error', true, true, 8);
                                    break;
                                case 'changed':
                                    ModalManager.dispelModal('change-name-modal', 'change-name-modal-background');
                                    toast('Name set.', 'success', true, true, 5);
                                    propagateNameChange(stateBucket.currentGameState, name, stateBucket.currentGameState.client.id);
                                    processGameState(stateBucket.currentGameState, cookie, socket, gameStateRenderer, gameTimerManager, timerWorker);
                            }
                        });
                    } else {
                        toast('Name must be between 1 and 30 characters.', 'error', true, true, 8);
                    }
                };
            }
        });
    } else {
        window.location = '/not-found?reason=' + encodeURIComponent('invalid-access-code');
    }
}

function processGameState (currentGameState, userId, socket, gameStateRenderer, gameTimerManager, timerWorker, refreshPrompt = true) {
    displayClientInfo(currentGameState.client.name, currentGameState.client.userType);
    if (refreshPrompt) {
        removeStartGameFunctionalityIfPresent(gameStateRenderer);
        document.querySelector('#end-game-prompt')?.remove();
    }
    switch (currentGameState.status) {
        case globals.STATUS.LOBBY:
            document.getElementById('game-state-container').innerHTML = templates.LOBBY;
            gameStateRenderer.renderLobbyHeader();
            gameStateRenderer.renderLobbyPlayers();
            if (
                currentGameState.isFull
                && (
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
                    document.getElementById('game-state-container').innerHTML = templates.PLAYER_GAME_VIEW;
                    gameStateRenderer.renderPlayerView();
                    break;
                case globals.USER_TYPES.KILLED_PLAYER:

                    document.getElementById('game-state-container').innerHTML = templates.PLAYER_GAME_VIEW;
                    gameStateRenderer.renderPlayerView(true);
                    break;
                case globals.USER_TYPES.MODERATOR:
                    document.getElementById('game-state-container').innerHTML = templates.MODERATOR_GAME_VIEW;
                    gameStateRenderer.renderModeratorView();
                    break;
                case globals.USER_TYPES.TEMPORARY_MODERATOR:
                    document.getElementById('game-state-container').innerHTML = templates.TEMP_MOD_GAME_VIEW;
                    gameStateRenderer.renderTempModView();
                    break;
                case globals.USER_TYPES.SPECTATOR:
                    document.getElementById('game-state-container').innerHTML = templates.SPECTATOR_GAME_VIEW;
                    gameStateRenderer.renderSpectatorView();
                    break;
                default:
                    break;
            }
            if (currentGameState.timerParams) {
                socket.emit(globals.COMMANDS.GET_TIME_REMAINING, currentGameState.accessCode);
            } else {
                document.querySelector('#game-timer')?.remove();
                document.querySelector('label[for="game-timer"]')?.remove();
            }
            break;
        case globals.STATUS.ENDED: {
            const container = document.getElementById('game-state-container');
            container.innerHTML = templates.END_OF_GAME_VIEW;
            container.classList.add('vertical-flex');
            gameStateRenderer.renderEndOfGame();
            break;
        }
        default:
            break;
    }

    activateRoleInfoButton(stateBucket.currentGameState.deck);
}

function displayClientInfo (name, userType) {
    document.getElementById('client-name').innerText = name;
    document.getElementById('client-user-type').innerText = userType;
    document.getElementById('client-user-type').innerText += globals.USER_TYPE_ICONS[userType];
}

function setClientSocketHandlers (stateBucket, gameStateRenderer, socket, timerWorker, gameTimerManager) {
    socket.on(globals.EVENTS.PLAYER_JOINED, (player, gameIsFull) => {
        toast(player.name + ' joined!', 'success', false, true, 3);
        stateBucket.currentGameState.people.push(player);
        stateBucket.currentGameState.isFull = gameIsFull;
        gameStateRenderer.renderLobbyPlayers();
        if (
            gameIsFull
            && (
                stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                || stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            )
        ) {
            displayStartGamePromptForModerators(stateBucket.currentGameState, gameStateRenderer);
        }
    });

    socket.on(globals.EVENTS.PLAYER_LEFT, (player) => {
        removeStartGameFunctionalityIfPresent(gameStateRenderer);
        toast(player.name + ' has left!', 'error', false, true, 3);
        const index = stateBucket.currentGameState.people.findIndex(person => person.id === player.id);
        if (index >= 0) {
            stateBucket.currentGameState.people.splice(
                index,
                1
            );
            gameStateRenderer.renderLobbyPlayers();
        }
    });

    socket.on(globals.EVENTS.START_GAME, () => {
        socket.emit(
            globals.COMMANDS.FETCH_GAME_STATE,
            stateBucket.currentGameState.accessCode,
            stateBucket.currentGameState.client.cookie,
            function (gameState) {
                stateBucket.currentGameState = gameState;
                processGameState(
                    stateBucket.currentGameState,
                    gameState.client.cookie,
                    socket,
                    gameStateRenderer,
                    gameTimerManager,
                    timerWorker
                );
            }
        );
    });

    socket.on(globals.EVENTS.SYNC_GAME_STATE, () => {
        socket.emit(
            globals.COMMANDS.FETCH_GAME_STATE,
            stateBucket.currentGameState.accessCode,
            stateBucket.currentGameState.client.cookie,
            function (gameState) {
                stateBucket.currentGameState = gameState;
                processGameState(
                    stateBucket.currentGameState,
                    gameState.client.cookie,
                    socket,
                    gameStateRenderer,
                    gameTimerManager,
                    timerWorker
                );
            }
        );
    });

    if (timerWorker && gameTimerManager) {
        gameTimerManager.attachTimerSocketListeners(socket, timerWorker, gameStateRenderer);
    }

    socket.on(globals.EVENTS.KILL_PLAYER, (id) => {
        const killedPerson = stateBucket.currentGameState.people.find((person) => person.id === id);
        if (killedPerson) {
            killedPerson.out = true;
            if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
                toast(killedPerson.name + ' killed.', 'success', true, true, 6);
                gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo(stateBucket.currentGameState.status === globals.STATUS.ENDED);
            } else {
                if (killedPerson.id === stateBucket.currentGameState.client.id) {
                    const clientUserType = document.getElementById('client-user-type');
                    if (clientUserType) {
                        clientUserType.innerText = globals.USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80';
                    }
                    gameStateRenderer.updatePlayerCardToKilledState();
                    toast('You have been killed!', 'warning', true, true, 6);
                } else {
                    toast(killedPerson.name + ' was killed!', 'warning', true, true, 6);
                }
                if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                } else {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                }
            }
        }
    });

    socket.on(globals.EVENTS.REVEAL_PLAYER, (revealData) => {
        const revealedPerson = stateBucket.currentGameState.people.find((person) => person.id === revealData.id);
        if (revealedPerson) {
            revealedPerson.revealed = true;
            revealedPerson.gameRole = revealData.gameRole;
            revealedPerson.alignment = revealData.alignment;
            if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
                toast(revealedPerson.name + ' revealed.', 'success', true, true, 6);
                gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo(stateBucket.currentGameState.status === globals.STATUS.ENDED);
            } else {
                if (revealedPerson.id === stateBucket.currentGameState.client.id) {
                    toast('Your role has been revealed!', 'warning', true, true, 6);
                } else {
                    toast(revealedPerson.name + ' was revealed as a ' + revealedPerson.gameRole + '!', 'warning', true, true, 6);
                }
                if (stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                } else {
                    gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                }
            }
        }
    });

    socket.on(globals.EVENTS.CHANGE_NAME, (personId, name) => {
        propagateNameChange(stateBucket.currentGameState, name, personId);
        updateDOMWithNameChange(stateBucket.currentGameState, gameStateRenderer);
        processGameState(
            stateBucket.currentGameState,
            stateBucket.currentGameState.client.cookie,
            socket,
            gameStateRenderer,
            gameTimerManager,
            timerWorker,
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
            timerWorker
        );
    });
}

function displayStartGamePromptForModerators (gameState, gameStateRenderer) {
    const div = document.createElement('div');
    div.innerHTML = templates.START_GAME_PROMPT;
    div.querySelector('#start-game-button').addEventListener('click', gameStateRenderer.startGameHandler);
    document.body.appendChild(div);
}

function validateName (name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 30;
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

function activateRoleInfoButton (deck) {
    deck.sort((a, b) => {
        return a.team === globals.ALIGNMENT.GOOD ? 1 : -1;
    });
    document.getElementById('role-info-button').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('prompt').innerHTML = templates.ROLE_INFO_MODAL;
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

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = game;
} else {
    game();
}
