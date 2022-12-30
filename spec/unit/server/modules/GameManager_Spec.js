// TODO: clean up these deep relative paths? jsconfig.json is not working...
const Game = require('../../../../server/model/Game');
const globals = require('../../../../server/config/globals');
const USER_TYPES = globals.USER_TYPES;
const STATUS = globals.STATUS;
const Person = require('../../../../server/model/Person');
const GameManager = require('../../../../server/modules/GameManager.js');
const GameStateCurator = require('../../../../server/modules/GameStateCurator.js');
const ActiveGameRunner = require('../../../../server/modules/ActiveGameRunner.js');
const logger = require('../../../../server/modules/Logger.js')(false);

describe('GameManager', () => {
    let gameManager, namespace, socket;

    beforeAll(() => {
        spyOn(logger, 'debug');
        spyOn(logger, 'error');

        const inObj = { emit: () => {} };
        namespace = { in: () => { return inObj; }, to: () => { return inObj; } };
        socket = { id: '123', emit: () => {}, to: () => { return { emit: () => {} }; } };
        gameManager = new GameManager(logger, globals.ENVIRONMENT.PRODUCTION, new ActiveGameRunner(logger));
        gameManager.setGameSocketNamespace(namespace);
    });

    beforeEach(() => {
        spyOn(namespace, 'to').and.callThrough();
        spyOn(socket, 'to').and.callThrough();
    });

    describe('#transferModerator', () => {
        it('Should transfer successfully from a dedicated moderator to a killed player', () => {
            const personToTransferTo = new Person('1', '123', 'Joe', USER_TYPES.KILLED_PLAYER);
            personToTransferTo.socketId = 'socket1';
            personToTransferTo.out = true;
            const moderator = new Person('3', '789', 'Jack', USER_TYPES.MODERATOR);
            moderator.socketId = 'socket2';
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [personToTransferTo, new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
                [],
                false,
                moderator,
                true,
                moderator.id,
                new Date().toJSON()
            );
            gameManager.transferModeratorPowers(socket, game, personToTransferTo, namespace, logger);

            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(moderator.userType).toEqual(USER_TYPES.SPECTATOR);
            expect(namespace.to).toHaveBeenCalledWith(personToTransferTo.socketId);
            expect(namespace.to).toHaveBeenCalledWith(game.moderator.socketId);
        });

        it('Should transfer successfully from a dedicated moderator to a spectator', () => {
            const personToTransferTo = new Person('1', '123', 'Joe', USER_TYPES.SPECTATOR);
            personToTransferTo.socketId = 'socket1';
            const moderator = new Person('3', '789', 'Jack', USER_TYPES.MODERATOR);
            moderator.socketId = 'socket2';
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
                [],
                false,
                moderator,
                true,
                moderator.id,
                new Date().toJSON()
            );
            game.spectators.push(personToTransferTo);
            gameManager.transferModeratorPowers(socket, game, personToTransferTo, namespace, logger);

            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(moderator.userType).toEqual(USER_TYPES.SPECTATOR);
            expect(namespace.to).toHaveBeenCalledWith(personToTransferTo.socketId);
            expect(namespace.to).toHaveBeenCalledWith(game.moderator.socketId);
        });

        it('Should transfer successfully from a temporary moderator to a killed player', () => {
            const personToTransferTo = new Person('1', '123', 'Joe', USER_TYPES.KILLED_PLAYER);
            personToTransferTo.out = true;
            personToTransferTo.socketId = 'socket1';
            const tempMod = new Person('3', '789', 'Jack', USER_TYPES.TEMPORARY_MODERATOR);
            tempMod.socketId = 'socket2';
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [personToTransferTo, tempMod, new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
                [],
                false,
                tempMod,
                false,
                tempMod.id,
                new Date().toJSON()
            );
            gameManager.transferModeratorPowers(socket, game, personToTransferTo, namespace, logger);

            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(tempMod.userType).toEqual(USER_TYPES.PLAYER);
            expect(namespace.to).toHaveBeenCalledWith(personToTransferTo.socketId);
            expect(namespace.to).toHaveBeenCalledWith(game.moderator.socketId);
        });

        it('Should make the temporary moderator a dedicated moderator when they take themselves out of the game', () => {
            const tempMod = new Person('3', '789', 'Jack', USER_TYPES.TEMPORARY_MODERATOR);
            tempMod.socketId = 'socket1';
            const personToTransferTo = tempMod;
            tempMod.out = true;
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [personToTransferTo, tempMod, new Person('2', '456', 'Jane', USER_TYPES.PLAYER)],
                [],
                false,
                tempMod,
                true,
                tempMod.id,
                new Date().toJSON()
            );
            gameManager.transferModeratorPowers(socket, game, personToTransferTo, namespace, logger);

            expect(game.moderator).toEqual(personToTransferTo);
            expect(personToTransferTo.userType).toEqual(USER_TYPES.MODERATOR);
            expect(tempMod.userType).toEqual(USER_TYPES.MODERATOR);
            expect(namespace.to).toHaveBeenCalledOnceWith(personToTransferTo.socketId);
            expect(socket.to).toHaveBeenCalledWith(game.accessCode);
        });
    });

    describe('#killPlayer', () => {
        it('Should mark a player as out and broadcast it, and should not transfer moderators if the moderator is a dedicated mod.', () => {
            spyOn(namespace.in(), 'emit');
            spyOn(gameManager, 'transferModeratorPowers');
            const player = new Person('1', '123', 'Joe', USER_TYPES.PLAYER);
            const mod = new Person('2', '456', 'Jane', USER_TYPES.MODERATOR);
            const game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [player],
                [],
                false,
                mod,
                true,
                mod.id,
                new Date().toJSON()
            );
            gameManager.killPlayer(socket, game, player, namespace, logger);

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
                tempMod,
                true,
                tempMod.id,
                new Date().toJSON()
            );
            gameManager.killPlayer(socket, game, tempMod, namespace, logger);

            expect(tempMod.out).toEqual(true);
            expect(tempMod.userType).toEqual(USER_TYPES.TEMPORARY_MODERATOR);
            expect(namespace.in().emit).not.toHaveBeenCalled();
            expect(gameManager.transferModeratorPowers).toHaveBeenCalled();
        });
    });

    describe('#handleRequestForGameState', () => {
        let gameRunner, mod, player;

        beforeEach(() => {
            mod = new Person('2', '456', 'Jane', USER_TYPES.MODERATOR);
            player = new Person('1', '123', 'Joe', USER_TYPES.PLAYER);
            gameRunner = {
                activeGames: new Map([
                    ['abc', new Game(
                        'abc',
                        globals.STATUS.IN_PROGRESS,
                        [player],
                        [],
                        false,
                        mod,
                        true,
                        mod.id,
                        new Date().toJSON())
                    ]
                ])
            };
        });

        it('should send the game state to a matching person with an active connection to the room', () => {
            const socket = { id: 'socket1' };
            spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson');
            player.socketId = 'socket1';
            spyOn(namespace.in(), 'emit');
            gameManager.handleRequestForGameState(
                gameRunner.activeGames.get('abc'),
                namespace,
                logger,
                gameRunner,
                'abc',
                '123',
                (arg) => {},
                socket
            );

            expect(GameStateCurator.getGameStateFromPerspectiveOfPerson)
                .toHaveBeenCalledWith(gameRunner.activeGames.get('abc'), player);
        });

        it('should send the game state to a matching person who reset their connection', () => {
            const socket = { id: 'socket_222222', join: () => {} };
            spyOn(socket, 'join');
            spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson');
            player.socketId = 'socket_111111';
            spyOn(namespace.in(), 'emit');
            gameManager.handleRequestForGameState(
                gameRunner.activeGames.get('abc'),
                namespace,
                logger,
                gameRunner,
                'abc',
                '123',
                (arg) => {},
                socket
            );

            expect(GameStateCurator.getGameStateFromPerspectiveOfPerson)
                .toHaveBeenCalledWith(gameRunner.activeGames.get('abc'), player);
            expect(player.socketId).toEqual(socket.id);
            expect(socket.join).toHaveBeenCalled();
        });
    });

    describe('#joinGame', () => {
        let game, person, moderator;

        beforeEach(() => {
            person = new Person('1', '123', 'Placeholder', USER_TYPES.KILLED_PLAYER);
            moderator = new Person('3', '789', 'Jack', USER_TYPES.MODERATOR);
            game = new Game(
                'abc',
                globals.STATUS.IN_PROGRESS,
                [person],
                [],
                false,
                moderator,
                true,
                moderator.id,
                new Date().toJSON()
            );
        });

        it('should mark the game as full when all players have been assigned', () => {
            moderator.assigned = true;

            gameManager.joinGame(game, 'Jill', 'x');

            expect(game.isFull).toEqual(true);
            expect(game.people[0].name).toEqual('Jill');
            expect(game.people[0].assigned).toEqual(true);
        });

        it('should create a spectator if the game is already full and broadcast it to the room', () => {
            moderator.assigned = true;
            person.assigned = true;
            game.isFull = true;
            spyOn(gameManager.namespace.in(), 'emit');

            gameManager.joinGame(game, 'Jane', 'x');

            expect(game.isFull).toEqual(true);
            expect(game.people[0].name).toEqual('Placeholder');
            expect(game.moderator.name).toEqual('Jack');
            expect(game.spectators.length).toEqual(1);
            expect(game.spectators[0].name).toEqual('Jane');
            expect(game.spectators[0].userType).toEqual(USER_TYPES.SPECTATOR);
            expect(gameManager.namespace.in().emit).toHaveBeenCalledWith(globals.EVENTS.UPDATE_SPECTATORS, jasmine.anything());
        });
    });

    describe('#generateAccessCode', () => {
        it('should continue to generate access codes up to the max attempts when the generated code is already in use by another game', () => {
            gameManager.activeGameRunner.activeGames = new Map([['AAAA', {}]]);

            const accessCode = gameManager.generateAccessCode(['A']);
            expect(accessCode).toEqual(null); // we might the max generation attempts of 50.
        });

        it('should generate and return a unique access code', () => {
            gameManager.activeGameRunner.activeGames = new Map([['AAAA', {}]]);

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
            expect(emitSpy).toHaveBeenCalledWith(globals.EVENT_IDS.RESTART_GAME);
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
            expect(emitSpy).toHaveBeenCalledWith(globals.EVENT_IDS.RESTART_GAME);
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
            expect(emitSpy).toHaveBeenCalledWith(globals.EVENT_IDS.RESTART_GAME);
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
            expect(emitSpy).toHaveBeenCalledWith(globals.EVENT_IDS.RESTART_GAME);
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
            expect(emitSpy).toHaveBeenCalledWith(globals.EVENT_IDS.RESTART_GAME);
        });
    });

    describe('#pruneStaleGames', () => {
        it('delete a game if it was created more than 24 hours ago', () => {
            const moreThan24HoursAgo = new Date();
            moreThan24HoursAgo.setDate(moreThan24HoursAgo.getDate() - 1);
            moreThan24HoursAgo.setHours(moreThan24HoursAgo.getHours() - 1);
            gameManager.activeGameRunner.activeGames = new Map([['AAAA', { createTime: moreThan24HoursAgo.toJSON() }]]);

            gameManager.pruneStaleGames();

            expect(gameManager.activeGameRunner.activeGames.size).toEqual(0);
        });

        it('should not delete a game if it was not created more than 24 hours ago', () => {
            const lessThan24HoursAgo = new Date();
            lessThan24HoursAgo.setHours(lessThan24HoursAgo.getHours() - 23);
            gameManager.activeGameRunner.activeGames = new Map([['AAAA', { createTime: lessThan24HoursAgo.toJSON() }]]);

            gameManager.pruneStaleGames();

            expect(gameManager.activeGameRunner.activeGames.size).toEqual(1);
        });
    });
});
