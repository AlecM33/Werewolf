const globals = require('../config/globals');

class GameCreationRequest {
    constructor (
        deck,
        hasTimer,
        timerParams,
        moderatorName,
        hasDedicatedModerator,
        isTestGame
    ) {
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.timerParams = timerParams;
        this.moderatorName = moderatorName;
        this.hasDedicatedModerator = hasDedicatedModerator;
        this.isTestGame = isTestGame;
    }

    static validate = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams', 'moderatorName', 'hasDedicatedModerator', 'isTestGame'];
        if (gameParams === null
            || typeof gameParams !== 'object'
            || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))
            || !valid(gameParams)
        ) {
            return Promise.reject(globals.ERROR_MESSAGE.BAD_CREATE_REQUEST);
        } else {
            return Promise.resolve();
        }
    };

    static deckIsValid = (deck) => {
        if (Array.isArray(deck) && deck.length > 0) {
            for (const entry of deck) {
                if (entry !== null
                    && typeof entry === 'object'
                    && typeof entry.role === 'string'
                    && entry.role.length > 0
                    && entry.role.length <= globals.MAX_CUSTOM_ROLE_NAME_LENGTH
                    && typeof entry.team === 'string'
                    && (entry.team === globals.ALIGNMENT.GOOD || entry.team === globals.ALIGNMENT.EVIL)
                    && typeof entry.description === 'string'
                    && entry.description.length > 0
                    && entry.description.length <= globals.MAX_CUSTOM_ROLE_DESCRIPTION_LENGTH
                    && (!entry.custom || typeof entry.custom === 'boolean')
                    && typeof entry.quantity === 'number'
                    && entry.quantity >= 1
                    && entry.quantity <= 50
                ) {
                    continue;
                }
                return false;
            }
            return true;
        }
        return false;
    }
}

function valid (gameParams) {
    return typeof gameParams.hasTimer === 'boolean'
        && typeof gameParams.isTestGame === 'boolean'
        && typeof gameParams.hasDedicatedModerator === 'boolean'
        && typeof gameParams.moderatorName === 'string'
        && gameParams.moderatorName.length > 0
        && gameParams.moderatorName.length <= 30
        && timerParamsAreValid(gameParams.hasTimer, gameParams.timerParams)
        && GameCreationRequest.deckIsValid(gameParams.deck);
}

function timerParamsAreValid (hasTimer, timerParams) {
    if (hasTimer === false) {
        return timerParams === null;
    } else {
        if (timerParams === null || typeof timerParams !== 'object') {
            return false;
        }

        return (timerParams.hours === null && timerParams.minutes > 0 && timerParams.minutes < 60)
            || (timerParams.minutes === null && timerParams.hours > 0 && timerParams.hours < 6)
            || (timerParams.hours === 0 && timerParams.minutes > 0 && timerParams.minutes < 60)
            || (timerParams.minutes === 0 && timerParams.hours > 0 && timerParams.hours < 6)
            || (timerParams.hours > 0 && timerParams.hours < 6 && timerParams.minutes >= 0 && timerParams.minutes < 60);
    }
}

module.exports = GameCreationRequest;
