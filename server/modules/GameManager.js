const globals = require('../config/globals');
const Game = require('../model/Game');
const Person = require('../model/Person');
const GameStateCurator = require('./GameStateCurator');
const UsernameGenerator = require('./UsernameGenerator');

class GameManager {
    constructor (logger, environment, activeGameRunner) {
        if (GameManager.instance) {
            throw new Error('The server tried to instantiate more than one GameManager');
        }
        logger.info('CREATING SINGLETON GAME MANAGER');
        this.logger = logger;
        this.environment = environment;
        this.activeGameRunner = activeGameRunner;
        this.namespace = null;
        GameManager.instance = this;
    }

    setGameSocketNamespace = (namespace) => {
        this.namespace = namespace;
    };

    createGame = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams', 'moderatorName'];
        if (typeof gameParams !== 'object'
            || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))
        ) {
            this.logger.error('Tried to create game with invalid options: ' + JSON.stringify(gameParams));
            return Promise.reject(globals.ERROR_MESSAGE.BAD_CREATE_REQUEST);
        } else {
            this.pruneStaleGames();
            const newAccessCode = this.generateAccessCode(globals.ACCESS_CODE_CHAR_POOL);
            if (newAccessCode === null) {
                return Promise.reject(globals.ERROR_MESSAGE.NO_UNIQUE_ACCESS_CODE);
            }
            const moderator = initializeModerator(gameParams.moderatorName, gameParams.hasDedicatedModerator);
            moderator.assigned = true;
            if (gameParams.timerParams !== null) {
                gameParams.timerParams.paused = false;
            }
            const newGame = new Game(
                newAccessCode,
                globals.STATUS.LOBBY,
                initializePeopleForGame(gameParams.deck, moderator, this.shuffle),
                gameParams.deck,
                gameParams.hasTimer,
                moderator,
                gameParams.hasDedicatedModerator,
                moderator.id,
                new Date().toJSON(),
                gameParams.timerParams
            );

            this.activeGameRunner.activeGames.set(newAccessCode, newGame);

            return Promise.resolve({ accessCode: newAccessCode, cookie: moderator.cookie, environment: this.environment });
        }
    };

    startGame = (game, namespace) => {
        if (game.isFull) {
            game.status = globals.STATUS.IN_PROGRESS;
            if (game.hasTimer) {
                game.timerParams.paused = true;
                this.activeGameRunner.runGame(game, namespace);
            }
            namespace.in(game.accessCode).emit(globals.EVENT_IDS.START_GAME);
        }
    };

    pauseTimer = (game, logger) => {
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

    resumeTimer = (game, logger) => {
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

    getTimeRemaining = (game, socket) => {
        const thread = this.activeGameRunner.timerThreads[game.accessCode];
        if (thread && (!thread.killed && thread.exitCode === null)) {
            thread.send({
                command: globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING,
                accessCode: game.accessCode,
                socketId: socket.id,
                logLevel: this.logger.logLevel
            });
        } else if (thread) {
            if (game.timerParams && game.timerParams.timeRemaining === 0) {
                this.namespace.to(socket.id).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
            }
        }
    };

    revealPlayer = (game, personId) => {
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
                });
        }
    };

    changeName = (game, data, ackFn) => {
        const person = findPersonByField(game, 'id', data.personId);
        if (person) {
            if (!isNameTaken(game, data.name)) {
                ackFn('changed');
                person.name = data.name.trim();
                person.hasEnteredName = true;
                this.namespace.in(game.accessCode).emit(globals.EVENT_IDS.CHANGE_NAME, person.id, person.name);
            } else {
                ackFn('taken');
            }
        }
    };

    endGame = (game) => {
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

    checkAvailability = (code) => {
        const game = this.activeGameRunner.activeGames.get(code.toUpperCase().trim());
        if (game) {
            return Promise.resolve({ accessCode: code, playerCount: getGameSize(game.deck), timerParams: game.timerParams });
        } else {
            return Promise.resolve(404);
        }
    };

    generateAccessCode = (charPool) => {
        const charCount = charPool.length;
        let codeDigits, accessCode;
        let attempts = 0;
        while (!accessCode || (this.activeGameRunner.activeGames.get(accessCode) && attempts < globals.ACCESS_CODE_GENERATION_ATTEMPTS)) {
            codeDigits = [];
            let iterations = globals.ACCESS_CODE_LENGTH;
            while (iterations > 0) {
                iterations --;
                codeDigits.push(charPool[getRandomInt(charCount)]);
            }
            accessCode = codeDigits.join('');
            attempts ++;
        }
        return this.activeGameRunner.activeGames.get(accessCode)
            ? null
            : accessCode;
    };

    transferModeratorPowers = (socket, game, person, namespace, logger) => {
        if (person && (person.out || person.userType === globals.USER_TYPES.SPECTATOR)) {
            logger.debug('game ' + game.accessCode + ': transferring mod powers to ' + person.name);
            if (game.moderator === person) {
                person.userType = globals.USER_TYPES.MODERATOR;
                this.namespace.to(person.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
                socket.to(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, person.id);
            } else {
                const oldModerator = game.moderator;
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
                    namespace.in(game.accessCode).emit(globals.EVENTS.NEW_SPECTATOR);
                }
                person.userType = globals.USER_TYPES.MODERATOR;
                game.moderator = person;
                this.namespace.to(person.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
                this.namespace.to(oldModerator.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
            }
        }
    };

    killPlayer = (socket, game, person, namespace, logger) => {
        if (person && !person.out) {
            logger.debug('game ' + game.accessCode + ': killing player ' + person.name);
            if (person.userType !== globals.USER_TYPES.TEMPORARY_MODERATOR) {
                person.userType = globals.USER_TYPES.KILLED_PLAYER;
            }
            person.out = true;
            // temporary moderators will transfer their powers automatically to the first person they kill.
            if (game.moderator.userType === globals.USER_TYPES.TEMPORARY_MODERATOR) {
                this.transferModeratorPowers(socket, game, person, namespace, logger);
            } else {
                namespace.in(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, person.id);
            }
        }
    };

    joinGame = (game, name, cookie, joinAsSpectator) => {
        const matchingPerson = findPersonByField(game, 'cookie', cookie);
        if (matchingPerson) {
            return Promise.resolve(matchingPerson.cookie);
        }
        if (isNameTaken(game, name)) {
            return Promise.reject({ status: 400, reason: 'This name is taken.' });
        }
        if (joinAsSpectator && game.spectators.length === globals.MAX_SPECTATORS) {
            return Promise.reject({ status: 400, reason: 'There are too many people already spectating.' });
        } else if (joinAsSpectator) {
            return addSpectator(game, name, this.logger, this.namespace);
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
        } else {
            if (game.spectators.length === globals.MAX_SPECTATORS) {
                return Promise.reject({ status: 400, reason: 'This game has reached the maximum number of players and spectators.' });
            }
            return addSpectator(game, name, this.logger, this.namespace);
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

        namespace.in(game.accessCode).emit(globals.EVENT_IDS.RESTART_GAME);
    };

    handleRequestForGameState = async (game, namespace, logger, gameRunner, accessCode, personCookie, ackFn, clientSocket) => {
        const matchingPerson = findPersonByField(game, 'cookie', personCookie);
        if (matchingPerson) {
            if (matchingPerson.socketId === clientSocket.id) {
                logger.trace('matching person found with an established connection to the room: ' + matchingPerson.name);
                ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
            } else {
                logger.trace('matching person found with a new connection to the room: ' + matchingPerson.name);
                clientSocket.join(accessCode);
                matchingPerson.socketId = clientSocket.id;
                ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
            }
        } else {
            rejectClientRequestForGameState(ackFn);
        }
    };

    removeClientFromLobbyIfApplicable (socket) {
        socket.rooms.forEach((room) => {
            if (this.activeGameRunner.activeGames.get(room)) {
                this.logger.trace('disconnected socket is in a game');
                const game = this.activeGameRunner.activeGames.get(room);
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

    pruneStaleGames = () => {
        this.activeGameRunner.activeGames.forEach((value, key) => {
            if (value.createTime) {
                const createDate = new Date(value.createTime);
                if (createDate.setHours(createDate.getHours() + globals.STALE_GAME_HOURS) < Date.now()) {
                    this.logger.info('PRUNING STALE GAME ' + key);
                    this.activeGameRunner.activeGames.delete(key);
                    if (this.activeGameRunner.timerThreads[key]) {
                        this.logger.info('KILLING STALE TIMER PROCESS FOR ' + key);
                        this.activeGameRunner.timerThreads[key].kill();
                        delete this.activeGameRunner.timerThreads[key];
                    }
                }
            }
        });
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

function getGameSize (cards) {
    let quantity = 0;
    for (const card of cards) {
        quantity += card.quantity;
    }

    return quantity;
}

function addSpectator (game, name, logger, namespace) {
    const spectator = new Person(
        createRandomId(),
        createRandomId(),
        name,
        globals.USER_TYPES.SPECTATOR
    );
    logger.trace('new spectator: ' + spectator.name);
    game.spectators.push(spectator);
    namespace.in(game.accessCode).emit(
        globals.EVENTS.NEW_SPECTATOR,
        GameStateCurator.mapPerson(spectator)
    );
    return Promise.resolve(spectator.cookie);
}

module.exports = GameManager;
