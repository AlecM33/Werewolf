import { globals } from '../config/globals.js';
import { HTMLFragments } from './HTMLFragments.js';
import { toast } from './Toast.js';
import {ModalManager} from "./ModalManager.js";

export class DeckStateManager {
    constructor () {
        this.deck = [];
        this.templates = {
            '5 Players': {
                'Villager': 1,
                'Werewolf': 1,
                'Sorceress': 1,
                'Parity Hunter': 1,
                'Seer': 1
            },
            '7 Players': {
                'Villager': 6,
                'Werewolf': 1
            },
            '9 Players': {
                'Villager': 7,
                'Werewolf': 2
            },
            '11 Players': {
                'Villager': 8,
                'Werewolf': 2,
                'Seer': 1
            },
            '13 Players': {
                'Villager': 10,
                'Werewolf': 2,
                'Seer': 1
            },
            '15 Players': {
                'Villager': 12,
                'Werewolf': 2,
                'Seer': 1
            }
        }
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

    loadDeckTemplates = (roleBox) => {
        if (document.querySelectorAll('.template-option').length === 0) {
            for (let templateName of Object.keys(this.templates)) {
                let templateOption = document.createElement('div');
                templateOption.classList.add('template-option');
                templateOption.innerHTML = HTMLFragments.DECK_TEMPLATE;
                templateOption.querySelector('.template-option-name').innerText = templateName;
                for (let i = 0; i < Object.keys(this.templates[templateName]).length; i++) {
                    let role = Object.keys(this.templates[templateName])[i];
                    let roleEl = document.createElement('span');
                    roleEl.innerText = this.templates[templateName][role] + ' ' + role;
                    if (i < Object.keys(this.templates[templateName]).length - 1) { // construct comma-delimited list
                        roleEl.innerText += ', ';
                    }
                    roleEl.classList.add(roleBox.defaultRoles.find((entry) => entry.role === role).team);
                    templateOption.querySelector('.template-option-roles').appendChild(roleEl);
                }
                templateOption.addEventListener('click', (e) => {
                    e.preventDefault();
                    for (let card of this.deck) {
                        card.quantity = 0;
                    }
                    for (let role of Object.keys(this.templates[templateName])) {
                        let roleObj = roleBox.getDefaultRole(role);
                        if (!this.hasRole(roleObj.role)) {
                            this.addToDeck(roleObj);
                        }
                        for (let i = roleObj.quantity; i < this.templates[templateName][role]; i++) {
                            this.addCopyOfCard(roleObj.role);
                        }
                    }
                    this.updateDeckStatus();
                    ModalManager.dispelModal('deck-template-modal', 'modal-background');
                    toast('Template loaded', 'success', true, true, 'short');
                });
                document.getElementById('deck-template-container').appendChild(templateOption);
            }
        }
    }

    displayDeckPlaceHolder = () => {
        const placeholder = document.createElement('div');
        placeholder.setAttribute('id', 'deck-list-placeholder');
        placeholder.innerText = 'Add a card from the role box.';
        document.getElementById('deck-list').appendChild(placeholder);
    };

    updateDeckStatus = () => {
        document.getElementById('deck-count').innerText = this.getDeckSize() + ' Players';
        if (this.deck.length > 0) {
            if (document.getElementById('deck-list-placeholder')) {
                document.getElementById('deck-list-placeholder').remove();
            }
            const sortedDeck = this.deck.sort((a, b) => {
                if (a.team !== b.team) {
                    return a.team === globals.ALIGNMENT.GOOD ? -1 : 1;
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
                this.displayDeckPlaceHolder();
            }
        } else {
            this.displayDeckPlaceHolder();
        }
    };
}
