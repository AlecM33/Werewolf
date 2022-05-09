class Game {
    constructor (accessCode, status, people, deck, hasTimer, moderator, hasDedicatedModerator, timerParams = null) {
        this.accessCode = accessCode;
        this.status = status;
        this.moderator = moderator;
        this.people = people;
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.hasDedicatedModerator = hasDedicatedModerator;
        this.timerParams = timerParams;
        this.isFull = false;
        this.timeRemaining = null;
        this.spectators = [];
    }
}

module.exports = Game;
