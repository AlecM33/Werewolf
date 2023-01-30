const globals = {
    ACCESS_CODE_CHAR_POOL: 'BCDFGHJKLMNPQRSTVWXYZ23456789',
    INSTANCE_ID_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ACCESS_CODE_LENGTH: 4,
    ACCESS_CODE_GENERATION_ATTEMPTS: 50,
    CLOCK_TICK_INTERVAL_MILLIS: 100,
    MAX_CUSTOM_ROLE_NAME_LENGTH: 50,
    MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH: 1000,
    ALIGNMENT: {
        GOOD: 'good',
        EVIL: 'evil'
    },
    REDIS_CHANNELS: {
        ACTIVE_GAME_STREAM: 'active_game_stream'
    },
    CORS: process.env.NODE_ENV?.trim() === 'development'
        ? {
            origin: '*',
            optionsSuccessStatus: 200
        }
        : {
            origin: 'https://play-werewolf.app',
            optionsSuccessStatus: 200
        },
    CONTENT_TYPE_VALIDATOR: (req, res, next) => {
        req.accepts();
        if (req.is('application/json')) {
            next();
        } else {
            res.status(400).send('Request has invalid content type.');
        }
    },
    STALE_GAME_SECONDS: 86400,
    SOCKET_EVENTS: {
        IN_GAME_MESSAGE: 'inGameMessage'
    },
    EVENT_IDS: {
        NEW_GAME: 'newGame',
        FETCH_GAME_STATE: 'fetchGameState',
        START_GAME: 'startGame',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer',
        END_TIMER: 'endTimer',
        GET_TIME_REMAINING: 'getTimeRemaining',
        SOURCE_TIMER_EVENT: 'sourceTimerEvent',
        KILL_PLAYER: 'killPlayer',
        REVEAL_PLAYER: 'revealPlayer',
        TRANSFER_MODERATOR: 'transferModerator',
        CHANGE_NAME: 'changeName',
        END_GAME: 'endGame',
        RESTART_GAME: 'restartGame',
        PLAYER_JOINED: 'playerJoined',
        UPDATE_SPECTATORS: 'updateSpectators',
        ADD_SPECTATOR: 'addSpectator',
        SYNC_GAME_STATE: 'syncGameState',
        UPDATE_SOCKET: 'updateSocket',
        ASSIGN_DEDICATED_MOD: 'assignDedicatedMod',
        TIMER_EVENT: 'timerEvent'
    },
    SYNCABLE_EVENTS: function () {
        return [
            this.EVENT_IDS.NEW_GAME,
            this.EVENT_IDS.START_GAME,
            this.EVENT_IDS.KILL_PLAYER,
            this.EVENT_IDS.REVEAL_PLAYER,
            this.EVENT_IDS.TRANSFER_MODERATOR,
            this.EVENT_IDS.END_GAME,
            this.EVENT_IDS.RESTART_GAME,
            this.EVENT_IDS.PLAYER_JOINED,
            this.EVENT_IDS.ADD_SPECTATOR,
            this.EVENT_IDS.SYNC_GAME_STATE,
            this.EVENT_IDS.UPDATE_SOCKET,
            this.EVENT_IDS.FETCH_GAME_STATE,
            this.EVENT_IDS.ASSIGN_DEDICATED_MOD,
            this.EVENT_IDS.RESUME_TIMER,
            this.EVENT_IDS.PAUSE_TIMER,
            this.EVENT_IDS.END_TIMER
        ];
    },
    TIMER_EVENTS: function () {
        return [
            this.EVENT_IDS.RESUME_TIMER,
            this.EVENT_IDS.PAUSE_TIMER,
            this.EVENT_IDS.END_TIMER,
            this.EVENT_IDS.GET_TIME_REMAINING
        ];
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
    INSTANCE_ID_LENGTH: 75,
    USER_TYPES: {
        MODERATOR: 'moderator',
        PLAYER: 'player',
        TEMPORARY_MODERATOR: 'temp mod',
        KILLED_PLAYER: 'killed',
        KILLED_BOT: 'killed bot',
        SPECTATOR: 'spectator',
        BOT: 'bot'
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
        UPDATE_SPECTATORS: 'newSpectator',
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
    MOCK_AUTH: 'mock_auth',
    MAX_SPECTATORS: 25
};

module.exports = globals;
