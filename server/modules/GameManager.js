const globals = require('../config/globals');
const ActiveGameRunner = require('./ActiveGameRunner');
const Game = require('../model/Game');
const Person = require('../model/Person');

class GameManager {
    constructor (logger) {
        this.logger = logger;
        this.activeGameRunner = new ActiveGameRunner().getInstance();
        this.namespace = null;
        //this.gameSocketUtility = GameSocketUtility;
    }

    addGameSocketHandlers = (namespace, socket) => {
        this.namespace = namespace;
        socket.on(globals.CLIENT_COMMANDS.FETCH_GAME_STATE, (accessCode, personId, ackFn) => {
            handleRequestForGameState(this.namespace, this.logger, this.activeGameRunner, accessCode, personId, ackFn, socket);
        });
    }


    createGame = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams', 'moderatorName'];
        if (typeof gameParams !== 'object' || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))) {
            this.logger.error('Tried to create game with invalid options: ' + JSON.stringify(gameParams));
            return Promise.reject('Tried to create game with invalid options: ' + gameParams);
        } else {
            const newAccessCode = this.generateAccessCode();
            this.activeGameRunner.activeGames[newAccessCode] = new Game(
                globals.STATUS.LOBBY,
                initializePeopleForGame(gameParams.moderatorName, gameParams.deck),
                gameParams.deck,
                gameParams.hasTimer,
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

function initializeModerator(name) {
    return new Person(createRandomUserId(), name, globals.USER_TYPES.MODERATOR)
}

function initializePeopleForGame(modName, uniqueCards) {
    let people = [];
    let cards = []; // this will contain copies of each card equal to the quantity.
    people.push(initializeModerator(modName));
    let numberOfRoles = 0;
    for (let card of uniqueCards) {
        for (let i = 0; i < card.quantity; i ++) {
            cards.push(card);
            numberOfRoles ++;
        }
    }

    cards = shuffleArray(cards); // The deck should probably be shuffled, ey?.

    for(let j = 0; j < numberOfRoles; j ++) {
        people.push(new Person(createRandomUserId(), null, globals.USER_TYPES.PLAYER, cards[j].role, cards[j].description))
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

function createRandomUserId () {
    let id = '';
    for (let i = 0; i < globals.USER_SIGNATURE_LENGTH; i++) {
        id += globals.ACCESS_CODE_CHAR_POOL[Math.floor(Math.random() * globals.ACCESS_CODE_CHAR_POOL.length)];
    }
    return id;
}

class Singleton {
    constructor (logger) {
        if (!Singleton.instance) {
            logger.log('CREATING SINGLETON GAME MANAGER');
            Singleton.instance = new GameManager(logger);
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
function handleRequestForGameState(namespace, logger, gameRunner, accessCode, personId, ackFn, socket) {
    const game = gameRunner.activeGames[accessCode];
    if (game) {
        let matchingPerson = game.people.find((person) => person.id === personId);
        if (matchingPerson) {
            if (matchingPerson.socketId === socket.id) {
                logger.debug("matching person found with an established connection to the room: " + matchingPerson.name);
                ackFn(getGameStateFromPerspectiveOfPerson(game, matchingPerson));
            } else {
                if (!roomContainsSocketOfMatchingPerson(namespace, matchingPerson, logger, accessCode)) {
                    logger.debug("matching person found with a new connection to the room: " + matchingPerson.name);
                    socket.join(accessCode);
                    matchingPerson.socketId = socket.id;
                    ackFn(getGameStateFromPerspectiveOfPerson(game, matchingPerson));
                } else {
                    rejectClientRequestForGameState(ackFn);
                }
            }
        } else {
            let personWithMatchingSocketId = findPersonWithMatchingSocketId(game.people, socket.id);
            if (personWithMatchingSocketId) {
                logger.debug("matching person found whose cookie got cleared after establishing a connection to the room: " + personWithMatchingSocketId.name);
                ackFn(getGameStateFromPerspectiveOfPerson(game, personWithMatchingSocketId));
            } else {
                let unassignedPerson = game.people.find((person) => person.assigned === false);
                if (unassignedPerson) {
                    logger.debug("completely new person with a first connection to the room: " + unassignedPerson.name);
                    socket.join(accessCode);
                    unassignedPerson.assigned = true;
                    unassignedPerson.socketId = socket.id;
                    ackFn(getGameStateFromPerspectiveOfPerson(game, unassignedPerson));
                } else {
                    rejectClientRequestForGameState(ackFn);
                }
            }
        }
    } else {
        rejectClientRequestForGameState(ackFn);
    }
}

function getGameStateFromPerspectiveOfPerson(game, person) {
    return person;
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

module.exports = Singleton;
