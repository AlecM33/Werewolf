import { toast } from '../../front_end_components/Toast.js';
import {
    STATUS,
    EVENT_IDS,
    SOCKET_EVENTS,
    USER_TYPE_ICONS,
    USER_TYPES,
    ALIGNMENT
} from '../../../config/globals.js';
import { HTMLFragments } from '../../front_end_components/HTMLFragments.js';
import { Confirmation } from '../../front_end_components/Confirmation.js';
import { ModalManager } from '../../front_end_components/ModalManager.js';
import { GameTimerManager } from '../../timer/GameTimerManager.js';
import { SharedStateUtil } from './shared/SharedStateUtil.js';

export class InProgress {
    constructor (containerId, stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.socket = socket;
        this.container = document.getElementById(containerId);
        this.killPlayerHandlers = {};
        this.revealRoleHandlers = {};
        this.transferModHandlers = {};
    }

    setUserView (userType) {
        switch (userType) {
            case USER_TYPES.PLAYER:
                this.container.innerHTML = HTMLFragments.PLAYER_GAME_VIEW;
                this.renderPlayerView();
                break;
            case USER_TYPES.KILLED_PLAYER:
                this.container.innerHTML = HTMLFragments.PLAYER_GAME_VIEW;
                this.renderPlayerView(true);
                break;
            case USER_TYPES.MODERATOR:
                document.getElementById('transfer-mod-prompt').innerHTML = HTMLFragments.TRANSFER_MOD_MODAL;
                document.getElementById('player-options-prompt').innerHTML = HTMLFragments.PLAYER_OPTIONS_MODAL;
                this.container.innerHTML = HTMLFragments.MODERATOR_GAME_VIEW;
                this.renderModeratorView();
                break;
            case USER_TYPES.TEMPORARY_MODERATOR:
                document.getElementById('transfer-mod-prompt').innerHTML = HTMLFragments.TRANSFER_MOD_MODAL;
                document.getElementById('player-options-prompt').innerHTML = HTMLFragments.PLAYER_OPTIONS_MODAL;
                this.container.innerHTML = HTMLFragments.TEMP_MOD_GAME_VIEW;
                this.renderTempModView();
                break;
            case USER_TYPES.SPECTATOR:
                this.container.innerHTML = HTMLFragments.SPECTATOR_GAME_VIEW;
                this.renderSpectatorView();
                break;
            default:
                break;
        }

        if (this.stateBucket.currentGameState.timerParams) {
            this.socket.emit(
                SOCKET_EVENTS.IN_GAME_MESSAGE,
                EVENT_IDS.GET_TIME_REMAINING,
                this.stateBucket.currentGameState.accessCode
            );
            setTimeout(() => {
                if (this.socket.hasListeners(EVENT_IDS.GET_TIME_REMAINING) && document.getElementById('game-timer') !== null) {
                    document.getElementById('game-timer').innerText = 'Timer not found.';
                    document.getElementById('game-timer').classList.add('timer-error');
                }
            }, 15000);
        } else {
            document.querySelector('#game-timer')?.remove();
            document.querySelector('#timer-container-moderator')?.remove();
            document.querySelector('label[for="game-timer"]')?.remove();
        }

        const spectatorCount = this.container.querySelector('#spectator-count');
        const spectatorHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                Confirmation(
                    SharedStateUtil.buildSpectatorList(
                        this.stateBucket.currentGameState.people
                            .filter(p => p.userType === USER_TYPES.SPECTATOR),
                        this.stateBucket.currentGameState.client,
                        this.socket,
                        this.stateBucket.currentGameState),
                    null,
                    true
                );
            }
        };

        if (spectatorCount) {
            SharedStateUtil.setNumberOfSpectators(
                this.stateBucket.currentGameState.people.filter(p => p.userType === USER_TYPES.SPECTATOR).length,
                spectatorCount
            );
            spectatorCount?.addEventListener('click', spectatorHandler);
            spectatorCount?.addEventListener('keyup', spectatorHandler);
        }
    }

    renderPlayerView (isKilled = false) {
        if (isKilled) {
            const clientUserType = document.getElementById('client-user-type');
            if (clientUserType) {
                clientUserType.innerText = USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80';
            }
        }
        renderPlayerRole(this.stateBucket.currentGameState);
        SharedStateUtil.displayCurrentModerator(this.stateBucket.currentGameState.people
            .find((person) => person.userType === USER_TYPES.MODERATOR
                || person.userType === USER_TYPES.TEMPORARY_MODERATOR));
        this.renderPlayersWithNoRoleInformationUnlessRevealed(false);
    }

    renderPlayersWithNoRoleInformationUnlessRevealed (tempMod = false) {
        if (tempMod) {
            this.removePlayerListEventListeners();
        }
        document.querySelectorAll('.game-player').forEach((el) => el.remove());
        /* TODO: UX issue - it's easier to parse visually when players are sorted this way,
          but shifting players around when they are killed or revealed is bad UX for the moderator. */
        // sortPeopleByStatus(this.stateBucket.currentGameState.people);
        const modType = tempMod
            ? this.stateBucket.currentGameState.people.find(person =>
                person.id === this.stateBucket.currentGameState.currentModeratorId).userType
            : null;
        this.renderGroupOfPlayers(
            this.stateBucket.currentGameState.people.filter(
                p => (p.userType !== USER_TYPES.MODERATOR && p.userType !== USER_TYPES.SPECTATOR)
                || p.killed
            ),
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.stateBucket.currentGameState.accessCode,
            null,
            modType,
            this.socket
        );
        document.getElementById('players-alive-label').innerText =
            'Players: ' + this.stateBucket.currentGameState.people.filter((person) => !person.out).length + ' / ' +
            this.stateBucket.currentGameState.gameSize + ' Alive';
    }

    removePlayerListEventListeners (removeEl = true) {
        document.querySelectorAll('.game-player').forEach((el) => {
            const pointer = el.dataset.pointer;
            if (pointer && this.killPlayerHandlers[pointer]) {
                el.removeEventListener('click', this.killPlayerHandlers[pointer]);
                delete this.killPlayerHandlers[pointer];
            }
            if (pointer && this.revealRoleHandlers[pointer]) {
                el.removeEventListener('click', this.revealRoleHandlers[pointer]);
                delete this.revealRoleHandlers[pointer];
            }
            if (removeEl) {
                el.remove();
            }
        });
    }

    renderModeratorView () {
        createEndGamePromptComponent(this.socket, this.stateBucket);

        const modTransferButton = document.getElementById('mod-transfer-button');
        modTransferButton.addEventListener(
            'click', () => {
                this.displayAvailableModerators();
                ModalManager.displayModal(
                    'transfer-mod-modal',
                    'transfer-mod-modal-background',
                    'close-mod-transfer-modal-button'
                );
            }
        );
        this.renderPlayersWithRoleAndAlignmentInfo();
    }

    renderTempModView () {
        createEndGamePromptComponent(this.socket, this.stateBucket);

        renderPlayerRole(this.stateBucket.currentGameState);
        this.renderPlayersWithNoRoleInformationUnlessRevealed(true);
    }

    renderSpectatorView () {
        SharedStateUtil.displayCurrentModerator(this.stateBucket.currentGameState.people
            .find((person) => person.userType === USER_TYPES.MODERATOR
                || person.userType === USER_TYPES.TEMPORARY_MODERATOR));
        this.renderPlayersWithNoRoleInformationUnlessRevealed();
    }

    setSocketHandlers () {
        this.socket.on(EVENT_IDS.KILL_PLAYER, (killedPlayer) => {
            this.stateBucket.currentGameState.people = this.stateBucket.currentGameState.people
                .map(person => person.id === killedPlayer.id ? killedPlayer : person);
            if (this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR) {
                toast(killedPlayer.name + ' killed.', 'success', true, true, 'medium');
                this.renderPlayersWithRoleAndAlignmentInfo(this.stateBucket.currentGameState.status === STATUS.ENDED);
            } else {
                if (killedPlayer.id === this.stateBucket.currentGameState.client.id) {
                    const clientUserType = document.getElementById('client-user-type');
                    if (clientUserType) {
                        clientUserType.innerText = USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80';
                    }
                    this.updatePlayerCardToKilledState();
                    toast('You have been killed!', 'warning', true, true, 'medium');
                } else {
                    toast(killedPlayer.name + ' was killed!', 'warning', true, true, 'medium');
                    if (killedPlayer.userType === USER_TYPES.MODERATOR
                        && this.stateBucket.currentGameState.client.userType !== USER_TYPES.TEMPORARY_MODERATOR) {
                        SharedStateUtil.displayCurrentModerator(killedPlayer);
                    }
                }
                if (this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                    this.removePlayerListEventListeners(false);
                } else {
                    this.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                }
            }
        });

        this.socket.on(EVENT_IDS.REVEAL_PLAYER, (revealData) => {
            const revealedPerson = this.stateBucket.currentGameState.people.find((person) => person.id === revealData.id);
            if (revealedPerson) {
                revealedPerson.revealed = true;
                revealedPerson.gameRole = revealData.gameRole;
                revealedPerson.alignment = revealData.alignment;
                if (this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR) {
                    if (revealedPerson.id === this.stateBucket.currentGameState.client.id) {
                        toast('You revealed your role.', 'success', true, true, 'medium');
                    } else {
                        toast(revealedPerson.name + ' revealed.', 'success', true, true, 'medium');
                    }

                    this.renderPlayersWithRoleAndAlignmentInfo(this.stateBucket.currentGameState.status === STATUS.ENDED);
                } else {
                    if (revealedPerson.id === this.stateBucket.currentGameState.client.id) {
                        toast('Your role has been revealed!', 'warning', true, true, 'medium');
                    } else {
                        toast(revealedPerson.name + ' was revealed as a ' + revealedPerson.gameRole + '!', 'warning', true, true, 'medium');
                    }
                    if (this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                        this.renderPlayersWithNoRoleInformationUnlessRevealed(true);
                    } else {
                        this.renderPlayersWithNoRoleInformationUnlessRevealed(false);
                    }
                }
            }
        });

        this.socket.on(EVENT_IDS.ADD_SPECTATOR, (spectator) => {
            this.stateBucket.currentGameState.people.push(spectator);
            SharedStateUtil.setNumberOfSpectators(
                this.stateBucket.currentGameState.people.filter(p => p.userType === USER_TYPES.SPECTATOR).length,
                document.getElementById('spectator-count')
            );
            if (this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                this.displayAvailableModerators();
            }
        });

        this.socket.on(EVENT_IDS.KICK_PERSON, (kickedId, gameIsStartable) => {
            if (kickedId === this.stateBucket.currentGameState.client.id) {
                window.location = '/?message=' + encodeURIComponent('You were kicked by the moderator.');
            } else {
                this.handleSpectatorExiting(kickedId);
            }
        });

        if (this.stateBucket.currentGameState.timerParams) {
            if (this.stateBucket.timerWorker) {
                this.stateBucket.timerWorker.terminate();
                this.stateBucket.timerWorker = null;
            }

            this.stateBucket.timerWorker = new Worker(new URL('../../timer/Timer.js', import.meta.url));

            const gameTimerManager = new GameTimerManager(this.stateBucket, this.socket);
            gameTimerManager.attachTimerSocketListeners(this.socket, this.stateBucket.timerWorker);
        }
    }

    renderPlayersWithRoleAndAlignmentInfo () {
        removeExistingPlayerElements(this.killPlayerHandlers, this.revealRoleHandlers);
        this.stateBucket.currentGameState.people.sort((a, b) => {
            return a.name >= b.name ? 1 : -1;
        });
        const teamGood = this.stateBucket.currentGameState.people.filter(
            (p) => p.alignment === ALIGNMENT.GOOD
                && ((p.userType !== USER_TYPES.MODERATOR && p.userType !== USER_TYPES.SPECTATOR)
                    || p.killed)

        );
        const teamEvil = this.stateBucket.currentGameState.people.filter((p) => p.alignment === ALIGNMENT.EVIL
            && ((p.userType !== USER_TYPES.MODERATOR && p.userType !== USER_TYPES.SPECTATOR)
                || p.killed)
        );
        this.renderGroupOfPlayers(
            teamEvil,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.stateBucket.currentGameState.accessCode,
            ALIGNMENT.EVIL,
            this.stateBucket.currentGameState.people.find(person =>
                person.id === this.stateBucket.currentGameState.currentModeratorId).userType,
            this.socket
        );
        this.renderGroupOfPlayers(
            teamGood,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.stateBucket.currentGameState.accessCode,
            ALIGNMENT.GOOD,
            this.stateBucket.currentGameState.people.find(person =>
                person.id === this.stateBucket.currentGameState.currentModeratorId).userType,
            this.socket
        );
        document.getElementById('players-alive-label').innerText =
            'Players: ' + this.stateBucket.currentGameState.people.filter((person) => !person.out).length + ' / ' +
            this.stateBucket.currentGameState.gameSize + ' Alive';
    }

    renderGroupOfPlayers (
        people,
        killPlayerHandlers,
        revealRoleHandlers,
        accessCode = null,
        alignment = null,
        moderatorType,
        socket = null
    ) {
        for (const player of people) {
            const playerEl = document.createElement('div');
            playerEl.classList.add('game-player');
            playerEl.dataset.pointer = player.id;

            // add a reference to the player's id for each corresponding element in the list
            if (moderatorType) {
                playerEl.dataset.pointer = player.id;
                playerEl.innerHTML = HTMLFragments.MODERATOR_PLAYER;
            } else {
                playerEl.innerHTML = HTMLFragments.GAME_PLAYER;
            }

            playerEl.querySelector('.game-player-name').innerText = player.name;
            const roleElement = playerEl.querySelector('.game-player-role');

            // Add role/alignment indicators if necessary
            if (moderatorType === USER_TYPES.MODERATOR || player.revealed) {
                if (alignment === null) {
                    roleElement.classList.add(player.alignment);
                } else {
                    roleElement.classList.add(alignment);
                }
                roleElement.innerText = player.gameRole;
            } else {
                roleElement.innerText = 'Role Unknown';
            }

            // Change element based on player's in/out status
            if (player.out) {
                playerEl.classList.add('killed');
                if (moderatorType) {
                    playerEl.querySelector('.kill-player-button')?.remove();
                    insertPlaceholderButton(playerEl, false, 'killed');
                }
            } else if (!player.out && moderatorType) {
                killPlayerHandlers[player.id] = () => {
                    Confirmation('Kill \'' + player.name + '\'?', () => {
                        if (this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
                            socket.emit(SOCKET_EVENTS.IN_GAME_MESSAGE, EVENT_IDS.ASSIGN_DEDICATED_MOD, accessCode, { personId: player.id });
                        } else {
                            socket.emit(SOCKET_EVENTS.IN_GAME_MESSAGE, EVENT_IDS.KILL_PLAYER, accessCode, { personId: player.id });
                        }
                    });
                };
                playerEl.querySelector('.kill-player-button').addEventListener('click', killPlayerHandlers[player.id]);
            }

            // change element based on player's revealed/unrevealed status
            if (player.revealed) {
                if (moderatorType) {
                    playerEl.querySelector('.reveal-role-button')?.remove();
                    insertPlaceholderButton(playerEl, true, 'revealed');
                }
            } else if (!player.revealed && moderatorType) {
                revealRoleHandlers[player.id] = () => {
                    Confirmation('Reveal  \'' + player.name + '\'?', () => {
                        socket.emit(SOCKET_EVENTS.IN_GAME_MESSAGE, EVENT_IDS.REVEAL_PLAYER, accessCode, { personId: player.id });
                    });
                };
                playerEl.querySelector('.reveal-role-button').addEventListener('click', revealRoleHandlers[player.id]);
            }

            const playerListContainerId = moderatorType === USER_TYPES.MODERATOR
                ? 'player-list-moderator-team-' + alignment
                : 'game-player-list';

            document.getElementById(playerListContainerId).appendChild(playerEl);
        }
    }

    handleSpectatorExiting (id) {
        const index = this.stateBucket.currentGameState.people.findIndex(person => person.id === id);
        if (index >= 0) {
            this.stateBucket.currentGameState.people
                .splice(index, 1);
        }
        SharedStateUtil.setNumberOfSpectators(
            this.stateBucket.currentGameState.people.filter(p => p.userType === USER_TYPES.SPECTATOR).length,
            document.getElementById('spectator-count')
        );
        if (this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
            || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR) {
            toast(
                'Spectator kicked.',
                'success',
                true,
                true,
                'short'
            );
        }
    }

    displayAvailableModerators () {
        document.getElementById('transfer-mod-modal-content').innerText = '';
        document.querySelectorAll('.potential-moderator').forEach((el) => {
            const pointer = el.dataset.pointer;
            if (pointer && this.transferModHandlers[pointer]) {
                el.removeEventListener('click', this.transferModHandlers[pointer]);
                delete this.transferModHandlers[pointer];
            }
            el.remove();
        });
        renderPotentialMods(
            this.stateBucket.currentGameState,
            this.stateBucket.currentGameState.people,
            this.transferModHandlers,
            this.socket
        );

        if (document.querySelectorAll('.potential-moderator').length === 0) {
            document.getElementById('transfer-mod-modal-content').innerText =
                'There is nobody available to transfer to. Only spectators or killed players (who are not bots) can be mods.';
        }
    }

    updatePlayerCardToKilledState () {
        document.querySelector('#role-image').classList.add('killed-card');
        document.getElementById('role-image').setAttribute(
            'src',
            '../images/tombstone.png'
        );
    }
}

function renderPlayerRole (gameState) {
    const name = document.querySelector('#role-name');
    name.innerText = gameState.client.gameRole;
    if (gameState.client.alignment === ALIGNMENT.GOOD) {
        document.getElementById('game-role').classList.add('game-role-good');
        name.classList.add('good');
    } else {
        document.getElementById('game-role').classList.add('game-role-evil');
        name.classList.add('evil');
    }
    name.setAttribute('title', gameState.client.gameRole);
    if (gameState.client.out) {
        document.querySelector('#role-image').classList.add('killed-card');
        document.getElementById('role-image').setAttribute(
            'src',
            '../images/tombstone.png'
        );
    } else {
        if (gameState.client.gameRole.toLowerCase() === 'villager') {
            document.getElementById('role-image').setAttribute(
                'src',
                '../images/roles/Villager' + Math.ceil(Math.random() * 2) + '.png'
            );
        } else {
            if (gameState.client.customRole) {
                document.getElementById('role-image').setAttribute(
                    'src',
                    '../images/roles/custom-role.svg'
                );
            } else {
                document.getElementById('role-image').setAttribute(
                    'src',
                    '../images/roles/' + gameState.client.gameRole.replaceAll(' ', '') + '.png'
                );
            }
        }
    }

    document.querySelector('#role-description').innerText = gameState.client.gameRoleDescription;

    const roleBackHandler = (e) => {
        if (e.type === 'dblclick' || e.code === 'Enter') {
            document.getElementById('game-role').style.display = 'flex';
            document.getElementById('game-role-back').style.display = 'none';
        }
    };

    const roleFrontHandler = (e) => {
        if (e.type === 'dblclick' || e.code === 'Enter') {
            document.getElementById('game-role-back').style.display = 'flex';
            document.getElementById('game-role').style.display = 'none';
        }
    };

    document.getElementById('game-role-back').addEventListener('dblclick', roleBackHandler);
    document.getElementById('game-role-back').addEventListener('keyup', roleBackHandler);

    document.getElementById('game-role').addEventListener('dblclick', roleFrontHandler);
    document.getElementById('game-role').addEventListener('keyup', roleFrontHandler);
}

function removeExistingPlayerElements (killPlayerHandlers, revealRoleHandlers) {
    document.querySelectorAll('.game-player').forEach((el) => {
        const pointer = el.dataset.pointer;
        if (pointer && killPlayerHandlers[pointer]) {
            el.removeEventListener('click', killPlayerHandlers[pointer]);
            delete killPlayerHandlers[pointer];
        }
        if (pointer && revealRoleHandlers[pointer]) {
            el.removeEventListener('click', revealRoleHandlers[pointer]);
            delete revealRoleHandlers[pointer];
        }
        el.remove();
    });
}

function createEndGamePromptComponent (socket, stateBucket) {
    if (document.querySelector('#game-control-prompt') === null) {
        const div = document.createElement('div');
        div.id = 'game-control-prompt';
        div.innerHTML = HTMLFragments.END_GAME_BUTTON;
        div.querySelector('#end-game-button').addEventListener('click', (e) => {
            e.preventDefault();
            Confirmation('End the game?', () => {
                toast('Ending...', 'neutral', true, false);
                socket.emit(
                    SOCKET_EVENTS.IN_GAME_MESSAGE,
                    EVENT_IDS.END_GAME,
                    stateBucket.currentGameState.accessCode,
                    null,
                    () => {
                        toast('Game ended.', 'success', true);
                    }
                );
            });
        });
        div.prepend(SharedStateUtil.createReturnToLobbyButton(stateBucket));
        document.getElementById('game-content').appendChild(div);
    }
}

function insertPlaceholderButton (container, append, type) {
    const button = document.createElement('div');
    button.classList.add('placeholder-button');
    if (type === 'killed') {
        button.innerText = 'Killed';
    } else {
        button.innerText = 'Revealed';
    }
    if (append) {
        container.querySelector('.player-action-buttons').appendChild(button);
    } else {
        container.querySelector('.player-action-buttons').prepend(button);
    }
}

function renderPotentialMods (gameState, group, transferModHandlers, socket) {
    const modalContent = document.getElementById('transfer-mod-modal-content');
    for (const member of group) {
        if ((member.userType === USER_TYPES.KILLED_PLAYER || member.userType === USER_TYPES.SPECTATOR) && !(member.id === gameState.client.id)) {
            const container = document.createElement('div');
            container.classList.add('potential-moderator');
            container.setAttribute('tabindex', '0');
            container.dataset.pointer = member.id;
            container.innerHTML =
                '<div class=\'potential-mod-name\'></div>' +
                '<div>' + member.userType + ' ' + USER_TYPE_ICONS[member.userType] + ' </div>';
            container.querySelector('.potential-mod-name').innerText = member.name;
            transferModHandlers[member.id] = (e) => {
                if (e.type === 'click' || e.code === 'Enter') {
                    ModalManager.dispelModal('transfer-mod-modal', 'transfer-mod-modal-background');
                    Confirmation('Transfer moderator powers to \'' + member.name + '\'?', () => {
                        toast('Transferring...', 'neutral', true, false);
                        const transferPrompt = document.getElementById('transfer-mod-prompt');
                        if (transferPrompt !== null) {
                            transferPrompt.innerHTML = '';
                        }
                        socket.timeout(5000).emit(
                            SOCKET_EVENTS.IN_GAME_MESSAGE,
                            EVENT_IDS.TRANSFER_MODERATOR,
                            gameState.accessCode,
                            { personId: member.id },
                            () => {
                                toast('Transferred!', 'success', true, true);
                            }
                        );
                    });
                }
            };

            container.addEventListener('click', transferModHandlers[member.id]);
            container.addEventListener('keyup', transferModHandlers[member.id]);
            modalContent.appendChild(container);
        }
    }
}
