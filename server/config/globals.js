const globals = {
    ACCESS_CODE_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    ACCESS_CODE_LENGTH: 6,
    CLIENT_COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        GET_ENVIRONMENT: 'getEnvironment'
    },
    STATUS: {
        LOBBY: "lobby",
        IN_PROGRESS: "in progress"
    },
    USER_SIGNATURE_LENGTH: 25,
    USER_TYPES: {
        MODERATOR: "moderator",
        PLAYER: "player",
        TEMPORARY_MODERATOR: "temporary moderator"
    },
    ERROR_MESSAGE: {
        GAME_IS_FULL: "This game is full"
    },
    EVENTS: {
        PLAYER_JOINED: "playerJoined"
    },
    ENVIRONMENT: {
        LOCAL: "local",
        PRODUCTION: "production"
    }
};

module.exports = globals;
