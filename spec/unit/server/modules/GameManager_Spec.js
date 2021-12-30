// TODO: clean up these deep relative paths? jsconfig.json is not working...
const Game = require("../../../../server/model/Game");
const globals = require("../../../../server/config/globals");
const USER_TYPES = globals.USER_TYPES;
const Person = require("../../../../server/model/Person");
const GameManager = require('../../../../server/modules/GameManager.js');
const GameStateCurator = require("../../../../server/modules/GameStateCurator");
const logger = require('../../../../server/modules/Logger.js')(false);

describe('GameManager', function () {
    let gameManager, namespace;

    beforeAll(function () {
        spyOn(logger, 'debug');
        spyOn(logger, 'error');
        gameManager = new GameManager(logger, globals.ENVIRONMENT.PRODUCTION).getInstance();
        let inObj = { emit: () => {} }
        namespace = { in: () => { return inObj }};
    });

    beforeEach(function () {
    });

    describe('#transferModerator', function () {
        it('Should transfer successfully from a dedicated moderator to a killed player', () => {
            let personToTransferTo = new Person("1", "123", "Joe", USER_TYPES.KILLED_PLAYER);
            personToTransferTo.out = true;
            let moderator = new Person("3", "789", "Jack", USER_TYPES.MODERATOR)
            let game = new Game(
                "abc",
                globals.STATUS.IN_PROGRESS,
                [ personToTransferTo, new Person("2", "456", "Jane", USER_TYPES.PLAYER)],
                [],
                false,
                moderator
            );
            gameManager.transferModeratorPowers(game, personToTransferTo, namespace, logger);


            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(moderator.userType).toEqual(USER_TYPES.SPECTATOR);
        });

        it('Should transfer successfully from a dedicated moderator to a spectator', () => {
            let personToTransferTo = new Person("1", "123", "Joe", USER_TYPES.SPECTATOR);
            let moderator = new Person("3", "789", "Jack", USER_TYPES.MODERATOR)
            let game = new Game(
                "abc",
                globals.STATUS.IN_PROGRESS,
                [ new Person("2", "456", "Jane", USER_TYPES.PLAYER)],
                [],
                false,
                moderator
            );
            game.spectators.push(personToTransferTo)
            gameManager.transferModeratorPowers(game, personToTransferTo, namespace, logger);


            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(moderator.userType).toEqual(USER_TYPES.SPECTATOR);
        });

        it('Should transfer successfully from a temporary moderator to a killed player', () => {
            let personToTransferTo = new Person("1", "123", "Joe", USER_TYPES.KILLED_PLAYER);
            personToTransferTo.out = true;
            let tempMod = new Person("3", "789", "Jack", USER_TYPES.TEMPORARY_MODERATOR)
            let game = new Game(
                "abc",
                globals.STATUS.IN_PROGRESS,
                [ personToTransferTo, tempMod, new Person("2", "456", "Jane", USER_TYPES.PLAYER)],
                [],
                false,
                tempMod
            );
            gameManager.transferModeratorPowers(game, personToTransferTo, namespace, logger);


            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(tempMod.userType).toEqual(USER_TYPES.PLAYER);
        });

        it('Should make the temporary moderator a dedicated moderator when they take themselves out of the game', () => {
            let tempMod = new Person("3", "789", "Jack", USER_TYPES.TEMPORARY_MODERATOR);
            let personToTransferTo = tempMod;
            tempMod.out = true;
            let game = new Game(
                "abc",
                globals.STATUS.IN_PROGRESS,
                [ personToTransferTo, tempMod, new Person("2", "456", "Jane", USER_TYPES.PLAYER)],
                [],
                false,
                tempMod
            );
            gameManager.transferModeratorPowers(game, personToTransferTo, namespace, logger);


            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(tempMod.userType).toEqual(USER_TYPES.MODERATOR);
        });
    });

    describe('#killPlayer', function () {
        it('Should mark a player as out and broadcast it, and should not transfer moderators if the moderator is a dedicated mod.', () => {
            spyOn(namespace.in(), 'emit');
            spyOn(gameManager, 'transferModeratorPowers');
            let player = new Person("1", "123", "Joe", USER_TYPES.PLAYER);
            let game = new Game(
                "abc",
                globals.STATUS.IN_PROGRESS,
                [ player ],
                [],
                false,
                new Person("2", "456", "Jane", USER_TYPES.MODERATOR)
            );
            gameManager.killPlayer(game, player, namespace, logger);


            expect(player.out).toEqual(true);
            expect(player.userType).toEqual(USER_TYPES.KILLED_PLAYER);
            expect(namespace.in().emit).toHaveBeenCalled();
            expect(gameManager.transferModeratorPowers).not.toHaveBeenCalled();
        });

        it('Should mark a temporary moderator as out but preserve their user type, and call the transfer mod function', () => {
            spyOn(namespace.in(), 'emit');
            spyOn(gameManager, 'transferModeratorPowers');
            let tempMod = new Person("1", "123", "Joe", USER_TYPES.TEMPORARY_MODERATOR);
            let game = new Game(
                "abc",
                globals.STATUS.IN_PROGRESS,
                [ tempMod ],
                [],
                false,
                tempMod
            );
            gameManager.killPlayer(game, tempMod, namespace, logger);


            expect(tempMod.out).toEqual(true);
            expect(tempMod.userType).toEqual(USER_TYPES.TEMPORARY_MODERATOR);
            expect(namespace.in().emit).toHaveBeenCalled();
            expect(gameManager.transferModeratorPowers).toHaveBeenCalled();
        });
    });

    describe('#handleRequestForGameState', function () {
        it('should send the game state to a matching person with an active connection to the room', () => {
            let player = new Person("1", "123", "Joe", USER_TYPES.PLAYER);
            let socket = { id: "socket1"};
            spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson');
            player.socketId = "socket1";
            let gameRunner = {
                activeGames: {
                    "abc": new Game(
                        "abc",
                        globals.STATUS.IN_PROGRESS,
                        [ player ],
                        [],
                        false,
                        new Person("2", "456", "Jane", USER_TYPES.MODERATOR)
                    )
                }
            }
            spyOn(namespace.in(), 'emit');
            gameManager.handleRequestForGameState(
                namespace,
                logger,
                gameRunner,
                "abc",
                "123",
                (arg) => {},
                socket
            );

            expect(GameStateCurator.getGameStateFromPerspectiveOfPerson)
                .toHaveBeenCalledWith(gameRunner.activeGames["abc"], player, gameRunner, socket, logger);
        });

        it('should send the game state to a matching person who reset their connection', () => {
            let player = new Person("1", "123", "Joe", USER_TYPES.PLAYER);
            let socket = { id: "socket_222222", join: () => {}};
            spyOn(socket, 'join');
            spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson');
            player.socketId = "socket_111111";
            let gameRunner = {
                activeGames: {
                    "abc": new Game(
                        "abc",
                        globals.STATUS.IN_PROGRESS,
                        [ player ],
                        [],
                        false,
                        new Person("2", "456", "Jane", USER_TYPES.MODERATOR)
                    )
                }
            }
            spyOn(namespace.in(), 'emit');
            gameManager.handleRequestForGameState(
                namespace,
                logger,
                gameRunner,
                "abc",
                "123",
                (arg) => {},
                socket
            );

            expect(GameStateCurator.getGameStateFromPerspectiveOfPerson)
                .toHaveBeenCalledWith(gameRunner.activeGames["abc"], player, gameRunner, socket, logger);
            expect(player.socketId).toEqual(socket.id);
            expect(socket.join).toHaveBeenCalled();
        });
    });
});
