const globals = require('../../config/globals');
const Game = require('../../model/Game');
const Person = require('../../model/Person');
const GameStateCurator = require('../GameStateCurator');
const UsernameGenerator = require('../UsernameGenerator');
const GameCreationRequest = require('../../model/GameCreationRequest');

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
        GameManager.instance = this;
    }

    getActiveGame = async (accessCode) => {
        const r = await this.eventManager.publisher.get(accessCode);
        if (r === null && this.timerManager.timerThreads[accessCode]) {
            if (!this.timerManager.timerThreads[accessCode].killed) {
                this.timerManager.timerThreads[accessCode].kill();
            }
            delete this.timerManager.timerThreads[accessCode];
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
            console.log(req.isTestGame);
            const newAccessCode = await this.generateAccessCode(globals.ACCESS_CODE_CHAR_POOL);
            if (newAccessCode === null) {
                return Promise.reject(globals.ERROR_MESSAGE.NO_UNIQUE_ACCESS_CODE);
            }
            const moderator = initializeModerator(req.moderatorName, req.hasDedicatedModerator);
            console.log(moderator);
            moderator.assigned = true;
            if (req.timerParams !== null) {
                req.timerParams.paused = true;
                req.timerParams.timeRemaining = convertFromHoursToMilliseconds(req.timerParams.hours) +
                    convertFromMinutesToMilliseconds(req.timerParams.minutes);
            }
            const newGame = new Game(
                newAccessCode,
                globals.STATUS.LOBBY,
                initializePeopleForGame(req.deck, moderator, this.shuffle, req.isTestGame),
                req.deck,
                req.hasTimer,
                moderator.id,
                req.hasDedicatedModerator,
                moderator.id,
                new Date().toJSON(),
                req.timerParams,
                req.isTestGame
            );
            await this.eventManager.publisher.set(newAccessCode, JSON.stringify(newGame), {
                EX: globals.STALE_GAME_SECONDS
            });
            return Promise.resolve({ accessCode: newAccessCode, cookie: moderator.cookie, environment: this.environment });
        }).catch((message) => {
            console.log(message);
            this.logger.debug('Received invalid request to create new game.');
            return Promise.reject(message);
        });
    };

    pauseTimer = async (game, logger) => {
        const thread = this.timerManager.timerThreads[game.accessCode];
        if (thread && !thread.killed) {
            this.logger.debug('Timer thread found for game ' + game.accessCode);
            thread.send({
                command: globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER,
                accessCode: game.accessCode,
                logLevel: this.logger.logLevel
            });
        }
    };

    resumeTimer = async (game, logger) => {
        const thread = this.timerManager.timerThreads[game.accessCode];
        if (thread && !thread.killed) {
            this.logger.debug('Timer thread found for game ' + game.accessCode);
            thread.send({
                command: globals.GAME_PROCESS_COMMANDS.RESUME_TIMER,
                accessCode: game.accessCode,
                logLevel: this.logger.logLevel
            });
        }
    };

    getTimeRemaining = async (game, socketId) => {
        if (socketId) {
            const thread = this.timerManager.timerThreads[game.accessCode];
            if (thread && (!thread.killed && thread.exitCode === null)) {
                thread.send({
                    command: globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING,
                    accessCode: game.accessCode,
                    socketId: socketId,
                    logLevel: this.logger.logLevel
                });
            } else if (thread) {
                if (game.timerParams && game.timerParams.timeRemaining === 0) {
                    this.namespace.to(socketId).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                }
            }
        }
    };

    checkAvailability = async (code) => {
        const game = await this.getActiveGame(code.toUpperCase().trim());
        if (game) {
            return Promise.resolve({ accessCode: code, playerCount: getGameSize(game.deck), timerParams: game.timerParams });
        } else {
            return Promise.resolve(404);
        }
    };

    generateAccessCode = async (charPool) => {
        const charCount = charPool.length;
        let codeDigits, accessCode;
        let attempts = 0;
        while (!accessCode || ((await this.eventManager.publisher.keys('*')).includes(accessCode)
            && attempts < globals.ACCESS_CODE_GENERATION_ATTEMPTS)) {
            codeDigits = [];
            let iterations = globals.ACCESS_CODE_LENGTH;
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
        if (isNameTaken(game, name)) {
            return Promise.reject({ status: 400, reason: 'This name is taken.' });
        }
        if (joinAsSpectator
            && game.people.filter(person => person.userType === globals.USER_TYPES.SPECTATOR).length === globals.MAX_SPECTATORS
        ) {
            return Promise.reject({ status: 400, reason: 'There are too many people already spectating.' });
        } else if (joinAsSpectator) {
            return await addSpectator(game, name, this.logger, this.namespace, this.eventManager, this.instanceId, this.refreshGame);
        }
        const unassignedPerson = this.findPersonByField(game, 'id', game.currentModeratorId).assigned === false
            ? this.findPersonByField(game, 'id', game.currentModeratorId)
            : game.people.find((person) => person.assigned === false && person.userType === globals.USER_TYPES.PLAYER);
        if (unassignedPerson) {
            this.logger.trace('request from client to join game. Assigning: ' + unassignedPerson.name);
            unassignedPerson.assigned = true;
            unassignedPerson.name = name;
            game.isFull = this.isGameFull(game);
            await this.refreshGame(game);
            this.namespace.in(game.accessCode).emit(
                globals.EVENTS.PLAYER_JOINED,
                GameStateCurator.mapPerson(unassignedPerson),
                game.isFull
            );
            await this.eventManager.publisher?.publish(
                globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                this.eventManager.createMessageToPublish(
                    game.accessCode,
                    globals.EVENT_IDS.PLAYER_JOINED,
                    this.instanceId,
                    JSON.stringify(unassignedPerson)
                )
            );
            return Promise.resolve(unassignedPerson.cookie);
        } else {
            if (game.people.filter(person => person.userType === globals.USER_TYPES.SPECTATOR).length === globals.MAX_SPECTATORS) {
                return Promise.reject({ status: 400, reason: 'This game has reached the maximum number of players and spectators.' });
            }
            return await addSpectator(game, name, this.logger, this.namespace, this.eventManager, this.instanceId, this.refreshGame);
        }
    };

    restartGame = async (game, namespace) => {
        // kill any outstanding timer threads
        const subProcess = this.timerManager.timerThreads[game.accessCode];
        if (subProcess) {
            if (!subProcess.killed) {
                this.logger.info('Killing timer process ' + subProcess.pid + ' for: ' + game.accessCode);
                this.timerManager.timerThreads[game.accessCode].kill();
            }
            this.logger.debug('Deleting reference to subprocess ' + subProcess.pid);
            delete this.timerManager.timerThreads[game.accessCode];
        }

        // re-shuffle the deck
        const cards = [];
        for (const card of game.deck) {
            for (let i = 0; i < card.quantity; i ++) {
                cards.push(card);
            }
        }

        this.shuffle(cards);

        // make sure no players are marked as out or revealed, and give them new cards.
        for (let i = 0; i < game.people.length; i ++) {
            if (game.people[i].userType === globals.USER_TYPES.KILLED_PLAYER) {
                game.people[i].userType = globals.USER_TYPES.PLAYER;
                game.people[i].out = false;
            }
            if (game.people[i].userType === globals.USER_TYPES.KILLED_BOT) {
                game.people[i].userType = globals.USER_TYPES.BOT;
                game.people[i].out = false;
            }
            game.people[i].revealed = false;
            game.people[i].killed = false;
            if (game.people[i].gameRole) {
                game.people[i].gameRole = cards[i].role;
                game.people[i].gameRoleDescription = cards[i].description;
                game.people[i].alignment = cards[i].team;
                if (game.people[i].id === game.currentModeratorId && game.people[i].userType === globals.USER_TYPES.MODERATOR) {
                    game.people[i].userType = globals.USER_TYPES.TEMPORARY_MODERATOR;
                    game.people[i].out = false;
                }
            }
        }

        // start the new game
        game.status = globals.STATUS.IN_PROGRESS;
        if (game.hasTimer) {
            game.timerParams.paused = true;
            game.timerParams.timeRemaining = convertFromHoursToMilliseconds(game.timerParams.hours) +
                convertFromMinutesToMilliseconds(game.timerParams.minutes);
            await this.timerManager.runTimer(game, namespace, this.eventManager, this);
        }

        await this.refreshGame(game);
        await this.eventManager.publisher?.publish(
            globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
            this.eventManager.createMessageToPublish(
                game.accessCode,
                globals.EVENT_IDS.RESTART_GAME,
                this.instanceId,
                '{}'
            )
        );
        namespace.in(game.accessCode).emit(globals.EVENT_IDS.RESTART_GAME);
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

    isGameFull = (game) => {
        return !game.people.find((person) => person.userType === globals.USER_TYPES.PLAYER && person.assigned === false);
    }

    findPersonByField = (game, fieldName, value) => {
        return game.people.find(person => person[fieldName] === value);
    }
}

function getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function initializeModerator (name, hasDedicatedModerator) {
    const userType = hasDedicatedModerator
        ? globals.USER_TYPES.MODERATOR
        : globals.USER_TYPES.TEMPORARY_MODERATOR;
    return new Person(createRandomId(), createRandomId(), name, userType);
}

function initializePeopleForGame (uniqueRoles, moderator, shuffle, isTestGame) {
    const people = [];

    const cards = [];
    for (const role of uniqueRoles) {
        for (let i = 0; i < role.quantity; i ++) {
            cards.push(role);
        }
    }

    shuffle(cards); // this shuffles in-place.

    let j = 0;
    const number = moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        ? cards.length - 1
        : cards.length;
    while (j < number) {
        const person = new Person(
            createRandomId(),
            createRandomId(),
            UsernameGenerator.generate(),
            isTestGame ? globals.USER_TYPES.BOT : globals.USER_TYPES.PLAYER,
            cards[j].role,
            cards[j].description,
            cards[j].team,
            isTestGame
        );
        person.customRole = cards[j].custom;
        person.hasEnteredName = false;
        people.push(person);
        j ++;
    }

    if (moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
        moderator.gameRole = cards[cards.length - 1].role;
        moderator.customRole = cards[cards.length - 1].custom;
        moderator.gameRoleDescription = cards[cards.length - 1].description;
        moderator.alignment = cards[cards.length - 1].team;
    }

    people.push(moderator);

    return people;
}

function createRandomId () {
    let id = '';
    for (let i = 0; i < globals.INSTANCE_ID_LENGTH; i ++) {
        id += globals.INSTANCE_ID_CHAR_POOL[Math.floor(Math.random() * globals.INSTANCE_ID_CHAR_POOL.length)];
    }
    return id;
}

function isNameTaken (game, name) {
    const processedName = name.toLowerCase().trim();
    return game.people.find((person) => person.name.toLowerCase().trim() === processedName);
}

function getGameSize (cards) {
    let quantity = 0;
    for (const card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

async function addSpectator (game, name, logger, namespace, eventManager, instanceId, refreshGame) {
    const spectator = new Person(
        createRandomId(),
        createRandomId(),
        name,
        globals.USER_TYPES.SPECTATOR
    );
    logger.trace('new spectator: ' + spectator.name);
    game.people.push(spectator);
    await refreshGame(game);
    namespace.in(game.accessCode).emit(
        globals.EVENT_IDS.ADD_SPECTATOR,
        GameStateCurator.mapPerson(spectator)
    );
    await eventManager.publisher.publish(
        globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
        eventManager.createMessageToPublish(
            game.accessCode,
            globals.EVENT_IDS.ADD_SPECTATOR,
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
