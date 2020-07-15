const finishedArtArray = ["Villager", "Werewolf", "Seer", "Shadow", "Hunter", "Mason", "Minion", "Sorcerer", "Dream Wolf"];

export class CardManager {
    constructor() {}

    static createCard(card) {
        return new Card(card.role, card.team, card.description, card.quantity, card.isTypeOfWerewolf, card.custom, card.saved);
    }

    // builds element for the informational role modal on the setup page
    static constructModalRoleElement(card) {
        const modalRole = document.createElement("div");
        modalRole.setAttribute("class", "modal-role");
        const roleClass = card.team === "good" ? "role-village" : "role-wolf";
        let roleImage;
        if (card.custom === true) {
            roleImage = "<img alt='No art' class='card-image-custom' src='/assets/images/custom.svg' />";
        } else {
            roleImage = finishedArtArray.includes(card.role) ?
                "<img alt='No art' src='/assets/images/roles-small/" + card.role.replace(/\s/g, '') + ".png' />"
                : "<span>Art soon.</span>";
        }
        modalRole.innerHTML =
            "<div>" +
            roleImage +
            "<div>" +
            "<h2 class='" + roleClass + "'>" + card.role + "</h2>" +
            "<p>" + card.team + "</p>" +
            "</div>" +
            "</div>" +
            "<p>" + card.description + "</p>";
        return modalRole;
    }

    static constructDeckBuilderElement(card, index) {
        const cardContainer = document.createElement("div");

        const quantityClass = card.team === "good" ? "card-quantity quantity-village" : "card-quantity quantity-wolf";

        let cardClass = card.isTypeOfWerewolf ? "card card-werewolf" : "card";
        cardContainer.setAttribute("class", cardClass);
        if (card.team === "good") {
            cardContainer.setAttribute("id", "card-" + index);
        } else {
            cardContainer.setAttribute("id", "card-" + index);
        }
        cardContainer.innerHTML =
            "<div class='card-top'>" +
            "<div class='card-header'>" +
            "<div>" +
            "<p class='card-role'>" + card.role + "</p>" +
            "<div class='" + quantityClass + "'>" + card.quantity + "</div>" +
            "</div>" +
            "<p>+</p>" +
            "</div>" +
            "</div>";
        cardContainer.innerHTML = card.custom
            ? cardContainer.innerHTML += "<img class='card-image card-image-custom' src='/assets/images/custom.svg' alt='" + card.role + "'/>"
            : cardContainer.innerHTML +="<img class='card-image' src='/assets/images/roles-small/" + card.role.replace(/\s/g, '') + ".png' alt='" + card.role + "'/>";
        cardContainer.innerHTML +=
            "<div class='card-bottom'>" +
            "<p>-</p>" +
            "</div>";

        return cardContainer;
    }

    static constructCompactDeckBuilderElement(card, index) {
        const cardContainer = document.createElement("div");

        const quantityClass = card.team === "good" ? "card-quantity quantity-village" : "card-quantity quantity-wolf";

        let cardClass = card.isTypeOfWerewolf ? "compact-card card-werewolf" : "compact-card";
        cardContainer.setAttribute("class", cardClass);
        if (card.team === "good") {
            cardContainer.setAttribute("id", "card-" + index);
        } else {
            cardContainer.setAttribute("id", "card-" + index);
        }
        cardContainer.innerHTML =
            "<div class='compact-card-left'>" +
                "<p>-</p>" +
            "</div>" +
            "<div class='compact-card-header'>" +
                "<p class='card-role'>" + card.role + "</p>" +
                "<div class='" + quantityClass + "'>" + card.quantity + "</div>" +
            "</div>" +
            "<div class='compact-card-right'>" +
            "<p>+</p>" +
            "</div>";
        return cardContainer;
    }

    static constructCustomCardIndicator(isCondensed, team) {
        let customCard = document.createElement("div");
        if (isCondensed) {
            customCard.classList.add("compact-card", "custom-card");
        } else {
            customCard.classList.add("card", "custom-card");
        }

        if (team === "good") {
            customCard.setAttribute("id", "custom-good");
        } else {
            customCard.setAttribute("id", "custom-evil");
        }

        let cardHeader = document.createElement("h1");
        cardHeader.innerText = "Add Custom Role";

        let cardBody = document.createElement("div");
        cardBody.innerText = "+";

        customCard.appendChild(cardHeader);
        customCard.appendChild(cardBody);

        return customCard;
    }

}

class Card {
    constructor(role, team, description, quantity, isTypeOfWerewolf, custom, saved) {
        this.id = null;
        this.role = role;
        this.isTypeOfWerewolf = isTypeOfWerewolf;
        this.team = team;
        this.description = description;
        this.quantity = quantity || 0;
        this.custom = custom;
        this.saved = saved;
    }
}
