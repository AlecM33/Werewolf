const globals = {
    ACCESS_CODE_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    ACCESS_CODE_LENGTH: 6,
    CLIENT_COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        TOGGLE_READY: 'toggleReady',
        PROCESS_GUESS: 'processGuess'
    },
    STATUS: {
        LOBBY: "lobby"
    },
    USER_SIGNATURE_LENGTH: 25,
    USER_TYPES: {
        MODERATOR: "moderator",
        PLAYER: "player"
    },
    ERROR_MESSAGE: {
        GAME_IS_FULL: "This game is full"
    }
};

module.exports = globals;
