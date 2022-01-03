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
}
