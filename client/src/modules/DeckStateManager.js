import { globals } from "../config/globals.js";
import {toast} from "./Toast.js";
import {ModalManager} from "./ModalManager";

export class DeckStateManager {
    constructor() {
        this.deck = null;
        this.customRoleOptions = [];
    }

    addToDeck(role) {
        let option = this.customRoleOptions.find((option) => option.role === role);
        if (option) {
            option.quantity = 0;
            this.deck.push(option);
            this.customRoleOptions.splice(this.customRoleOptions.indexOf(option), 1);
        }
    }

    addToCustomRoleOptions(role) {
        this.customRoleOptions.push(role);
        localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(this.customRoleOptions.concat(this.deck.filter(card => card.custom === true))));
    }

    removeFromCustomRoleOptions(name) {
        let option = this.customRoleOptions.find((option) => option.role === name);
        if (option) {
            this.customRoleOptions.splice(this.customRoleOptions.indexOf(option), 1);
            localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(this.customRoleOptions.concat(this.deck.filter(card => card.custom === true))));
            toast('"' + name + '" deleted.', 'error', true, true, 3);
        }
    }

    addCopyOfCard(role) {
        let existingCard = this.deck.find((card) => card.role === role)
        if (existingCard) {
            existingCard.quantity += 1;
        }
    }

    removeCopyOfCard(role) {
        let existingCard = this.deck.find((card) => card.role === role)
        if (existingCard && existingCard.quantity > 0) {
            existingCard.quantity -= 1;
        }
    }

    getCurrentDeck() { return this.deck; }

    getCard(role) {
        return this.deck.find(
            (card) => card.role.toLowerCase().trim() === role.toLowerCase().trim()
        );
    }

    getCurrentCustomRoleOptions() { return this.customRoleOptions; }

    getCustomRoleOption(role) {
        return this.customRoleOptions.find(
            (option) => option.role.toLowerCase().trim() === role.toLowerCase().trim()
        )
    };

    getDeckSize() {
        let total = 0;
        for (let role of this.deck) {
            total += role.quantity;
        }
        return total;
    }

    loadCustomRolesFromCookies() {
        let customRoles = localStorage.getItem('play-werewolf-custom-roles');
        if (customRoles !== null && validateCustomRoleCookie(customRoles)) {
            this.customRoleOptions = JSON.parse(customRoles); // we know it is valid JSON from the validate function
        }
    }

    loadCustomRolesFromFile(file, updateRoleListFunction, loadDefaultCardsFn, showIncludedCardsFn) {
        let reader = new FileReader();
        reader.onerror = (e) => {
            toast(reader.error.message, "error", true, true, 5);
        }
        reader.onload = (e) => {
            let string;
            if (typeof e.target.result !== "string") {
                string = new TextDecoder("utf-8").decode(e.target.result);
            } else {
                string = e.target.result;
            }
            if (validateCustomRoleCookie(string)) {
                this.customRoleOptions = JSON.parse(string); // we know it is valid JSON from the validate function
                ModalManager.dispelModal("upload-custom-roles-modal", "modal-background");
                toast("Roles imported successfully", "success", true, true, 3);
                localStorage.setItem("play-werewolf-custom-roles", JSON.stringify(this.customRoleOptions));
                updateRoleListFunction(this, document.getElementById("deck-select"));
                // loadDefaultCardsFn(this);
                // showIncludedCardsFn(this);
            } else {
                toast("Invalid formatting. Make sure you import the file as downloaded from this page.", "error", true, true, 5);
            }
        }
        reader.readAsText(file);
    }

    // via https://stackoverflow.com/a/18197341
    downloadCustomRoles(filename, text) {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

}

// this is user-supplied, so we should validate it fully
function validateCustomRoleCookie(cookie) {
    let valid = false;
    if (typeof cookie === "string" && new Blob([cookie]).size <= 1000000) {
        try {
            let cookieJSON = JSON.parse(cookie);
            if (Array.isArray(cookieJSON)) {
                for (let entry of cookieJSON) {
                    if (typeof entry === "object") {
                        if (typeof entry.role !== "string" || entry.role.length > globals.MAX_CUSTOM_ROLE_NAME_LENGTH
                            || typeof entry.team !== "string" || (entry.team !== globals.ALIGNMENT.GOOD && entry.team !== globals.ALIGNMENT.EVIL)
                            || typeof entry.description !== "string" || entry.description.length > globals.MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH
                        ) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                return true;
            }
        } catch(e) {
            return false;
        }
    }

    return valid;
}
