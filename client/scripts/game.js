import { UserUtility } from "../modules/UserUtility.js";
import { globals } from "../config/globals.js";
import {templates} from "../modules/Templates.js";
import {GameStateRenderer} from "../modules/GameStateRenderer.js";
import {cancelCurrentToast, toast} from "../modules/Toast.js";

export const game = () => {
    socket.emit(globals.COMMANDS.GET_ENVIRONMENT, function(environment) {
        let userId = UserUtility.validateAnonUserSignature(environment);
        const splitUrl = window.location.href.split('/game/');
        const accessCode = splitUrl[1];
        if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
            socket.emit(globals.COMMANDS.FETCH_GAME_STATE, accessCode, userId, function (gameState) {
                if (gameState === null) {
                    window.location.replace('/not-found');
                } else {
                    console.log(gameState);
                    gameState.accessCode = accessCode;
                    userId = gameState.client.id;
                    UserUtility.setAnonymousUserId(userId, environment);
                    let gameStateRenderer = new GameStateRenderer(gameState);
                    const timerWorker = new Worker('../modules/Timer.js');
                    processGameState(gameState, userId, socket, gameStateRenderer, timerWorker); // this socket is initialized via a script tag in the game page HTML.
                    setClientSocketHandlers(gameStateRenderer, socket, timerWorker);
                }
            });
        } else {
            window.location.replace('/not-found');
        }
    });
};

function processGameState (gameState, userId, socket, gameStateRenderer, timerWorker) {
    cancelCurrentToast();
    switch (gameState.status) {
        case globals.STATUS.LOBBY:
            document.getElementById("game-state-container").innerHTML = templates.LOBBY;
            gameStateRenderer.renderLobbyHeader();
            gameStateRenderer.renderLobbyPlayers();
            if (
                gameState.isFull
                && (
                    gameState.userType === globals.USER_TYPES.MODERATOR
                    || gameState.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
                )
            ) {
               displayStartGamePromptForModerators(gameStateRenderer);
            }
            break;
        case globals.STATUS.IN_PROGRESS:
            document.querySelector("#start-game-prompt")?.remove();
            gameStateRenderer.gameState = gameState;
            document.getElementById("game-state-container").innerHTML = templates.GAME;
            gameStateRenderer.renderGameHeader();
            gameStateRenderer.renderPlayerRole();
            break;
        default:
            break;
    }
}

function setClientSocketHandlers(gameStateRenderer, socket, timerWorker) {
    socket.on(globals.EVENTS.PLAYER_JOINED, (player, gameIsFull) => {
        toast(player.name + " joined!", "success", false);
        gameStateRenderer.gameState.people.push(player);
        gameStateRenderer.renderLobbyPlayers();
        if (
            gameIsFull
            && (
                gameStateRenderer.gameState.userType === globals.USER_TYPES.MODERATOR
                || gameStateRenderer.gameState.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            )
        ) {
           displayStartGamePromptForModerators(gameStateRenderer);
        }
    });

    socket.on(globals.EVENTS.SYNC_GAME_STATE, () => {
        socket.emit(
            globals.COMMANDS.FETCH_GAME_STATE,
            gameStateRenderer.gameState.accessCode,
            gameStateRenderer.gameState.client.id,
            function (gameState) {
                processGameState(gameState, gameState.client.id, socket, gameStateRenderer);
            }
        );
    })

    socket.on(globals.EVENTS.START_TIMER, () => {
        runGameTimer(
            gameStateRenderer.gameState.timerParams.hours,
            gameStateRenderer.gameState.timerParams.minutes,
            globals.CLOCK_TICK_INTERVAL_MILLIS,
            null,
            timerWorker
        )
    })
}

function displayStartGamePromptForModerators(gameStateRenderer) {
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
