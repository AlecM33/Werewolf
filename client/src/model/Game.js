export class Game {
    constructor(deck, hasTimer, hasDedicatedModerator, timerParams=null) {
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.timerParams = timerParams;
        this.hasDedicatedModerator = hasDedicatedModerator;
        this.accessCode = null;
    }
}
