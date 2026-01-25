const PRIMITIVES = {
    ACCESS_CODE_CHAR_POOL: 'BCDFGHJLMNPQRSTVWXYZ23456789',
    INSTANCE_ID_CHAR_POOL: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ACCESS_CODE_LENGTH: 4,
    ACCESS_CODE_GENERATION_ATTEMPTS: 50,
    CLOCK_TICK_INTERVAL_MILLIS: 100,
    MAX_CUSTOM_ROLE_NAME_LENGTH: 50,
    MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH: 1000,
    STALE_GAME_SECONDS: 86400,
    USER_SIGNATURE_LENGTH: 25,
    INSTANCE_ID_LENGTH: 75,
    MAX_SPECTATORS: 25,
    MOCK_AUTH: 'mock_auth',
    MAX_PERSON_NAME_LENGTH: 40
};

const LOG_LEVEL = {
    INFO: 'info',
    DEBUG: 'debug',
    ERROR: 'error',
    WARN: 'warn',
    TRACE: 'trace'
};

const ALIGNMENT = {
    GOOD: 'good',
    EVIL: 'evil',
    INDEPENDENT: 'independent'
};

const REDIS_CHANNELS = {
    ACTIVE_GAME_STREAM: 'active_game_stream'
};

const CORS_OPTIONS = process.env.NODE_ENV?.trim() === 'development'
    ? {
        origin: '*',
        optionsSuccessStatus: 200
    }
    : {
        origin: 'https://play-werewolf.app',
        optionsSuccessStatus: 200
    };

const CONTENT_TYPE_VALIDATOR = (req, res, next) => {
    req.accepts();
    if (req.is('application/json')) {
        next();
    } else {
        res.status(400).send('Request has invalid content type.');
    }
};

const SOCKET_EVENTS = {
    IN_GAME_MESSAGE: 'inGameMessage'
};

const EVENT_IDS = {
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
    TIMER_EVENT: 'timerEvent',
    KICK_PERSON: 'kickPerson',
    UPDATE_GAME_ROLES: 'updateGameRoles',
    UPDATE_GAME_TIMER: 'updateGameTimer',
    LEAVE_ROOM: 'leaveRoom',
    BROADCAST: 'broadcast'
};

const SYNCABLE_EVENTS = function () {
    return [
        EVENT_IDS.NEW_GAME,
        EVENT_IDS.START_GAME,
        EVENT_IDS.KILL_PLAYER,
        EVENT_IDS.REVEAL_PLAYER,
        EVENT_IDS.TRANSFER_MODERATOR,
        EVENT_IDS.CHANGE_NAME,
        EVENT_IDS.END_GAME,
        EVENT_IDS.RESTART_GAME,
        EVENT_IDS.PLAYER_JOINED,
        EVENT_IDS.ADD_SPECTATOR,
        EVENT_IDS.SYNC_GAME_STATE,
        EVENT_IDS.UPDATE_SOCKET,
        EVENT_IDS.FETCH_GAME_STATE,
        EVENT_IDS.ASSIGN_DEDICATED_MOD,
        EVENT_IDS.RESUME_TIMER,
        EVENT_IDS.PAUSE_TIMER,
        EVENT_IDS.END_TIMER,
        EVENT_IDS.KICK_PERSON,
        EVENT_IDS.UPDATE_GAME_ROLES,
        EVENT_IDS.UPDATE_GAME_TIMER,
        EVENT_IDS.LEAVE_ROOM
    ];
};

const TIMER_EVENTS = function () {
    return [
        EVENT_IDS.RESUME_TIMER,
        EVENT_IDS.PAUSE_TIMER,
        EVENT_IDS.END_TIMER,
        EVENT_IDS.GET_TIME_REMAINING
    ];
};

const MESSAGES = {
    ENTER_NAME: 'Client must enter name.'
};

const STATUS = {
    LOBBY: 'lobby',
    IN_PROGRESS: 'in progress',
    ENDED: 'ended'
};

const USER_TYPES = {
    MODERATOR: 'moderator',
    PLAYER: 'player',
    TEMPORARY_MODERATOR: 'temp mod',
    KILLED_PLAYER: 'killed',
    KILLED_BOT: 'killed bot',
    SPECTATOR: 'spectator',
    BOT: 'bot'
};

const ERROR_MESSAGES = {
    GAME_IS_FULL: 'This game is full',
    BAD_CREATE_REQUEST: 'Game has invalid options.',
    NO_UNIQUE_ACCESS_CODE: 'Could not generate a unique access code.'
};

const ENVIRONMENTS = {
    LOCAL: 'local',
    PRODUCTION: 'production'
};

const GAME_PROCESS_COMMANDS = {
    END_TIMER: 'endTimer',
    START_GAME: 'startGame',
    START_TIMER: 'startTimer',
    PAUSE_TIMER: 'pauseTimer',
    RESUME_TIMER: 'resumeTimer',
    GET_TIME_REMAINING: 'getTimeRemaining'
};

module.exports = {
    PRIMITIVES,
    LOG_LEVEL,
    ALIGNMENT,
    REDIS_CHANNELS,
    CORS_OPTIONS,
    CONTENT_TYPE_VALIDATOR,
    SOCKET_EVENTS,
    EVENT_IDS,
    SYNCABLE_EVENTS,
    TIMER_EVENTS,
    MESSAGES,
    STATUS,
    USER_TYPES,
    ERROR_MESSAGES,
    ENVIRONMENTS,
    GAME_PROCESS_COMMANDS
};
