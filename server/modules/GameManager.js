const globals = require('../config/globals');
const ActiveGameRunner = require('./ActiveGameRunner');
const Game = require('../model/Game');
const Person = require('../model/Person');
const GameStateCurator = require('./GameStateCurator');
const UsernameGenerator = require('./UsernameGenerator');

class GameManager {
    constructor (logger, environment) {
        this.logger = logger;
        this.environment = environment;
        this.activeGameRunner = new ActiveGameRunner(logger).getInstance();
        this.namespace = null;
        //this.gameSocketUtility = GameSocketUtility;
    }

    addGameSocketHandlers = (namespace, socket) => {
        this.namespace = namespace;
        socket.on(globals.CLIENT_COMMANDS.FETCH_GAME_STATE, (accessCode, personId, ackFn) => {
            this.logger.trace('request for game state for accessCode ' + accessCode + ', person ' + personId);
            this.handleRequestForGameState(
                this.namespace,
                this.logger,
                this.activeGameRunner,
                accessCode,
                personId,
                ackFn,
                socket
            );
        });

        socket.on(globals.CLIENT_COMMANDS.GET_ENVIRONMENT, (ackFn) => {
            ackFn(this.environment);
        });

        socket.on(globals.CLIENT_COMMANDS.START_GAME, (accessCode) => {
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                game.status = globals.STATUS.IN_PROGRESS;
                namespace.in(accessCode).emit(globals.EVENTS.SYNC_GAME_STATE);
                if (game.hasTimer) {
                    game.timerParams.paused = true;
                    this.activeGameRunner.runGame(game, namespace);
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.PAUSE_TIMER, (accessCode) => {
            this.logger.trace(accessCode);
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let thread = this.activeGameRunner.timerThreads[accessCode];
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
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let thread = this.activeGameRunner.timerThreads[accessCode];
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
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let thread = this.activeGameRunner.timerThreads[accessCode];
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
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let person = game.people.find((person) => person.id === personId)
                this.killPlayer(game, person, namespace, this.logger);
            }
        });

        socket.on(globals.CLIENT_COMMANDS.REVEAL_PLAYER, (accessCode, personId) => {
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let person = game.people.find((person) => person.id === personId)
                if (person && !person.revealed) {
                    this.logger.debug('game ' + accessCode + ': revealing player ' + person.name);
                    person.revealed = true;
                    namespace.in(accessCode).emit(
                        globals.CLIENT_COMMANDS.REVEAL_PLAYER,
                        {
                            id: person.id,
                            gameRole: person.gameRole,
                            alignment: person.alignment
                        })
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.TRANSFER_MODERATOR, (accessCode, personId) => {
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let person = game.people.find((person) => person.id === personId)
                if (!person) {
                    person = game.spectators.find((spectator) => spectator.id === personId)
                }
                this.transferModeratorPowers(game, person, namespace, this.logger);
            }
        });

        socket.on(globals.CLIENT_COMMANDS.CHANGE_NAME, (accessCode, data, ackFn) => {
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let person = findPersonById(game, data.personId);
                if (person) {
                    if (!isNameTaken(game, data.name)) {
                        ackFn("changed");
                        person.name = data.name.trim();
                        person.hasEnteredName = true;
                        socket.to(accessCode).emit(globals.EVENTS.SYNC_GAME_STATE);
                    } else {
                        ackFn("taken");
                    }
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.END_GAME, (accessCode) => {
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                game.status = globals.STATUS.ENDED;
                for (let person of game.people) {
                    person.revealed = true;
                }
                namespace.in(accessCode).emit(globals.CLIENT_COMMANDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
            }
        })
    }


    createGame = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams'];
        if (typeof gameParams !== 'object'
            || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))
        ) {
            this.logger.error('Tried to create game with invalid options: ' + JSON.stringify(gameParams));
            return Promise.reject(globals.ERROR_MESSAGE.BAD_CREATE_REQUEST);
        } else {
            // to avoid excessive memory build-up, every time a game is created, check for and purge any stale games.
            pruneStaleGames(this.activeGameRunner.activeGames, this.activeGameRunner.timerThreads, this.logger);
            const newAccessCode = this.generateAccessCode();
            let moderator = initializeModerator(UsernameGenerator.generate(), gameParams.hasDedicatedModerator);
            if (gameParams.timerParams !== null) {
                gameParams.timerParams.paused = false;
            }
            this.activeGameRunner.activeGames[newAccessCode] = new Game(
                newAccessCode,
                globals.STATUS.LOBBY,
                initializePeopleForGame(gameParams.deck, moderator),
                gameParams.deck,
                gameParams.hasTimer,
                moderator,
                gameParams.timerParams
            );
            this.activeGameRunner.activeGames[newAccessCode].createTime = new Date().toJSON();
            return Promise.resolve(newAccessCode);
        }
    }

    joinGame = (code) => {
        let game = this.activeGameRunner.activeGames[code];
        if (game) {
            let unassignedPerson = game.people.find((person) => person.assigned === false);
            if (!unassignedPerson) {
                return Promise.resolve(new Error(globals.ERROR_MESSAGE.GAME_IS_FULL));
            } else {
                return Promise.resolve(code);
            }
        } else {
            return Promise.resolve(404);
        }
    }

    generateAccessCode = () => {
        const numLetters = globals.ACCESS_CODE_CHAR_POOL.length;
        const codeDigits = [];
        let iterations = globals.ACCESS_CODE_LENGTH;
        while (iterations > 0) {
            iterations--;
            codeDigits.push(globals.ACCESS_CODE_CHAR_POOL[getRandomInt(numLetters)]);
        }
        return codeDigits.join('');
    }

    transferModeratorPowers = (game, person, namespace, logger) => {
        if (person && (person.out || person.userType === globals.USER_TYPES.SPECTATOR)) {
            logger.debug('game ' + game.accessCode + ': transferring mod powers to ' + person.name);
            if (game.moderator === person) {
                logger.debug('temp mod killed themselves');
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
    }

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
    }


    handleRequestForGameState = (namespace, logger, gameRunner, accessCode, personCookie, ackFn, socket) => {
        const game = gameRunner.activeGames[accessCode];
        if (game) {
            let matchingPerson = game.people.find((person) => person.cookie === personCookie);
            if (!matchingPerson) {
                matchingPerson = game.spectators.find((spectator) => spectator.cookie === personCookie);
            }
            if (game.moderator.cookie === personCookie)  {
                matchingPerson = game.moderator;
            }
            if (matchingPerson) {
                if (matchingPerson.socketId === socket.id) {
                    logger.trace("matching person found with an established connection to the room: " + matchingPerson.name);
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, socket, logger));
                } else {
                    logger.trace("matching person found with a new connection to the room: " + matchingPerson.name);
                    socket.join(accessCode);
                    matchingPerson.socketId = socket.id;
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, socket, logger));
                }
            } else {
                this.handleRequestFromNonMatchingPerson(game, socket, gameRunner, ackFn, logger);
            }
        } else {
            rejectClientRequestForGameState(ackFn);
            logger.trace('the game ' + accessCode + ' was not found');
        }
    }

    handleRequestFromNonMatchingPerson = (game, socket, gameRunner, ackFn, logger) => {
        let personWithMatchingSocketId = findPersonWithMatchingSocketId(game.people, socket.id);
        if (personWithMatchingSocketId) {
            logger.trace("matching person found whose cookie got cleared after establishing a connection to the room: " + personWithMatchingSocketId.name);
            ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, personWithMatchingSocketId, gameRunner, socket, logger));
        } else {
            let unassignedPerson = game.moderator.assigned === false
                ? game.moderator
                : game.people.find((person) => person.assigned === false);
            if (unassignedPerson) {
                logger.trace("completely new person with a first connection to the room: " + unassignedPerson.name);
                unassignedPerson.assigned = true;
                unassignedPerson.socketId = socket.id;
                ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, unassignedPerson, gameRunner, socket, logger));
                let isFull = isGameFull(game);
                game.isFull = isFull;
                socket.to(game.accessCode).emit(
                    globals.EVENTS.PLAYER_JOINED,
                    {name: unassignedPerson.name, userType: unassignedPerson.userType},
                    isFull
                );
            } else { // if the game is full, make them a spectator.
                let spectator = new Person(
                    createRandomId(),
                    createRandomId(),
                    UsernameGenerator.generate(),
                    globals.USER_TYPES.SPECTATOR
                );
                logger.trace("new spectator: " + spectator.name);
                game.spectators.push(spectator);
                ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, spectator, gameRunner, socket, logger));
            }
            socket.join(game.accessCode);
        }
    }

}

function getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function initializeModerator(name, hasDedicatedModerator) {
    const userType = hasDedicatedModerator
        ? globals.USER_TYPES.MODERATOR
        : globals.USER_TYPES.TEMPORARY_MODERATOR;
    return new Person(createRandomId(), createRandomId(), name, userType);;
}

function initializePeopleForGame(uniqueCards, moderator) {
    let people = [];
    let cards = []; // this will contain copies of each card equal to the quantity.
    let numberOfRoles = 0;
    for (let card of uniqueCards) {
        for (let i = 0; i < card.quantity; i ++) {
            cards.push(card);
            numberOfRoles ++;
        }
    }

    cards = shuffleArray(cards); // The deck should probably be shuffled, ey?.

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
        let person = new Person(
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

function shuffleArray (array) {
    for (let i = 0; i < array.length; i++) {
        const randIndex = Math.floor(Math.random() * i);
        const temp = array[i];
        array[i] = array[randIndex];
        array[randIndex] = temp;
    }
    return array;
}

function createRandomId () {
    let id = '';
    for (let i = 0; i < globals.USER_SIGNATURE_LENGTH; i++) {
        id += globals.ACCESS_CODE_CHAR_POOL[Math.floor(Math.random() * globals.ACCESS_CODE_CHAR_POOL.length)];
    }
    return id;
}

function rejectClientRequestForGameState(acknowledgementFunction) {
    return acknowledgementFunction(null);
}

function findPersonWithMatchingSocketId(people, socketId) {
    return people.find((person) => person.socketId === socketId);
}

function isGameFull(game) {
    return game.moderator.assigned === true && !game.people.find((person) => person.assigned === false);
}

function findPersonById(game, id) {
    let person;
    if (id === game.moderator.id) {
        person = game.moderator;
    }
    if (!person) {
        person = game.people.find((person) => person.id === id);
    }
    if (!person) {
        person = game.spectators.find((spectator) => spectator.id === id)
    }
    return person;
}

function isNameTaken(game, name) {
    let processedName = name.toLowerCase().trim();
    return (game.people.find((person) => person.name.toLowerCase().trim() === processedName))
    || (game.moderator.name.toLowerCase().trim() === processedName)
    || (game.spectators.find((spectator) => spectator.name.toLowerCase().trim() === processedName))
}

function pruneStaleGames(activeGames, timerThreads, logger) {
    for (const [accessCode, game] of Object.entries(activeGames)) {
        if (game.createTime) {
            let createDate = new Date(game.createTime);
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

class Singleton {
    constructor (logger, environment) {
        if (!Singleton.instance) {
            logger.info('CREATING SINGLETON GAME MANAGER');
            Singleton.instance = new GameManager(logger, environment);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}


module.exports = Singleton;
