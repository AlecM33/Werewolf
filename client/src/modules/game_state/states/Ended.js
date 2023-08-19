import { USER_TYPES } from '../../../config/globals.js';
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
            gameState.client.userType === USER_TYPES.MODERATOR
            || gameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
        ) {
            createPromptComponent(this.socket, this.stateBucket);
        }
        SharedStateUtil.displayCurrentModerator(this.stateBucket.currentGameState.people
            .find((person) => person.userType === USER_TYPES.MODERATOR
                || person.userType === USER_TYPES.TEMPORARY_MODERATOR));
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
                p => (p.userType !== USER_TYPES.MODERATOR && p.userType !== USER_TYPES.SPECTATOR)
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

function createPromptComponent (socket, stateBucket) {
    if (document.querySelector('#game-control-prompt') === null) {
        const div = document.createElement('div');
        div.id = 'game-control-prompt';
        div.prepend(SharedStateUtil.createReturnToLobbyButton(stateBucket));
        document.getElementById('game-content').appendChild(div);
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
        playerEl.dataset.pointer = player.id;
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
