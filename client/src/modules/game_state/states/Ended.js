import { globals } from '../../../config/globals.js';
import { HTMLFragments } from '../../front_end_components/HTMLFragments.js';
import { XHRUtility } from '../../utility/XHRUtility.js';
import { UserUtility } from '../../utility/UserUtility.js';
import { toast } from '../../front_end_components/Toast.js';
import { Confirmation } from '../../front_end_components/Confirmation';

export class Ended {
    constructor (containerId, stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.socket = socket;
        this.container = document.getElementById(containerId);
        this.container.innerHTML = HTMLFragments.END_OF_GAME_VIEW;
        this.restartGameHandler = () => {
            XHRUtility.xhr(
                '/api/games/' + this.stateBucket.currentGameState.accessCode + '/restart',
                'PATCH',
                null,
                JSON.stringify({
                    playerName: this.stateBucket.currentGameState.client.name,
                    accessCode: this.stateBucket.currentGameState.accessCode,
                    sessionCookie: UserUtility.validateAnonUserSignature(globals.ENVIRONMENT.LOCAL),
                    localCookie: UserUtility.validateAnonUserSignature(globals.ENVIRONMENT.PRODUCTION)
                })
            )
                .then((res) => {
                    toast('Game restarted!', 'success', true, true, 'medium');
                })
                .catch((res) => {
                    toast(res.content, 'error', true, true, 'medium');
                });
        };
    }

    renderEndOfGame (gameState) {
        if (
            gameState.client.userType === globals.USER_TYPES.MODERATOR
            || gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        ) {
            const restartGameContainer = document.createElement('div');
            restartGameContainer.innerHTML = HTMLFragments.RESTART_GAME_BUTTON;
            const button = restartGameContainer.querySelector('#restart-game');
            button.addEventListener('click', () => {
                Confirmation('Restart the game, dealing everyone new roles?', () => {
                    this.restartGameHandler();
                });
            });
            document.getElementById('end-of-game-buttons').prepend(restartGameContainer);
        }
        this.renderPlayersWithRoleInformation();
    }

    renderPlayersWithRoleInformation (tempMod = false) {
        document.querySelectorAll('.game-player').forEach((el) => el.remove());
        /* TODO: UX issue - it's easier to parse visually when players are sorted this way,
          but shifting players around when they are killed or revealed is bad UX for the moderator. */
        // sortPeopleByStatus(this.stateBucket.currentGameState.people);
        const modType = tempMod ? this.stateBucket.currentGameState.moderator.userType : null;
        renderGroupOfPlayers(
            this.stateBucket.currentGameState.people,
            this.stateBucket.currentGameState.accessCode,
            null,
            modType,
            this.socket
        );
        document.getElementById('players-alive-label').innerText =
            'Players: ' + this.stateBucket.currentGameState.people.filter((person) => !person.out).length + ' / ' +
            this.stateBucket.currentGameState.people.length + ' Alive';
    }
}

function renderGroupOfPlayers (
    people,
    accessCode = null,
    alignment = null
) {
    for (const player of people) {
        const playerEl = document.createElement('div');
        playerEl.classList.add('game-player');
        playerEl.innerHTML = HTMLFragments.GAME_PLAYER;

        playerEl.querySelector('.game-player-name').innerText = player.name;
        const roleElement = playerEl.querySelector('.game-player-role');

        if (alignment === null) {
            roleElement.classList.add(player.alignment);
        } else {
            roleElement.classList.add(alignment);
        }
        roleElement.innerText = player.gameRole;

        if (player.out) {
            playerEl.classList.add('killed');
        }

        document.getElementById('game-player-list').appendChild(playerEl);
    }
}
