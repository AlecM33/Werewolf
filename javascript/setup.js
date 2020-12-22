import {cards} from './cards.js'
import {utility} from './util.js'
import {CardManager} from './modules/card-manager.js'

const socket = io();

class Game {
    constructor(accessCode, reveals, size, deck, time, hasDreamWolf) {
        this.accessCode = accessCode;
        this.reveals = reveals;
        this.size = size;
        this.deck = deck;
        this.time = time;
        this.players = [];
        this.status = "lobby";
        this.hasDreamWolf = hasDreamWolf;
        this.endTime = null;
    }
}

let gameSize = 0;
let atLeastOnePlayer = false;

// register event listeners on buttons
document.getElementById("reset-btn").addEventListener("click", resetCardQuantities);
document.getElementById("create-btn").addEventListener("click", createGame);
document.getElementById("role-view-changer-gallery").addEventListener("click", function() { toggleViewChanger(false) });
document.getElementById("role-view-changer-list").addEventListener("click", function() { toggleViewChanger(true) });
document.getElementById("role-btn").addEventListener("click", function() { displayModal("role-modal", undefined) });
document.getElementById("edit-role-btn").addEventListener("click", function() { displayModal("edit-custom-roles-modal", undefined) });
document.getElementById("import-role-btn").addEventListener("click", function() {
    document.getElementById("import-file-input").click();
});
document.getElementById("import-file-input").addEventListener("change", function(e) {
    selectRoleImportFile(e);
});
document.getElementById("custom-role-form").addEventListener("submit", function(e) {
    addCustomCardToRoles(e);
});
Array.from(document.getElementsByClassName("close")).forEach(function(element) {
    element.addEventListener('click', closeModal);
});

// render all of the available cards to the user
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    document.getElementById("create-game-header").innerText = urlParams.get('reveals') === "true"
        ? "Create Reveal Game"
        : "Create No-Reveal Game";
    readInUserCustomRoles();
    renderAvailableCards(false);
};

function renderAvailableCards(isCondensed) {
    cards.sort(function(a, b) {
        return a.role.toUpperCase().localeCompare(b.role);
    });
    document.getElementById("card-select-good").innerHTML = "";
    document.getElementById("card-select-evil").innerHTML = "";
    document.getElementById("roles").innerHTML = "";
    document.getElementById("custom-roles").innerHTML = "";

    for (let i = 0; i < cards.length; i ++) {
        if (!cards[i].quantity) cards[i].quantity = 0;
        cards[i].team === "good"
            ? renderGoodRole(cards[i], i, isCondensed)
            : renderEvilRole(cards[i], i, isCondensed);
    }

    if (document.getElementById("custom-roles").getElementsByClassName("custom-role-edit").length === 0) {
        document.getElementById("custom-roles").innerHTML = "<h2>You haven't added any custom cards.</h2>";
    }

    let customCardGood = CardManager.constructCustomCardIndicator(isCondensed, "good");
    let customCardEvil = CardManager.constructCustomCardIndicator(isCondensed, "evil");
    document.getElementById("card-select-good").appendChild(customCardGood);
    document.getElementById("card-select-evil").appendChild(customCardEvil);
    customCardGood.addEventListener("click", function() {
        displayModal("custom-card-modal", "Good");
    });
    customCardEvil.addEventListener("click", function() {
        displayModal("custom-card-modal", "Evil");
    });
}

function renderGoodRole(cardInfo, i, isCondensed) {
    const card = CardManager.createCard(cardInfo);
    if (card.custom) {
        renderCustomRole(cardInfo, "custom-roles");
    }

    document.getElementById("roles").appendChild(CardManager.constructModalRoleElement(card));
    if (isCondensed) {
        document.getElementById("card-select-good").appendChild(CardManager.constructCompactDeckBuilderElement(card, i));
        let cardLeft = document.getElementById("card-" + i).getElementsByClassName("compact-card-left")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardRight = document.getElementById("card-" + i).getElementsByClassName("compact-card-right")[0];
        cardRight.addEventListener("click", function() { incrementCardQuantity(cardRight) }, true);
        cardLeft.addEventListener("click", function() { decrementCardQuantity(cardLeft) }, true);
        cardRight.card = card;
        cardRight.quantityEl = cardQuantity;
        cardLeft.card = card;
        cardLeft.quantityEl = cardQuantity;
    } else {
        document.getElementById("card-select-good").appendChild(CardManager.constructDeckBuilderElement(card, i));
        // Add event listeners to the top and bottom halves of the card to change the quantity.
        let cardTop = document.getElementById("card-" + i).getElementsByClassName("card-top")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardBottom = document.getElementById("card-" + i).getElementsByClassName("card-bottom")[0];
        cardTop.addEventListener("click", function() { incrementCardQuantity(cardTop) }, false);
        cardBottom.addEventListener("click", function() { decrementCardQuantity(cardBottom) }, false);
        cardTop.card = card;
        cardTop.quantityEl = cardQuantity;
        cardBottom.card = card;
        cardBottom.quantityEl = cardQuantity;
    }
}

function renderEvilRole(cardInfo, i, isCondensed) {
    const card = CardManager.createCard(cardInfo);
    if (card.custom) {
        renderCustomRole(cardInfo, "custom-roles");
    }

    document.getElementById("roles").appendChild(CardManager.constructModalRoleElement(card));
    if (isCondensed) {
        document.getElementById("card-select-evil").appendChild(CardManager.constructCompactDeckBuilderElement(card, i));
        let cardLeft = document.getElementById("card-" + i).getElementsByClassName("compact-card-left")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardRight = document.getElementById("card-" + i).getElementsByClassName("compact-card-right")[0];
        cardRight.addEventListener("click", function() { incrementCardQuantity(cardRight) }, false);
        cardLeft.addEventListener("click", function() { decrementCardQuantity(cardLeft) }, false);
        cardRight.card = card;
        cardRight.quantityEl = cardQuantity;
        cardLeft.card = card;
        cardLeft.quantityEl = cardQuantity;
    } else {
        document.getElementById("card-select-evil").appendChild(CardManager.constructDeckBuilderElement(card, i));
        // Add event listeners to the top and bottom halves of the card to change the quantity.
        let cardTop = document.getElementById("card-" + i).getElementsByClassName("card-top")[0];
        let cardQuantity = document.getElementById("card-" + i).getElementsByClassName("card-quantity")[0];
        let cardBottom = document.getElementById("card-" + i).getElementsByClassName("card-bottom")[0];
        cardTop.addEventListener("click", function() { incrementCardQuantity(cardTop) }, false);
        cardBottom.addEventListener("click", function() { decrementCardQuantity(cardBottom) }, false);
        cardTop.card = card;
        cardTop.quantityEl = cardQuantity;
        cardBottom.card = card;
        cardBottom.quantityEl = cardQuantity;
    }
}

function addCustomCardToRoles(e) {
    e.preventDefault();
    if (!cards.find((card) => card.role === document.getElementById("custom-role-name").value)) {
        let newCard = {
            role: document.getElementById("custom-role-name").value,
            team: document.getElementById("custom-role-team").value,
            description: document.getElementById("custom-role-desc").value,
            isTypeOfWerewolf: document.getElementById("custom-role-wolf").checked,
            custom: true,
            saved: document.getElementById("custom-role-remember").checked
        };
        cards.push(newCard);
        renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));

        if (newCard.saved === true) {
            let existingRoles = localStorage.getItem("play-werewolf-custom-roles");
            if (existingRoles !== null) {
                let rolesArray;
                try {
                    rolesArray = JSON.parse(existingRoles);
                } catch (e) {
                    console.error(e.message);
                }
                if (rolesArray) {
                    rolesArray.push(newCard);
                }
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(rolesArray));
            } else {
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(new Array(newCard)));
            }
        }
        updateCustomRoleModal();
        closeModal();
        document.getElementById("custom-role-form").reset();
    } else {
        alert("A custom or standard card already exists with that name!")
    }
}

function addImportFileToRoles (e) {
    //parse roles from file
    let match = /^data:(.*);base64,(.*)$/.exec(e.target.result);
    if (match == null) {
        throw 'Could not parse result'; // should not happen
    }
    let mimeType = match[1];
    let content = match[2];
    let newRoles;
    try {
        newRoles = JSON.parse(atob(content));
    } catch(ex) {
        console.error(ex.message);
    }

    //add roles
    let succesfullyAddedRoleInfo = [];
    let rolesThatFailedToImport = [];
    let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf"];
    let roleIndex;
    newRoles.forEach(newRole => {
        newRole.custom = true;
        newRole.saved = true;
        let newRoleValidationResult = validateNewRole(newRole, expectedKeys);
        if (newRoleValidationResult.isValid) {
            roleIndex = cards.push(newRole) - 1;
            succesfullyAddedRoleInfo.push({role: newRole, roleIndex: roleIndex});
        }
        else {
            rolesThatFailedToImport.push(newRoleValidationResult);
        }
    });
    renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));
    // always save imported roles
    let succesfullyAddedRoles = succesfullyAddedRoleInfo.map(roleInfo => roleInfo.role);
    let existingRoles = localStorage.getItem("play-werewolf-custom-roles");
    if (existingRoles !== null) {
        let rolesArray;
        try {
            rolesArray = JSON.parse(existingRoles);
        } catch (e) {
            console.error(e.message);
        }
        if (rolesArray) {
            rolesArray.push(...succesfullyAddedRoles);
        }
        localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(rolesArray));
    } else {
        localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(succesfullyAddedRoles));
    }
    updateCustomRoleModal();
    updateImportRolesModal(succesfullyAddedRoleInfo, rolesThatFailedToImport);
    displayModal("import-custom-roles-result-modal", undefined);
}

function validateNewRole(newCard,expectedKeys) {
    let newRoleValidationResult = {};
    newRoleValidationResult.role = newCard;
    newRoleValidationResult.issues = [];
    
    //add warning if there already exists a loaded role with the same name
    if (cards.find((card) => card.role === newCard.role)) {
        newRoleValidationResult.issues.push({level: "warning", description: "duplicate entry"});
    }
    
    //For each required field, add error if the role is missing it
    let missingKeys = expectedKeys.filter(function(key){ return Object.keys(newCard).indexOf(key) < 0 });
    missingKeys.forEach(missingKey => {
        newRoleValidationResult.issues.push({level: "error", description: "Missing data: " + missingKey});
    });

    newRoleValidationResult.isValid = ( newRoleValidationResult.issues.length == 0 );

    return newRoleValidationResult;
}

function updateCustomRoleModal() {
    document.getElementById("custom-roles").innerHTML = "";
    for (let i = 0; i < cards.length; i++){
        if (cards[i].custom) {
            renderCustomRole(cards[i], "custom-roles");
        }
    }
}

function updateImportRolesModal(succesfullyAddedRoles, rolesThatFailedToImport) {
    document.getElementById("import-successes-subheader").innerHTML = succesfullyAddedRoles.length + " roles sucessfully imported";
    document.getElementById("import-successes-role-list").innerHTML = "";
    succesfullyAddedRoles.forEach(roleInfo => {
        renderCustomRole(roleInfo.role, "import-successes-role-list");
    });
}

function readInUserCustomRoles() {
    let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf", "custom", "saved"];
    let userCustomRoles = utility.validateCustomRolesJsonObject("play-werewolf-custom-roles", expectedKeys);
    if (userCustomRoles) {
        for (let i = 0; i < userCustomRoles.length; i++) {
            cards.push(userCustomRoles[i]);
        }
    }
}

function renderCustomRole(card, destinationId) {
    let roleElement = document.createElement("div");
    let editRemoveContainer = document.createElement("div");
    let editFormDiv = document.createElement("div");
    let roleLabel = document.createElement("div");
    let roleName = document.createElement("p");
    let remove = document.createElement("img");
    let edit = document.createElement("img");
    //let editForm = buildRoleEditForm(index);
    let editRoleTemplate = document.getElementById("edit-custom-role-template");
    let editForm = editRoleTemplate.content.cloneNode(true);

    roleName.innerText = card.role;
    remove.setAttribute("src", "../assets/images/delete.svg");
    remove.setAttribute("title", "Delete");
    remove.classList.add("custom-role-button");
    remove.addEventListener("click", function() { removeCustomRole(card.role) });

    edit.setAttribute("src", "../assets/images/pencil_green.svg");
    edit.setAttribute("title", "Edit");
    edit.classList.add("custom-role-button");
    edit.addEventListener("click", function(e) { toggleEditForm(e, editFormDiv, card) });
    roleElement.setAttribute("class", "custom-role-edit");

    editRemoveContainer.appendChild(remove);
    editRemoveContainer.appendChild(edit);
    roleLabel.appendChild(roleName);
    roleLabel.appendChild(editRemoveContainer);
    roleElement.appendChild(roleLabel);
    //roleElement.appendChild(editForm);
    const shadowRoot = editFormDiv.attachShadow({mode: 'open'});
    shadowRoot.appendChild(editForm);

    editFormDiv.style.display = "none";
    roleElement.appendChild(editFormDiv);

    document.getElementById(destinationId).appendChild(roleElement);

    shadowRoot.getElementById("edit-role-form").addEventListener("submit", function(e) {
        updateCustomRole(e, editFormDiv, card);
    });
}

function toggleEditForm(event, formDiv, card) {
    event.preventDefault();
    let displayRule = formDiv.style.display;
    formDiv.style.display = displayRule === "none" ? "block" : "none";

    if (formDiv.style.display === "block") {
        populateEditRoleForm(formDiv, card);
    }
}

function toggleViewChanger(isCondensed) {

    if (isCondensed) {
        document.getElementById("role-view-changer-gallery").classList.remove("selected");
        document.getElementById("role-view-changer-list").classList.add("selected");
    } else {
        document.getElementById("role-view-changer-gallery").classList.add("selected");
        document.getElementById("role-view-changer-list").classList.remove("selected");
    }
    renderAvailableCards(isCondensed);
}

function buildRoleEditForm(index) {
    let infoForm = document.createElement("div");
    infoForm.style.display = "none";
    infoForm.setAttribute("id", "edit-form-" + index);
    infoForm.innerHTML =
        "<form class=\"edit-role-form\" id=\"edit-role-form-" + index + "\">" +
            "<label for=\"edit-role-desc-" + index + "\">Description</label>" +
            "<textarea rows=\"3\" id=\"edit-role-desc-" + index + "\" required></textarea>" +
            "<label for=\"edit-role-team-" + index + "\">Team</label>" +
            "<select id=\"edit-role-team-" + index + "\">" +
                "<option value=\"good\">Good</option>" +
                "<option value=\"evil\">Evil</option>" +
            "</select>" +
            "<div class=\"checkbox\">" +
                "<input type=\"checkbox\" id=\"edit-role-wolf-" + index + "\">" +
                "<label for=\"edit-role-wolf-" + index + "\">Werewolf role (counts for parity)</label>" +
            "</div>" +
            "<div class=\"checkbox\">" +
                "<input type=\"checkbox\" id=\"edit-role-remember-" + index + "\">" +
                "<label for=\"edit-role-remember-" + index + "\">Remember this role for later (uses cookies)</label>" +
            "</div>" +
            "<br><br>" +
            "<input type=\"submit\" class=\"app-btn\" value=\"Update\">" +
        "</form>";
    return infoForm;
}

function populateEditRoleForm(formDiv, card) {
    formDiv.shadowRoot.querySelector("#edit-role-desc").value = card.description;
    formDiv.shadowRoot.querySelector("#edit-role-team").value = card.team;
    formDiv.shadowRoot.querySelector("#edit-role-wolf").checked = card.isTypeOfWerewolf;
    formDiv.shadowRoot.querySelector("#edit-role-remember").checked = card.saved;
}

function removeCustomRole(name) {
    if (confirm("Delete this role?")) {
        let matchingCards = cards.filter((card) => card.role === name);
        matchingCards.forEach((card) => {
            cards.splice(cards.indexOf(card), 1);
        });
        let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf", "custom", "saved"];
        let userCustomRoles = utility.validateCustomRolesJsonObject("play-werewolf-custom-roles", expectedKeys);
        if (userCustomRoles) {
            userCustomRoles = userCustomRoles.filter((card) => card.role !== name);
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(userCustomRoles));
        }
        updateCustomRoleModal();
        renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));
    }
}

function updateCustomRole(event, formDiv, cardToUpdate) {
    event.preventDefault();
    cardToUpdate.team = formDiv.shadowRoot.querySelector("#edit-role-team").value;
    cardToUpdate.description = formDiv.shadowRoot.querySelector("#edit-role-desc").value;
    cardToUpdate.isTypeOfWerewolf = formDiv.shadowRoot.querySelector("#edit-role-wolf").checked;
    cardToUpdate.saved = formDiv.shadowRoot.querySelector("#edit-role-remember").checked;

    removeOrAddSavedRoleIfNeeded(cardToUpdate);
    toggleEditForm(event, formDiv, cardToUpdate);
    renderAvailableCards(document.getElementById("role-view-changer-list").classList.contains("selected"));
}

function removeOrAddSavedRoleIfNeeded(card) {
    let expectedKeys = ["role", "description", "team", "isTypeOfWerewolf", "custom", "saved"];
    let userCustomRoles = utility.validateCustomRolesJsonObject("play-werewolf-custom-roles", expectedKeys);
    if (userCustomRoles) {
        if (card.saved) {
            let roleToUpdate = userCustomRoles.find((savedCard) => savedCard.role === card.role);
            if (roleToUpdate) {
                userCustomRoles[userCustomRoles.indexOf(roleToUpdate)] = card;
            } else {
                userCustomRoles.push(card);
            }
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(userCustomRoles));
        } else {
            let roleToRemove = userCustomRoles.find((savedCard) => savedCard.role === card.role);
            if (roleToRemove) {
                userCustomRoles.splice(userCustomRoles.indexOf(roleToRemove), 1);
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(userCustomRoles));
            }
        }
    }
}


function incrementCardQuantity(e) {
    if(e.card.quantity < 25) {
        e.card.quantity += 1;
        cards.find((card) => card.role === e.card.role).quantity += 1;
    }
    e.quantityEl.innerHTML = e.card.quantity;
    updateGameSize();
}

function decrementCardQuantity(e) {
    if(e.card.quantity > 0) {
        e.card.quantity -= 1;
        cards.find((card) => card.role === e.card.role).quantity -= 1;
    }
    e.quantityEl.innerHTML = e.card.quantity;
    updateGameSize();
}

function updateGameSize() {
    gameSize = 0;
    for (let card of cards) {
        gameSize += card.quantity;
    }
    document.getElementById("game-size").innerText = gameSize + " Players";
    atLeastOnePlayer = gameSize > 0;
    return gameSize;
}

function resetCardQuantities() {
    for (let card of cards) {
        card.quantity = 0;
    }
    updateGameSize();
    Array.prototype.filter.call(document.getElementsByClassName("card-quantity"), function(quantities){
        return quantities.innerHTML = 0;
    });
}

function displayModal(modalId, teamForCustomRole) {
    if (teamForCustomRole === "Good") {
        document.getElementById("option-evil").removeAttribute("selected");
        document.getElementById("option-good").setAttribute("selected", "selected");
    }
    if (teamForCustomRole === "Evil") {
        document.getElementById("option-good").removeAttribute("selected");
        document.getElementById("option-evil").setAttribute("selected", "selected");
    }
    document.getElementById(modalId).classList.remove("hidden");
    document.getElementById("app-content").classList.add("hidden");
}

function closeModal() {
    document.getElementById("role-modal").classList.add("hidden");
    document.getElementById("custom-card-modal").classList.add("hidden");
    document.getElementById("edit-custom-roles-modal").classList.add("hidden");
    document.getElementById("import-custom-roles-result-modal").classList.add("hidden");
    document.getElementById("app-content").classList.remove("hidden");
}

function buildDeckFromQuantities() {
    let playerDeck = [];
    for (const card of cards) {
        for (let i = 0; i < card.quantity; i++) {
            card.id = utility.generateID();
            playerDeck.push(card);
        }
    }
    return playerDeck;
}

function createGame() {
    if (document.getElementById("name").value.length > 0 && atLeastOnePlayer) {
        const urlParams = new URLSearchParams(window.location.search);
        const revealParam = urlParams.get('reveals');

        // generate 6 digit access code
        let code = "";
        let charPool = "abcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 6; i++) {
            code += charPool[utility.getRandomInt(36)]
        }

        // generate unique player Id for session
        let id = utility.generateID();
        sessionStorage.setItem("id", id);

        // player who creates the game is the host
        sessionStorage.setItem("host", true);

        // send a new game to the server, and then join it
        const playerInfo = {name: document.getElementById("name").value, code: code, id: id};
        let gameDeck = buildDeckFromQuantities();
        const game = new Game(
            code,
            revealParam === "true",
            gameSize,
            gameDeck,
            Math.ceil(document.getElementById("time").value),
            gameDeck.find((card) => card.role === "Dream Wolf") !== undefined
            );
        socket.emit('newGame', game, function() {
            socket.emit('joinGame', playerInfo);
            sessionStorage.setItem('code', code);
            window.location.replace('/' + code);
        });
    } else {
        document.getElementById("some-error").innerText = "There are problems with your above setup.";
        if (!atLeastOnePlayer) {
            document.getElementById("game-size").classList.add("error");
        } else {
            document.getElementById("game-size").classList.remove("error");
        }
        document.getElementById("name").classList.add("error");
        document.getElementById("name-error").innerText = "Name is required.";
    }
}
function selectRoleImportFile(e) {
    var files = e.target.files;
    if (files.length < 1) { return; }
    var file = files[0];
    var reader = new FileReader();
    reader.onload = addImportFileToRoles;
    reader.readAsDataURL(file);
}
