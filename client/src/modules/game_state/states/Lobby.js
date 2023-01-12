import { QRCode } from '../../third_party/qrcode.js';
import { toast } from '../../front_end_components/Toast.js';
import { globals } from '../../../config/globals.js';
import { HTMLFragments } from '../../front_end_components/HTMLFragments.js';
import { Confirmation } from '../../front_end_components/Confirmation.js';
import { SharedStateUtil } from './shared/SharedStateUtil.js';

export class Lobby {
    constructor (containerId, stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.socket = socket;
        this.container = document.getElementById(containerId);
        this.container.innerHTML = HTMLFragments.LOBBY;

        this.startGameHandler = (e) => {
            e.preventDefault();
            Confirmation('Start game and deal roles?', () => {
                socket.emit(
                    globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                    globals.EVENT_IDS.START_GAME,
                    stateBucket.currentGameState.accessCode,
                    null,
                    () => {
                        this.removeStartGameFunctionalityIfPresent();
                    }
                );
            });
        };
    }

    populateHeader () {
        const timeString = getTimeString(this.stateBucket.currentGameState);
        const time = this.container.querySelector('#game-time');
        time.innerText = timeString;

        const linkContainer = this.container.querySelector('#game-link');
        linkContainer.innerHTML = '<img src=\'../images/copy.svg\' alt=\'copy\'/>';
        const link = window.location.protocol + '//' + window.location.host +
            '/join/' + this.stateBucket.currentGameState.accessCode +
            '?playerCount=' + this.stateBucket.currentGameState.gameSize +
            '&timer=' + encodeURIComponent(timeString);
        const linkDiv = document.createElement('div');
        linkDiv.innerText = link;
        linkContainer.prepend(linkDiv);
        activateLink(linkContainer, link);

        const playerCount = this.container.querySelector('#game-player-count');
        playerCount.innerText = this.stateBucket.currentGameState.gameSize + ' Players';

        this.container.querySelector('#spectator-count').addEventListener('click', () => {
            Confirmation(SharedStateUtil.buildSpectatorList(this.stateBucket.currentGameState.people), null, true);
        });

        SharedStateUtil.setNumberOfSpectators(
            this.stateBucket.currentGameState.people.filter(p => p.userType === globals.USER_TYPES.SPECTATOR).length,
            this.container.querySelector('#spectator-count')
        );

        const gameCode = this.container.querySelector('#game-code');
        gameCode.innerHTML = 'Or enter this code on the homepage: <span>' +
            this.stateBucket.currentGameState.accessCode + '</span>';

        QRCode.toCanvas(document.getElementById('canvas'), link, { scale: 3 }, function (error) {
            if (error) console.error(error);
        });
    }

    populatePlayers () {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove());
        const lobbyPlayersContainer = this.container.querySelector('#lobby-players');
        const sorted = this.stateBucket.currentGameState.people.sort(
            function (a, b) {
                if (a.userType === globals.USER_TYPES.MODERATOR) {
                    return -1;
                }
                return 1;
            }
        );
        for (const person of sorted.filter(p => p.userType !== globals.USER_TYPES.SPECTATOR)) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person.name, person.userType));
        }
        const playerCount = this.stateBucket.currentGameState.people.filter(
            p => p.userType === globals.USER_TYPES.PLAYER || p.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        ).length;
        document.querySelector("label[for='lobby-players']").innerText =
            'Participants (' + playerCount + '/' + this.stateBucket.currentGameState.gameSize + ' Players)';
    }

    setSocketHandlers () {
        this.socket.on(globals.EVENT_IDS.PLAYER_JOINED, (player, gameIsFull) => {
            toast(player.name + ' joined!', 'success', true, true, 'short');
            this.stateBucket.currentGameState.people.push(player);
            this.stateBucket.currentGameState.isFull = gameIsFull;
            this.populatePlayers();
            if ((
                this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            )
            ) {
                this.displayStartGamePromptForModerators();
            }
        });

        this.socket.on(globals.EVENT_IDS.ADD_SPECTATOR, (spectator) => {
            this.stateBucket.currentGameState.people.push(spectator);
            SharedStateUtil.setNumberOfSpectators(
                this.stateBucket.currentGameState.people.filter(p => p.userType === globals.USER_TYPES.SPECTATOR).length,
                document.getElementById('spectator-count')
            );
        });

        // this.socket.on(globals.EVENT_IDS.PLAYER_LEFT, (player) => {
        //     removeStartGameFunctionalityIfPresent(this.stateBucket.currentGameState, this.startGameHandler);
        //     toast(player.name + ' has left!', 'error', false, true, 'short');
        //     const index = this.stateBucket.currentGameState.people.findIndex(person => person.id === player.id);
        //     if (index >= 0) {
        //         this.stateBucket.currentGameState.people.splice(
        //             index,
        //             1
        //         );
        //         this.populatePlayers();
        //     }
        // });
    }

    displayStartGamePromptForModerators () {
        const existingPrompt = document.getElementById('start-game-prompt');
        if (existingPrompt) {
            enableOrDisableStartButton(this.stateBucket.currentGameState, existingPrompt, this.startGameHandler);
        } else {
            const newPrompt = document.createElement('div');
            newPrompt.setAttribute('id', 'start-game-prompt');
            newPrompt.innerHTML = HTMLFragments.START_GAME_PROMPT;

            document.body.appendChild(newPrompt);
            enableOrDisableStartButton(this.stateBucket.currentGameState, newPrompt, this.startGameHandler);
        }
    }

    removeStartGameFunctionalityIfPresent () {
        document.querySelector('#start-game-prompt')?.removeEventListener('click', this.startGameHandler);
        document.querySelector('#start-game-prompt')?.remove();
    }
}

function enableOrDisableStartButton (gameState, buttonContainer, handler) {
    if (gameState.isFull) {
        buttonContainer.querySelector('#start-game-button').addEventListener('click', handler);
        buttonContainer.querySelector('#start-game-button').classList.remove('disabled');
    } else {
        buttonContainer.querySelector('#start-game-button').removeEventListener('click', handler);
        buttonContainer.querySelector('#start-game-button').classList.add('disabled');
    }
}

function activateLink (linkContainer, link) {
    const linkCopyHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            navigator.clipboard.writeText(link)
                .then(() => {
                    toast('Link copied!', 'success', true);
                });
        }
    };
    linkContainer.addEventListener('click', linkCopyHandler);
    linkContainer.addEventListener('keyup', linkCopyHandler);
}

function getTimeString (gameState) {
    let timeString = '';
    if (gameState.timerParams) {
        const hours = gameState.timerParams.hours;
        const minutes = gameState.timerParams.minutes;
        if (hours) {
            timeString += hours > 1
                ? hours + ' hours '
                : hours + ' hour ';
        }
        if (minutes) {
            timeString += minutes > 1
                ? minutes + ' minutes '
                : minutes + ' minute ';
        }
        return timeString;
    } else {
        return 'untimed';
    }
}

function renderLobbyPerson (name, userType) {
    const el = document.createElement('div');
    const personNameEl = document.createElement('div');
    personNameEl.classList.add('lobby-player-name');
    const personTypeEl = document.createElement('div');
    personNameEl.innerText = name;
    personTypeEl.innerText = userType + globals.USER_TYPE_ICONS[userType];
    el.classList.add('lobby-player');
    if (userType === globals.USER_TYPES.MODERATOR) {
        el.classList.add('moderator');
    }

    el.appendChild(personNameEl);
    el.appendChild(personTypeEl);

    return el;
}
