export const globals = {
    USER_SIGNATURE_LENGTH: 25,
    ACCESS_CODE_LENGTH: 6,
    PLAYER_ID_COOKIE_KEY: 'play-werewolf-anon-id',
    ACCESS_CODE_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        GET_ENVIRONMENT: 'getEnvironment'
    },
    GAME_STATE: {
        LOBBY: 'lobby'
    },
    ALIGNMENT: {
        GOOD: "good",
        EVIL: "evil"
    },
    EVENTS: {
        PLAYER_JOINED: "playerJoined"
    },
    USER_TYPES: {
        MODERATOR: "moderator",
        PLAYER: "player",
        TEMPORARY_MODERATOR: "temporary moderator"
    },
    ENVIRONMENT: {
        LOCAL: "local",
        PRODUCTION: "production"
    }
};
