export const templates = {
    LOBBY:
    "<div id='lobby-header'>" +
        "<div>" +
            "<label for='game-link'>Share Link</label>" +
            "<div id='game-link'></div>" +
        "</div>" +
        "<div id='game-time'></div>" +
        "<div id='game-player-count'></div>" +
    "</div>" +
    "<div>" +
        "<div id='lobby-people-container'>" +
            "<label for='lobby-players'>Other People</label>" +
            "<div id='lobby-players'></div>" +
        "</div>" +
        "<div id='lobby-footer'>" +
            "<div id='game-deck'></div>" +
        "</div>" +
    "</div>",
    START_GAME_PROMPT:
    "<div id='start-game-prompt'>" +
        "<button id='start-game-button'>Start Game</button>" +
    "</div>",
    END_GAME_PROMPT:
    "<div id='end-game-prompt'>" +
        "<button id='end-game-button'>End Game</button>" +
    "</div>",
    PLAYER_GAME_VIEW:
    "<div id='game-header'>" +
        "<div>" +
            "<label for='game-timer'>Time Remaining</label>" +
            "<div id='game-timer'></div>" +
        "</div>" +
    "</div>" +
    "<div id='game-role' style='display:none'>" +
        "<h4 id='role-name'></h4>" +
        "<img alt='role' id='role-image'/>" +
        "<p id='role-description'></p>" +
    "</div>" +
    "<div id='game-role-back'>" +
        "<h4>Click to reveal your role</h4>" +
        "<p>(click again to hide)</p>" +
    "</div>" +
    "<div id='game-people-container'>" +
        "<label id='players-alive-label'></label>" +
        "<div id='game-player-list'></div>" +
    "</div>",
    SPECTATOR_GAME_VIEW:
    "<div id='game-header'>" +
        "<div>" +
            "<label for='game-timer'>Time Remaining</label>" +
            "<div id='game-timer'></div>" +
        "</div>" +
    "</div>" +
    "<div>" +
        "<label id='players-alive-label'></label>" +
        "<div id='game-player-list'></div>" +
    "</div>",
    MODERATOR_GAME_VIEW:
    "<div id='transfer-mod-modal-background' class='modal-background' style='display: none'></div>" +
    "<div id='transfer-mod-modal' class='modal' style='display: none'>" +
        "<form id='transfer-mod-form'>" +
            "<div id='transfer-mod-form-content'>" +
                "<h3>Transfer Mod Powers &#128081;</h3>" +
            "</div>" +
            "<div id='modal-button-container'>" +
                "<button id='close-modal-button'>Cancel</button>" +
            "</div>" +
        "</form>" +
    "</div>" +
    "<div id='game-header'>" +
        "<div class='timer-container-moderator'>" +
            "<div>" +
                "<label for='game-timer'>Time Remaining</label>" +
                "<div id='game-timer'></div>" +
            "</div>" +
            "<div id='play-pause'>" + "</div>" +
        "</div>" +
        "<button id='mod-transfer-button' class='moderator-player-button make-mod-button'>Transfer Mod Powers \uD83D\uDD00</button>" +
    "</div>" +
    "<div>" +
        "<label id='players-alive-label'></label>" +
        "<div id='game-player-list'>" +
            "<div class='evil-players'>" +
                "<label class='evil'>Team Evil</label>" +
                "<div id='player-list-moderator-team-evil'></div>" +
            "</div>" +
            "<div class='good-players'>" +
                "<label class='good'>Team Good</label>" +
                "<div id='player-list-moderator-team-good'></div>" +
            "</div>" +
        "</div>" +
    "</div>",
    TEMP_MOD_GAME_VIEW:
    "<div id='transfer-mod-modal-background' class='modal-background' style='display: none'></div>" +
        "<div id='transfer-mod-modal' class='modal' style='display: none'>" +
            "<form id='transfer-mod-form'>" +
                "<div id='transfer-mod-form-content'>" +
                    "<h3>Transfer Mod Powers &#128081;</h3>" +
                "</div>" +
                "<div id='modal-button-container'>" +
                    "<button id='close-modal-button'>Cancel</button>" +
                "</div>" +
            "</form>" +
        "</div>" +
        "<div id='game-header'>" +
            "<div class='timer-container-moderator'>" +
                "<div>" +
                    "<label for='game-timer'>Time Remaining</label>" +
                    "<div id='game-timer'></div>" +
                "</div>" +
                "<div id='play-pause'>" + "</div>" +
            "</div>" +
        "</div>" +
        "<div id='game-role' style='display:none'>" +
            "<h4 id='role-name'></h4>" +
            "<img alt='role' id='role-image'/>" +
            "<p id='role-description'></p>" +
        "</div>" +
        "<div id='game-role-back'>" +
            "<h4>Click to reveal your role</h4>" +
            "<p>(click again to hide)</p>" +
        "</div>" +
        "<div id='game-people-container'>" +
            "<label id='players-alive-label'></label>" +
            "<div id='game-player-list'></div>" +
        "</div>" +
    "</div>",
    MODERATOR_PLAYER:
        "<div>" +
            "<div class='game-player-name'></div>" +
            "<div class='game-player-role'></div>" +
        "</div>" +
        "<div class='player-action-buttons'>" +
            "<button class='moderator-player-button kill-player-button'>Kill \uD83D\uDC80</button>" +
            "<button class='moderator-player-button reveal-role-button'>Reveal Role <img src='../images/eye.svg'/></button>" +
        "</div>",
    GAME_PLAYER:
        "<div>" +
            "<div class='game-player-name'></div>" +
            "<div class='game-player-role'></div>" +
        "</div>",
    INITIAL_GAME_DOM:
        "<div id='game-title'></div>" +
        "<div id='client-container'>" +
            "<label for='client'>You</label>" +
            "<div id='client'>" +
                "<div id='client-name'></div>" +
                "<div id='client-user-type'></div>" +
            "</div>" +
        "</div>" +
        "<div id='game-state-container'></div>",
    // via https://loading.io/css/
    SPINNER:
        "<div class=\"lds-spinner\">" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
            "<div></div>" +
        "</div>",
    NAME_CHANGE_MODAL:
        "<div id='change-name-modal-background' class='modal-background'></div>" +
        "<div id='change-name-modal' class='modal'>" +
            "<form id='change-name-form'>" +
                "<div id='transfer-mod-form-content'>" +
                    "<label for='player-new-name'>Your name:</label>" +
                    "<input id='player-new-name' type='text'/>" +
                "</div>" +
                "<div id='modal-button-container'>" +
                    "<input type='submit' id='submit-new-name' value='Set Name'/>" +
                "</div>" +
            "</form>" +
        "</div>"
}
