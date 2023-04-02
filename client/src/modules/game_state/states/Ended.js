import { globals } from '../../../config/globals.js';
import { HTMLFragments } from '../../front_end_components/HTMLFragments.js';
import { SharedStateUtil } from './shared/SharedStateUtil.js';

export class Ended {
    constructor (containerId, stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.socket = socket;
        this.container = document.getElementById(containerId);
        this.container.innerHTML = HTMLFragments.END_OF_GAME_VIEW;
    }

    renderEndOfGame (gameState) {
        if (
            gameState.client.userType === globals.USER_TYPES.MODERATOR
            || gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        ) {
            document.getElementById('end-of-game-buttons').prepend(SharedStateUtil.createRestartButton(this.stateBucket));
        }
        SharedStateUtil.displayCurrentModerator(this.stateBucket.currentGameState.people
            .find((person) => person.userType === globals.USER_TYPES.MODERATOR
                || person.userType === globals.USER_TYPES.TEMPORARY_MODERATOR));
        this.renderPlayersWithRoleInformation();
    }

    renderPlayersWithRoleInformation (tempMod = false) {
        document.querySelectorAll('.game-player').forEach((el) => el.remove());
        /* TODO: UX issue - it's easier to parse visually when players are sorted this way,
          but shifting players around when they are killed or revealed is bad UX for the moderator. */
        // sortPeopleByStatus(this.stateBucket.currentGameState.people);
        const modType = tempMod ? this.stateBucket.currentGameState.moderator.userType : null;
        renderGroupOfPlayers(
            this.stateBucket.currentGameState.people.filter(
                p => (p.userType !== globals.USER_TYPES.MODERATOR && p.userType !== globals.USER_TYPES.SPECTATOR)
                    || p.killed
            ),
            this.stateBucket.currentGameState.accessCode,
            null,
            modType,
            this.socket
        );
        document.getElementById('players-alive-label').innerText =
            'Players: ' + this.stateBucket.currentGameState.people.filter((person) => !person.out).length + ' / ' +
            this.stateBucket.currentGameState.gameSize + ' Alive';
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
