export class Game {
    constructor (
        deck,
        hasTimer,
        hasDedicatedModerator,
        moderatorName,
        timerParams = null,
        isTestGame = false
    ) {
        this.deck = deck;
        this.hasTimer = hasTimer;
        this.timerParams = timerParams;
        this.hasDedicatedModerator = hasDedicatedModerator;
        this.moderatorName = moderatorName;
        this.isTestGame = isTestGame;
    }
}
