import { globals } from '../config/globals.js';
import { toast } from './Toast.js';
import { templates } from './Templates.js';
import { ModalManager } from './ModalManager.js';

export class GameStateRenderer {
    constructor (stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.socket = socket;
        this.killPlayerHandlers = {};
        this.revealRoleHandlers = {};
        this.transferModHandlers = {};
        this.startGameHandler = (e) => {
            e.preventDefault();
            if (confirm('Start the game and deal roles?')) {
                socket.emit(globals.COMMANDS.START_GAME, this.stateBucket.currentGameState.accessCode);
            }
        };
    }

    renderLobbyPlayers () {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove());
        const lobbyPlayersContainer = document.getElementById('lobby-players');
        if (this.stateBucket.currentGameState.moderator.userType === globals.USER_TYPES.MODERATOR) {
            lobbyPlayersContainer.appendChild(
                renderLobbyPerson(
                    this.stateBucket.currentGameState.moderator.name,
                    this.stateBucket.currentGameState.moderator.userType
                )
            );
        }
        for (const person of this.stateBucket.currentGameState.people) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person.name, person.userType));
        }
        const playerCount = this.stateBucket.currentGameState.people.length;
        document.querySelector("label[for='lobby-players']").innerText =
            'Participants (' + playerCount + '/' + getGameSize(this.stateBucket.currentGameState.deck) + ' Players)';
    }

    renderLobbyHeader () {
        removeExistingTitle();
        const title = document.createElement('h1');
        title.innerText = 'Lobby';
        document.getElementById('game-title').appendChild(title);
        const gameLinkContainer = document.getElementById('game-link');
        const linkDiv = document.createElement('div');
        linkDiv.innerText = window.location;
        gameLinkContainer.prepend(linkDiv);
        const linkCopyHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                navigator.clipboard.writeText(gameLinkContainer.innerText).then(() => {
                    toast('Link copied!', 'success', true);
                });
            }
        };
        gameLinkContainer.addEventListener('click', linkCopyHandler);
        gameLinkContainer.addEventListener('keyup', linkCopyHandler);
        const copyImg = document.createElement('img');
        copyImg.setAttribute('src', '../images/copy.svg');
        gameLinkContainer.appendChild(copyImg);

        const time = document.getElementById('game-time');
        const playerCount = document.getElementById('game-player-count');
        playerCount.innerText = getGameSize(this.stateBucket.currentGameState.deck) + ' Players';

        if (this.stateBucket.currentGameState.timerParams) {
            let timeString = '';
            const hours = this.stateBucket.currentGameState.timerParams.hours;
            const minutes = this.stateBucket.currentGameState.timerParams.minutes;
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
            time.innerText = timeString;
        } else {
            time.innerText = 'untimed';
        }
    }

    renderLobbyFooter () {
        for (const card of this.stateBucket.currentGameState.deck) {
            const cardEl = document.createElement('div');
            cardEl.innerText = card.quantity + 'x ' + card.role;
            cardEl.classList.add('lobby-card');
        }
    }

    renderGameHeader () {
        removeExistingTitle();
        // let title = document.createElement("h1");
        // title.innerText = "Game";
        // document.getElementById("game-title").appendChild(title);
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

    renderPlayerView (isKilled = false) {
        if (isKilled) {
            const clientUserType = document.getElementById('client-user-type');
            if (clientUserType) {
                clientUserType.innerText = globals.USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80';
            }
        }
        renderPlayerRole(this.stateBucket.currentGameState);
        this.renderPlayersWithNoRoleInformationUnlessRevealed(false);
    }

    renderSpectatorView () {
        this.renderPlayersWithNoRoleInformationUnlessRevealed();
    }

    refreshPlayerList (isModerator) {
        if (isModerator) {
            this.renderPlayersWithRoleAndAlignmentInfo();
        } else {
            this.renderPlayersWithNoRoleInformationUnlessRevealed();
        }
    }

    renderPlayersWithRoleAndAlignmentInfo () {
        removeExistingPlayerElements(this.killPlayerHandlers, this.revealRoleHandlers);
        this.stateBucket.currentGameState.people.sort((a, b) => {
            return a.name >= b.name ? 1 : -1;
        });
        const teamGood = this.stateBucket.currentGameState.people.filter((person) => person.alignment === globals.ALIGNMENT.GOOD);
        const teamEvil = this.stateBucket.currentGameState.people.filter((person) => person.alignment === globals.ALIGNMENT.EVIL);
        renderGroupOfPlayers(
            teamEvil,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.stateBucket.currentGameState.accessCode,
            globals.ALIGNMENT.EVIL,
            this.stateBucket.currentGameState.moderator.userType,
            this.socket
        );
        renderGroupOfPlayers(
            teamGood,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.stateBucket.currentGameState.accessCode,
            globals.ALIGNMENT.GOOD,
            this.stateBucket.currentGameState.moderator.userType,
            this.socket
        );
        document.getElementById('players-alive-label').innerText =
            'Players: ' + this.stateBucket.currentGameState.people.filter((person) => !person.out).length + ' / ' +
            this.stateBucket.currentGameState.people.length + ' Alive';
    }

    renderPlayersWithNoRoleInformationUnlessRevealed (tempMod = false) {
        if (tempMod) {
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
                el.remove();
            });
        }
        document.querySelectorAll('.game-player').forEach((el) => el.remove());
        sortPeopleByStatus(this.stateBucket.currentGameState.people);
        const modType = tempMod ? this.stateBucket.currentGameState.moderator.userType : null;
        renderGroupOfPlayers(
            this.stateBucket.currentGameState.people,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.stateBucket.currentGameState.accessCode,
            null,
            modType,
            this.socket
        );
        document.getElementById('players-alive-label').innerText =
            'Players: ' + this.stateBucket.currentGameState.people.filter((person) => !person.out).length + ' / ' +
            this.stateBucket.currentGameState.people.length + ' Alive';
    }

    updatePlayerCardToKilledState () {
        document.querySelector('#role-image').classList.add('killed-card');
        document.getElementById('role-image').setAttribute(
            'src',
            '../images/tombstone.png'
        );
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
        renderPotentialMods( // spectators can also be made mods.
            this.stateBucket.currentGameState,
            this.stateBucket.currentGameState.spectators,
            this.transferModHandlers,
            this.socket
        );

        if (document.querySelectorAll('.potential-moderator').length === 0) {
            document.getElementById('transfer-mod-modal-content').innerText = 'There is nobody available to transfer to.';
        }
    }

    renderEndOfGame () {
        this.renderPlayersWithNoRoleInformationUnlessRevealed();
    }
}

function renderPotentialMods (gameState, group, transferModHandlers, socket) {
    const modalContent = document.getElementById('transfer-mod-modal-content');
    for (const member of group) {
        if ((member.out || member.userType === globals.USER_TYPES.SPECTATOR) && !(member.id === gameState.client.id)) {
            const container = document.createElement('div');
            container.classList.add('potential-moderator');
            container.setAttribute("tabindex", "0");
            container.dataset.pointer = member.id;
            container.innerText = member.name;
            transferModHandlers[member.id] = (e) => {
                if (e.type === 'click' || e.code === 'Enter') {
                    if (confirm('Transfer moderator powers to ' + member.name + '?')) {
                        socket.emit(globals.COMMANDS.TRANSFER_MODERATOR, gameState.accessCode, member.id);
                    }
                }
            };

            container.addEventListener('click', transferModHandlers[member.id]);
            container.addEventListener('keyup', transferModHandlers[member.id]);
            modalContent.appendChild(container);
        }
    }
}

function renderLobbyPerson (name, userType) {
    const el = document.createElement('div');
    const personNameEl = document.createElement('div');
    const personTypeEl = document.createElement('div');
    personNameEl.innerText = name;
    personTypeEl.innerText = userType + globals.USER_TYPE_ICONS[userType];
    el.classList.add('lobby-player');

    el.appendChild(personNameEl);
    el.appendChild(personTypeEl);

    return el;
}

function sortPeopleByStatus (people) {
    people.sort((a, b) => {
        if (a.out !== b.out) {
            return a.out ? 1 : -1;
        } else {
            if (a.revealed !== b.revealed) {
                return a.revealed ? -1 : 1;
            }
            return a.name >= b.name ? 1 : -1;
        }
    });
}

function getGameSize (cards) {
    let quantity = 0;
    for (const card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

function removeExistingTitle () {
    const existingTitle = document.querySelector('#game-title h1');
    if (existingTitle) {
        existingTitle.remove();
    }
}

// TODO: refactor to reduce the cyclomatic complexity of this function
function renderGroupOfPlayers (
    people,
    killPlayerHandlers,
    revealRoleHandlers,
    accessCode = null,
    alignment = null,
    moderatorType,
    socket = null
) {
    for (const player of people) {
        const container = document.createElement('div');
        container.classList.add('game-player');
        if (moderatorType) {
            container.dataset.pointer = player.id;
            container.innerHTML = templates.MODERATOR_PLAYER;
        } else {
            container.innerHTML = templates.GAME_PLAYER;
        }
        container.querySelector('.game-player-name').innerText = player.name;
        const roleElement = container.querySelector('.game-player-role');

        if (moderatorType) {
            roleElement.classList.add(alignment);
            if (moderatorType === globals.USER_TYPES.MODERATOR) {
                roleElement.innerText = player.gameRole;
                document.getElementById('player-list-moderator-team-' + alignment).appendChild(container);
            } else {
                if (player.revealed) {
                    roleElement.innerText = player.gameRole;
                    roleElement.classList.add(player.alignment);
                } else {
                    roleElement.innerText = 'Unknown';
                }
                document.getElementById('game-player-list').appendChild(container);
            }
        } else if (player.revealed) {
            roleElement.classList.add(player.alignment);
            roleElement.innerText = player.gameRole;
            document.getElementById('game-player-list').appendChild(container);
        } else {
            roleElement.innerText = 'Unknown';
            document.getElementById('game-player-list').appendChild(container);
        }

        if (player.out) {
            container.classList.add('killed');
            if (moderatorType) {
                container.querySelector('.kill-player-button')?.remove();
                insertPlaceholderButton(container, false, 'killed');
            }
        } else {
            if (moderatorType) {
                killPlayerHandlers[player.id] = () => {
                    if (confirm('KILL ' + player.name + '?')) {
                        socket.emit(globals.COMMANDS.KILL_PLAYER, accessCode, player.id);
                    }
                };
                container.querySelector('.kill-player-button').addEventListener('click', killPlayerHandlers[player.id]);
            }
        }

        if (player.revealed) {
            if (moderatorType) {
                container.querySelector('.reveal-role-button')?.remove();
                insertPlaceholderButton(container, true, 'revealed');
            }
        } else {
            if (moderatorType) {
                revealRoleHandlers[player.id] = () => {
                    if (confirm('REVEAL ' + player.name + '?')) {
                        socket.emit(globals.COMMANDS.REVEAL_PLAYER, accessCode, player.id);
                    }
                };
                container.querySelector('.reveal-role-button').addEventListener('click', revealRoleHandlers[player.id]);
            }
        }
    }
}

function renderPlayerRole (gameState) {
    const name = document.querySelector('#role-name');
    name.innerText = gameState.client.gameRole;
    if (gameState.client.alignment === globals.ALIGNMENT.GOOD) {
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

    document.getElementById('game-role-back').addEventListener('click', () => {
        document.getElementById('game-role').style.display = 'flex';
        document.getElementById('game-role-back').style.display = 'none';
    });

    document.getElementById('game-role').addEventListener('click', () => {
        document.getElementById('game-role-back').style.display = 'flex';
        document.getElementById('game-role').style.display = 'none';
    });
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
    if (document.querySelector('#end-game-prompt') === null) {
        const div = document.createElement('div');
        div.innerHTML = templates.END_GAME_PROMPT;
        div.querySelector('#end-game-button').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('End the game?')) {
                socket.emit(
                    globals.COMMANDS.END_GAME,
                    stateBucket.currentGameState.accessCode
                );
            }
        });
        document.getElementById('game-content').appendChild(div);
    }
}
