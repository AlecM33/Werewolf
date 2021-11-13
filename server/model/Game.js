class Game {
    constructor(status, people, deck, hasTimer, timerParams=null) {
        this.status = status;
        this.people = people;
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.timerParams = timerParams;
    }
}

module.exports = Game;
