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
        "<div>" +
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
    GAME:
    "<div id='game-header'>" +
        "<div>" +
            "<label for='game-timer'>Time Remaining</label>" +
            "<div id='game-timer'></div>" +
        "</div>" +
        "<div>" +
            "<label for='alive-count'>Players Left</label>" +
            "<div id='alive-count'></div>" +
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
    "</div>",
    MODERATOR_GAME_VIEW:
    "<div id='game-header'>" +
        "<div class='timer-container-moderator'>" +
            "<div>" +
                "<label for='game-timer'>Time Remaining</label>" +
                "<div id='game-timer'></div>" +
            "</div>" +
            "<div id='play-pause'>" +

            "</div>" +
        "</div>" +
        "<div>" +
            "<label for='alive-count'>Players Left</label>" +
            "<div id='alive-count'></div>" +
        "</div>" +
    "</div>" +
    "<div id='player-list-moderator'></div>" +
    "<button id='end-game-button'>End Game</button>"
}
