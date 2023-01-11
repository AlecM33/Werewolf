const globals = require('../../config/globals');
const Game = require('../../model/Game');
const Person = require('../../model/Person');
const GameStateCurator = require('../GameStateCurator');
const UsernameGenerator = require('../UsernameGenerator');
const GameCreationRequest = require('../../model/GameCreationRequest');
const redis = require('redis');


class GameManager {
    constructor (logger, environment, instanceId) {
        if (GameManager.instance) {
            throw new Error('The server tried to instantiate more than one GameManager');
        }
        logger.info('CREATING SINGLETON GAME MANAGER');
        this.logger = logger;
        this.environment = environment;
        this.activeGameRunner = null;
        this.socketManager = null;
        this.namespace = null;
        this.publisher = null;
        this.instanceId = instanceId;
        GameManager.instance = this;
    }

    createRedisPublisher = async () => {
        this.publisher = redis.createClient();
        await this.publisher.connect();
        this.logger.info('GAME MANAGER - CREATED GAME SYNC PUBLISHER');
    }

    setGameSocketNamespace = (namespace) => {
        this.namespace = namespace;
    };

    refreshGame = async (game) => {
        this.logger.debug('PUSHING REFRESH OF ' +  game.accessCode);
        await this.activeGameRunner.client.hSet('activeGames', game.accessCode, JSON.stringify(game));
    }

    createGame = async (gameParams) => {
        this.logger.debug('Received request to create new game.');
        return GameCreationRequest.validate(gameParams).then(async () => {
            const req = new GameCreationRequest(
                gameParams.deck,
                gameParams.hasTimer,
                gameParams.timerParams,
                gameParams.moderatorName,
                gameParams.hasDedicatedModerator
            );
            //await this.pruneStaleGames();
            const newAccessCode = await this.generateAccessCode(globals.ACCESS_CODE_CHAR_POOL);
            if (newAccessCode === null) {
                return Promise.reject(globals.ERROR_MESSAGE.NO_UNIQUE_ACCESS_CODE);
            }
            const moderator = initializeModerator(req.moderatorName, req.hasDedicatedModerator);
            moderator.assigned = true;
            if (req.timerParams !== null) {
                req.timerParams.paused = false;
            }
            const newGame = new Game(
                newAccessCode,
                globals.STATUS.LOBBY,
                initializePeopleForGame(req.deck, moderator, this.shuffle),
                req.deck,
                req.hasTimer,
                moderator,
                req.hasDedicatedModerator,
                moderator.id,
                new Date().toJSON(),
                req.timerParams
            );
            await this.activeGameRunner.client.hSet('activeGames', newAccessCode, JSON.stringify(newGame));
            return Promise.resolve({ accessCode: newAccessCode, cookie: moderator.cookie, environment: this.environment });
        }).catch((message) => {
            console.log(message);
            this.logger.debug('Received invalid request to create new game.');
            return Promise.reject(message);
        });
    };

    startGame = async (game, namespace) => {
        if (game.isFull) {
            game.status = globals.STATUS.IN_PROGRESS;
            if (game.hasTimer) {
                game.timerParams.paused = true;
                this.activeGameRunner.runGame(game, namespace);
            }
            namespace.in(game.accessCode).emit(globals.EVENT_IDS.START_GAME);
        }
    };

    pauseTimer = async (game, logger) => {
        const thread = this.activeGameRunner.timerThreads[game.accessCode];
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
        const thread = this.activeGameRunner.timerThreads[game.accessCode];
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
            const thread = this.activeGameRunner.timerThreads[game.accessCode];
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

    revealPlayer = async (game, personId) => {
        const person = game.people.find((person) => person.id === personId);
        if (person && !person.revealed) {
            this.logger.debug('game ' + game.accessCode + ': revealing player ' + person.name);
            person.revealed = true;
            this.namespace.in(game.accessCode).emit(
                globals.EVENT_IDS.REVEAL_PLAYER,
                {
                    id: person.id,
                    gameRole: person.gameRole,
                    alignment: person.alignment
                }
            );
        }
    };

    endGame = async (game) => {
        game.status = globals.STATUS.ENDED;
        if (this.activeGameRunner.timerThreads[game.accessCode]) {
            this.logger.trace('KILLING TIMER PROCESS FOR ENDED GAME ' + game.accessCode);
            this.activeGameRunner.timerThreads[game.accessCode].kill();
        }
        for (const person of game.people) {
            person.revealed = true;
        }
        this.namespace.in(game.accessCode).emit(globals.EVENT_IDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
    };

    checkAvailability = async (code) => {
        const game = await this.activeGameRunner.getActiveGame(code.toUpperCase().trim());
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
        while (!accessCode || ((await this.activeGameRunner.client.hKeys('activeGames')).includes(accessCode)
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
        return (await this.activeGameRunner.client.hKeys('activeGames')).includes(accessCode)
            ? null
            : accessCode;
    };

    transferModeratorPowers = async (socketId, game, person, namespace, logger) => {
        if (person && (person.out || person.userType === globals.USER_TYPES.SPECTATOR)) {
            let spectatorsUpdated = false;
            if (game.spectators.includes(person)) {
                game.spectators.splice(game.spectators.indexOf(person), 1);
                spectatorsUpdated = true;
            }
            logger.debug('game ' + game.accessCode + ': transferring mod powers to ' + person.name);
            if (game.moderator === person) {
                person.userType = globals.USER_TYPES.MODERATOR;
                const socket = this.namespace.sockets.get(socketId);
                if (socket) {
                    this.namespace.to(socketId).emit(globals.EVENTS.SYNC_GAME_STATE); // they are guaranteed to be connected to this instance.
                }
            } else {
                const oldModerator = game.moderator;
                if (game.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    game.moderator.userType = globals.USER_TYPES.PLAYER;
                } else if (game.moderator.gameRole) { // the current moderator was at one point a dealt-in player.
                    game.moderator.userType = globals.USER_TYPES.KILLED_PLAYER; // restore their state from before being made mod.
                } else if (game.moderator.userType === globals.USER_TYPES.MODERATOR) {
                    game.moderator.userType = globals.USER_TYPES.SPECTATOR;
                    game.spectators.push(game.moderator);
                    spectatorsUpdated = true;
                }
                person.userType = globals.USER_TYPES.MODERATOR;
                game.moderator = person;
                if (spectatorsUpdated === true) {
                    namespace.in(game.accessCode).emit(
                        globals.EVENTS.UPDATE_SPECTATORS,
                        game.spectators.map((spectator) => GameStateCurator.mapPerson(spectator))
                    );
                }
                await notifyPlayerInvolvedInModTransfer(game, this.namespace, person);
                await notifyPlayerInvolvedInModTransfer(game, this.namespace, oldModerator);
            }
        }
    };

    killPlayer = async (socketId, game, person, namespace, logger) => {
        if (person && !person.out) {
            logger.debug('game ' + game.accessCode + ': killing player ' + person.name);
            if (person.userType !== globals.USER_TYPES.TEMPORARY_MODERATOR) {
                person.userType = globals.USER_TYPES.KILLED_PLAYER;
            }
            person.out = true;
            const socket = namespace.sockets.get(socketId);
            if (socket && game.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                socket.to(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, person.id);
            } else {
                namespace.in(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, person.id);
            }
            // temporary moderators will transfer their powers automatically to the first person they kill.
            if (game.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                await this.socketManager.handleAndSyncEvent(
                    globals.EVENT_IDS.TRANSFER_MODERATOR,
                    game,
                    socket,
                    { personId: person.id },
                    null
                );
            }
        }
    };

    joinGame = async (game, name, cookie, joinAsSpectator) => {
        const matchingPerson = this.findPersonByField(game, 'cookie', cookie);
        if (matchingPerson) {
            return Promise.resolve(matchingPerson.cookie);
        }
        if (isNameTaken(game, name)) {
            return Promise.reject({ status: 400, reason: 'This name is taken.' });
        }
        if (joinAsSpectator && game.spectators.length === globals.MAX_SPECTATORS) {
            return Promise.reject({ status: 400, reason: 'There are too many people already spectating.' });
        } else if (joinAsSpectator) {
            return await addSpectator(game, name, this.logger, this.namespace, this.publisher, this.instanceId, this.refreshGame);
        }
        const unassignedPerson = game.moderator.assigned === false
            ? game.moderator
            : game.people.find((person) => person.assigned === false);
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
            await this.publisher?.publish(
                globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                game.accessCode + ';' + globals.EVENT_IDS.PLAYER_JOINED + ';' + JSON.stringify(unassignedPerson) + ';' + this.instanceId
            );
            return Promise.resolve(unassignedPerson.cookie);
        } else {
            if (game.spectators.length === globals.MAX_SPECTATORS) {
                return Promise.reject({ status: 400, reason: 'This game has reached the maximum number of players and spectators.' });
            }
            return await addSpectator(game, name, this.logger, this.namespace, this.publisher, this.instanceId, this.refreshGame);
        }
    };

    restartGame = async (game, namespace) => {
        // kill any outstanding timer threads
        const subProcess = this.activeGameRunner.timerThreads[game.accessCode];
        if (subProcess) {
            if (!subProcess.killed) {
                this.logger.info('Killing timer process ' + subProcess.pid + ' for: ' + game.accessCode);
                this.activeGameRunner.timerThreads[game.accessCode].kill();
            }
            this.logger.debug('Deleting reference to subprocess ' + subProcess.pid);
            delete this.activeGameRunner.timerThreads[game.accessCode];
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
            if (game.people[i].out) {
                game.people[i].out = false;
            }
            if (game.people[i].userType === globals.USER_TYPES.KILLED_PLAYER) {
                game.people[i].userType = globals.USER_TYPES.PLAYER;
            }
            game.people[i].revealed = false;
            game.people[i].gameRole = cards[i].role;
            game.people[i].gameRoleDescription = cards[i].description;
            game.people[i].alignment = cards[i].team;
        }

        /* If there is currently a dedicated mod, and that person was once a player (i.e. they have a game role), make
            them a temporary mod for the restarted game.
         */
        if (game.moderator.gameRole && game.moderator.userType === globals.USER_TYPES.MODERATOR) {
            game.moderator.userType = globals.USER_TYPES.TEMPORARY_MODERATOR;
        }

        // start the new game
        game.status = globals.STATUS.IN_PROGRESS;
        if (game.hasTimer) {
            game.timerParams.paused = true;
            this.activeGameRunner.runGame(game, namespace);
        }

        await this.refreshGame(game);
        namespace.in(game.accessCode).emit(globals.EVENT_IDS.RESTART_GAME);
    };

    handleRequestForGameState = async (game, namespace, logger, gameRunner, accessCode, personCookie, ackFn, socketId) => {
        const matchingPerson = this.findPersonByField(game, 'cookie', personCookie);
        if (matchingPerson) {
            if (matchingPerson.socketId === socketId) {
                logger.debug('matching person found with an established connection to the room: ' + matchingPerson.name);
                if (ackFn) {
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
                }
            } else {
                logger.debug('matching person found with a new connection to the room: ' + matchingPerson.name);
                this.namespace.sockets.get(socketId).join(accessCode);
                matchingPerson.socketId = socketId;
                await this.publisher.publish(
                    globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    game.accessCode + ';' + globals.EVENT_IDS.UPDATE_SOCKET + ';' + JSON.stringify({ personId: matchingPerson.id, socketId: socketId }) + ';' + this.instanceId
                );
                if (ackFn) {
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
                }
            }
        } else {
            if (ackFn) {
                rejectClientRequestForGameState(ackFn);
            }
        }
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

    // pruneStaleGames = async () => {
    //     this.activeGameRunner.activeGames.forEach((key, value) => {
    //         if (value.createTime) {
    //             const createDate = new Date(value.createTime);
    //             if (createDate.setHours(createDate.getHours() + globals.STALE_GAME_HOURS) < Date.now()) {
    //                 this.logger.info('PRUNING STALE GAME ' + key);
    //                 this.activeGameRunner.activeGames.delete(key);
    //                 if (this.activeGameRunner.timerThreads[key]) {
    //                     this.logger.info('KILLING STALE TIMER PROCESS FOR ' + key);
    //                     this.activeGameRunner.timerThreads[key].kill();
    //                     delete this.activeGameRunner.timerThreads[key];
    //                 }
    //             }
    //         }
    //     });
    // };

    isGameFull = (game) => {
        return game.moderator.assigned === true && !game.people.find((person) => person.assigned === false);
    }

    findPersonByField = (game, fieldName, value) => {
        let person;
        if (value === game.moderator[fieldName]) {
            person = game.moderator;
        }
        if (!person) {
            person = game.people.find((person) => person[fieldName] === value);
        }
        if (!person) {
            person = game.spectators.find((spectator) => spectator[fieldName] === value);
        }
        return person;
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

function initializePeopleForGame (uniqueCards, moderator, shuffle) {
    const people = [];
    const cards = [];
    let numberOfRoles = 0;
    for (const card of uniqueCards) {
        for (let i = 0; i < card.quantity; i ++) {
            cards.push(card);
            numberOfRoles ++;
        }
    }

    shuffle(cards); // this shuffles in-place.

    let j = 0;
    if (moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) { // temporary moderators should be dealt in.
        moderator.gameRole = cards[j].role;
        moderator.customRole = cards[j].custom;
        moderator.gameRoleDescription = cards[j].description;
        moderator.alignment = cards[j].team;
        people.push(moderator);
        j ++;
    }

    while (j < numberOfRoles) {
        const person = new Person(
            createRandomId(),
            createRandomId(),
            UsernameGenerator.generate(),
            globals.USER_TYPES.PLAYER,
            cards[j].role,
            cards[j].description,
            cards[j].team
        );
        person.customRole = cards[j].custom;
        person.hasEnteredName = false;
        people.push(person);
        j ++;
    }

    return people;
}

function createRandomId () {
    let id = '';
    for (let i = 0; i < globals.USER_SIGNATURE_LENGTH; i ++) {
        id += globals.ACCESS_CODE_CHAR_POOL[Math.floor(Math.random() * globals.ACCESS_CODE_CHAR_POOL.length)];
    }
    return id;
}

function rejectClientRequestForGameState (acknowledgementFunction) {
    return acknowledgementFunction(null);
}

function findPlayerBySocketId (people, socketId) {
    return people.find((person) => person.socketId === socketId && person.userType === globals.USER_TYPES.PLAYER);
}

function isNameTaken (game, name) {
    const processedName = name.toLowerCase().trim();
    return (game.people.find((person) => person.name.toLowerCase().trim() === processedName))
    || (game.moderator.name.toLowerCase().trim() === processedName)
    || (game.spectators.find((spectator) => spectator.name.toLowerCase().trim() === processedName));
}

function getGameSize (cards) {
    let quantity = 0;
    for (const card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

async function notifyPlayerInvolvedInModTransfer(game, namespace, person) {
    if (namespace.sockets.get(person.socketId)) {
        namespace.to(person.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
    }
}

async function addSpectator (game, name, logger, namespace, publisher, instanceId, refreshGame) {
    const spectator = new Person(
        createRandomId(),
        createRandomId(),
        name,
        globals.USER_TYPES.SPECTATOR
    );
    logger.trace('new spectator: ' + spectator.name);
    game.spectators.push(spectator);
    await refreshGame(game);
    namespace.in(game.accessCode).emit(
        globals.EVENTS.UPDATE_SPECTATORS,
        game.spectators.map((spectator) => { return GameStateCurator.mapPerson(spectator); })
    );
    await publisher.publish(
        globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
        game.accessCode + ';' + globals.EVENT_IDS.UPDATE_SPECTATORS + ';' + JSON.stringify(game.spectators) + ';' + instanceId
    );
    return Promise.resolve(spectator.cookie);
}

module.exports = GameManager;
