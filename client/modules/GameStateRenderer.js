import {globals} from "../config/globals.js";

export class GameStateRenderer {
    constructor(gameState) {
        this.gameState = gameState;
    }

    renderLobbyPlayers() {
        document.querySelectorAll('.lobby-player').forEach((el) => el.remove())
        let lobbyPlayersContainer = document.getElementById("lobby-players");
        if (this.gameState.userType !== globals.USER_TYPES.MODERATOR) {
            renderClient(this.gameState.client, lobbyPlayersContainer);
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
            "Players ( " + playerCount + " / " + getGameSize(this.gameState.deck) + " )";
    }

    renderLobbyHeader() {
        let title = document.createElement("h1");
        title.innerText = "Lobby";
        document.body.prepend(title);
        let gameLinkContainer = document.getElementById("game-link");
        gameLinkContainer.innerText = window.location;
        let copyImg = document.createElement("img");
        copyImg.setAttribute("src", "../images/copy.svg");
        gameLinkContainer.appendChild(copyImg);

        let moderatorContainer = document.getElementById("moderator");
        let text, modClass;
        if (this.gameState.userType === globals.USER_TYPES.MODERATOR || this.gameState.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
            moderatorContainer.innerText = this.gameState.moderator.name + " (you)";
            moderatorContainer.classList.add('moderator-client');
        } else {
            moderatorContainer.innerText = this.gameState.moderator.name;
        }
    }

    renderLobbyFooter() {
        let gameDeckContainer = document.getElementById("game-deck");
        for (let card of this.gameState.deck) {
            let cardEl = document.createElement("div");
            cardEl.innerText = card.quantity + 'x ' + card.role;
            cardEl.classList.add('lobby-card')
        }
    }
}

function renderClient(client, container) {
    let clientEl = document.createElement("div");
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
