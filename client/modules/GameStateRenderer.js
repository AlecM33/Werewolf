import { globals } from "../config/globals.js";
import { toast } from "./Toast.js";
import {templates} from "./Templates.js";

export class GameStateRenderer {
    constructor(gameState, socket) {
        this.gameState = gameState;
        this.socket = socket;
        this.killPlayerHandlers = {};
        this.cardFlipped = false;
    }

    renderLobbyPlayers() {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove())
        let lobbyPlayersContainer = document.getElementById("lobby-players");
        if (this.gameState.client.userType === globals.USER_TYPES.PLAYER) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(this.gameState.moderator.name, this.gameState.moderator.userType))
        }
        for (let person of this.gameState.people) {
            lobbyPlayersContainer.appendChild(renderLobbyPerson(person.name,person.userType))
        }
        let playerCount = this.gameState.people.filter((person) => person.userType === globals.USER_TYPES.PLAYER).length;
        if (this.gameState.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
            playerCount += 1;
        }
        if (this.gameState.client.userType === globals.USER_TYPES.PLAYER) {
            playerCount += 1;
        }
        document.querySelector("label[for='lobby-players']").innerText =
            "Other People (" + playerCount + "/" + getGameSize(this.gameState.deck) + " Players)";
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
        renderPlayersWithRoleAndAlignmentInfo(this.gameState.people, this.socket, this.gameState.accessCode, this.killPlayerHandlers);
    }

    renderPlayerView() {
        renderPlayerRole(this.gameState);
        renderPlayersWithNoRoleInformation(this.gameState.people, this.killPlayerHandlers);
    }

    refreshPlayerList(isModerator) {
        if (isModerator) {
            renderPlayersWithRoleAndAlignmentInfo(this.gameState.people, this.socket, this.gameState.accessCode, this.killPlayerHandlers)
        } else {
            renderPlayersWithNoRoleInformation(this.gameState.people, this.killPlayerHandlers);
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

function renderPlayersWithRoleAndAlignmentInfo(people, socket, accessCode, handlers) {
    document.querySelectorAll('.game-player').forEach((el) => {
        let pointer = el.dataset.pointer;
        if (pointer && handlers[pointer]) {
            el.removeEventListener('click', handlers[pointer])
        }
        el.remove();
    });
    people.sort((a, b) => {
        return a.name >= b.name ? 1 : -1;
    });
    let teamGood = people.filter((person) => person.alignment === globals.ALIGNMENT.GOOD);
    let teamEvil = people.filter((person) => person.alignment === globals.ALIGNMENT.EVIL);
    renderGroupOfPlayers(teamEvil, handlers, accessCode, globals.ALIGNMENT.EVIL, true, socket);
    renderGroupOfPlayers(teamGood, handlers, accessCode, globals.ALIGNMENT.GOOD, true, socket);
    document.getElementById("players-alive-label").innerText =
        'Players: ' + people.filter((person) => !person.out).length + ' / ' + people.length + ' Alive';

}

function renderPlayersWithNoRoleInformation(people, handlers) {
    document.querySelectorAll('.game-player').forEach((el) => el.remove());
    people.sort((a, b) => {
        return a.name >= b.name ? 1 : -1;
    });
    renderGroupOfPlayers(people, handlers);
    document.getElementById("players-alive-label").innerText =
        'Players: ' + people.filter((person) => !person.out).length + ' / ' + people.length + ' Alive';

}

function renderGroupOfPlayers(players, handlers, accessCode=null, alignment=null, moderator=false, socket=null) {
    for (let player of players) {
        let container = document.createElement("div");
        container.classList.add('game-player');
        container.dataset.pointer = player.id;
        if (alignment) {
            container.innerHTML = templates.MODERATOR_PLAYER;
        } else {
            container.innerHTML = templates.GAME_PLAYER;
        }
        container.querySelector('.game-player-name').innerText = player.name;
        let roleElement = container.querySelector('.game-player-role')

        if (alignment) {
            roleElement.classList.add(alignment);
            roleElement.innerText = player.gameRole;
            document.getElementById("player-list-moderator-team-" + alignment).appendChild(container);
        } else {
            roleElement.innerText = "Unknown"
            document.getElementById("game-player-list").appendChild(container);
        }

        if (moderator) {
            handlers[player.id] = () => {
                socket.emit(globals.COMMANDS.KILL_PLAYER, accessCode, player.id);
            }
            if (player.out) {
                container.classList.add('killed');
                container.querySelector('.kill-player-button').remove();
            } else {
                container.querySelector('.kill-player-button').addEventListener('click', handlers[player.id]);
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
    document.querySelector('#role-description').innerText = gameState.client.gameRoleDescription;
    document.getElementById("role-image").setAttribute(
        'src',
        '../images/roles/' + gameState.client.gameRole.replaceAll(' ', '') + '.png'
    );

    document.getElementById("game-role-back").addEventListener('click', () => {
        document.getElementById("game-role").style.display = 'flex';
        document.getElementById("game-role-back").style.display = 'none';
    });

    document.getElementById("game-role").addEventListener('click', () => {
        document.getElementById("game-role-back").style.display = 'flex';
        document.getElementById("game-role").style.display = 'none';
    });
}
