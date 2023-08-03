class Game {
    constructor (
        accessCode,
        status,
        people,
        deck,
        hasTimer,
        currentModeratorId,
        hasDedicatedModerator,
        originalModeratorId,
        createTime,
        timerParams = null,
        isTestGame = false
    ) {
        this.accessCode = accessCode;
        this.status = status;
        this.currentModeratorId = currentModeratorId;
        this.people = people;
        this.deck = deck;
        this.gameSize = deck.reduce(
            (accumulator, currentValue) => accumulator + currentValue.quantity,
            0
        );
        this.hasTimer = hasTimer;
        this.hasDedicatedModerator = hasDedicatedModerator;
        this.originalModeratorId = originalModeratorId;
        this.previousModeratorId = null;
        this.createTime = createTime;
        this.timerParams = timerParams;
        this.isStartable = (this.gameSize === 1 && !this.hasDedicatedModerator) || isTestGame;
        this.timeRemaining = null;
    }
}

module.exports = Game;
