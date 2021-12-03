class Game {
    constructor(accessCode, status, people, deck, hasTimer, moderator, timerParams=null) {
        this.accessCode = accessCode;
        this.status = status;
        this.moderator = moderator;
        this.people = people;
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.timerParams = timerParams;
        this.isFull = false;
        this.timeRemaining = null;
    }
}

module.exports = Game;