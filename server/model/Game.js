class Game {
    constructor(status, people, deck, hasTimer, moderator, timerParams=null) {
        this.status = status;
        this.moderator = moderator;
        this.people = people;
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.timerParams = timerParams;
        this.isFull = false;
    }
}

module.exports = Game;
