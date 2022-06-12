import { globals } from '../config/globals.js';
import { HTMLFragments } from './HTMLFragments.js';
import { toast } from './Toast';

export class DeckStateManager {
    constructor () {
        this.deck = [];
    }

    addToDeck (role) {
        role.quantity = 1;
        this.deck.push(role);
    }

    addCopyOfCard (role) {
        const existingCard = this.deck.find((card) => card.role === role);
        if (existingCard) {
            existingCard.quantity += 1;
        }
    }

    removeCopyOfCard (role) {
        const existingCard = this.deck.find((card) => card.role === role);
        if (existingCard.quantity > 0) {
            existingCard.quantity -= 1;
        }
    }

    removeRoleEntirelyFromDeck (entry) {
        const existingCard = this.deck.find((card) => card.role === entry.role);
        if (existingCard) {
            existingCard.quantity = 0;
            this.updateDeckStatus();
        }
    }

    hasRole (role) {
        return this.deck.find(
            (card) => card.role.toLowerCase().trim() === role.toLowerCase().trim()
        );
    }

    getQuantityOfRole (role) {
        return this.deck.find(
            (card) => card.role.toLowerCase().trim() === role.toLowerCase().trim()
        )?.quantity;
    }

    getDeckSize () {
        let total = 0;
        for (const role of this.deck) {
            total += role.quantity;
        }
        return total;
    }

    updateDeckStatus = () => {
        document.getElementById('deck-count').innerText = this.getDeckSize() + ' Players';
        if (this.deck.length > 0) {
            if (document.getElementById('deck-list-placeholder')) {
                document.getElementById('deck-list-placeholder').remove();
            }
            const sortedDeck = this.deck.sort((a, b) => {
                if (a.team !== b.team) {
                    return a.team === globals.ALIGNMENT.GOOD ? 1 : -1;
                }
                return a.role.localeCompare(b.role);
            });
            for (let i = 0; i < sortedDeck.length; i ++) {
                const existingCardEl = document.querySelector('#deck-list [data-role-id="' + sortedDeck[i].id + '"]');
                if (sortedDeck[i].quantity > 0) {
                    if (existingCardEl) {
                        existingCardEl.querySelector('.role-name').innerText = sortedDeck[i].quantity + 'x ' + sortedDeck[i].role;
                    } else {
                        const roleEl = document.createElement('div');
                        roleEl.dataset.roleId = sortedDeck[i].id;
                        roleEl.classList.add('added-role');
                        roleEl.innerHTML = HTMLFragments.DECK_SELECT_ROLE_ADDED_TO_DECK;
                        // roleEl.classList.add('deck-role');
                        if (sortedDeck[i].team === globals.ALIGNMENT.GOOD) {
                            roleEl.classList.add(globals.ALIGNMENT.GOOD);
                        } else {
                            roleEl.classList.add(globals.ALIGNMENT.EVIL);
                        }
                        roleEl.querySelector('.role-name').innerText = sortedDeck[i].quantity + 'x ' + sortedDeck[i].role;
                        document.getElementById('deck-list').appendChild(roleEl);
                        const minusOneHandler = (e) => {
                            if (e.type === 'click' || e.code === 'Enter') {
                                e.preventDefault();
                                toast(
                                    '<span class=\'toast-minus-one\'>-1</span>' +
                                    sortedDeck[i].role + ' (<span class="toast-minus-role-quantity">' + (sortedDeck[i].quantity - 1).toString() + '</span>)',
                                    'neutral',
                                    true,
                                    true,
                                    'short',
                                    true
                                );
                                this.removeCopyOfCard(sortedDeck[i].role);
                                this.updateDeckStatus();
                            }
                        };
                        roleEl.querySelector('.role-remove').addEventListener('click', minusOneHandler);
                        roleEl.querySelector('.role-remove').addEventListener('keyup', minusOneHandler);
                    }
                } else {
                    sortedDeck[i].markedForRemoval = true;
                    if (existingCardEl) {
                        existingCardEl.remove();
                    }
                }
                this.deck = this.deck.filter((card) => {
                    if (card.markedForRemoval) {
                        card.markedForRemoval = false;
                        return false;
                    } else {
                        return true;
                    }
                });
            }
            if (this.deck.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.setAttribute('id', 'deck-list-placeholder');
                placeholder.innerText = 'Add a card from the role box.';
                document.getElementById('deck-list').appendChild(placeholder);
            }
        }
    };
}
