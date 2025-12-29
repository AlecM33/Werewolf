export const HTMLFragments = {
    LOBBY:
    `<div id='lobby-header'>
        <div>
            <label for='game-link'>Share this Room:</label>
            <div tabindex='0' id='game-link'></div>
            <div id='game-code'></div>
        </div>
        <div>
            <canvas id="canvas"></canvas>
            <div id='game-parameters'>
                <div>
                    <img alt='clock' width="20" height="20" src='/images/clock.svg'/>
                    <div id='timer-parameters'></div>
                </div>
                <div>
                    <img alt='person' width="22" height="20" src='/images/person.svg'/>
                    <div id='game-player-count'></div>
                </div>
            </div>
        </div>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img alt='Info icon' width="25" height="25" src='/images/info.svg'/></button>
        </div>
    </div>
    <div>
        <div id='lobby-people-container'>
            <label for='lobby-players'></label>
            <div id="spectator-count" tabindex="0"></div>
            <div id='lobby-players'></div>
        </div>
        <div id='lobby-footer'>
            <div id='game-deck'></div>
        </div>
    </div>`,
    ENTER_NAME_STEP:
        `<div>
            <input type="text" id="moderator-name" autocomplete='given-name' placeholder="enter your name...">
        </div>
        <div>
            <label for="test-game">Populate the room with bots?</label>
            <select id="test-game">
                <option value="no" selected>No</option>
                <option value="yes">Yes</option>
            </select>
        </div>`,
    START_GAME_PROMPT:
    `<button id='edit-roles-button'>Edit Roles</button>
    <button id='edit-timer-button'>Edit Timer</button>
    <button id='start-game-button'>Start Game</button>`,
    LEAVE_GAME_PROMPT:
    '<button id=\'leave-game-button\' class="app-button">Leave Room</button>',
    END_GAME_BUTTON:
    '<button id=\'end-game-button\' class=\'app-button\'>End Game</button>',
    ROLE_EDIT_BUTTONS:
    `<button class="app-button cancel" id="cancel-role-changes-button">Cancel</button>
    <button class="app-button" id="save-role-changes-button">
        <p>Save</p><img src="../images/save-svgrepo-com.svg" alt='save'>
    </button>`,
    TIMER_EDIT_BUTTONS:
        `<button class="app-button cancel" id="cancel-timer-changes-button">Cancel</button>
        <button class="app-button" id="save-timer-changes-button">
            <p>Save</p><img src="../images/save-svgrepo-com.svg" alt='save'>
        </button>`,
    PLAYER_GAME_VIEW:
    `<div id='game-header'>
        <div>
            <label for='game-timer'>Time Remaining</label>
            <div id='game-timer'>
                <div class="lds-spinner lds-spinner-clock">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
        </div>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img alt='Info icon' width="25" height="25" src='/images/info.svg'/></button>
        </div>
    </div>
    <div id='game-role' tabindex="0">
        <h4 id='role-name'></h4>
        <img alt='role' id='role-image'/>
        <p id='role-description'></p>
    </div>
    <div id='game-role-back' tabindex="0">
        <h4>Double-click here to show your role</h4>
        <p>(Double-click here again to hide)</p>
    </div>
    <div id='game-people-container'>
        <div id="current-moderator" class="moderator">
            <div id="current-moderator-name" class="person-name-element"></div>
            <div id="current-moderator-type"></div>
        </div>
        <label id='players-alive-label'></label>
        <div id="spectator-count" tabindex="0"></div>
        <div id='game-player-list'></div>
    </div>`,
    SPECTATOR_GAME_VIEW:
    `<div id='game-header'>
        <div>
            <label for='game-timer'>Time Remaining</label>
            <div id='game-timer'>
                <div class="lds-spinner lds-spinner-clock">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
            </div>
        </div>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img alt='Info icon' width="25" height="25" src='/images/info.svg'/></button>
        </div>
    </div>
    <div id='game-people-container'>
        <div id="current-moderator" class="moderator">
            <div id="current-moderator-name" class="person-name-element"></div>
            <div id="current-moderator-type"></div>
        </div>
        <label id='players-alive-label'></label>
        <div id="spectator-count" tabindex="0"></div>
        <div id='game-player-list'></div>
    </div>`,
    TRANSFER_MOD_MODAL:
    `<div id='transfer-mod-modal-background' class='modal-background'></div>
    <div tabindex='-1' id='transfer-mod-modal' class='modal'>
        <h2>Select a new moderator &#128081;</h2>
        <div id='transfer-mod-modal-content'></div>
        <div class='modal-button-container'>
            <button id='close-mod-transfer-modal-button' class='app-button cancel'>Cancel</button>
        </div>
    </div>`,
    PLAYER_OPTIONS_MODAL:
    `<div id='player-options-modal-background' class='modal-background'></div>
    <div tabindex='-1' id='player-options-modal' class='modal'>
        <h2 id="player-options-modal-title"></h2>
        <div id='player-options-modal-content'></div>
        <div class='modal-button-container'>
            <button id='close-player-options-modal-button' class='app-button cancel'>Close</button>
        </div>
    </div>`,
    MODERATOR_GAME_VIEW:
    `<div id='game-header'>
        <div id='timer-container-moderator'>
            <div>
                <label for='game-timer'>Time Remaining</label>
                <div id='game-timer'>
                    <div class="lds-spinner lds-spinner-clock">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                </div>
            </div>
            <div id='play-pause' tabindex="0">
                <div id="play-pause-placeholder"></div>
            </div>
        </div>
        <button id='mod-transfer-button' class='moderator-player-button make-mod-button app-button'>
            Transfer Mod Powers <img alt='transfer icon' src='/images/shuffle.svg'/>
        </button>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img alt='Info icon' width="25" height="25" src='/images/info.svg'/></button>
        </div>
    </div>
    <div id="game-players-container">
        <label id='players-alive-label'></label>
        <div id="spectator-count" tabindex="0"></div>
        <div id='game-player-list'>
            <div class='evil-players'>
                <label class='evil'>Team Evil</label>
                <div id='player-list-moderator-team-evil'></div>
            </div>
            <div class='good-players'>
                <label class='good'>Team Good</label>
                <div id='player-list-moderator-team-good'></div>
            </div>
        </div>
    </div>`,
    TEMP_MOD_GAME_VIEW:
    `<div id='game-header'>
            <div id='timer-container-moderator'>
                <div>
                    <label for='game-timer'>Time Remaining</label>
                    <div id='game-timer'>
                        <div class="lds-spinner lds-spinner-clock">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                </div>
                <div id='play-pause'> </div>
            </div>
            <div>
                <button id='role-info-button' class='app-button'>Roles in This Game <img alt='Info icon' width="25" height="25" src='/images/info.svg'/></button>
            </div>
        </div>
        <div id='game-role' tabindex="0">
            <h4 id='role-name'></h4>
            <img alt='role' id='role-image'/>
            <p id='role-description'></p>
        </div>
        <div id='game-role-back' tabindex="0">
            <h4>Double-click here to show your role</h4>
            <p>(Double-click here again to hide)</p>
        </div>
        <div id='game-people-container'>
            <label id='players-alive-label'></label>
            <div id="spectator-count" tabindex="0"></div>
            <div id='game-player-list'></div>
        </div>
    </div>`,
    MODERATOR_PLAYER:
        `<div>
            <div class='game-player-name person-name-element'></div>
            <div class='game-player-role'></div>
        </div>
        <div class='player-action-buttons'>
            <button title='Kill' class='moderator-player-button kill-player-button'>\uD83D\uDC80</button>
            <button title='Reveal' class='moderator-player-button reveal-role-button'><img alt='reveal' src='../../images/eye.svg'/></button>
        </div>`,
    GAME_PLAYER:
        `<div>
            <div class='game-player-name person-name-element'></div>
            <div class='game-player-role'></div>
        </div>`,
    INITIAL_GAME_DOM:
        `
        <div id='client-container'>
            <label for='client'>You</label>
            <div id='client'>
                <div id='client-name'></div>
                <div id='client-user-type'></div>
            </div>
            <button id="edit-name-button">
                <img alt="edit name" src="../../images/pencil.svg"/>
            </button>
        </div>
        <div id='lobby-title'>Lobby</div>
        <div id='game-state-container'></div>`,
    // via https://loading.io/css/
    SPINNER:
        `<div class="lds-spinner lds-spinner-clock">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>`,
    NAME_CHANGE_FORM:
        `<div id='change-name-form-content'>
            <label for='client-new-name'>Your name:</label>
            <input maxlength="40" id='client-new-name' autocomplete='off' type='text'/>
        </div>`,
    ROLE_INFO_MODAL:
        `<div id='role-info-modal-background' class='modal-background'></div>
        <div tabindex='-1' id='role-info-modal' class='modal'>
            <h2>Roles in this game:</h2>
            <div id='game-role-info-container'></div>
            <div class='modal-button-container'>
                <button id='close-role-info-modal-button' class='app-button cancel' >Close</button>
            </div>
        </div>`,
    END_OF_GAME_VIEW:
        `<div id='end-of-game-header'>
            <h2>&#x1F3C1; The moderator has ended the game. Roles are revealed.</h2>
            <div id="end-of-game-buttons">
                <button id='role-info-button' class='app-button'>Roles in This Game <img alt='Info icon' width="25" height="25" src='/images/info.svg'/></button>
            </div>
        </div>
        <div id='game-people-container'>
            <div id="current-moderator" class="moderator">
                <div id="current-moderator-name" class="person-name-element"></div>
                <div id="current-moderator-type"></div>
            </div>
            <label id='players-alive-label'></label>
            <div id='game-player-list'></div>
        </div>`,
    CREATE_GAME_DECK:
        `<div id='deck-container'>
            <div>
                <label for='deck-good'>Available Good Roles</label>
                <div id='deck-good'></div>
            </div>
            <div>
                <label for='deck-evil'>Available Evil Roles</label>
                <div id='deck-evil'></div>
            </div>
        </div>`,
    DECK_TEMPLATE:
        `<div class='template-option-name'></div>
        <div class='template-option-roles'></div>`,
    CREATE_GAME_CUSTOM_ROLES:
        `<div id="custom-roles-container">
            <button id="custom-role-hamburger" class="hamburger hamburger--collapse" type="button">
                <span class="hamburger-box">
                    <span class="hamburger-inner"></span>
                </span>
            </button>
            <div id="custom-role-actions">
                <div tabindex="0" class="custom-role-action" id="custom-roles-export">Export Roles</div>
                <div tabindex="0" class="custom-role-action" id="custom-roles-import">Import Roles</div>
            </div>
            <label for="add-card-to-deck-form">Role Box</label>
            <div id="role-category-buttons">
                <button id="role-category-default" class="role-category-button role-category-button-selected">Default Roles</button>
                <button id="role-category-custom" class="role-category-button">Custom Roles</button>
            </div>
            <div id="role-select"></div>
            <button id="custom-role-btn" class="app-button">+ Create Custom Role</button>
        </div>`,
    CREATE_GAME_DECK_STATUS:
        `<div id="deck-status-container">
            <div id="deck-status-header">
                <div id="deck-count">0 Players</div>
                <button id="deck-template-button" class="app-button">Use Template</button>
            </div>
            <div id="deck-list"></div>
        </div>`,
    DECK_SELECT_ROLE:
        `<div class="role-name">

</div>
        <div class="role-options">
            <img tabindex="0" class="role-include" src="../images/add.svg" title="add one" alt="add one"/>
            <img tabindex="0" class="role-info" src="../images/info.svg" title="info" alt="info"/>
            <img tabindex="0" class="role-edit" src="../images/pencil.svg" title="edit" alt="edit"/>
            <img tabindex="0" class="role-remove" src="../images/delete-2.svg" title="remove" alt="remove"/>
        </div>`,
    DECK_SELECT_ROLE_DEFAULT:
        `<div class="role-name"></div>
        <div class="role-options">
            <img tabindex="0" class="role-include" src="../images/add.svg" title="add one" alt="add one"/>
            <img tabindex="0" class="role-info" src="../images/info.svg" title="info" alt="info"/>
        </div>`,
    DECK_SELECT_ROLE_ADDED_TO_DECK:
        `<div class="role-name"></div>
        <div class="role-options">
            <img tabindex="0" class="role-remove" src="../images/remove.svg" title="remove one" alt="remove one"/>
            <img tabindex="0" class="role-info" src="../images/info.svg" title="info" alt="info"/>
        </div>`
};
