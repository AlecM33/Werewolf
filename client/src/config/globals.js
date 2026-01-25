export const PRIMITIVES = {
    CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    USER_SIGNATURE_LENGTH: 75,
    CLOCK_TICK_INTERVAL_MILLIS: 50,
    MAX_CUSTOM_ROLE_NAME_LENGTH: 50,
    MAX_PERSON_NAME_LENGTH: 40,
    MAX_DECK_SIZE: 50,
    MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH: 1000,
    TOAST_DURATION_DEFAULT: 6,
    ACCESS_CODE_LENGTH: 4,
    MAX_MINUTES: 59,
    MAX_HOURS: 5,
    PLAYER_ID_COOKIE_KEY: 'play-werewolf-anon-id'
};

export const STATUS = {
    LOBBY: 'lobby',
    IN_PROGRESS: 'in progress',
    ENDED: 'ended'
};

export const ALIGNMENT = {
    GOOD: 'good',
    EVIL: 'evil',
    INDEPENDENT: 'independent'
};

export const MESSAGES = {
    ENTER_NAME: 'Client must enter name.'
};

export const SOCKET_EVENTS = {
    IN_GAME_MESSAGE: 'inGameMessage'
};

export const USER_TYPES = {
    MODERATOR: 'moderator',
    PLAYER: 'player',
    TEMPORARY_MODERATOR: 'temp mod',
    KILLED_PLAYER: 'killed',
    SPECTATOR: 'spectator',
    BOT: 'bot'
};

export const ENVIRONMENTS = {
    LOCAL: 'local',
    PRODUCTION: 'production'
};

export const USER_TYPE_ICONS = {
    player: ' \uD83C\uDFAE',
    moderator: ' \uD83D\uDC51',
    'temp mod': ' \uD83C\uDFAE\uD83D\uDC51',
    spectator: ' \uD83D\uDC7B',
    killed: ' \uD83D\uDC80',
    bot: ' \uD83E\uDD16'
};

export const EVENT_IDS = {
    FETCH_GAME_STATE: 'fetchGameState',
    START_GAME: 'startGame',
    PAUSE_TIMER: 'pauseTimer',
    RESUME_TIMER: 'resumeTimer',
    END_TIMER: 'endTimer',
    GET_TIME_REMAINING: 'getTimeRemaining',
    KILL_PLAYER: 'killPlayer',
    REVEAL_PLAYER: 'revealPlayer',
    TRANSFER_MODERATOR: 'transferModerator',
    CHANGE_NAME: 'changeName',
    END_GAME: 'endGame',
    PLAYER_JOINED: 'playerJoined',
    SYNC_GAME_STATE: 'syncGameState',
    START_TIMER: 'startTimer',
    PLAYER_LEFT: 'playerLeft',
    ADD_SPECTATOR: 'addSpectator',
    UPDATE_SPECTATORS: 'updateSpectators',
    RESTART_GAME: 'restartGame',
    ASSIGN_DEDICATED_MOD: 'assignDedicatedMod',
    KICK_PERSON: 'kickPerson',
    UPDATE_GAME_ROLES: 'updateGameRoles',
    UPDATE_GAME_TIMER: 'updateGameTimer',
    LEAVE_ROOM: 'leaveRoom'
};

export const TIMER_EVENTS = function () {
    return [
        EVENT_IDS.PAUSE_TIMER,
        EVENT_IDS.RESUME_TIMER,
        EVENT_IDS.GET_TIME_REMAINING,
        EVENT_IDS.END_TIMER
    ];
};

export const LOBBY_EVENTS = function () {
    return [
        EVENT_IDS.PLAYER_JOINED,
        EVENT_IDS.ADD_SPECTATOR,
        EVENT_IDS.KICK_PERSON,
        EVENT_IDS.UPDATE_GAME_ROLES,
        EVENT_IDS.UPDATE_GAME_TIMER,
        EVENT_IDS.LEAVE_ROOM
    ];
};

export const IN_PROGRESS_EVENTS = function () {
    return [
        EVENT_IDS.KILL_PLAYER,
        EVENT_IDS.REVEAL_PLAYER,
        EVENT_IDS.ADD_SPECTATOR,
        EVENT_IDS.KICK_PERSON
    ];
};
