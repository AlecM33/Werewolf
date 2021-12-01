const globals = {
    ACCESS_CODE_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    ACCESS_CODE_LENGTH: 6,
    CLOCK_TICK_INTERVAL_MILLIS: 10,
    CLIENT_COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        GET_ENVIRONMENT: 'getEnvironment',
        START_GAME: 'startGame',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer'
    },
    STATUS: {
        LOBBY: "lobby",
        IN_PROGRESS: "in progress",
        ENDED: "ended"
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
        PLAYER_JOINED: "playerJoined",
        SYNC_GAME_STATE: "syncGameState"
    },
    ENVIRONMENT: {
        LOCAL: "local",
        PRODUCTION: "production"
    },
    LOG_LEVEL: {
        INFO: "info",
        DEBUG: "debug",
        ERROR: "error",
        WARN: "warn",
        TRACE: "trace"
    },
    GAME_PROCESS_COMMANDS: {
        END_GAME: "endGame",
        START_GAME: "startGame",
        START_TIMER: "startTimer",
        PAUSE_TIMER: "pauseTimer",
        RESUME_TIMER: "resumeTimer",
        GET_TIME_REMAINING: "getTimeRemaining"
    }
};

module.exports = globals;
