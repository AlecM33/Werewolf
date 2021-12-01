import { UserUtility } from "../modules/UserUtility.js";
import { globals } from "../config/globals.js";
import {templates} from "../modules/Templates.js";
import {GameStateRenderer} from "../modules/GameStateRenderer.js";
import {cancelCurrentToast, toast} from "../modules/Toast.js";
import {GameTimerManager} from "../modules/GameTimerManager.js";

export const game = () => {
    let timerWorker = new Worker('../modules/Timer.js');
    const socket = io('/in-game');
    socket.on('disconnect', () => {
        timerWorker.terminate();
        toast('Disconnected. Attempting reconnect...', 'error', true, false);
    });
    socket.on('connect', () => {
        socket.emit(globals.COMMANDS.GET_ENVIRONMENT, function(returnedEnvironment) {
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
            if (gameState === null) {
                window.location = '/not-found'
            } else {
                toast('You are connected.', 'success', true);
                console.log(gameState);
                userId = gameState.client.id;
                UserUtility.setAnonymousUserId(userId, environment);
                let gameStateRenderer = new GameStateRenderer(gameState);
                let gameTimerManager;
                if (gameState.timerParams) {
                    gameTimerManager = new GameTimerManager(gameState, socket);
                }
                setClientSocketHandlers(gameStateRenderer, socket, timerWorker, gameTimerManager);
                displayClientInfo(gameState.client.name, gameState.client.userType);
                processGameState(gameState, userId, socket, gameStateRenderer);
            }
        });
    } else {
        window.location = '/not-found';
    }
}

function processGameState (gameState, userId, socket, gameStateRenderer) {
    switch (gameState.status) {
        case globals.STATUS.LOBBY:
            document.getElementById("game-state-container").innerHTML = templates.LOBBY;
            gameStateRenderer.renderLobbyHeader();
            gameStateRenderer.renderLobbyPlayers();
            if (
                gameState.isFull
                && (
                    gameState.client.userType === globals.USER_TYPES.MODERATOR
                    || gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
                )
            ) {
               displayStartGamePromptForModerators(gameStateRenderer, socket);
            }
            break;
        case globals.STATUS.IN_PROGRESS:
            document.querySelector("#start-game-prompt")?.remove();
            gameStateRenderer.gameState = gameState;
            gameStateRenderer.renderGameHeader();
            if (gameState.client.userType === globals.USER_TYPES.PLAYER || gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                document.getElementById("game-state-container").innerHTML = templates.GAME;
                gameStateRenderer.renderPlayerRole();
            } else if (gameState.client.userType === globals.USER_TYPES.MODERATOR) {
                document.getElementById("game-state-container").innerHTML = templates.MODERATOR_GAME_VIEW;
                gameStateRenderer.renderModeratorView();
            }
            socket.emit(globals.COMMANDS.GET_TIME_REMAINING, gameState.accessCode);
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

function setClientSocketHandlers(gameStateRenderer, socket, timerWorker, gameTimerManager) {
    if (!socket.hasListeners(globals.EVENTS.PLAYER_JOINED)) {
        socket.on(globals.EVENTS.PLAYER_JOINED, (player, gameIsFull) => {
            toast(player.name + " joined!", "success", false);
            gameStateRenderer.gameState.people.push(player);
            gameStateRenderer.renderLobbyPlayers();
            if (
                gameIsFull
                && (
                    gameStateRenderer.gameState.client.userType === globals.USER_TYPES.MODERATOR
                    || gameStateRenderer.gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
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
                gameStateRenderer.gameState.accessCode,
                gameStateRenderer.gameState.client.id,
                function (gameState) {
                    processGameState(gameState, gameState.client.id, socket, gameStateRenderer);
                }
            );
        });
    }

    if (timerWorker && gameTimerManager) {
        gameTimerManager.attachTimerSocketListeners(socket, timerWorker, gameStateRenderer);
    }
}

function displayStartGamePromptForModerators(gameStateRenderer, socket) {
    document.getElementById("lobby-players").setAttribute("style", 'margin-bottom: 130px');
    let div = document.createElement("div");
    div.innerHTML = templates.START_GAME_PROMPT;
    document.body.appendChild(div);
    document.getElementById("start-game-button").addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("Start the game and deal roles?")) {
            socket.emit(globals.COMMANDS.START_GAME, gameStateRenderer.gameState.accessCode, gameStateRenderer.gameState.client.id);
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
