import { globals } from "../config/globals.js";
import { toast } from "./Toast.js";
import {templates} from "./Templates.js";
import {ModalManager} from "./ModalManager.js";

export class GameStateRenderer {
    constructor(gameState, socket) {
        this.gameState = gameState;
        this.socket = socket;
        this.killPlayerHandlers = {};
        this.revealRoleHandlers = {};
        this.transferModHandlers = {};
        this.cardFlipped = false;
    }

    renderLobbyPlayers() {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove())
        let lobbyPlayersContainer = document.getElementById("lobby-players");
        if (this.gameState.client.userType === globals.USER_TYPES.PLAYER && this.gameState.moderator.userType === globals.USER_TYPES.MODERATOR) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(this.gameState.moderator.name, this.gameState.moderator.userType))
        }
        for (let person of this.gameState.people) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person.name,person.userType))
        }
        let playerCount = this.gameState.people.length;
        document.querySelector("label[for='lobby-players']").innerText =
            "People (" + playerCount + "/" + getGameSize(this.gameState.deck) + " Players)";
    }

    renderLobbyHeader() {
        removeExistingTitle();
        let title = document.createElement("h1");
        title.innerText = "Lobby";
        document.getElementById("game-title").appendChild(title);
        let gameLinkContainer = document.getElementById("game-link");
        gameLinkContainer.innerText = window.location;
        gameLinkContainer.addEventListener('click', () => {
            navigator.clipboard.writeText(gameLinkContainer.innerText).then(() => {
                toast('Link copied!', 'success', true);
            });
        });
        let copyImg = document.createElement("img");
        copyImg.setAttribute("src", "../images/copy.svg");
        gameLinkContainer.appendChild(copyImg);
    }

    renderLobbyFooter() {
        let gameDeckContainer = document.getElementById("game-deck");
        for (let card of this.gameState.deck) {
            let cardEl = document.createElement("div");
            cardEl.innerText = card.quantity + 'x ' + card.role;
            cardEl.classList.add('lobby-card')
        }
    }

    renderGameHeader() {
        removeExistingTitle();
        // let title = document.createElement("h1");
        // title.innerText = "Game";
        // document.getElementById("game-title").appendChild(title);
    }

    renderModeratorView() {
        let div = document.createElement("div");
        div.innerHTML = templates.END_GAME_PROMPT;
        document.body.appendChild(div);

        let modTransferButton = document.getElementById("mod-transfer-button");
        modTransferButton.addEventListener(
            "click", () => {
                this.displayAvailableModerators();
                ModalManager.displayModal(
                    "transfer-mod-modal",
                    "transfer-mod-modal-background",
                    "close-modal-button"
                )
            }
        )
        this.renderPlayersWithRoleAndAlignmentInfo();
    }

    renderTempModView() {
        let div = document.createElement("div");
        div.innerHTML = templates.END_GAME_PROMPT;
        document.body.appendChild(div);

        renderPlayerRole(this.gameState);
        this.renderPlayersWithNoRoleInformationUnlessRevealed(true);
    }

    renderPlayerView(isKilled=false) {
        if (isKilled) {
            let clientUserType = document.getElementById("client-user-type");
            if (clientUserType) {
                clientUserType.innerText = globals.USER_TYPES.KILLED_PLAYER + ' \uD83D\uDC80'
            }
        }
        renderPlayerRole(this.gameState);
        this.renderPlayersWithNoRoleInformationUnlessRevealed(false);
    }

    renderSpectatorView() {
        this.renderPlayersWithNoRoleInformationUnlessRevealed();
    }

    refreshPlayerList(isModerator) {
        if (isModerator) {
            this.renderPlayersWithRoleAndAlignmentInfo()
        } else {
            this.renderPlayersWithNoRoleInformationUnlessRevealed();
        }
    }

    renderPlayersWithRoleAndAlignmentInfo() {
        document.querySelectorAll('.game-player').forEach((el) => {
            let pointer = el.dataset.pointer;
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
        this.gameState.people.sort((a, b) => {
            return a.name >= b.name ? 1 : -1;
        });
        let teamGood = this.gameState.people.filter((person) => person.alignment === globals.ALIGNMENT.GOOD);
        let teamEvil = this.gameState.people.filter((person) => person.alignment === globals.ALIGNMENT.EVIL);
        renderGroupOfPlayers(
            teamEvil,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.gameState.accessCode,
            globals.ALIGNMENT.EVIL,
            this.gameState.moderator.userType,
            this.socket
        );
        renderGroupOfPlayers(
            teamGood,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.gameState.accessCode,
            globals.ALIGNMENT.GOOD,
            this.gameState.moderator.userType,
            this.socket);
        document.getElementById("players-alive-label").innerText =
            'Players: ' + this.gameState.people.filter((person) => !person.out).length + ' / ' + this.gameState.people.length + ' Alive';

    }

    renderPlayersWithNoRoleInformationUnlessRevealed(tempMod = false) {
        if (tempMod) {
            document.querySelectorAll('.game-player').forEach((el) => {
                let pointer = el.dataset.pointer;
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
        sortPeopleByStatus(this.gameState.people);
        let modType = tempMod ? this.gameState.moderator.userType : null;
        renderGroupOfPlayers(
            this.gameState.people,
            this.killPlayerHandlers,
            this.revealRoleHandlers,
            this.gameState.accessCode,
            null,
            modType,
            this.socket
        );
        document.getElementById("players-alive-label").innerText =
            'Players: ' + this.gameState.people.filter((person) => !person.out).length + ' / ' + this.gameState.people.length + ' Alive';

    }

    updatePlayerCardToKilledState() {
        document.querySelector('#role-image').classList.add("killed-card");
        document.getElementById("role-image").setAttribute(
            'src',
            '../images/tombstone.png'
        );
    }

    displayAvailableModerators() {
        document.querySelectorAll('.potential-moderator').forEach((el) => {
            let pointer = el.dataset.pointer;
            if (pointer && this.transferModHandlers[pointer]) {
                el.removeEventListener('click', this.transferModHandlers[pointer]);
                delete this.transferModHandlers[pointer];
            }
            el.remove();
        });
        let modalContent = document.getElementById("transfer-mod-form-content");
        if (modalContent) {
            renderPotentialMods(this.gameState, this.gameState.people, this.transferModHandlers, modalContent, this.socket);
            renderPotentialMods(this.gameState, this.gameState.spectators, this.transferModHandlers, modalContent, this.socket);
        }
    }

}

function renderPotentialMods(gameState, group, transferModHandlers, modalContent, socket) {
    for (let member of group) {
        if ((member.out || member.userType === globals.USER_TYPES.SPECTATOR) && !(member.id === gameState.client.id)) {
            let container = document.createElement("div");
            container.classList.add('potential-moderator');
            container.dataset.pointer = member.id;
            container.innerText = member.name;
            transferModHandlers[member.id] = () => {
                if (confirm("Transfer moderator powers to " + member.name + "?")) {
                    socket.emit(globals.COMMANDS.TRANSFER_MODERATOR, gameState.accessCode, member.id);
                }
            }

            container.addEventListener('click', transferModHandlers[member.id]);
            modalContent.appendChild(container);
        }
    }
}

function renderLobbyPerson(name, userType) {
    let el = document.createElement("div");
    let personNameEl = document.createElement("div");
    let personTypeEl = document.createElement("div");
    personNameEl.innerText = name;
    personTypeEl.innerText = userType + globals.USER_TYPE_ICONS[userType];
    el.classList.add('lobby-player');

    el.appendChild(personNameEl);
    el.appendChild(personTypeEl);

    return el;
}

function sortPeopleByStatus(people) {
    people.sort((a, b) => {
        if (a.out !== b.out) {
            return a.out ? 1 : -1;
        } else {
            if (a.revealed !== b.revealed) {
                return a.revealed? -1 : 1;
            }
            return a.name >= b.name ? 1 : -1;
        }
    });
}

function getGameSize(cards) {
    let quantity = 0;
    for (let card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

function removeExistingTitle() {
    let existingTitle = document.querySelector('#game-title h1');
    if (existingTitle) {
        existingTitle.remove();
    }
}

// TODO: refactor to reduce the cyclomatic complexity of this function
function renderGroupOfPlayers(people, killPlayerHandlers, revealRoleHandlers, accessCode=null, alignment=null, moderatorType, socket=null) {
    for (let player of people) {
        let container = document.createElement("div");
        container.classList.add('game-player');
        if (moderatorType) {
            container.dataset.pointer = player.id;
            container.innerHTML = templates.MODERATOR_PLAYER;
        } else {
            container.innerHTML = templates.GAME_PLAYER;
        }
        container.querySelector('.game-player-name').innerText = player.name;
        let roleElement = container.querySelector('.game-player-role')

        if (moderatorType) {
            roleElement.classList.add(alignment);
            if (moderatorType === globals.USER_TYPES.MODERATOR) {
                roleElement.innerText = player.gameRole;
                document.getElementById("player-list-moderator-team-" + alignment).appendChild(container);
            } else {
                if (player.revealed) {
                    roleElement.innerText = player.gameRole;
                    roleElement.classList.add(player.alignment);
                } else {
                    roleElement.innerText = "Unknown";
                }
                document.getElementById("game-player-list").appendChild(container);
            }
        } else if (player.revealed) {
            roleElement.classList.add(player.alignment);
            roleElement.innerText = player.gameRole;
            document.getElementById("game-player-list").appendChild(container);
        } else {
            roleElement.innerText = "Unknown";
            document.getElementById("game-player-list").appendChild(container);
        }

        if (player.out) {
            container.classList.add('killed');
            if (moderatorType) {
                container.querySelector('.kill-player-button')?.remove();
                insertPlaceholderButton(container, false, "killed");
            }
        } else {
            if (moderatorType) {
                killPlayerHandlers[player.id] = () => {
                    if (confirm("KILL " + player.name + "?")) {
                        socket.emit(globals.COMMANDS.KILL_PLAYER, accessCode, player.id);
                    }
                }
                container.querySelector('.kill-player-button').addEventListener('click', killPlayerHandlers[player.id]);
            }
        }

        if (player.revealed) {
            if (moderatorType) {
                container.querySelector('.reveal-role-button')?.remove();
                insertPlaceholderButton(container, true, "revealed");
            }
        } else {
            if (moderatorType) {
                revealRoleHandlers[player.id] = () => {
                    if (confirm("REVEAL " + player.name + "?")) {
                        socket.emit(globals.COMMANDS.REVEAL_PLAYER, accessCode, player.id);
                    }
                }
                container.querySelector('.reveal-role-button').addEventListener('click', revealRoleHandlers[player.id]);
            }
        }
    }
}

function renderPlayerRole(gameState) {
    let name = document.querySelector('#role-name');
    name.innerText = gameState.client.gameRole;
    if (gameState.client.alignment === globals.ALIGNMENT.GOOD) {
        name.classList.add('good');
    } else {
        name.classList.add('evil');
    }
    name.setAttribute("title", gameState.client.gameRole);
    if (gameState.client.out) {
        document.querySelector('#role-image').classList.add("killed-card");
        document.getElementById("role-image").setAttribute(
            'src',
            '../images/tombstone.png'
        );
    } else {
        document.getElementById("role-image").setAttribute(
            'src',
            '../images/roles/' + gameState.client.gameRole.replaceAll(' ', '') + '.png'
        );
    }

    document.querySelector('#role-description').innerText = gameState.client.gameRoleDescription;

    document.getElementById("game-role-back").addEventListener('click', () => {
        document.getElementById("game-role").style.display = 'flex';
        document.getElementById("game-role-back").style.display = 'none';
    });

    document.getElementById("game-role").addEventListener('click', () => {
        document.getElementById("game-role-back").style.display = 'flex';
        document.getElementById("game-role").style.display = 'none';
    });
}

function insertPlaceholderButton(container, append, type) {
    let button = document.createElement("div");
    button.classList.add('placeholder-button');
    if (type === "killed") {
        button.innerText = 'Killed';
    } else {
        button.innerText = "Revealed";
    }
    if (append) {
        container.querySelector('.player-action-buttons').appendChild(button);
    } else {
        container.querySelector('.player-action-buttons').prepend(button);
    }
}
