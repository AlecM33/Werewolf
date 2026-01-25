import { HTMLFragments } from '../front_end_components/HTMLFragments.js';
import { ALIGNMENT, PRIMITIVES } from '../../config/globals.js';
import { defaultRoles } from '../../config/defaultRoles.js';
import { toast } from '../front_end_components/Toast.js';
import { ModalManager } from '../front_end_components/ModalManager.js';
import { Confirmation } from '../front_end_components/Confirmation.js';

export class RoleBox {
    constructor (container, deckManager) {
        this.createMode = false;
        this.category = 'default';
        this.deckManager = deckManager;
        this.defaultRoles = [];
        this.customRoles = [];
        container.innerHTML += HTMLFragments.CREATE_GAME_CUSTOM_ROLES;
        this.defaultButton = document.getElementById('role-category-default');
        this.customButton = document.getElementById('role-category-custom');
        this.defaultButton.addEventListener('click', () => { this.changeRoleCategory('default'); });
        this.customButton.addEventListener('click', () => { this.changeRoleCategory('custom'); });
        this.categoryTransition = document.getElementById('role-select').animate(
            [
                { opacity: 0 },
                { opacity: 1 }
            ], {
                fill: 'forwards',
                easing: 'linear',
                duration: 500
            });
    }

    loadDefaultRoles = () => {
        this.defaultRoles = defaultRoles.sort((a, b) => {
            if (a.team !== b.team) {
                const order = { good: 0, evil: 1, independent: 2 };
                return order[a.team] - order[b.team];
            }
            return a.role.localeCompare(b.role);
        }).map((role) => {
            role.id = createRandomId();
            return role;
        });
    };

    loadCustomRolesFromCookies () {
        const customRoles = localStorage.getItem('play-werewolf-custom-roles');
        if (customRoles !== null && validateCustomRoleCookie(customRoles)) {
            this.customRoles = JSON.parse(customRoles).map((roleObj) => {
                return {
                    id: createRandomId(),
                    role: roleObj.role,
                    team: roleObj.team,
                    description: roleObj.description,
                    custom: true
                };
            }); // we know it is valid JSON from the validate function
        }
    }

    loadCustomRolesFromFile (file) {
        const reader = new FileReader();
        reader.onerror = (e) => {
            toast(reader.error.message, 'error', true, true, 'medium');
        };
        reader.onload = (e) => {
            let string;
            if (typeof e.target.result !== 'string') {
                string = new TextDecoder('utf-8').decode(e.target.result);
            } else {
                string = e.target.result;
            }
            if (validateCustomRoleCookie(string)) {
                this.customRoles = JSON.parse(string).map((roleObj) => {
                    return {
                        id: createRandomId(),
                        role: roleObj.role,
                        team: roleObj.team,
                        description: roleObj.description,
                        custom: true
                    };
                }); // we know it is valid JSON from the validate function
                const initialLength = this.customRoles.length;
                // If any imported roles match a default role, exclude them.
                this.customRoles = this.customRoles.filter((entry) => !this.defaultRoles
                    .find((defaultEntry) => defaultEntry.role.toLowerCase().trim() === entry.role.toLowerCase().trim()));
                const message = this.customRoles.length === initialLength
                    ? 'All roles imported successfully!'
                    : 'Success, but one or more roles were excluded because their names match default roles.';
                const messageType = this.customRoles.length === initialLength ? 'success' : 'warning';
                ModalManager.dispelModal('upload-custom-roles-modal', 'modal-background');
                toast(message, messageType, true, true, 'medium');
                document.getElementById('custom-role-actions').style.display = 'none';
                localStorage.setItem('play-werewolf-custom-roles', JSON.stringify(this.customRoles));
                this.changeRoleCategory('custom');
                this.displayCustomRoles(document.getElementById('role-select'));
                for (const card of this.deckManager.deck) {
                    card.quantity = 0;
                }
                this.deckManager.updateDeckStatus();
            } else {
                toast(
                    'Invalid formatting. Make sure you import the file as downloaded from this page.',
                    'error',
                    true,
                    true,
                    'medium'
                );
            }
        };
        reader.readAsText(file);
    }

    loadSelectedRolesFromCurrentGame = (game) => {
        for (const card of game.deck) {
            if (card.quantity) {
                for (let i = 0; i < card.quantity; i ++) {
                    if (!this.deckManager.hasRole(card.role)) {
                        const role = this.getDefaultRole(card.role)
                            ? this.getDefaultRole(card.role)
                            : this.getCustomRole(card.role);
                        if (role) {
                            role.id = card.id;
                            this.deckManager.addToDeck(role);
                        }
                    } else {
                        this.deckManager.addCopyOfCard(card.role);
                    }
                }
            }
        }

        this.deckManager.updateDeckStatus();
    }

    // via https://stackoverflow.com/a/18197341
    downloadCustomRoles = (filename, text) => {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };

    changeRoleCategory = (category) => {
        this.category = category;
        if (category === 'default') {
            this.displayDefaultRoles(document.getElementById('role-select'));
            if (this.defaultButton) {
                this.defaultButton.classList.add('role-category-button-selected');
            }
            if (this.customButton) {
                this.customButton.classList.remove('role-category-button-selected');
            }
        } else if (category === 'custom') {
            this.displayCustomRoles(document.getElementById('role-select'));
            if (this.customButton) {
                this.customButton.classList.add('role-category-button-selected');
            }
            if (this.defaultButton) {
                this.defaultButton.classList.remove('role-category-button-selected');
            }
        }
    };

    displayDefaultRoles = (selectEl) => {
        document.querySelector('#custom-role-placeholder')?.remove();
        document.querySelectorAll('#role-select .default-role, #role-select .custom-role').forEach(e => e.remove());
        this.categoryTransition.play();
        for (let i = 0; i < this.defaultRoles.length; i ++) {
            const defaultRole = document.createElement('div');
            defaultRole.innerHTML = HTMLFragments.DECK_SELECT_ROLE_DEFAULT;
            defaultRole.classList.add('default-role');
            defaultRole.dataset.roleId = this.defaultRoles[i].id;
            defaultRole.classList.add(this.defaultRoles[i].team);
            defaultRole.querySelector('.role-name').innerText = this.defaultRoles[i].role;
            selectEl.appendChild(defaultRole);
        }

        this.addRoleEventListeners(selectEl, true, true, false, false, false);
    };

    displayCustomRolePlaceHolder = () => {
        const placeholder = document.createElement('div');
        placeholder.setAttribute('id', 'custom-role-placeholder');
        placeholder.innerText = 'Create a role with the button below.';
        document.getElementById('role-select').appendChild(placeholder);
    };

    displayCustomRoles = (selectEl) => {
        document.querySelector('#custom-role-placeholder')?.remove();
        document.querySelectorAll('#role-select .default-role, #role-select .custom-role').forEach(e => e.remove());
        this.categoryTransition.play();
        if (this.customRoles.length === 0) {
            this.displayCustomRolePlaceHolder();
            return;
        }
        this.customRoles.sort((a, b) => {
            if (a.team !== b.team) {
                const order = { good: 0, evil: 1, independent: 2 };
                return order[a.team] - order[b.team];
            }
            return a.role.localeCompare(b.role);
        });

        for (let i = 0; i < this.customRoles.length; i ++) {
            const customRole = document.createElement('div');
            customRole.innerHTML = HTMLFragments.DECK_SELECT_ROLE;
            customRole.classList.add('custom-role');
            customRole.dataset.roleId = this.customRoles[i].id;
            customRole.classList.add(this.customRoles[i].team);
            customRole.querySelector('.role-name').innerText = this.customRoles[i].role;
            selectEl.appendChild(customRole);
        }

        this.addRoleEventListeners(selectEl, true, true, true, true, true);
    };

    addRoleEventListeners = (select, addOne, info, edit, remove, isCustom) => {
        const elements = isCustom
            ? document.querySelectorAll('#role-select .custom-role')
            : document.querySelectorAll('#role-select .default-role');
        elements.forEach((role) => {
            const name = role.querySelector('.role-name').innerText;
            if (addOne) {
                const plusOneHandler = (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        e.preventDefault();
                        if (!this.deckManager.hasRole(name)) {
                            if (isCustom) {
                                this.deckManager.addToDeck(this.getCustomRole(name));
                            } else {
                                this.deckManager.addToDeck(this.getDefaultRole(name));
                            }
                        } else {
                            this.deckManager.addCopyOfCard(name);
                        }

                        toast(name + ' ', 'neutral', true, true, 'short', () => {
                            const toastEl = document.createElement('span');
                            toastEl.innerHTML =
                                `<span class="toast-plus-one">+1 </span>
                                 <span id="toast-content"></span>
                                 <span class="toast-plus-role-quantity"></span>`;
                            toastEl.querySelector('.toast-plus-role-quantity').innerText = ' (' + this.deckManager.getQuantityOfRole(name) + ')';

                            return toastEl;
                        });

                        this.deckManager.updateDeckStatus();
                    }
                };
                role.querySelector('.role-include').addEventListener('click', plusOneHandler);
                role.querySelector('.role-include').addEventListener('keyup', plusOneHandler);
            }

            if (remove) {
                const removeHandler = (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        Confirmation("Delete the role '" + name + "'?", () => {
                            e.preventDefault();
                            this.removeFromCustomRoles(name);
                            if (this.category === 'custom') {
                                this.displayCustomRoles(document.getElementById('role-select'));
                            }
                        });
                    }
                };
                role.querySelector('.role-remove').addEventListener('click', removeHandler);
                role.querySelector('.role-remove').addEventListener('keyup', removeHandler);
            }
            if (info) {
                const infoHandler = (e) => {
                    document.querySelector('#custom-role-info-modal-image')?.remove();
                    if (e.type === 'click' || e.code === 'Enter') {
                        const alignmentEl = document.getElementById('custom-role-info-modal-alignment');
                        const nameEl = document.getElementById('custom-role-info-modal-name');
                        alignmentEl.classList.remove(ALIGNMENT.GOOD);
                        alignmentEl.classList.remove(ALIGNMENT.EVIL);
                        alignmentEl.classList.remove(ALIGNMENT.INDEPENDENT);
                        nameEl.classList.remove(ALIGNMENT.GOOD);
                        nameEl.classList.remove(ALIGNMENT.EVIL);
                        nameEl.classList.remove(ALIGNMENT.INDEPENDENT);
                        e.preventDefault();
                        let role;
                        if (isCustom) {
                            document.getElementById('custom-role-info-modal-image-placeholder').style.display = 'none';
                            role = this.getCustomRole(name);
                        } else {
                            document.getElementById('custom-role-info-modal-image-placeholder').style.display = 'flex';
                            role = this.getDefaultRole(name);
                            const roleImg = new Image();
                            roleImg.id = 'custom-role-info-modal-image';
                            roleImg.onload = () => {
                                document.getElementById('custom-role-info-modal-image-placeholder').appendChild(roleImg);
                            };
                            if (name.toLowerCase() === 'villager') {
                                roleImg.src = '../images/roles/Villager' + Math.ceil(Math.random() * 2) + '.png';
                            } else {
                                roleImg.src = '../images/roles/' + name.replaceAll(' ', '') + '.png';
                            }
                        }
                        nameEl.innerText = name;
                        nameEl.classList.add(role.team);
                        alignmentEl.classList.add(role.team);
                        document.getElementById('custom-role-info-modal-description').innerText = role.description;
                        alignmentEl.innerText = role.team;
                        ModalManager.displayModal('custom-role-info-modal', 'modal-background', 'close-custom-role-info-modal-button');
                    }
                };
                role.querySelector('.role-info').addEventListener('click', infoHandler);
                role.querySelector('.role-info').addEventListener('keyup', infoHandler);
            }

            if (edit) {
                const editHandler = (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        e.preventDefault();
                        const entry = this.getCustomRole(name);
                        document.getElementById('role-name').value = entry.role;
                        document.getElementById('role-alignment').value = entry.team;
                        document.getElementById('role-description').value = entry.description;
                        this.createMode = false;
                        this.currentlyEditingRoleName = entry.role;
                        const createBtn = document.getElementById('create-role-button');
                        createBtn.setAttribute('value', 'Update');
                        ModalManager.displayModal('role-modal', 'modal-background', 'close-modal-button');
                    }
                };
                role.querySelector('.role-edit').addEventListener('click', editHandler);
                role.querySelector('.role-edit').addEventListener('keyup', editHandler);
            }
        });
    };

    removeFromCustomRoles = (name) => {
        const role = this.customRoles.find((entry) => entry.role === name);
        if (role) {
            this.customRoles.splice(this.customRoles.indexOf(role), 1);
            this.deckManager.removeRoleEntirelyFromDeck(role);
            localStorage.setItem('play-werewolf-custom-roles', JSON.stringify(this.customRoles));
            toast('"' + name + '" deleted.', 'error', true, true, 'short');
        }
    };

    getCustomRole (name) {
        return this.customRoles.find(
            (entry) => entry.role.toLowerCase().trim() === name.toLowerCase().trim()
        );
    };

    addCustomRole (role) {
        role.id = createRandomId();
        this.customRoles.push(role);
        localStorage.setItem('play-werewolf-custom-roles', JSON.stringify(this.customRoles));
    }

    updateCustomRole (entry, name, description, team) {
        entry.role = name;
        entry.description = description;
        entry.team = team;
        this.deckManager.updateDeckStatus();
        localStorage.setItem('play-werewolf-custom-roles', JSON.stringify(this.customRoles));
    }

    getDefaultRole (name) {
        return this.defaultRoles.find(
            (entry) => entry.role.toLowerCase().trim() === name.toLowerCase().trim()
        );
    };
}

function createRandomId () {
    let id = '';
    for (let i = 0; i < 50; i ++) {
        id += PRIMITIVES.CHAR_POOL[Math.floor(Math.random() * PRIMITIVES.CHAR_POOL.length)];
    }
    return id;
}

// this is user-supplied, so we should validate it fully
function validateCustomRoleCookie (cookie) {
    const valid = false;
    if (typeof cookie === 'string' && new Blob([cookie]).size <= 1000000) {
        try {
            const cookieJSON = JSON.parse(cookie);
            if (Array.isArray(cookieJSON)) {
                for (const entry of cookieJSON) {
                    if (entry !== null && typeof entry === 'object') {
                        if (typeof entry.role !== 'string' || entry.role.length > PRIMITIVES.MAX_CUSTOM_ROLE_NAME_LENGTH
                            || typeof entry.team !== 'string' || (entry.team !== ALIGNMENT.GOOD && entry.team !== ALIGNMENT.EVIL)
                            || typeof entry.description !== 'string' || entry.description.length > PRIMITIVES.MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH
                        ) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
                return true;
            }
        } catch (e) {
            return false;
        }
    }

    return valid;
}
