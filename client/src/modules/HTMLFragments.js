export const HTMLFragments = {
    LOBBY:
    `<div id='lobby-header'>
        <div>
            <label for='game-link'>Share Link</label>
            <div tabindex='0' id='game-link'></div>
            <div id='game-code'></div>
        </div>
        <canvas id="canvas"></canvas>
        <div id='game-parameters'>
            <div>
                <img alt='clock' src='/images/clock.svg'/>
                <div id='game-time'></div>
            </div>
            <div>
                <img alt='person' src='/images/person.svg'/>
            <div id='game-player-count'></div>
        </div>
        </div>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img src='/images/info.svg'/></button>
        </div>
    </div>
    <div>
        <div id='lobby-people-container'>
            <label for='lobby-players'>Other People</label>
            <div id='lobby-players'></div>
        </div>
        <div id='lobby-footer'>
            <div id='game-deck'></div>
        </div>
    </div>`,
    ENTER_NAME_STEP:
    `<div id='step-4'>
        <div>
            <input type="text" id="moderator-name" autocomplete='given-name' placeholder="enter your name...">
        </div>
    </div>`,
    START_GAME_PROMPT:
    `<div id='start-game-prompt'>
        <button id='start-game-button'>Start Game</button>
    </div>`,
    END_GAME_PROMPT:
    `<div id='end-game-prompt'>
        <button id='end-game-button'>End Game</button>
    </div>`,
    PLAYER_GAME_VIEW:
    `<div id='game-header'>
        <div>
            <label for='game-timer'>Time Remaining</label>
            <div id='game-timer'></div>
        </div>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img src='/images/info.svg'/></button>
        </div>
    </div>
    <div id='game-role'>
        <h4 id='role-name'></h4>
        <img alt='role' id='role-image'/>
        <p id='role-description'></p>
    </div>
    <div id='game-role-back'>
        <h4>Double-tap here to show your role</h4>
        <p>(Double-tap here again to hide)</p>
    </div>
    <div id='game-people-container'>
        <label id='players-alive-label'></label>
        <div id='game-player-list'></div>
    </div>`,
    SPECTATOR_GAME_VIEW:
    `<div id='game-header'>
        <div>
            <label for='game-timer'>Time Remaining</label>
            <div id='game-timer'></div>
        </div>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img src='/images/info.svg'/></button>
        </div>
    </div>
    <div id='game-people-container'>
        <label id='players-alive-label'></label>
        <div id='game-player-list'></div>
    </div>`,
    TRANSFER_MOD_MODAL:
    `<div id='transfer-mod-modal-background' class='modal-background'></div>
    <div tabindex='-1' id='transfer-mod-modal' class='modal'>
        <h3>Transfer Mod Powers &#128081;</h3>
        <div id='transfer-mod-modal-content'></div>
        <div class='modal-button-container'>
            <button id='close-mod-transfer-modal-button' class='app-button cancel'>Cancel</button>
        </div>
    </div>`,
    MODERATOR_GAME_VIEW:
    `<div id='game-header'>
        <div id='timer-container-moderator'>
            <div>
                <label for='game-timer'>Time Remaining</label>
                <div id='game-timer'></div>
            </div>
            <div id='play-pause'>
                <div id="play-pause-placeholder"></div>
            </div>
        </div>
        <button id='mod-transfer-button' class='moderator-player-button make-mod-button app-button'>Transfer Mod Powers \uD83D\uDD00</button>
        <div>
            <button id='role-info-button' class='app-button'>Roles in This Game <img src='/images/info.svg'/></button>
        </div>
    </div>
    <div>
        <label id='players-alive-label'></label>
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
                    <div id='game-timer'></div>
                </div>
                <div id='play-pause'> </div>
            </div>
            <div>
                <button id='role-info-button' class='app-button'>Roles in This Game <img src='/images/info.svg'/></button>
            </div>
        </div>
        <div id='game-role'>
            <h4 id='role-name'></h4>
            <img alt='role' id='role-image'/>
            <p id='role-description'></p>
        </div>
        <div id='game-role-back'>
            <h4>Double-tap here to show your role</h4>
            <p>(Double-tap here again to hide)</p>
        </div>
        <div id='game-people-container'>
            <label id='players-alive-label'></label>
            <div id='game-player-list'></div>
        </div>
    </div>`,
    MODERATOR_PLAYER:
        `<div>
            <div class='game-player-name'></div>
            <div class='game-player-role'></div>
        </div>
        <div class='player-action-buttons'>
            <button class='moderator-player-button kill-player-button'>Kill \uD83D\uDC80</button>
            <button class='moderator-player-button reveal-role-button'>Reveal <img src='../images/eye.svg'/></button>
        </div>`,
    GAME_PLAYER:
        `<div>
            <div class='game-player-name'></div>
            <div class='game-player-role'></div>
        </div>`,
    INITIAL_GAME_DOM:
        `<div id='game-title'></div>
        <div id='client-container'>
            <label for='client'>You</label>
            <div id='client'>
                <div id='client-name'></div>
                <div id='client-user-type'></div>
            </div>
        </div>
        <div id='game-state-container'></div>`,
    // via https://loading.io/css/
    SPINNER:
        `<div class="lds-spinner">
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
    NAME_CHANGE_MODAL:
        `<div id='change-name-modal-background' class='modal-background'></div>
        <div tabindex='-1' id='change-name-modal' class='modal'>
            <form id='change-name-form'>
                <div id='transfer-mod-form-content'>
                    <label for='player-new-name'>Your name:</label>
                    <input id='player-new-name' autocomplete='given-name' type='text'/>
                </div>
                <div class='modal-button-container'>
                    <input type='submit' id='submit-new-name' value='Set Name'/>
                </div>
            </form>
        </div>`,
    ROLE_INFO_MODAL:
        `<div id='role-info-modal-background' class='modal-background'></div>
        <div tabindex='-1' id='role-info-modal' class='modal'>
            <h2>Roles in this game:</h2>
            <div id='game-role-info-container'></div>
            <div class='modal-button-container'>
                <button id='close-role-info-modal-button' class='app-button cancel'>Close</button>
            </div>
        </div>`,
    END_OF_GAME_VIEW:
        `<div id='end-of-game-header'>
            <h2>&#x1F3C1; The moderator has ended the game. Roles are revealed.</h2>
            <div id="end-of-game-buttons">
                <div>
                    <button id='role-info-button' class='app-button'>Roles in This Game <img src='/images/info.svg'/></button>
                </div>
                <div>
                    <a href='/'>
                        <button class='app-button'>Go Home \uD83C\uDFE0</button>
                    </a>
                </div>
            </div>
        </div>
        <div id='game-people-container'>
            <label id='players-alive-label'></label>
            <div id='game-player-list'></div>
        </div>`,
    RESTART_GAME_BUTTON:
        '<button id=\'restart-game\' class=\'app-button\'>Run it back 🔄</button>',
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
        `<div class="role-name"></div>
        <div class="role-options">
            <img tabindex="0" class="role-include" src="images/add.svg" title="add one" alt="add one"/>
            <img tabindex="0" class="role-info" src="images/info.svg" title="info" alt="info"/>
            <img tabindex="0" class="role-edit" src="images/pencil.svg" title="edit" alt="edit"/>
            <img tabindex="0" class="role-remove" src="images/delete.svg" title="remove" alt="remove"/>
        </div>`,
    DECK_SELECT_ROLE_DEFAULT:
        `<div class="role-name"></div>
        <div class="role-options">
            <img tabindex="0" class="role-include" src="images/add.svg" title="add one" alt="add one"/>
            <img tabindex="0" class="role-info" src="images/info.svg" title="info" alt="info"/>
        </div>`,
    DECK_SELECT_ROLE_ADDED_TO_DECK:
        `<div class="role-name"></div>
        <div class="role-options">
            <img tabindex="0" class="role-remove" src="images/remove.svg" title="remove one" alt="remove one"/>
            <img tabindex="0" class="role-info" src="images/info.svg" title="info" alt="info"/>
        </div>`
};
