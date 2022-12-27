import { XHRUtility } from '../../../utility/XHRUtility.js';
import { UserUtility } from '../../../utility/UserUtility.js';
import { globals } from '../../../../config/globals.js';
import { toast } from '../../../front_end_components/Toast.js';
import { Confirmation } from '../../../front_end_components/Confirmation.js';

// This constant is meant to house logic that is utilized by more than one game state
export const SharedStateUtil = {
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
    }
};
