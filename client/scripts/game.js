import { UserUtility } from "../modules/UserUtility.js";
import { globals } from "../config/globals.js";
import {templates} from "../modules/Templates.js";
import {GameStateRenderer} from "../modules/GameStateRenderer.js";
import {toast} from "../modules/Toast.js";

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
                    userId = gameState.client.id;
                    UserUtility.setAnonymousUserId(userId, environment);
                    let gameStateRenderer = new GameStateRenderer(gameState);
                    processGameState(gameState, userId, socket, gameStateRenderer); // this socket is initialized via a script tag in the game page HTML.
                    setClientSocketHandlers(gameStateRenderer, socket);
                }
            });
        } else {
            window.location.replace('/not-found');
        }
    });
};

function processGameState (gameState, userId, socket, gameStateRenderer) {
    switch (gameState.status) {
        case globals.GAME_STATE.LOBBY:
            document.getElementById("game-state-container").innerHTML = templates.LOBBY;
            gameStateRenderer.renderLobbyPlayers();
            gameStateRenderer.renderLobbyHeader();
            break;
        default:
            break;
    }
}

function setClientSocketHandlers(gameStateRenderer, socket) {
    socket.on(globals.EVENTS.PLAYER_JOINED, (player) => {
        toast(player.name + " joined!", "success", false);
        gameStateRenderer.gameState.people.push(player);
        gameStateRenderer.renderLobbyPlayers();
    })
}
