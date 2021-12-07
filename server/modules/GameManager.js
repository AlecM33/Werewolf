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
            handleRequestForGameState(
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

        socket.on(globals.CLIENT_COMMANDS.START_GAME, (accessCode, personId) => {
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
                }
            }
        });

        socket.on(globals.CLIENT_COMMANDS.KILL_PLAYER, (accessCode, personId) => {
            let game = this.activeGameRunner.activeGames[accessCode];
            if (game) {
                let person = game.people.find((person) => person.id === personId)
                if (person) {
                    this.logger.debug('game ' + accessCode + ': killing player ' + person.name);
                    person.out = true;
                    namespace.in(accessCode).emit(globals.CLIENT_COMMANDS.KILL_PLAYER, )
                }
            }
        })
    }


    createGame = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams', 'moderatorName'];
        if (typeof gameParams !== 'object' || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))) {
            this.logger.error('Tried to create game with invalid options: ' + JSON.stringify(gameParams));
            return Promise.reject('Tried to create game with invalid options: ' + gameParams);
        } else {
            const newAccessCode = this.generateAccessCode();
            let moderator = initializeModerator(gameParams.moderatorName, gameParams.hasDedicatedModerator);
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


}

function getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function initializeModerator(name, hasDedicatedModerator) {
    const userType = hasDedicatedModerator
        ? globals.USER_TYPES.MODERATOR
        : globals.USER_TYPES.TEMPORARY_MODERATOR;
    return new Person(createRandomId(), createRandomId(), name, userType)
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
        moderator.gameRoleDescription = cards[j].description;
        moderator.alignment = cards[j].team;
        people.push(moderator);
        j ++;
    }

    while (j < numberOfRoles) {
        people.push(new Person(createRandomId(), createRandomId(), UsernameGenerator.generate(), globals.USER_TYPES.PLAYER, cards[j].role, cards[j].description, cards[j].team))
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

class Singleton {
    constructor (logger, environment) {
        if (!Singleton.instance) {
            logger.log('CREATING SINGLETON GAME MANAGER');
            Singleton.instance = new GameManager(logger, environment);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

/* Since clients are anonymous, we have to rely to some extent on a cookie to identify them. Socket ids
    are unique to a client, but they are re-generated if a client disconnects and then reconnects.
    Thus, to have the most resilient identification i.e. to let them refresh, navigate away and come back,
    get disconnected and reconnect, etc. we should have a combination of the socket id and the cookie. This
    will also allow us to reject certain theoretical ways of breaking things, such as copying someone else's
    cookie. Though if a client wants to clear their cookie and reset their connection, there's not much we can do.
    The best thing in my opinion is to make it hard for clients to _accidentally_ break their experience.
 */
function handleRequestForGameState(namespace, logger, gameRunner, accessCode, personCookie, ackFn, socket) {
    const game = gameRunner.activeGames[accessCode];
    if (game) {
        let matchingPerson = game.people.find((person) => person.cookie === personCookie);
        if (!matchingPerson && game.moderator.cookie === personCookie)  {
            matchingPerson = game.moderator;
        }
        if (matchingPerson) {
            if (matchingPerson.socketId === socket.id) {
                logger.trace("matching person found with an established connection to the room: " + matchingPerson.name);
                ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, socket, logger));
            } else {
                if (!roomContainsSocketOfMatchingPerson(namespace, matchingPerson, logger, accessCode)) {
                    logger.trace("matching person found with a new connection to the room: " + matchingPerson.name);
                    socket.join(accessCode);
                    matchingPerson.socketId = socket.id;
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, socket, logger));
                } else {
                    logger.trace('this person is already associated with a socket connection');
                    let alreadyConnectedSocket = namespace.connected[matchingPerson.socketId];
                    if (alreadyConnectedSocket && alreadyConnectedSocket.leave) {
                        alreadyConnectedSocket.leave(accessCode, ()=> {
                            logger.trace('kicked existing connection out of room ' + accessCode);
                            socket.join(accessCode);
                            matchingPerson.socketId = socket.id;
                            ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson, gameRunner, socket, logger));
                        })
                    }
                }
            }
        } else {
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
                    socket.join(accessCode);
                    unassignedPerson.assigned = true;
                    unassignedPerson.socketId = socket.id;
                    ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, unassignedPerson, gameRunner, socket, logger));
                    let isFull = isGameFull(game);
                    game.isFull = isFull;
                    socket.to(accessCode).emit(
                        globals.EVENTS.PLAYER_JOINED,
                        {name: unassignedPerson.name, userType: unassignedPerson.userType},
                        isFull
                    );
                } else {
                    rejectClientRequestForGameState(ackFn);
                    logger.trace('this game is full');
                }
            }
        }
    } else {
        rejectClientRequestForGameState(ackFn);
        logger.trace('the game' + accessCode + ' was not found');
    }
}

// in socket.io 2.x , the rooms property is an object. in 3.x and 4.x, it is a javascript Set.
function roomContainsSocketOfMatchingPerson(namespace, matchingPerson, logger, accessCode) {
    return namespace.adapter
        && namespace.adapter.rooms[accessCode]
        && namespace.adapter.rooms[accessCode].sockets[matchingPerson.socketId];
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

module.exports = Singleton;
