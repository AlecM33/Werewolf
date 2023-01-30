export const globals = {
    CHAR_POOL: 'abcdefghijklmnopqrstuvwxyz0123456789',
    USER_SIGNATURE_LENGTH: 75,
    CLOCK_TICK_INTERVAL_MILLIS: 50,
    MAX_CUSTOM_ROLE_NAME_LENGTH: 50,
    MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH: 1000,
    TOAST_DURATION_DEFAULT: 6,
    ACCESS_CODE_LENGTH: 4,
    PLAYER_ID_COOKIE_KEY: 'play-werewolf-anon-id',
    COMMANDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        START_GAME: 'startGame',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer',
        GET_TIME_REMAINING: 'getTimeRemaining',
        KILL_PLAYER: 'killPlayer',
        REVEAL_PLAYER: 'revealPlayer',
        TRANSFER_MODERATOR: 'transferModerator',
        CHANGE_NAME: 'changeName',
        END_GAME: 'endGame',
        END_TIMER: 'endTimer'
    },
    STATUS: {
        LOBBY: 'lobby',
        IN_PROGRESS: 'in progress',
        ENDED: 'ended'
    },
    ALIGNMENT: {
        GOOD: 'good',
        EVIL: 'evil'
    },
    MESSAGES: {
        ENTER_NAME: 'Client must enter name.'
    },
    SOCKET_EVENTS: {
        IN_GAME_MESSAGE: 'inGameMessage'
    },
    EVENT_IDS: {
        FETCH_GAME_STATE: 'fetchGameState',
        START_GAME: 'startGame',
        PAUSE_TIMER: 'pauseTimer',
        RESUME_TIMER: 'resumeTimer',
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
        ASSIGN_DEDICATED_MOD: 'assignDedicatedMod'
    },
    TIMER_EVENTS: function () {
        return [
            this.EVENT_IDS.PAUSE_TIMER,
            this.EVENT_IDS.RESUME_TIMER,
            this.EVENT_IDS.GET_TIME_REMAINING,
            this.EVENT_IDS.END_TIMER
        ];
    },
    LOBBY_EVENTS: function () {
        return [
            this.EVENT_IDS.PLAYER_JOINED,
            this.EVENT_IDS.ADD_SPECTATOR
        ];
    },
    IN_PROGRESS_EVENTS: function () {
        return [
            this.EVENT_IDS.KILL_PLAYER,
            this.EVENT_IDS.REVEAL_PLAYER,
            this.EVENT_IDS.ADD_SPECTATOR
        ];
    },
    USER_TYPES: {
        MODERATOR: 'moderator',
        PLAYER: 'player',
        TEMPORARY_MODERATOR: 'temp mod',
        KILLED_PLAYER: 'killed',
        SPECTATOR: 'spectator',
        BOT: 'bot'
    },
    ENVIRONMENT: {
        LOCAL: 'local',
        PRODUCTION: 'production'
    },
    USER_TYPE_ICONS: {
        player: ' \uD83C\uDFAE',
        moderator: ' \uD83D\uDC51',
        'temp mod': ' \uD83C\uDFAE\uD83D\uDC51',
        spectator: ' \uD83D\uDC7B',
        killed: ' \uD83D\uDC80',
        bot: ' \uD83E\uDD16'
    }
};
