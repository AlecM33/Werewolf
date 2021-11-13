import { UserUtility } from "../modules/UserUtility.js";
import { globals } from "../config/globals.js";

export const game = () => {
    let userId = UserUtility.validateAnonUserSignature();
    const splitUrl = window.location.href.split('/game/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
        socket.emit(globals.COMMANDS.FETCH_GAME_STATE, accessCode, userId, function (gameState) {
            if (gameState === null) {
                window.location.replace('/not-found');
            } else {
                console.log(gameState);
                userId = gameState.id;
                UserUtility.setAnonymousUserId(userId);
                // processGameState(gameState, userId, socket);
            }
        });
    } else {
        window.location.replace('/not-found');
    }
};
