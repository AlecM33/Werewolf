import { injectNavbar } from '../front_end_components/Navbar.js';
import { stateBucket } from '../game_state/StateBucket.js';
import { UserUtility } from '../utility/UserUtility.js';
import { toast } from '../front_end_components/Toast.js';
import { SharedStateUtil } from '../game_state/states/shared/SharedStateUtil.js';

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

    socket.on('connect', function () {
        if (stateBucket.timerWorker) {
            stateBucket.timerWorker.terminate();
            stateBucket.timerWorker = null;
        }
        SharedStateUtil.syncWithGame(
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

    SharedStateUtil.setClientSocketHandlers(stateBucket, socket);
};
