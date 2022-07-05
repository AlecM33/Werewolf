const globals = {
    ACCESS_CODE_CHAR_POOL: 'BCDFGHJKLMNPQRSTVWXYZ23456789',
    ACCESS_CODE_LENGTH: 4,
    ACCESS_CODE_GENERATION_ATTEMPTS: 50,
    CLOCK_TICK_INTERVAL_MILLIS: 100,
    CORS: process.env.NODE_ENV?.trim() === 'development'
        ? {
            origin: '*',
            optionsSuccessStatus: 200
        }
        : {
            origin: 'https://play-werewolf.app',
            optionsSuccessStatus: 200
        },
    STALE_GAME_HOURS: 12,
    CLIENT_COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        START_GAME: 'startGame',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer',
        GET_TIME_REMAINING: 'getTimeRemaining',
        KILL_PLAYER: 'killPlayer',
        REVEAL_PLAYER: 'revealPlayer',
        TRANSFER_MODERATOR: 'transferModerator',
        CHANGE_NAME: 'changeName',
        END_GAME: 'endGame'
    },
    MESSAGES: {
        ENTER_NAME: 'Client must enter name.'
    },
    STATUS: {
        LOBBY: 'lobby',
        IN_PROGRESS: 'in progress',
        ENDED: 'ended'
    },
    USER_SIGNATURE_LENGTH: 25,
    USER_TYPES: {
        MODERATOR: 'moderator',
        PLAYER: 'player',
        TEMPORARY_MODERATOR: 'player / temp mod',
        KILLED_PLAYER: 'killed',
        SPECTATOR: 'spectator'
    },
    ERROR_MESSAGE: {
        GAME_IS_FULL: 'This game is full',
        BAD_CREATE_REQUEST: 'Game has invalid options.',
        NO_UNIQUE_ACCESS_CODE: 'Could not generate a unique access code.'
    },
    EVENTS: {
        PLAYER_JOINED: 'playerJoined',
        PLAYER_LEFT: 'playerLeft',
        SYNC_GAME_STATE: 'syncGameState',
        NEW_SPECTATOR: 'newSpectator',
        BROADCAST: 'broadcast'
    },
    ENVIRONMENT: {
        LOCAL: 'local',
        PRODUCTION: 'production'
    },
    LOG_LEVEL: {
        INFO: 'info',
        DEBUG: 'debug',
        ERROR: 'error',
        WARN: 'warn',
        TRACE: 'trace'
    },
    GAME_PROCESS_COMMANDS: {
        END_TIMER: 'endTimer',
        START_GAME: 'startGame',
        START_TIMER: 'startTimer',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer',
        GET_TIME_REMAINING: 'getTimeRemaining'
    },
    MOCK_AUTH: 'mock_auth'
};

module.exports = globals;
