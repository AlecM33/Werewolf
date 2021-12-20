import { UserUtility } from "../modules/UserUtility.js";
import { globals } from "../config/globals.js";
import {templates} from "../modules/Templates.js";
import {GameStateRenderer} from "../modules/GameStateRenderer.js";
import {cancelCurrentToast, toast} from "../modules/Toast.js";
import {GameTimerManager} from "../modules/GameTimerManager.js";
import {ModalManager} from "../modules/ModalManager.js";

export const game = () => {
    let timerWorker;
    const socket = io('/in-game');
    socket.on('disconnect', () => {
        if (timerWorker) {
            timerWorker.terminate();
        }
        toast('Disconnected. Attempting reconnect...', 'error', true, false);
    });
    socket.on('connect', () => {
        socket.emit(globals.COMMANDS.GET_ENVIRONMENT, function(returnedEnvironment) {
            timerWorker = new Worker('../modules/Timer.js');
            prepareGamePage(returnedEnvironment, socket, timerWorker);
        });
    })
};

function prepareGamePage(environment, socket, timerWorker) {
    let userId = UserUtility.validateAnonUserSignature(environment);
    const splitUrl = window.location.href.split('/game/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
        socket.emit(globals.COMMANDS.FETCH_GAME_STATE, accessCode, userId, function (gameState) {
            let currentGameState = gameState;
            document.querySelector('.spinner-container')?.remove();
            document.querySelector('.spinner-background')?.remove();
            if (gameState === null) {
                window.location = '/not-found?reason=' + encodeURIComponent('game-not-found');
            } else if (!gameState.client.hasEnteredName) {
                userId = gameState.client.cookie;
                UserUtility.setAnonymousUserId(userId, environment);
                document.getElementById("game-content").innerHTML = templates.NAME_CHANGE_MODAL;
                document.getElementById("change-name-form").onsubmit = (e) => {
                    e.preventDefault();
                    let name = document.getElementById("player-new-name").value;
                    if (validateName(name)) {
                        socket.emit(globals.COMMANDS.CHANGE_NAME, gameState.accessCode, { name: name, personId: gameState.client.id }, (result) => {
                            switch (result) {
                                case "taken":
                                    toast('This name is already taken.', 'error', true, true, 8);
                                    break;
                                case "changed":
                                    ModalManager.dispelModal("change-name-modal", "change-name-modal-background")
                                    toast('Name set.', 'success', true, true, 5);
                                    document.getElementById("game-content").innerHTML = templates.INITIAL_GAME_DOM;
                                    propagateNameChange(currentGameState, name, currentGameState.client.id);
                                    initializeGame(currentGameState, socket, timerWorker, userId);
                            }
                        })
                    } else {
                        toast("Name must be fewer than 30 characters.", 'error', true, true, 8);
                    }
                }
            } else {
                document.getElementById("game-content").innerHTML = templates.INITIAL_GAME_DOM;
                toast('You are connected.', 'success', true, true, 2);
                console.log(gameState);
                userId = gameState.client.cookie;
                UserUtility.setAnonymousUserId(userId, environment);
                initializeGame(gameState, socket, timerWorker, userId);
            }
        });
    } else {
        window.location = '/not-found?reason=' + encodeURIComponent('invalid-access-code');
    }
}

function initializeGame(currentGameState, socket, timerWorker, userId) {
    let gameStateRenderer = new GameStateRenderer(currentGameState, socket);
    let gameTimerManager;
    if (currentGameState.timerParams) {
        gameTimerManager = new GameTimerManager(currentGameState, socket);
    }
    setClientSocketHandlers(currentGameState, gameStateRenderer, socket, timerWorker, gameTimerManager);
    processGameState(currentGameState, userId, socket, gameStateRenderer);
}

function processGameState (currentGameState, userId, socket, gameStateRenderer) {
    displayClientInfo(currentGameState.client.name, currentGameState.client.userType);
    switch (currentGameState.status) {
        case globals.STATUS.LOBBY:
            document.getElementById("game-state-container").innerHTML = templates.LOBBY;
            gameStateRenderer.renderLobbyHeader();
            gameStateRenderer.renderLobbyPlayers();
            if (
                currentGameState.isFull
                && (
                    currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                    || currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
                )
            ) {
               displayStartGamePromptForModerators(gameStateRenderer, socket);
            }
            break;
        case globals.STATUS.IN_PROGRESS:
            gameStateRenderer.renderGameHeader();
            switch (currentGameState.client.userType) {
                case globals.USER_TYPES.PLAYER:
                    document.getElementById("game-state-container").innerHTML = templates.PLAYER_GAME_VIEW;
                    gameStateRenderer.renderPlayerView();
                    break;
                case globals.USER_TYPES.KILLED_PLAYER:
                    document.querySelector("#end-game-prompt")?.remove();
                    document.getElementById("game-state-container").innerHTML = templates.PLAYER_GAME_VIEW;
                    gameStateRenderer.renderPlayerView(true);
                    break;
                case globals.USER_TYPES.MODERATOR:
                    document.querySelector("#start-game-prompt")?.remove();
                    document.getElementById("game-state-container").innerHTML = templates.MODERATOR_GAME_VIEW;
                    gameStateRenderer.renderModeratorView();
                    break;
                case globals.USER_TYPES.TEMPORARY_MODERATOR:
                    document.querySelector("#start-game-prompt")?.remove();
                    document.getElementById("game-state-container").innerHTML = templates.TEMP_MOD_GAME_VIEW;
                    gameStateRenderer.renderTempModView();
                    break;
                case globals.USER_TYPES.SPECTATOR:
                    document.querySelector("#end-game-prompt")?.remove();
                    document.getElementById("game-state-container").innerHTML = templates.SPECTATOR_GAME_VIEW;
                    gameStateRenderer.renderSpectatorView();
                    break;
                default:
                    break;
            }

            socket.emit(globals.COMMANDS.GET_TIME_REMAINING, currentGameState.accessCode);
            break;
        default:
            break;
    }
}

function displayClientInfo(name, userType) {
    document.getElementById("client-name").innerText = name;
    document.getElementById("client-user-type").innerText = userType;
    document.getElementById("client-user-type").innerText += globals.USER_TYPE_ICONS[userType];
}

function setClientSocketHandlers(currentGameState, gameStateRenderer, socket, timerWorker, gameTimerManager) {
    if (!socket.hasListeners(globals.EVENTS.PLAYER_JOINED)) {
        socket.on(globals.EVENTS.PLAYER_JOINED, (player, gameIsFull) => {
            toast(player.name + " joined!", "success", false);
            currentGameState.people.push(player);
            gameStateRenderer.renderLobbyPlayers();
            if (
                gameIsFull
                && (
                    currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                    || currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
                )
            ) {
                displayStartGamePromptForModerators(gameStateRenderer, socket);
            }
        });
    }
    if (!socket.hasListeners(globals.EVENTS.SYNC_GAME_STATE)) {
        socket.on(globals.EVENTS.SYNC_GAME_STATE, () => {
            socket.emit(
                globals.COMMANDS.FETCH_GAME_STATE,
                currentGameState.accessCode,
                currentGameState.client.cookie,
                function (gameState) {
                    currentGameState = gameState;
                    gameStateRenderer.gameState = currentGameState;
                    gameTimerManager.gameState = currentGameState;
                    processGameState(currentGameState, gameState.client.cookie, socket, gameStateRenderer);
                }
            );
        });
    }

    if (timerWorker && gameTimerManager) {
        gameTimerManager.attachTimerSocketListeners(socket, timerWorker, gameStateRenderer);
    }

    if (!socket.hasListeners(globals.EVENTS.KILL_PLAYER)) {
        socket.on(globals.EVENTS.KILL_PLAYER, (id) => {
            let killedPerson = currentGameState.people.find((person) =>  person.id === id);
            if (killedPerson) {
                killedPerson.out = true;
                if (currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
                    toast(killedPerson.name + ' killed.', 'success', true, true, 6);
                    gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo()
                } else {
                    if (killedPerson.id === currentGameState.client.id) {
                        let clientUserType = document.getElementById("client-user-type");
                        if (clientUserType) {
                            clientUserType.innerText = globals.USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80'
                        }
                        gameStateRenderer.updatePlayerCardToKilledState();
                        toast('You have been killed!', 'warning', false, true, 6);
                    } else {
                        toast(killedPerson.name + ' was killed!', 'warning', false, true, 6);
                    }
                    if (currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                        gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                    } else {
                        gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                    }
                }
            }
        });
    }

    if (!socket.hasListeners(globals.EVENTS.REVEAL_PLAYER)) {
        socket.on(globals.EVENTS.REVEAL_PLAYER, (revealData) => {
            let revealedPerson = currentGameState.people.find((person) =>  person.id === revealData.id);
            if (revealedPerson) {
                revealedPerson.revealed = true;
                revealedPerson.gameRole = revealData.gameRole;
                revealedPerson.alignment = revealData.alignment;
                if (currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
                    toast(revealedPerson.name + ' revealed.', 'success', true, true, 6);
                    gameStateRenderer.renderPlayersWithRoleAndAlignmentInfo()
                } else {
                    if (revealedPerson.id === currentGameState.client.id) {
                        toast('Your role has been revealed!', 'warning', false, true, 6);
                    } else {
                        toast(revealedPerson.name + ' was revealed as a ' + revealedPerson.gameRole + '!', 'warning', false, true, 6);
                    }
                    if (currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                        gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                    } else {
                        gameStateRenderer.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                    }
                }
            }
        });
    }

    if (!socket.hasListeners(globals.EVENTS.CHANGE_NAME)) {
        socket.on(globals.EVENTS.CHANGE_NAME, (personId, name) => {
            propagateNameChange(currentGameState, name, personId);
            processGameState(currentGameState, currentGameState.client.cookie, socket, gameStateRenderer);
        });
    }
}

function displayStartGamePromptForModerators(gameStateRenderer, socket) {
    let div = document.createElement("div");
    div.innerHTML = templates.START_GAME_PROMPT;
    document.body.appendChild(div);
    document.getElementById("start-game-button").addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Start the game and deal roles?")) {
            socket.emit(globals.COMMANDS.START_GAME, gameStateRenderer.gameState.accessCode,gameStateRenderer.gameState.client.cookie);
        }

    });
}

function runGameTimer (hours, minutes, tickRate, soundManager, timerWorker) {
    if (window.Worker) {
        timerWorker.onmessage = function (e) {
            if (e.data.hasOwnProperty('timeRemainingInMilliseconds') && e.data.timeRemainingInMilliseconds > 0) {
                document.getElementById('game-timer').innerText = e.data.displayTime;
            }
        };
        timerWorker.postMessage({ hours: hours, minutes: minutes, tickInterval: tickRate });
    }
}

function validateName(name) {
    return typeof name === 'string' && name.length <= 30;
}

function propagateNameChange(gameState, name, personId) {
    gameState.client.name = name;
    let matchingPerson = gameState.people.find((person) => person.id === personId);
    if (matchingPerson) {
        matchingPerson.name = name;
    }

    if (gameState.moderator.id === personId) {
        gameState.moderator.name = name;
    }

    let matchingSpectator = gameState.spectators?.find((spectator) => spectator.id === personId);
    if (matchingSpectator) {
        matchingSpectator.name = name;
    }
}
