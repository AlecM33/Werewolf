const globals = require('../config/globals');
const ActiveGameRunner = require('./ActiveGameRunner');
const Game = require('../model/Game');
const Person = require('../model/Person');
const GameStateCurator = require('./GameStateCurator');
const UsernameGenerator = require('./UsernameGenerator');

class GameManager {
    constructor (logger, environment, namespace) {
        this.logger = logger;
        this.environment = environment;
        this.activeGameRunner = new ActiveGameRunner(logger).getInstance();
        this.namespace = namespace;
    }

    addGameSocketHandlers = (namespace, socket) => {
        socket.on(globals.CLIENT_COMMANDS.FETCH_GAME_STATE, async (accessCode, personId, ackFn) => {
            this.logger.trace('request for game state for accessCode: ' + accessCode + ' from socket: ' + socket.id + ' with cookie: ' + personId);
            await this.handleRequestForGameState(
                this.namespace,
                this.logger,
                this.activeGameRunner,
                accessCode,
                personId,
                ackFn,
                socket
            );
        });

        socket.on(globals.CLIENT_COMMANDS.START_GAME, (accessCode) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game && game.isFull) {
                game.status = globals.STATUS.IN_PROGRESS;
                if (game.hasTimer) {
                    game.timerParams.paused = true;
                    this.activeGameRunner.runGame(game, namespace);
                }
                namespace.in(accessCode).emit(globals.CLIENT_COMMANDS.START_GAME);
            }
        });

        socket.on(globals.CLIENT_COMMANDS.PAUSE_TIMER, (accessCode) => {
            this.logger.trace(accessCode);
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                const thread = this.activeGameRunner.timerThreads[accessCode];
                if (thread) {
                    this.logger.debug('Timer thread found for game ' + accessCode);
                    thread.send({
                        command: globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER,
                        accessCode: game.accessCode,
                        logLevel: this.logger.logLevel
                    });
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.RESUME_TIMER, (accessCode) => {
            this.logger.trace(accessCode);
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                const thread = this.activeGameRunner.timerThreads[accessCode];
                if (thread) {
                    this.logger.debug('Timer thread found for game ' + accessCode);
                    thread.send({
                        command: globals.GAME_PROCESS_COMMANDS.RESUME_TIMER,
                        accessCode: game.accessCode,
                        logLevel: this.logger.logLevel
                    });
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.GET_TIME_REMAINING, (accessCode) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                const thread = this.activeGameRunner.timerThreads[accessCode];
                if (thread) {
                    thread.send({
                        command: globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING,
                        accessCode: accessCode,
                        socketId: socket.id,
                        logLevel: this.logger.logLevel
                    });
                } else {
                    if (game.timerParams && game.timerParams.timeRemaining === 0) {
                        this.namespace.to(socket.id).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                    }
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.KILL_PLAYER, (accessCode, personId) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                const person = game.people.find((person) => person.id === personId);
                this.killPlayer(game, person, namespace, this.logger);
            }
        });

        socket.on(globals.CLIENT_COMMANDS.REVEAL_PLAYER, (accessCode, personId) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                const person = game.people.find((person) => person.id === personId);
                if (person && !person.revealed) {
                    this.logger.debug('game ' + accessCode + ': revealing player ' + person.name);
                    person.revealed = true;
                    namespace.in(accessCode).emit(
                        globals.CLIENT_COMMANDS.REVEAL_PLAYER,
                        {
                            id: person.id,
                            gameRole: person.gameRole,
                            alignment: person.alignment
                        });
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.TRANSFER_MODERATOR, (accessCode, personId) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let person = game.people.find((person) => person.id === personId);
                if (!person) {
                    person = game.spectators.find((spectator) => spectator.id === personId);
                }
                this.transferModeratorPowers(game, person, namespace, this.logger);
            }
        });

        socket.on(globals.CLIENT_COMMANDS.CHANGE_NAME, (accessCode, data, ackFn) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                const person = findPersonByField(game, 'id', data.personId);
                if (person) {
                    if (!isNameTaken(game, data.name)) {
                        ackFn('changed');
                        person.name = data.name.trim();
                        person.hasEnteredName = true;
                        namespace.in(accessCode).emit(globals.CLIENT_COMMANDS.CHANGE_NAME, person.id, person.name);
                    } else {
                        ackFn('taken');
                    }
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.END_GAME, (accessCode) => {
            const game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                game.status = globals.STATUS.ENDED;
                if (this.activeGameRunner.timerThreads[accessCode]) {
                    this.logger.trace('KILLING TIMER PROCESS FOR ENDED GAME ' + accessCode);
                    this.activeGameRunner.timerThreads[accessCode].kill();
                    delete this.activeGameRunner.timerThreads[accessCode];
                }
                for (const person of game.people) {
                    person.revealed = true;
                }
                namespace.in(accessCode).emit(globals.CLIENT_COMMANDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
            }
        });
    };

    createGame = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams', 'moderatorName'];
        if (typeof gameParams !== 'object'
            || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))
        ) {
            this.logger.error('Tried to create game with invalid options: ' + JSON.stringify(gameParams));
            return Promise.reject(globals.ERROR_MESSAGE.BAD_CREATE_REQUEST);
        } else {
            // to avoid excessive memory build-up, every time a game is created, check for and purge any stale games.
            pruneStaleGames(this.activeGameRunner.activeGames, this.activeGameRunner.timerThreads, this.logger);
            const newAccessCode = this.generateAccessCode(globals.ACCESS_CODE_CHAR_POOL);
            if (newAccessCode === null) {
                return Promise.reject(globals.ERROR_MESSAGE.NO_UNIQUE_ACCESS_CODE);
            }
            const moderator = initializeModerator(gameParams.moderatorName, gameParams.hasDedicatedModerator);
            moderator.assigned = true;
            if (gameParams.timerParams !== null) {
                gameParams.timerParams.paused = false;
            }
            this.activeGameRunner.activeGames[newAccessCode] = new Game(
                newAccessCode,
                globals.STATUS.LOBBY,
                initializePeopleForGame(gameParams.deck, moderator, this.shuffle),
                gameParams.deck,
                gameParams.hasTimer,
                moderator,
                gameParams.hasDedicatedModerator,
                moderator.id,
                gameParams.timerParams
            );
            this.activeGameRunner.activeGames[newAccessCode].createTime = new Date().toJSON();
            return Promise.resolve({ accessCode: newAccessCode, cookie: moderator.cookie, environment: this.environment });
        }
    };

    checkAvailability = (code) => {
        const game = this.activeGameRunner.activeGames[code.toUpperCase()];
        if (game) {
            const unassignedPerson = game.people.find((person) => person.assigned === false);
            if (!unassignedPerson) {
                return Promise.resolve(new Error(globals.ERROR_MESSAGE.GAME_IS_FULL));
            } else {
                return Promise.resolve({ accessCode: code, playerCount: getGameSize(game.deck), timerParams: game.timerParams });
            }
        } else {
            return Promise.resolve(404);
        }
    };

    generateAccessCode = (charPool) => {
        const charCount = charPool.length;
        let codeDigits, accessCode;
        let attempts = 0;
        while (!accessCode || (this.activeGameRunner.activeGames[accessCode] && attempts < globals.ACCESS_CODE_GENERATION_ATTEMPTS)) {
            codeDigits = [];
            let iterations = globals.ACCESS_CODE_LENGTH;
            while (iterations > 0) {
                iterations --;
                codeDigits.push(charPool[getRandomInt(charCount)]);
            }
            accessCode = codeDigits.join('');
            attempts ++;
        }
        return this.activeGameRunner.activeGames[accessCode]
            ? null
            : accessCode;
    };

    transferModeratorPowers = (game, person, namespace, logger) => {
        if (person && (person.out || person.userType === globals.USER_TYPES.SPECTATOR)) {
            logger.debug('game ' + game.accessCode + ': transferring mod powers to ' + person.name);
            if (game.moderator === person) {
                person.userType = globals.USER_TYPES.MODERATOR;
            } else {
                if (game.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                    game.moderator.userType = globals.USER_TYPES.PLAYER;
                } else if (game.moderator.gameRole) { // the current moderator was at one point a dealt-in player.
                    game.moderator.userType = globals.USER_TYPES.KILLED_PLAYER; // restore their state from before being made mod.
                } else if (game.moderator.userType === globals.USER_TYPES.MODERATOR) {
                    game.moderator.userType = globals.USER_TYPES.SPECTATOR;
                    if (!game.spectators.includes(game.moderator)) {
                        game.spectators.push(game.moderator);
                    }
                    if (game.spectators.includes(person)) {
                        game.spectators.splice(game.spectators.indexOf(person), 1);
                    }
                }
                person.userType = globals.USER_TYPES.MODERATOR;
                game.moderator = person;
            }

            namespace.in(game.accessCode).emit(globals.EVENTS.SYNC_GAME_STATE);
        }
    };

    killPlayer = (game, person, namespace, logger) => {
        if (person && !person.out) {
            logger.debug('game ' + game.accessCode + ': killing player ' + person.name);
            if (person.userType !== globals.USER_TYPES.TEMPORARY_MODERATOR) {
                person.userType = globals.USER_TYPES.KILLED_PLAYER;
            }
            person.out = true;
            namespace.in(game.accessCode).emit(globals.CLIENT_COMMANDS.KILL_PLAYER, person.id);
            // temporary moderators will transfer their powers automatically to the first person they kill.
            if (game.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                this.transferModeratorPowers(game, person, namespace, logger);
            }
        }
    };

    joinGame = (game, name, cookie) => {
        const matchingPerson = findPersonByField(game, 'cookie', cookie);
        if (matchingPerson) {
            return Promise.resolve(matchingPerson.cookie);
        }
        if (isNameTaken(game, name)) {
            return Promise.reject(400);
        }
        const unassignedPerson = game.moderator.assigned === false
            ? game.moderator
            : game.people.find((person) => person.assigned === false);
        if (unassignedPerson) {
            this.logger.trace('request from client to join game. Assigning: ' + unassignedPerson.name);
            unassignedPerson.assigned = true;
            unassignedPerson.name = name;
            game.isFull = isGameFull(game);
            this.namespace.in(game.accessCode).emit(
                globals.EVENTS.PLAYER_JOINED,
                GameStateCurator.mapPerson(unassignedPerson),
                game.isFull
            );
            return Promise.resolve(unassignedPerson.cookie);
        } else { // if the game is full, make them a spectator.
            const spectator = new Person(
                createRandomId(),
                createRandomId(),
                name,
                globals.USER_TYPES.SPECTATOR
            );
            this.logger.trace('new spectator: ' + spectator.name);
            game.spectators.push(spectator);
            this.namespace.in(game.accessCode).emit(
                globals.EVENTS.NEW_SPECTATOR,
                GameStateCurator.mapPerson(spectator)
            );
            return Promise.resolve(spectator.cookie);
        }
    };

    restartGame = async (game, namespace) => {
        // kill any outstanding timer threads
        if (this.activeGameRunner.timerThreads[game.accessCode]) {
            this.logger.info('KILLING STALE TIMER PROCESS FOR ' + game.accessCode);
            this.activeGameRunner.timerThreads[game.accessCode].kill();
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

        /* If the game was originally set up with a TEMP mod and the game has gone far enough to establish
        a DEDICATED mod, make the current mod a TEMP mod for the restart. */
        if (!game.hasDedicatedModerator && game.moderator.userType === globals.USER_TYPES.MODERATOR) {
            game.moderator.userType = globals.USER_TYPES.TEMPORARY_MODERATOR;
        }

        /* If the game was originally set up with a DEDICATED moderator and the current mod is DIFFERENT from that mod
            (i.e. they transferred their powers at some point), check if the current mod was once a player (i.e. they have
            a game role). If they were once a player, make them a temp mod for the restart. Otherwise, they were a
            spectator, and we want to leave them as a dedicated moderator.
         */
        if (game.hasDedicatedModerator && game.moderator.id !== game.originalModeratorId) {
            if (game.moderator.gameRole) {
                game.moderator.userType = globals.USER_TYPES.TEMPORARY_MODERATOR;
            } else {
                game.moderator.userType = globals.USER_TYPES.MODERATOR;
            }
        }

        // start the new game
        game.status = globals.STATUS.IN_PROGRESS;
        if (game.hasTimer) {
            game.timerParams.paused = true;
            this.activeGameRunner.runGame(game, namespace);
        }

        namespace.in(game.accessCode).emit(globals.CLIENT_COMMANDS.START_GAME);
    };

    handleRequestForGameState = async (namespace, logger, gameRunner, accessCode, personCookie, ackFn, clientSocket) => {
        const game = gameRunner.activeGames[accessCode];
        if (game) {
            const matchingPerson = findPersonByField(game, 'cookie', personCookie);
            if (matchingPerson) {
                if (matchingPerson.socketId === clientSocket.id) {
                    logger.trace('matching person found with an established connection to the room: ' + matchingPerson.name);
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, clientSocket, logger));
                } else {
                    logger.trace('matching person found with a new connection to the room: ' + matchingPerson.name);
                    clientSocket.join(accessCode);
                    matchingPerson.socketId = clientSocket.id;
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, clientSocket, logger));
                }
            } else {
                rejectClientRequestForGameState(ackFn);
            }
        } else {
            rejectClientRequestForGameState(ackFn);
            logger.trace('the game ' + accessCode + ' was not found');
        }
    };

    removeClientFromLobbyIfApplicable (socket) {
        socket.rooms.forEach((room) => {
            if (this.activeGameRunner.activeGames[room]) {
                this.logger.trace('disconnected socket is in a game');
                const game = this.activeGameRunner.activeGames[room];
                if (game.status === globals.STATUS.LOBBY) {
                    const matchingPlayer = findPlayerBySocketId(game.people, socket.id);
                    if (matchingPlayer) {
                        this.logger.trace('un-assigning disconnected player: ' + matchingPlayer.name);
                        matchingPlayer.assigned = false;
                        matchingPlayer.socketId = null;
                        matchingPlayer.cookie = createRandomId();
                        matchingPlayer.hasEnteredName = false;
                        socket.to(game.accessCode).emit(
                            globals.EVENTS.PLAYER_LEFT,
                            GameStateCurator.mapPerson(matchingPlayer)
                        );
                        game.isFull = isGameFull(game);
                        matchingPlayer.name = UsernameGenerator.generate();
                    }
                }
            }
        });
    }

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

    shuffle(cards);

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

function isGameFull (game) {
    return game.moderator.assigned === true && !game.people.find((person) => person.assigned === false);
}

function findPersonByField (game, fieldName, value) {
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

function isNameTaken (game, name) {
    const processedName = name.toLowerCase().trim();
    return (game.people.find((person) => person.name.toLowerCase().trim() === processedName))
    || (game.moderator.name.toLowerCase().trim() === processedName)
    || (game.spectators.find((spectator) => spectator.name.toLowerCase().trim() === processedName));
}

function pruneStaleGames (activeGames, timerThreads, logger) {
    for (const [accessCode, game] of Object.entries(activeGames)) {
        if (game.createTime) {
            const createDate = new Date(game.createTime);
            if (createDate.setHours(createDate.getHours() + globals.STALE_GAME_HOURS) < Date.now()) { // clear games created more than 12 hours ago
                logger.info('PRUNING STALE GAME ' + accessCode);
                delete activeGames[accessCode];
                if (timerThreads[accessCode]) {
                    logger.info('KILLING STALE TIMER PROCESS FOR ' + accessCode);
                    timerThreads[accessCode].kill();
                    delete timerThreads[accessCode];
                }
            }
        }
    }
}

function getGameSize (cards) {
    let quantity = 0;
    for (const card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

class Singleton {
    constructor (logger, environment, namespace) {
        if (!Singleton.instance) {
            logger.info('CREATING SINGLETON GAME MANAGER');
            Singleton.instance = new GameManager(logger, environment, namespace);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
