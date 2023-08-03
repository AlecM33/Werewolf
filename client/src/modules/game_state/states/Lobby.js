import { QRCode } from '../../third_party/qrcode.js';
import { toast } from '../../front_end_components/Toast.js';
import { globals } from '../../../config/globals.js';
import { HTMLFragments } from '../../front_end_components/HTMLFragments.js';
import { Confirmation } from '../../front_end_components/Confirmation.js';
import { SharedStateUtil } from './shared/SharedStateUtil.js';
import { GameCreationStepManager } from '../../game_creation/GameCreationStepManager.js';
import { DeckStateManager } from '../../game_creation/DeckStateManager.js';
import { hiddenMenus } from '../../../view_templates/CreateTemplate.js';

export class Lobby {
    constructor (containerId, stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.socket = socket;
        this.container = document.getElementById(containerId);
        this.container.innerHTML = HTMLFragments.LOBBY;
        this.gameCreationStepManager = new GameCreationStepManager(new DeckStateManager());

        this.startGameHandler = (e) => {
            e.preventDefault();
            if (!stateBucket.currentGameState.isStartable) {
                toast('The number of players does not match the number of cards. ' +
                    'You must either add/remove players or edit roles and their quantities.', 'error');
                return;
            }
            Confirmation('Start game and deal roles?', () => {
                socket.timeout(5000).emit(
                    globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                    globals.EVENT_IDS.START_GAME,
                    stateBucket.currentGameState.accessCode,
                    null,
                    (err) => {
                        if (err) {
                            socket.emit(
                                globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                                globals.EVENT_IDS.FETCH_GAME_STATE,
                                stateBucket.currentGameState.accessCode,
                                { personId: stateBucket.currentGameState.client.cookie },
                                (gameState) => {
                                    SharedStateUtil.gameStateAckFn(gameState, socket);
                                }
                            );
                        } else {
                            this.removeStartGameFunctionalityIfPresent();
                        }
                    }
                );
            });
        };

        this.editRolesHandler = (e) => {
            e.preventDefault();
            document.querySelector('#mid-game-role-editor')?.remove();
            const roleEditContainer = document.createElement('div');
            roleEditContainer.setAttribute('id', 'mid-game-role-editor');
            roleEditContainer.innerHTML = hiddenMenus;
            document.body.appendChild(roleEditContainer);
            this.gameCreationStepManager.deckManager.deck = [];
            this.gameCreationStepManager
                .renderRoleSelectionStep(this.stateBucket.currentGameState, 'mid-game-role-editor', '2');
            this.gameCreationStepManager.roleBox.loadSelectedRolesFromCurrentGame(this.stateBucket.currentGameState);
            const saveButton = document.createElement('button');
            saveButton.classList.add('app-button');
            saveButton.setAttribute('id', 'save-role-changes-button');
            saveButton.innerHTML = '<p>Save</p><img src=\'../images/save-svgrepo-com.svg\'/>';
            saveButton.addEventListener('click', () => {
                if (this.gameCreationStepManager.deckManager.getDeckSize() > 50) {
                    toast('Your deck is too large. The max is 50 cards.', 'error', true);
                } else if (this.gameCreationStepManager.deckManager.getDeckSize() < 1) {
                    toast('You must add at least one card', 'error', true);
                } else {
                    document.querySelector('#mid-game-role-editor')?.remove();
                    this.socket.emit(
                        globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                        globals.EVENT_IDS.UPDATE_GAME_ROLES,
                        stateBucket.currentGameState.accessCode,
                        { deck: this.gameCreationStepManager.deckManager.deck.filter((card) => card.quantity > 0) },
                        () => {
                            toast('Roles updated successfully!', 'success');
                        }
                    );
                }
            });
            roleEditContainer.appendChild(saveButton);
        };
    }

    setLink (timeString) {
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

        return link;
    }

    setPlayerCount () {
        const playerCount = this.container.querySelector('#game-player-count');
        playerCount.innerText = this.stateBucket.currentGameState.gameSize + ' Players';
        const inLobbyCount = this.stateBucket.currentGameState.people.filter(
            p => p.userType !== globals.USER_TYPES.MODERATOR && p.userType !== globals.USER_TYPES.SPECTATOR
        ).length;
        document.querySelector("label[for='lobby-players']").innerText =
            'Participants (' + inLobbyCount + '/' + this.stateBucket.currentGameState.gameSize + ' Players)';
    }

    populateHeader () {
        const timeString = getTimeString(this.stateBucket.currentGameState);
        const time = this.container.querySelector('#game-time');
        time.innerText = timeString;

        const link = this.setLink(timeString);

        this.setPlayerCount();

        const spectatorHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                Confirmation(
                    SharedStateUtil.buildSpectatorList(this.stateBucket.currentGameState.people
                        .filter(p => p.userType === globals.USER_TYPES.SPECTATOR),
                    this.stateBucket.currentGameState.client,
                    this.socket,
                    this.stateBucket.currentGameState),
                    null, true
                );
            }
        };

        this.container.querySelector('#spectator-count').addEventListener('click', spectatorHandler);
        this.container.querySelector('#spectator-count').addEventListener('keyup', spectatorHandler);

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
                if (a.userType === globals.USER_TYPES.MODERATOR || a.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    return -1;
                }
                return 1;
            }
        );
        for (const person of sorted.filter(p => p.userType !== globals.USER_TYPES.SPECTATOR)) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person, this.stateBucket.currentGameState, this.socket));
        }
        const playerCount = this.stateBucket.currentGameState.people.filter(
            p => p.userType !== globals.USER_TYPES.MODERATOR && p.userType !== globals.USER_TYPES.SPECTATOR
        ).length;
        document.querySelector("label[for='lobby-players']").innerText =
            'Participants (' + playerCount + '/' + this.stateBucket.currentGameState.gameSize + ' Players)';
    }

    setSocketHandlers () {
        this.socket.on(globals.EVENT_IDS.PLAYER_JOINED, (player, gameisStartable) => {
            toast(player.name + ' joined!', 'success', true, true, 'short');
            this.stateBucket.currentGameState.people.push(player);
            this.stateBucket.currentGameState.isStartable = gameisStartable;
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

        this.socket.on(globals.EVENT_IDS.KICK_PERSON, (kickedId, gameisStartable) => {
            if (kickedId === this.stateBucket.currentGameState.client.id) {
                window.location = '/?message=' + encodeURIComponent('You were kicked by the moderator.');
            } else {
                const kickedIndex = this.stateBucket.currentGameState.people.findIndex(person => person.id === kickedId);
                if (kickedIndex >= 0) {
                    this.stateBucket.currentGameState.people
                        .splice(kickedIndex, 1);
                }
                this.stateBucket.currentGameState.isStartable = gameisStartable;
                SharedStateUtil.setNumberOfSpectators(
                    this.stateBucket.currentGameState.people.filter(p => p.userType === globals.USER_TYPES.SPECTATOR).length,
                    document.getElementById('spectator-count')
                );
                this.populatePlayers();
                if ((
                    this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                    || this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
                )
                ) {
                    toast('player kicked.', 'success', true, true, 'short');
                    this.displayStartGamePromptForModerators();
                }
            }
        });

        this.socket.on(globals.EVENT_IDS.UPDATE_GAME_ROLES, (deck, gameSize) => {
            this.stateBucket.currentGameState.deck = deck;
            this.stateBucket.currentGameState.gameSize = gameSize;
            this.stateBucket.currentGameState.isStartable = this.stateBucket.currentGameState.people
                .filter(person => person.userType === globals.USER_TYPES.PLAYER
                    || person.userType === globals.USER_TYPES.TEMPORARY_MODERATOR).length === gameSize;
            this.setLink(getTimeString(this.stateBucket.currentGameState));
            this.setPlayerCount();
        });
    }

    displayStartGamePromptForModerators () {
        const existingPrompt = document.getElementById('start-game-prompt');
        if (existingPrompt) {
            enableStartButton(existingPrompt, this.startGameHandler);
            document.getElementById('edit-roles-button').addEventListener('click', this.editRolesHandler);
        } else {
            const newPrompt = document.createElement('div');
            newPrompt.setAttribute('id', 'start-game-prompt');
            newPrompt.innerHTML = HTMLFragments.START_GAME_PROMPT;

            document.body.appendChild(newPrompt);
            enableStartButton(newPrompt, this.startGameHandler);
            document.getElementById('edit-roles-button').addEventListener('click', this.editRolesHandler);
        }
    }

    removeStartGameFunctionalityIfPresent () {
        document.querySelector('#start-game-prompt')?.removeEventListener('click', this.startGameHandler);
        document.querySelector('#start-game-prompt')?.remove();
    }
}

function enableStartButton (buttonContainer, handler) {
    buttonContainer.querySelector('#start-game-button').addEventListener('click', handler);
    buttonContainer.querySelector('#start-game-button').classList.remove('disabled');
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

function renderLobbyPerson (person, gameState, socket) {
    const el = document.createElement('div');
    const personNameEl = document.createElement('div');
    personNameEl.classList.add('lobby-player-name');
    const personTypeEl = document.createElement('div');
    personNameEl.innerText = person.name;
    personTypeEl.innerText = person.userType + globals.USER_TYPE_ICONS[person.userType];
    el.classList.add('lobby-player');
    if (person.userType === globals.USER_TYPES.MODERATOR || person.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
        el.classList.add('moderator');
    }

    el.appendChild(personNameEl);
    el.appendChild(personTypeEl);

    if ((gameState.client.userType === globals.USER_TYPES.MODERATOR || gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR)
        && person.userType !== globals.USER_TYPES.MODERATOR && person.userType !== globals.USER_TYPES.TEMPORARY_MODERATOR) {
        SharedStateUtil.addPlayerOptions(el, person, socket, gameState);
        el.dataset.pointer = person.id;
    }

    return el;
}
