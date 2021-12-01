import { globals } from "../config/globals.js";
import { toast } from "./Toast.js";

export class GameStateRenderer {
    constructor(gameState) {
        this.gameState = gameState;
        this.cardFlipped = false;
    }

    renderLobbyPlayers() {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove())
        let lobbyPlayersContainer = document.getElementById("lobby-players");
        if (this.gameState.userType !== globals.USER_TYPES.MODERATOR) {
            let modEl = document.createElement("div");
            modEl.innerText = this.gameState.moderator.name;
            modEl.classList.add('lobby-player');
            lobbyPlayersContainer.appendChild(modEl);
        }
        for (let person of this.gameState.people) {
            let personEl = document.createElement("div");
            personEl.innerText = person.name;
            personEl.classList.add('lobby-player');
            lobbyPlayersContainer.appendChild(personEl);
        }
        let playerCount;
        if (this.gameState.userType === globals.USER_TYPES.MODERATOR) {
            playerCount = this.gameState.people.length;
        } else {
            playerCount = 1 + this.gameState.people.length;
        }
        document.querySelector("label[for='lobby-players']").innerText =
            "Other People ( " + playerCount + " )";
    }

    renderLobbyHeader() {
        let existingTitle = document.querySelector('#game-link h1');
        if (existingTitle) {
            existingTitle.remove();
        }
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
        // let title = document.createElement("h1");
        // title.innerText = "Game";
        // document.querySelector('#game-title h1')?.remove();
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

    }
}

function renderLobbyPlayer(name, userType) {
    let el = document.createElement("div");
    el.innerHTML = ""
    clientEl.innerText = client.name + ' (you)';
    clientEl.classList.add('lobby-player');
    clientEl.classList.add('lobby-player-client');
    container.prepend(clientEl);
}

function getGameSize(cards) {
    let quantity = 0;
    for (let card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}
