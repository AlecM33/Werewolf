export class Game {
    constructor(deck, hasTimer, moderatorName, timerParams=null) {
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.moderatorName = moderatorName;
        this.timerParams = timerParams;
    }
}
