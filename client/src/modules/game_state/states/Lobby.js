import { QRCode } from '../../third_party/qrcode.js';
import { toast } from '../../front_end_components/Toast.js';
import { EVENT_IDS, PRIMITIVES, SOCKET_EVENTS, USER_TYPE_ICONS, USER_TYPES } from '../../../config/globals.js';
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
                    'You must either add/remove players or edit roles and their quantities.', 'error', true, true, 'long');
                return;
            }
            Confirmation('Start game and deal roles?', () => {
                socket.timeout(5000).emit(
                    SOCKET_EVENTS.IN_GAME_MESSAGE,
                    EVENT_IDS.START_GAME,
                    stateBucket.currentGameState.accessCode,
                    null,
                    (err) => {
                        if (err) {
                            socket.emit(
                                SOCKET_EVENTS.IN_GAME_MESSAGE,
                                EVENT_IDS.FETCH_GAME_STATE,
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

        this.leaveGameHandler = (e) => {
            e.preventDefault();
            Confirmation('Leave the room?', () => {
                socket.emit(
                    SOCKET_EVENTS.IN_GAME_MESSAGE,
                    EVENT_IDS.LEAVE_ROOM,
                    stateBucket.currentGameState.accessCode,
                    { personId: stateBucket.currentGameState.client.id }
                );
            });
        };

        this.editTimerHandler = (e) => {
            e.preventDefault();
            document.querySelector('#mid-game-timer-editor')?.remove();
            const timerEditContainer = document.createElement('div');
            const timerEditContainerBackground = document.createElement('div');
            timerEditContainerBackground.setAttribute('id', 'timer-edit-container-background');
            timerEditContainer.setAttribute('id', 'mid-game-timer-editor');
            document.getElementById('game-content').style.display = 'none';
            document.body.appendChild(timerEditContainer);
            document.body.appendChild(timerEditContainerBackground);
            const timerEditPrompt = document.createElement('div');
            timerEditPrompt.setAttribute('id', 'timer-edit-prompt');
            timerEditPrompt.innerHTML = HTMLFragments.TIMER_EDIT_BUTTONS;
            this.gameCreationStepManager.steps['3'].forwardHandler = (e) => {
                e.preventDefault();
                if (e.type === 'click' || e.code === 'Enter') {
                    timerEditPrompt.querySelector('#save-timer-changes-button')?.click();
                }
            };
            this.gameCreationStepManager
                .renderTimerStep('mid-game-timer-editor', '3', this.stateBucket.currentGameState, this.gameCreationStepManager.steps);
            timerEditPrompt.querySelector('#save-timer-changes-button').addEventListener('click', () => {
                let hours = parseInt(document.getElementById('game-hours').value);
                let minutes = parseInt(document.getElementById('game-minutes').value);
                hours = this.gameCreationStepManager.standardizeNumberInput(hours);
                minutes = this.gameCreationStepManager.standardizeNumberInput(minutes);
                if (this.gameCreationStepManager.timerIsValid(hours, minutes)) {
                    let hasTimer, timerParams;
                    if (this.gameCreationStepManager.hasTimer(hours, minutes)) {
                        hasTimer = true;
                        timerParams = {
                            hours: hours,
                            minutes: minutes
                        };
                    } else {
                        hasTimer = false;
                        timerParams = null;
                    }
                    document.querySelector('#mid-game-timer-editor')?.remove();
                    document.querySelector('#timer-edit-container-background')?.remove();
                    document.getElementById('game-content').style.display = 'flex';
                    this.socket.emit(
                        SOCKET_EVENTS.IN_GAME_MESSAGE,
                        EVENT_IDS.UPDATE_GAME_TIMER,
                        stateBucket.currentGameState.accessCode,
                        { hasTimer: hasTimer, timerParams: timerParams },
                        () => {
                            toast('Timer updated successfully!', 'success');
                        }
                    );
                } else {
                    toast('Invalid timer options. Hours can be a max of 5, Minutes a max of 59.', 'error', true);
                }
            });

            timerEditPrompt.querySelector('#cancel-timer-changes-button').addEventListener('click', () => {
                document.querySelector('#mid-game-timer-editor')?.remove();
                document.querySelector('#timer-edit-container-background')?.remove();
                document.getElementById('game-content').style.display = 'flex';
            });

            timerEditContainer.appendChild(timerEditPrompt);
        };

        this.editRolesHandler = (e) => {
            e.preventDefault();
            document.querySelector('#mid-game-role-editor')?.remove();
            const roleEditContainer = document.createElement('div');
            const roleEditContainerBackground = document.createElement('div');
            roleEditContainerBackground.setAttribute('id', 'role-edit-container-background');
            roleEditContainer.setAttribute('id', 'mid-game-role-editor');
            roleEditContainer.innerHTML = hiddenMenus;
            document.getElementById('game-content').style.display = 'none';
            document.body.appendChild(roleEditContainer);
            document.body.appendChild(roleEditContainerBackground);
            this.gameCreationStepManager.deckManager.deck = [];
            this.gameCreationStepManager
                .renderRoleSelectionStep(this.stateBucket.currentGameState, 'mid-game-role-editor', '2');
            this.gameCreationStepManager.roleBox.loadSelectedRolesFromCurrentGame(this.stateBucket.currentGameState);
            const roleEditPrompt = document.createElement('div');
            roleEditPrompt.setAttribute('id', 'role-edit-prompt');
            roleEditPrompt.innerHTML = HTMLFragments.ROLE_EDIT_BUTTONS;
            roleEditPrompt.querySelector('#save-role-changes-button').addEventListener('click', () => {
                if (this.gameCreationStepManager.deckManager.getDeckSize() > PRIMITIVES.MAX_DECK_SIZE) {
                    toast('Your deck is too large. The max is 50 cards.', 'error', true);
                } else {
                    document.querySelector('#mid-game-role-editor')?.remove();
                    document.querySelector('#role-edit-container-background')?.remove();
                    document.getElementById('game-content').style.display = 'flex';
                    this.socket.emit(
                        SOCKET_EVENTS.IN_GAME_MESSAGE,
                        EVENT_IDS.UPDATE_GAME_ROLES,
                        stateBucket.currentGameState.accessCode,
                        { deck: this.gameCreationStepManager.deckManager.deck.filter((card) => card.quantity > 0) },
                        () => {
                            toast('Roles updated successfully!', 'success');
                        }
                    );
                }
            });

            roleEditPrompt.querySelector('#cancel-role-changes-button').addEventListener('click', () => {
                document.querySelector('#mid-game-role-editor')?.remove();
                document.querySelector('#role-edit-container-background')?.remove();
                document.getElementById('game-content').style.display = 'flex';
            });

            roleEditContainer.appendChild(roleEditPrompt);
        };
    }

    setLink () {
        const linkContainer = this.container.querySelector('#game-link');
        linkContainer.innerHTML = '<img src=\'../images/copy.svg\' alt=\'copy\'/>';
        const link = window.location.protocol + '//' + window.location.host +
            '/join/' + this.stateBucket.currentGameState.accessCode;
        const linkDiv = document.createElement('div');
        linkDiv.innerText = link;
        linkContainer.prepend(linkDiv);
        activateLink(linkContainer, link);

        QRCode.toCanvas(document.getElementById('canvas'), link, { scale: 3 }, function (error) {
            if (error) console.error(error);
        });

        return link;
    }

    setPlayerCount () {
        const playerCount = this.container.querySelector('#game-player-count');
        playerCount.innerText = this.stateBucket.currentGameState.gameSize + ' Players';
        const inLobbyCount = this.stateBucket.currentGameState.people.filter(
            p => p.userType !== USER_TYPES.MODERATOR && p.userType !== USER_TYPES.SPECTATOR
        ).length;
        document.querySelector("label[for='lobby-players']").innerText =
            'Participants (' + inLobbyCount + '/' + this.stateBucket.currentGameState.gameSize + ' Players)';
    }

    setTimer () {
        const timeString = getTimeString(this.stateBucket.currentGameState);
        const time = this.container.querySelector('#timer-parameters');
        time.innerText = timeString;
    }

    populateHeader () {
        const link = this.setLink();

        this.setTimer();

        this.setPlayerCount();

        const spectatorHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                Confirmation(
                    SharedStateUtil.buildSpectatorList(this.stateBucket.currentGameState.people
                        .filter(p => p.userType === USER_TYPES.SPECTATOR),
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
            this.stateBucket.currentGameState.people.filter(p => p.userType === USER_TYPES.SPECTATOR).length,
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
                if (a.userType === USER_TYPES.MODERATOR || a.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                    return -1;
                }
                return 1;
            }
        );
        for (const person of sorted.filter(p => p.userType !== USER_TYPES.SPECTATOR)) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person, this.stateBucket.currentGameState, this.socket));
        }
        const playerCount = this.stateBucket.currentGameState.people.filter(
            p => p.userType !== USER_TYPES.MODERATOR && p.userType !== USER_TYPES.SPECTATOR
        ).length;
        document.querySelector("label[for='lobby-players']").innerText =
            'Participants (' + playerCount + '/' + this.stateBucket.currentGameState.gameSize + ' Players)';
    }

    setSocketHandlers () {
        this.socket.on(EVENT_IDS.PLAYER_JOINED, (player, gameIsStartable) => {
            toast(player.name + ' joined!', 'success', true, true, 'short');
            this.stateBucket.currentGameState.people.push(player);
            this.stateBucket.currentGameState.isStartable = gameIsStartable;
            this.populatePlayers();
            if ((
                this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
            )
            ) {
                this.displayStartGamePromptForModerators();
            }
        });

        this.socket.on(EVENT_IDS.ADD_SPECTATOR, (spectator) => {
            this.stateBucket.currentGameState.people.push(spectator);
            SharedStateUtil.setNumberOfSpectators(
                this.stateBucket.currentGameState.people.filter(p => p.userType === USER_TYPES.SPECTATOR).length,
                document.getElementById('spectator-count')
            );
        });

        this.socket.on(EVENT_IDS.KICK_PERSON, (kickedId, gameIsStartable) => {
            if (kickedId === this.stateBucket.currentGameState.client.id) {
                window.location = '/?message=' + encodeURIComponent('You were kicked by the moderator.');
            } else {
                this.handlePersonExiting(kickedId, gameIsStartable, EVENT_IDS.KICK_PERSON);
            }
        });

        this.socket.on(EVENT_IDS.UPDATE_GAME_ROLES, (deck, gameSize, isStartable) => {
            this.stateBucket.currentGameState.deck = deck;
            this.stateBucket.currentGameState.gameSize = gameSize;
            this.stateBucket.currentGameState.isStartable = isStartable;
            this.setPlayerCount();
        });

        this.socket.on(EVENT_IDS.UPDATE_GAME_TIMER, (hasTimer, timerParams) => {
            this.stateBucket.currentGameState.hasTimer = hasTimer;
            this.stateBucket.currentGameState.timerParams = timerParams;
            this.setTimer();
        });

        this.socket.on(EVENT_IDS.LEAVE_ROOM, (leftId, gameIsStartable) => {
            if (leftId === this.stateBucket.currentGameState.client.id) {
                window.location = '/?message=' + encodeURIComponent('You left the room.');
            } else {
                this.handlePersonExiting(leftId, gameIsStartable, EVENT_IDS.LEAVE_ROOM);
            }
        });
    }

    handlePersonExiting (id, gameIsStartable, event) {
        const index = this.stateBucket.currentGameState.people.findIndex(person => person.id === id);
        if (index >= 0) {
            this.stateBucket.currentGameState.people
                .splice(index, 1);
        }
        this.stateBucket.currentGameState.isStartable = gameIsStartable;
        SharedStateUtil.setNumberOfSpectators(
            this.stateBucket.currentGameState.people.filter(p => p.userType === USER_TYPES.SPECTATOR).length,
            document.getElementById('spectator-count')
        );
        this.populatePlayers();
        if ((
            this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
            || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
        )
        ) {
            toast(
                event === EVENT_IDS.LEAVE_ROOM ? 'A player left.' : 'Player kicked.',
                event === EVENT_IDS.LEAVE_ROOM ? 'warning' : 'success',
                true,
                true,
                'short'
            );
            this.displayStartGamePromptForModerators();
        }
    }

    displayStartGamePromptForModerators () {
        const existingPrompt = document.getElementById('start-game-prompt');
        if (existingPrompt) {
            enableStartButton(existingPrompt, this.startGameHandler);
            document.getElementById('edit-roles-button').addEventListener('click', this.editRolesHandler);
            document.getElementById('edit-timer-button').addEventListener('click', this.editTimerHandler);
        } else {
            const newPrompt = document.createElement('div');
            newPrompt.setAttribute('id', 'start-game-prompt');
            newPrompt.innerHTML = HTMLFragments.START_GAME_PROMPT;

            document.body.appendChild(newPrompt);
            enableStartButton(newPrompt, this.startGameHandler);
            document.getElementById('edit-roles-button').addEventListener('click', this.editRolesHandler);
            document.getElementById('edit-timer-button').addEventListener('click', this.editTimerHandler);
        }
    }

    displayPlayerPrompt () {
        const existingPrompt = document.getElementById('leave-game-prompt');
        if (existingPrompt) {
            enableLeaveButton(existingPrompt, this.leaveGameHandler);
        } else {
            const newPrompt = document.createElement('div');
            newPrompt.setAttribute('id', 'leave-game-prompt');
            newPrompt.innerHTML = HTMLFragments.LEAVE_GAME_PROMPT;

            document.body.appendChild(newPrompt);
            enableLeaveButton(newPrompt, this.leaveGameHandler);
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

function enableLeaveButton (buttonContainer, handler) {
    buttonContainer.querySelector('#leave-game-button').addEventListener('click', handler);
    buttonContainer.querySelector('#leave-game-button').classList.remove('disabled');
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
            timeString += hours + 'h ';
        }
        if (minutes) {
            timeString += minutes + 'm';
        }
        return timeString;
    } else {
        return 'untimed';
    }
}

function renderLobbyPerson (person, gameState, socket) {
    const el = document.createElement('div');
    el.dataset.pointer = person.id;
    const personNameEl = document.createElement('div');
    personNameEl.classList.add('lobby-player-name', 'person-name-element');
    const personTypeEl = document.createElement('div');
    personNameEl.innerText = person.name;
    personTypeEl.innerText = person.userType + USER_TYPE_ICONS[person.userType];
    el.classList.add('lobby-player');
    if (person.userType === USER_TYPES.MODERATOR || person.userType === USER_TYPES.TEMPORARY_MODERATOR) {
        el.classList.add('moderator');
    }

    el.appendChild(personNameEl);
    el.appendChild(personTypeEl);

    if ((gameState.client.userType === USER_TYPES.MODERATOR || gameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR)
        && person.userType !== USER_TYPES.MODERATOR && person.userType !== USER_TYPES.TEMPORARY_MODERATOR) {
        SharedStateUtil.addPlayerOptions(el, person, socket, gameState);
        el.dataset.pointer = person.id;
    }

    return el;
}
