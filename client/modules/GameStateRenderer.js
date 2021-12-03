import { globals } from "../config/globals.js";
import { toast } from "./Toast.js";
import {templates} from "./Templates.js";

export class GameStateRenderer {
    constructor(gameState) {
        this.gameState = gameState;
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

    renderPlayerRole() {
        let name = document.querySelector('#role-name');
        name.innerText = this.gameState.client.gameRole;
        if (this.gameState.client.alignment === globals.ALIGNMENT.GOOD) {
            name.classList.add('good');
        } else {
            name.classList.add('evil');
        }
        name.setAttribute("title", this.gameState.client.gameRole);
        document.querySelector('#role-description').innerText = this.gameState.client.gameRoleDescription;
        document.getElementById("role-image").setAttribute(
            'src',
            '../images/roles/' + this.gameState.client.gameRole.replaceAll(' ', '') + '.png'
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

    renderModeratorView() {
        let div = document.createElement("div");
        div.innerHTML = templates.END_GAME_PROMPT;
        document.body.appendChild(div);
        renderModeratorPlayers(this.gameState.people);
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

function renderModeratorPlayers(people) {
    people.sort();
    let teamGood = people.filter((person) => person.alignment === globals.ALIGNMENT.GOOD);
    let teamEvil = people.filter((person) => person.alignment === globals.ALIGNMENT.EVIL);
    renderGroupOfPlayersFromTeam(teamEvil, globals.ALIGNMENT.EVIL);
    renderGroupOfPlayersFromTeam(teamGood, globals.ALIGNMENT.GOOD);
    document.getElementById("players-alive-label").innerText =
        'Players: ' + people.filter((person) => !person.out).length + ' / ' + people.length + ' Alive';

}

function renderGroupOfPlayersFromTeam(players, alignment) {
    for (let player of players) {
        let container = document.createElement("div");
        container.classList.add('moderator-player');
        container.innerHTML = templates.MODERATOR_PLAYER;
        container.querySelector('.moderator-player-name').innerText = player.name;
        let roleElement = container.querySelector('.moderator-player-role')
        roleElement.innerText = player.gameRole;
        roleElement.classList.add(alignment);

        document.getElementById("player-list-moderator-team-" + alignment).appendChild(container);
    }
}
