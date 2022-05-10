// TODO: clean up these deep relative paths? jsconfig.json is not working...
const Game = require('../../../../server/model/Game');
const globals = require('../../../../server/config/globals');
const USER_TYPES = globals.USER_TYPES;
const STATUS = globals.STATUS;
const Person = require('../../../../server/model/Person');
const GameManager = require('../../../../server/modules/GameManager.js');
const GameStateCurator = require('../../../../server/modules/GameStateCurator');
const logger = require('../../../../server/modules/Logger.js')(false);

describe('GameManager', () => {
    let gameManager, namespace;

    beforeAll(() => {
        spyOn(logger, 'debug');
        spyOn(logger, 'error');

        const inObj = { emit: () => {} };
        namespace = { in: () => { return inObj; } };
        gameManager = new GameManager(logger, globals.ENVIRONMENT.PRODUCTION, namespace).getInstance();
    });

    beforeEach(() => {
    });

    describe('#transferModerator', () => {
        it('Should transfer successfully from a dedicated moderator to a killed player', () => {
            const personToTransferTo = new Person('1', '123', 'Joe', USER_TYPES.KILLED_PLAYER);
            personToTransferTo.out = true;
            const moderator = new Person('3', '789', 'Jack', USER_TYPES.MODERATOR);
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [personToTransferTo, new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
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
            const personToTransferTo = new Person('1', '123', 'Joe', USER_TYPES.SPECTATOR);
            const moderator = new Person('3', '789', 'Jack', USER_TYPES.MODERATOR);
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
                [],
                false,
                moderator
            );
            game.spectators.push(personToTransferTo);
            gameManager.transferModeratorPowers(game, personToTransferTo, namespace, logger);

            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(moderator.userType).toEqual(USER_TYPES.SPECTATOR);
        });

        it('Should transfer successfully from a temporary moderator to a killed player', () => {
            const personToTransferTo = new Person('1', '123', 'Joe', USER_TYPES.KILLED_PLAYER);
            personToTransferTo.out = true;
            const tempMod = new Person('3', '789', 'Jack', USER_TYPES.TEMPORARY_MODERATOR);
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [personToTransferTo, tempMod, new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
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
            const tempMod = new Person('3', '789', 'Jack', USER_TYPES.TEMPORARY_MODERATOR);
            const personToTransferTo = tempMod;
            tempMod.out = true;
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [personToTransferTo, tempMod, new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
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

    describe('#killPlayer', () => {
        it('Should mark a player as out and broadcast it, and should not transfer moderators if the moderator is a dedicated mod.', () => {
            spyOn(namespace.in(), 'emit');
            spyOn(gameManager, 'transferModeratorPowers');
            const player = new Person('1', '123', 'Joe', USER_TYPES.PLAYER);
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [player],
                [],
                false,
                new Person('2', '456', 'Jane', USER_TYPES.MODERATOR)
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
            const tempMod = new Person('1', '123', 'Joe', USER_TYPES.TEMPORARY_MODERATOR);
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [tempMod],
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

    describe('#handleRequestForGameState', () => {
        it('should send the game state to a matching person with an active connection to the room', () => {
            const player = new Person('1', '123', 'Joe', USER_TYPES.PLAYER);
            const socket = { id: 'socket1' };
            spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson');
            player.socketId = 'socket1';
            const gameRunner = {
                activeGames: {
                    abc: new Game(
                        'abc',
                        globals.STATUS.IN_PROGRESS,
                        [player],
                        [],
                        false,
                        new Person('2', '456', 'Jane', USER_TYPES.MODERATOR)
                    )
                }
            };
            spyOn(namespace.in(), 'emit');
            gameManager.handleRequestForGameState(
                namespace,
                logger,
                gameRunner,
                'abc',
                '123',
                (arg) => {},
                socket
            );

            expect(GameStateCurator.getGameStateFromPerspectiveOfPerson)
                .toHaveBeenCalledWith(gameRunner.activeGames.abc, player, gameRunner, socket, logger);
        });

        it('should send the game state to a matching person who reset their connection', () => {
            const player = new Person('1', '123', 'Joe', USER_TYPES.PLAYER);
            const socket = { id: 'socket_222222', join: () => {} };
            spyOn(socket, 'join');
            spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson');
            player.socketId = 'socket_111111';
            const gameRunner = {
                activeGames: {
                    abc: new Game(
                        'abc',
                        globals.STATUS.IN_PROGRESS,
                        [player],
                        [],
                        false,
                        new Person('2', '456', 'Jane', USER_TYPES.MODERATOR)
                    )
                }
            };
            spyOn(namespace.in(), 'emit');
            gameManager.handleRequestForGameState(
                namespace,
                logger,
                gameRunner,
                'abc',
                '123',
                (arg) => {},
                socket
            );

            expect(GameStateCurator.getGameStateFromPerspectiveOfPerson)
                .toHaveBeenCalledWith(gameRunner.activeGames.abc, player, gameRunner, socket, logger);
            expect(player.socketId).toEqual(socket.id);
            expect(socket.join).toHaveBeenCalled();
        });
    });

    describe('#joinGame', () => {
        it('should mark the game as full when all players have been assigned', () => {
            const person = new Person('1', '123', 'Placeholder', USER_TYPES.KILLED_PLAYER);
            const moderator = new Person('3', '789', 'Jack', USER_TYPES.MODERATOR);
            moderator.assigned = true;
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [person],
                [],
                false,
                moderator
            );

            gameManager.joinGame(game, 'Jill', 'x');

            expect(game.isFull).toEqual(true);
            expect(game.people[0].name).toEqual('Jill');
            expect(game.people[0].assigned).toEqual(true);
        });

        it('should create a spectator if the game is already full and broadcast it to the room', () => {
            const person = new Person('1', '123', 'AlreadyJoined', USER_TYPES.KILLED_PLAYER);
            const moderator = new Person('3', '789', 'AlreadyTheModerator', USER_TYPES.MODERATOR);
            moderator.assigned = true;
            person.assigned = true;
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [person],
                [],
                false,
                moderator
            );
            game.isFull = true;

            spyOn(gameManager.namespace.in(), 'emit');

            gameManager.joinGame(game, 'Jane', 'x');

            expect(game.isFull).toEqual(true);
            expect(game.people[0].name).toEqual('AlreadyJoined');
            expect(game.moderator.name).toEqual('AlreadyTheModerator');
            expect(game.spectators.length).toEqual(1);
            expect(game.spectators[0].name).toEqual('Jane');
            expect(game.spectators[0].userType).toEqual(USER_TYPES.SPECTATOR);
            expect(gameManager.namespace.in().emit).toHaveBeenCalledWith(globals.EVENTS.NEW_SPECTATOR, jasmine.anything());
        });
    });

    describe('#generateAccessCode', () => {
        it('should continue to generate access codes up to the max attempts when the generated code is already in use by another game', () => {
            gameManager.activeGameRunner.activeGames = {
                AAAA: {}
            };

            const accessCode = gameManager.generateAccessCode(['A']);
            expect(accessCode).toEqual(null); // we might the max generation attempts of 50.
        });

        it('should generate and return a unique access code', () => {
            gameManager.activeGameRunner.activeGames = {
                AAAA: {}
            };

            const accessCode = gameManager.generateAccessCode(['B']);
            expect(accessCode).toEqual('BBBB');
        });
    });

    describe('#restartGame', () => {
        let person1,
            person2,
            person3,
            shuffleSpy,
            game,
            moderator;

        beforeEach(() => {
            person1 = new Person('1', '123', 'Placeholder1', USER_TYPES.KILLED_PLAYER);
            person2 = new Person('2', '456', 'Placeholder2', USER_TYPES.PLAYER);
            person3 = new Person('3', '789', 'Placeholder3', USER_TYPES.PLAYER);
            moderator = new Person('4', '000', 'Jack', USER_TYPES.MODERATOR);
            person1.out = true;
            person2.revealed = true;
            moderator.assigned = true;
            shuffleSpy = spyOn(gameManager, 'shuffle').and.stub();
            game = new Game(
                'test',
                STATUS.ENDED,
                [person1, person2, person3],
                [
                    { role: 'Villager', description: 'test', team: 'good', quantity: 1 },
                    { role: 'Seer', description: 'test', team: 'good', quantity: 1 },
                    { role: 'Werewolf', description: 'test', team: 'evil', quantity: 1 }
                ],
                false,
                moderator,
                true,
                '4',
                null
            );
        });

        it('should reset all relevant game parameters', async () => {
            const emitSpy = spyOn(namespace.in(), 'emit');

            await gameManager.restartGame(game, namespace);

            expect(game.status).toEqual(STATUS.IN_PROGRESS);
            expect(game.moderator.id).toEqual('4');
            expect(game.moderator.userType).toEqual(USER_TYPES.MODERATOR);
            expect(person1.out).toEqual(false);
            expect(person2.revealed).toEqual(false);
            for (const person of game.people) {
                expect(person.gameRole).toBeDefined();
            }
            expect(shuffleSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(globals.CLIENT_COMMANDS.START_GAME);
        });

        it('should reset all relevant game parameters, including when the game has a timer', async () => {
            game.timerParams = { hours: 2, minutes: 2, paused: false };
            game.hasTimer = true;
            gameManager.activeGameRunner.timerThreads = { test: { kill: () => {} } };

            const threadKillSpy = spyOn(gameManager.activeGameRunner.timerThreads.test, 'kill');
            const runGameSpy = spyOn(gameManager.activeGameRunner, 'runGame').and.stub();
            const emitSpy = spyOn(namespace.in(), 'emit');

            await gameManager.restartGame(game, namespace);

            expect(game.status).toEqual(STATUS.IN_PROGRESS);
            expect(game.timerParams.paused).toBeTrue();
            expect(game.moderator.id).toEqual('4');
            expect(game.moderator.userType).toEqual(USER_TYPES.MODERATOR);
            expect(person1.out).toEqual(false);
            expect(person2.revealed).toEqual(false);
            for (const person of game.people) {
                expect(person.gameRole).toBeDefined();
            }
            expect(threadKillSpy).toHaveBeenCalled();
            expect(runGameSpy).toHaveBeenCalled();
            expect(Object.keys(gameManager.activeGameRunner.timerThreads).length).toEqual(0);
            expect(shuffleSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(globals.CLIENT_COMMANDS.START_GAME);
        });

        it('should reset all relevant game parameters and preserve temporary moderator', async () => {
            const emitSpy = spyOn(namespace.in(), 'emit');
            game.moderator = game.people[0];
            game.moderator.userType = USER_TYPES.TEMPORARY_MODERATOR;
            game.hasDedicatedModerator = false;

            await gameManager.restartGame(game, namespace);

            expect(game.status).toEqual(STATUS.IN_PROGRESS);
            expect(game.moderator.id).toEqual('1');
            expect(game.moderator.userType).toEqual(USER_TYPES.TEMPORARY_MODERATOR);
            expect(game.moderator.gameRole).toBeDefined();
            expect(person1.out).toEqual(false);
            expect(person2.revealed).toEqual(false);
            for (const person of game.people) {
                expect(person.gameRole).toBeDefined();
            }
            expect(shuffleSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(globals.CLIENT_COMMANDS.START_GAME);
        });

        it('should reset all relevant game parameters and restore a temporary moderator from a dedicated moderator', async () => {
            const emitSpy = spyOn(namespace.in(), 'emit');
            game.moderator = game.people[0];
            game.moderator.userType = USER_TYPES.MODERATOR;
            game.hasDedicatedModerator = false;

            await gameManager.restartGame(game, namespace);

            expect(game.status).toEqual(STATUS.IN_PROGRESS);
            expect(game.moderator.id).toEqual('1');
            expect(game.moderator.userType).toEqual(USER_TYPES.TEMPORARY_MODERATOR);
            expect(game.moderator.gameRole).toBeDefined();
            expect(person1.out).toEqual(false);
            expect(person2.revealed).toEqual(false);
            for (const person of game.people) {
                expect(person.gameRole).toBeDefined();
            }
            expect(shuffleSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(globals.CLIENT_COMMANDS.START_GAME);
        });

        it('should reset all relevant game parameters and create a temporary mod if a dedicated mod transferred to a killed player', async () => {
            const emitSpy = spyOn(namespace.in(), 'emit');
            game.moderator = game.people[0];
            game.moderator.userType = USER_TYPES.MODERATOR;
            game.hasDedicatedModerator = true;

            await gameManager.restartGame(game, namespace);

            expect(game.status).toEqual(STATUS.IN_PROGRESS);
            expect(game.moderator.id).toEqual('1');
            expect(game.moderator.userType).toEqual(USER_TYPES.TEMPORARY_MODERATOR);
            expect(game.moderator.gameRole).toBeDefined();
            expect(person1.out).toEqual(false);
            expect(person2.revealed).toEqual(false);
            for (const person of game.people) {
                expect(person.gameRole).toBeDefined();
            }
            expect(shuffleSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(globals.CLIENT_COMMANDS.START_GAME);
        });
    });
});
