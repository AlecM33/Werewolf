const {
    STATUS,
    PRIMITIVES,
    ERROR_MESSAGES,
    GAME_PROCESS_COMMANDS,
    USER_TYPES,
    EVENT_IDS,
    REDIS_CHANNELS
} = require('../../config/globals');
const Game = require('../../model/Game');
const Person = require('../../model/Person');
const GameStateCurator = require('../GameStateCurator');
const UsernameGenerator = require('../UsernameGenerator');
const GameCreationRequest = require('../../model/GameCreationRequest');
const ServerTimer = require('../ServerTimer');

class GameManager {
    constructor (logger, environment, instanceId) {
        if (GameManager.instance) {
            throw new Error('The server tried to instantiate more than one GameManager');
        }
        logger.info('CREATING SINGLETON GAME MANAGER');
        this.logger = logger;
        this.environment = environment;
        this.timerManager = null;
        this.eventManager = null;
        this.namespace = null;
        this.instanceId = instanceId;
        this.timers = {}; // Map of accessCode -> ServerTimer instance
        GameManager.instance = this;
    }

    getActiveGame = async (accessCode) => {
        const r = await this.eventManager.publisher.get(accessCode);
        if (r === null && this.timers[accessCode]) {
            // Clean up orphaned timer
            this.timers[accessCode].stopTimer();
            delete this.timers[accessCode];
        }
        let activeGame;
        if (r !== null) {
            try {
                activeGame = JSON.parse(r);
            } catch (e) {
                this.logger.error('ERROR PARSING ACTIVE GAME: ' + e);
            }
        }
        return r === null ? r : activeGame;
    }

    setGameSocketNamespace = (namespace) => {
        this.namespace = namespace;
    };

    refreshGame = async (game) => {
        this.logger.debug('PUSHING REFRESH OF ' + game.accessCode);
        await this.eventManager.publisher.set(game.accessCode, JSON.stringify(game), {
            KEEPTTL: true,
            XX: true // only set the key if it already exists
        });
    }

    createGame = async (gameParams) => {
        this.logger.debug('Received request to create new game.');
        return GameCreationRequest.validate(gameParams).then(async () => {
            const req = new GameCreationRequest(
                gameParams.deck,
                gameParams.hasTimer,
                gameParams.timerParams,
                gameParams.moderatorName,
                gameParams.hasDedicatedModerator,
                gameParams.isTestGame
            );
            const newAccessCode = await this.generateAccessCode(PRIMITIVES.ACCESS_CODE_CHAR_POOL);
            if (newAccessCode === null) {
                return Promise.reject(ERROR_MESSAGES.NO_UNIQUE_ACCESS_CODE);
            }
            const moderator = initializeModerator(req.moderatorName, req.hasDedicatedModerator);
            moderator.assigned = true;
            if (req.timerParams !== null) {
                req.timerParams.paused = true;
                req.timerParams.timeRemaining = convertFromHoursToMilliseconds(req.timerParams.hours) +
                    convertFromMinutesToMilliseconds(req.timerParams.minutes);
            }
            const newGame = new Game(
                newAccessCode,
                STATUS.LOBBY,
                null,
                req.deck,
                req.hasTimer,
                moderator.id,
                req.hasDedicatedModerator,
                moderator.id,
                new Date().toJSON(),
                req.timerParams
            );
            newGame.people = initializePeopleForGame(req.deck, moderator, this.shuffle, req.isTestGame, newGame.gameSize);
            newGame.isStartable = newGame.people.filter(person => person.userType === USER_TYPES.PLAYER
                || person.userType === USER_TYPES.TEMPORARY_MODERATOR
                || person.userType === USER_TYPES.BOT).length === newGame.gameSize;
            await this.eventManager.publisher.set(newAccessCode, JSON.stringify(newGame), {
                EX: PRIMITIVES.STALE_GAME_SECONDS
            });
            return Promise.resolve({ accessCode: newAccessCode, cookie: moderator.cookie, environment: this.environment });
        }).catch((message) => {
            console.error(message);
            this.logger.error('Received invalid request to create new game.');
            return Promise.reject(message);
        });
    };

    runTimer = async (game) => {
        this.logger.debug('running timer for game ' + game.accessCode);
        const timer = new ServerTimer(
            game.timerParams.hours,
            game.timerParams.minutes,
            PRIMITIVES.CLOCK_TICK_INTERVAL_MILLIS,
            this.logger
        );
        this.timers[game.accessCode] = timer;
        
        // Start timer in paused state initially (pausedInitially = true)
        // Timer must be explicitly resumed by moderator
        timer.runTimer(true).then(async () => {
            this.logger.debug('Timer finished for ' + game.accessCode);
            // Trigger END_TIMER event
            game = await this.getActiveGame(game.accessCode);
            if (game) {
                await this.eventManager.handleEventById(
                    EVENT_IDS.END_TIMER,
                    null,
                    game,
                    null,
                    game.accessCode,
                    {},
                    null,
                    false
                );
                await this.refreshGame(game);
                await this.eventManager.publisher.publish(
                    REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    this.eventManager.createMessageToPublish(
                        game.accessCode,
                        EVENT_IDS.END_TIMER,
                        this.instanceId,
                        '{}'
                    )
                );
            }
            // Clean up timer instance
            delete this.timers[game.accessCode];
        });
        game.startTime = new Date().toJSON();
    };

    pauseTimer = async (game) => {
        const timer = this.timers[game.accessCode];
        if (timer) {
            this.logger.debug('Timer found for game ' + game.accessCode);
            // stopTimer() pauses the timer by clearing the setTimeout
            timer.stopTimer();
            return timer.currentTimeInMillis;
        }
        return null;
    };

    resumeTimer = async (game) => {
        const timer = this.timers[game.accessCode];
        if (timer) {
            this.logger.debug('Timer found for game ' + game.accessCode);
            timer.resumeTimer();
            return timer.currentTimeInMillis;
        }
        return null;
    };

    getTimeRemaining = async (game, socketId) => {
        if (socketId) {
            const timer = this.timers[game.accessCode];
            if (timer) {
                // Timer is running on this instance, emit directly
                this.namespace.to(socketId).emit(
                    GAME_PROCESS_COMMANDS.GET_TIME_REMAINING,
                    timer.currentTimeInMillis,
                    game.timerParams.paused
                );
            } else {
                // Timer not running on this instance, return stored value
                if (game.timerParams) {
                    this.namespace.to(socketId).emit(
                        GAME_PROCESS_COMMANDS.GET_TIME_REMAINING,
                        game.timerParams.timeRemaining,
                        game.timerParams.paused
                    );
                }
            }
        }
    };

    checkAvailability = async (code) => {
        const game = await this.getActiveGame(code.toUpperCase().trim());
        if (game) {
            return Promise.resolve({ accessCode: code, playerCount: game.gameSize, timerParams: game.timerParams });
        } else {
            return Promise.resolve(404);
        }
    };

    generateAccessCode = async (charPool) => {
        const charCount = charPool.length;
        let codeDigits, accessCode;
        let attempts = 0;
        while (!accessCode || ((await this.eventManager.publisher.keys('*')).includes(accessCode)
            && attempts < PRIMITIVES.ACCESS_CODE_GENERATION_ATTEMPTS)) {
            codeDigits = [];
            let iterations = PRIMITIVES.ACCESS_CODE_LENGTH;
            while (iterations > 0) {
                iterations --;
                codeDigits.push(charPool[getRandomInt(charCount)]);
            }
            accessCode = codeDigits.join('');
            attempts ++;
        }
        return (await this.eventManager.publisher.keys('*')).includes(accessCode)
            ? null
            : accessCode;
    };

    joinGame = async (game, name, cookie, joinAsSpectator) => {
        const matchingPerson = this.findPersonByField(game, 'cookie', cookie);
        if (matchingPerson) {
            return Promise.resolve(matchingPerson.cookie);
        }
        if (this.isNameTaken(game, name)) {
            return Promise.reject({ status: 400, reason: 'This name is taken.' });
        }
        if (joinAsSpectator
            && game.people.filter(person => person.userType === USER_TYPES.SPECTATOR).length === PRIMITIVES.MAX_SPECTATORS
        ) {
            return Promise.reject({ status: 400, reason: 'There are too many people already spectating.' });
        } else if (joinAsSpectator || this.isGameStartable(game) || game.status === STATUS.IN_PROGRESS) {
            return await addSpectator(game, name, this.logger, this.namespace, this.eventManager, this.instanceId, this.refreshGame);
        }
        let moderator, newPlayer;
        const isModeratorJoining = this.findPersonByField(game, 'id', game.currentModeratorId).assigned === false;
        if (isModeratorJoining) {
            moderator = this.findPersonByField(game, 'id', game.currentModeratorId);
            this.logger.trace('Moderator joining. Assigning: ' + name);
            moderator.assigned = true;
            moderator.name = name;
        } else {
            newPlayer = new Person(
                createRandomId(),
                createRandomId(),
                name,
                USER_TYPES.PLAYER,
                null,
                null,
                null,
                game.isTestGame
            );
            newPlayer.assigned = true;
            game.people.push(newPlayer);
        }
        game.isStartable = this.isGameStartable(game);
        await this.refreshGame(game);
        this.namespace.in(game.accessCode).emit(
            EVENT_IDS.PLAYER_JOINED,
            GameStateCurator.mapPerson(moderator || newPlayer),
            game.isStartable
        );
        await this.eventManager.publisher?.publish(
            REDIS_CHANNELS.ACTIVE_GAME_STREAM,
            this.eventManager.createMessageToPublish(
                game.accessCode,
                EVENT_IDS.PLAYER_JOINED,
                this.instanceId,
                JSON.stringify(moderator || newPlayer)
            )
        );
        return Promise.resolve(moderator?.cookie || newPlayer?.cookie);
    }

    prepareDeck (deck) {
        const cards = [];
        for (const card of deck) {
            for (let i = 0; i < card.quantity; i ++) {
                cards.push(card);
            }
        }

        this.shuffle(cards);

        return cards;
    }

    restartGame = async (game, namespace) => {
        // stop any outstanding timers
        const timer = this.timers[game.accessCode];
        if (timer) {
            this.logger.info('Stopping timer for: ' + game.accessCode);
            timer.stopTimer();
            delete this.timers[game.accessCode];
        }

        for (let i = 0; i < game.people.length; i ++) {
            if (game.people[i].userType === USER_TYPES.KILLED_PLAYER) {
                game.people[i].userType = USER_TYPES.PLAYER;
                game.people[i].out = false;
            }
            if (game.people[i].userType === USER_TYPES.KILLED_BOT) {
                game.people[i].userType = USER_TYPES.BOT;
                game.people[i].out = false;
            }
            if (game.people[i].gameRole && game.people[i].id === game.currentModeratorId && game.people[i].userType === USER_TYPES.MODERATOR) {
                game.people[i].userType = USER_TYPES.TEMPORARY_MODERATOR;
                game.people[i].out = false;
            }
            game.people[i].revealed = false;
            game.people[i].killed = false;
            game.people[i].gameRole = null;
            game.people[i].gameRoleDescription = null;
            game.people[i].alignment = null;
            game.people[i].customRole = null;
        }

        game.status = STATUS.LOBBY;

        await this.refreshGame(game);
        await this.eventManager.publisher?.publish(
            REDIS_CHANNELS.ACTIVE_GAME_STREAM,
            this.eventManager.createMessageToPublish(
                game.accessCode,
                EVENT_IDS.RESTART_GAME,
                this.instanceId,
                '{}'
            )
        );
        namespace.in(game.accessCode).emit(EVENT_IDS.RESTART_GAME);
    };

    /*
    -- To shuffle an array a of n elements (indices 0..n-1):
    for i from n−1 downto 1 do
        j ← random integer such that 0 ≤ j ≤ i
        exchange a[j] and a[i]
    */
    shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i --) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[j];
            array[j] = array[i];
            array[i] = temp;
        }

        return array;
    };

    deal = (game) => {
        const cards = this.prepareDeck(game.deck);
        let i = 0;
        for (const person of game.people.filter(person => person.userType === USER_TYPES.PLAYER
            || person.userType === USER_TYPES.TEMPORARY_MODERATOR
            || person.userType === USER_TYPES.BOT)
        ) {
            person.gameRole = cards[i].role;
            person.customRole = cards[i].custom;
            person.gameRoleDescription = cards[i].description;
            person.alignment = cards[i].team;
            i ++;
        }
    }

    isGameStartable = (game) => {
        return game.people.filter(person => person.userType === USER_TYPES.PLAYER
            || person.userType === USER_TYPES.TEMPORARY_MODERATOR
            || person.userType === USER_TYPES.BOT).length === game.gameSize;
    }

    findPersonByField = (game, fieldName, value) => {
        return game.people.find(person => person[fieldName] === value);
    }

    isNameTaken (game, name) {
        const processedName = name.toLowerCase().trim();
        return game.people.find((person) => person.name.toLowerCase().trim() === processedName);
    }
}

function getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function initializeModerator (name, hasDedicatedModerator) {
    const userType = hasDedicatedModerator
        ? USER_TYPES.MODERATOR
        : USER_TYPES.TEMPORARY_MODERATOR;
    return new Person(createRandomId(), createRandomId(), name, userType);
}

function initializePeopleForGame (uniqueRoles, moderator, shuffle, isTestGame, gameSize) {
    const people = [];
    if (isTestGame) {
        let j = 0;
        const number = moderator.userType === USER_TYPES.TEMPORARY_MODERATOR
            ? gameSize - 1
            : gameSize;
        while (j < number) {
            const person = new Person(
                createRandomId(),
                createRandomId(),
                UsernameGenerator.generate(),
                USER_TYPES.BOT,
                null,
                null,
                null,
                isTestGame
            );
            people.push(person);
            j ++;
        }
    }

    people.push(moderator);

    return people;
}

function createRandomId () {
    let id = '';
    for (let i = 0; i < PRIMITIVES.INSTANCE_ID_LENGTH; i ++) {
        id += PRIMITIVES.INSTANCE_ID_CHAR_POOL[Math.floor(Math.random() * PRIMITIVES.INSTANCE_ID_CHAR_POOL.length)];
    }
    return id;
}

async function addSpectator (game, name, logger, namespace, eventManager, instanceId, refreshGame) {
    const spectator = new Person(
        createRandomId(),
        createRandomId(),
        name,
        USER_TYPES.SPECTATOR
    );
    spectator.assigned = true;
    logger.trace('new spectator: ' + spectator.name);
    game.people.push(spectator);
    await refreshGame(game);
    namespace.in(game.accessCode).emit(
        EVENT_IDS.ADD_SPECTATOR,
        GameStateCurator.mapPerson(spectator)
    );
    await eventManager.publisher.publish(
        REDIS_CHANNELS.ACTIVE_GAME_STREAM,
        eventManager.createMessageToPublish(
            game.accessCode,
            EVENT_IDS.ADD_SPECTATOR,
            instanceId,
            JSON.stringify(GameStateCurator.mapPerson(spectator))
        )
    );
    return Promise.resolve(spectator.cookie);
}

function convertFromMinutesToMilliseconds (minutes) {
    return minutes * 60 * 1000;
}

function convertFromHoursToMilliseconds (hours) {
    return hours * 60 * 60 * 1000;
}

module.exports = GameManager;
