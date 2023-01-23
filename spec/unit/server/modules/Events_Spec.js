// TODO: clean up these deep relative paths? jsconfig.json is not working...
const Game = require('../../../../server/model/Game');
const globals = require('../../../../server/config/globals');
const EVENT_IDS = globals.EVENT_IDS;
const USER_TYPES = globals.USER_TYPES;
const STATUS = globals.STATUS;
const GameManager = require('../../../../server/modules/singletons/GameManager.js');
const TimerManager = require('../../../../server/modules/singletons/TimerManager.js');
const Events = require('../../../../server/modules/Events.js');
const GameStateCurator = require('../../../../server/modules/GameStateCurator.js');
const logger = require('../../../../server/modules/Logger.js')(false);

describe('Events', () => {
    let gameManager, namespace, socket, game, timerManager;

    beforeAll(() => {
        spyOn(logger, 'debug');
        spyOn(logger, 'error');
        const inObj = { emit: () => {} };
        const toObj = { emit: () => {} };
        namespace = { in: () => { return inObj; }, to: () => { return toObj; }, sockets: new Map() };
        socket = { id: '123', emit: () => {}, to: () => { return { emit: () => {} }; } };
        gameManager = GameManager.instance ? GameManager.instance : new GameManager(logger, globals.ENVIRONMENT.PRODUCTION, 'test');
        timerManager = TimerManager.instance ? TimerManager.instance : new TimerManager(logger, 'test');
        gameManager.setGameSocketNamespace(namespace);
    });

    beforeEach(() => {
        game = new Game(
            'ABCD',
            STATUS.LOBBY,
            [
                { id: 'a', assigned: true, out: true, killed: false, userType: USER_TYPES.MODERATOR },
                { id: 'b', gameRole: 'Villager', alignment: 'good', assigned: false, out: false, killed: false, userType: USER_TYPES.PLAYER },
                { id: 'c', assigned: true, out: true, killed: false, userType: USER_TYPES.SPECTATOR }
            ],
            [{ quantity: 2 }],
            false,
            'a',
            true,
            'a',
            new Date().toJSON(),
            null
        );
        spyOn(namespace, 'to').and.callThrough();
        spyOn(namespace, 'in').and.callThrough();
        spyOn(socket, 'to').and.callThrough();
        spyOn(namespace.in(), 'emit').and.callThrough();
        spyOn(namespace.to(), 'emit').and.callThrough();
        spyOn(gameManager, 'isGameFull').and.callThrough();
        spyOn(GameStateCurator, 'mapPerson').and.callThrough();
        namespace.sockets = new Map();
        timerManager.timerThreads = {};
    });

    describe(EVENT_IDS.PLAYER_JOINED, () => {
        describe('stateChange', () => {
            it('should let a player join and mark the game as full', async () => {
                await Events.find((e) => e.id === EVENT_IDS.PLAYER_JOINED)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager });
                expect(gameManager.isGameFull).toHaveBeenCalled();
                expect(game.isFull).toEqual(true);
                expect(game.people.find(p => p.id === 'b').assigned).toEqual(true);
            });
            it('should let a player join and mark the game as NOT full', async () => {
                game.people.push({ id: 'd', assigned: false, userType: USER_TYPES.PLAYER });
                await Events.find((e) => e.id === EVENT_IDS.PLAYER_JOINED)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager });
                expect(gameManager.isGameFull).toHaveBeenCalled();
                expect(game.isFull).toEqual(false);
                expect(game.people.find(p => p.id === 'b').assigned).toEqual(true);
            });
            it('should not let the player join if their id does not match some unassigned person', async () => {
                await Events.find((e) => e.id === EVENT_IDS.PLAYER_JOINED)
                    .stateChange(game, { id: 'd', assigned: true }, { gameManager: gameManager });
                expect(gameManager.isGameFull).not.toHaveBeenCalled();
                expect(game.isFull).toEqual(false);
                expect(game.people.find(p => p.id === 'd')).not.toBeDefined();
            });
        });
        describe('communicate', () => {
            it('should communicate the join event to the rooms sockets, sending the new player', async () => {
                await Events.find((e) => e.id === EVENT_IDS.PLAYER_JOINED)
                    .communicate(game, { id: 'b', assigned: true }, { gameManager: gameManager });
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(
                    globals.EVENTS.PLAYER_JOINED,
                    GameStateCurator.mapPerson({ id: 'b', assigned: true }),
                    game.isFull
                );
            });
        });
    });

    describe(EVENT_IDS.ADD_SPECTATOR, () => {
        describe('stateChange', () => {
            it('should add a spectator', async () => {
                await Events.find((e) => e.id === EVENT_IDS.ADD_SPECTATOR)
                    .stateChange(game, { id: 'e', name: 'ghost', assigned: true }, { gameManager: gameManager });
                expect(gameManager.isGameFull).not.toHaveBeenCalled();
                expect(game.isFull).toEqual(false);
                expect(game.people.find(p => p.id === 'e').assigned).toEqual(true);
                expect(game.people.find(p => p.id === 'e').name).toEqual('ghost');
            });
        });
        describe('communicate', () => {
            it('should communicate the add spectator event to the rooms sockets, sending the new spectator', async () => {
                await Events.find((e) => e.id === EVENT_IDS.ADD_SPECTATOR)
                    .communicate(game, { id: 'e', name: 'ghost', assigned: true }, { gameManager: gameManager });
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(
                    EVENT_IDS.ADD_SPECTATOR,
                    GameStateCurator.mapPerson({ id: 'e', name: 'ghost', assigned: true })
                );
            });
        });
    });

    describe(EVENT_IDS.FETCH_GAME_STATE, () => {
        describe('stateChange', () => {
            it('should find the matching person and update their associated socket id if it is different', async () => {
                const mockSocket = { join: () => {} };
                spyOn(mockSocket, 'join').and.callThrough();
                namespace.sockets.set('123', mockSocket);
                game.people.push({ cookie: 'cookie', socketId: '456' });
                await Events.find((e) => e.id === EVENT_IDS.FETCH_GAME_STATE)
                    .stateChange(game, { personId: 'cookie' }, { gameManager: gameManager, requestingSocketId: '123' });
                expect(mockSocket.join).toHaveBeenCalledWith(game.accessCode);
                expect(game.people.find(p => p.socketId === '123')).not.toBeNull();
            });
            it('should find the matching person and should NOT update their socketId if it is NOT different', async () => {
                const mockSocket = { join: () => {} };
                spyOn(mockSocket, 'join').and.callThrough();
                namespace.sockets.set('123', mockSocket);
                game.people.push({ cookie: 'cookie', socketId: '123' });
                await Events.find((e) => e.id === EVENT_IDS.FETCH_GAME_STATE)
                    .stateChange(game, { personId: 'cookie' }, { gameManager: gameManager, requestingSocketId: '123' });
                expect(mockSocket.join).not.toHaveBeenCalled();
                expect(game.people.find(p => p.socketId === '123')).not.toBeNull();
            });
        });
        describe('communicate', () => {
            it('should do nothing if the client is not expecting an acknowledgement', async () => {
                game.people.push({ cookie: 'cookie', socketId: '456' });
                const mockSocket = { join: () => {} };
                namespace.sockets.set('456', mockSocket);
                spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.FETCH_GAME_STATE)
                    .communicate(game, { personId: 'cookie' }, { ackFn: null });
                expect(GameStateCurator.getGameStateFromPerspectiveOfPerson).not.toHaveBeenCalled();
            });
            it('should acknowledge the client with null if a matching person was not found', async () => {
                game.people.push({ cookie: 'differentCookie', socketId: '456' });
                const mockSocket = { join: () => {} };
                namespace.sockets.set('456', mockSocket);
                const vars = { ackFn: () => {}, gameManager: gameManager };
                spyOn(vars, 'ackFn').and.callThrough();
                spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.FETCH_GAME_STATE)
                    .communicate(game, { personId: 'cookie' }, vars);
                expect(GameStateCurator.getGameStateFromPerspectiveOfPerson).not.toHaveBeenCalled();
                expect(vars.ackFn).toHaveBeenCalledWith(null);
            });
            it('should acknowledge the client with null if a matching person was found, but the socket is not connected' +
                ' to the namespace', async () => {
                game.people.push({ cookie: 'cookie', socketId: '456' });
                const mockSocket = { join: () => {} };
                namespace.sockets.set('123', mockSocket);
                const vars = { ackFn: () => {}, gameManager: gameManager };
                spyOn(vars, 'ackFn').and.callThrough();
                spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.FETCH_GAME_STATE)
                    .communicate(game, { personId: 'cookie' }, vars);
                expect(GameStateCurator.getGameStateFromPerspectiveOfPerson).not.toHaveBeenCalled();
                expect(vars.ackFn).toHaveBeenCalledWith(null);
            });
            it('should acknowledge the client with the game state if they are found and their socket is connected', async () => {
                game.people.push({ cookie: 'cookie', socketId: '456' });
                const mockSocket = { join: () => {} };
                namespace.sockets.set('456', mockSocket);
                const vars = { ackFn: () => {}, gameManager: gameManager };
                spyOn(vars, 'ackFn').and.callThrough();
                spyOn(GameStateCurator, 'getGameStateFromPerspectiveOfPerson').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.FETCH_GAME_STATE)
                    .communicate(game, { personId: 'cookie' }, vars);
                expect(GameStateCurator.getGameStateFromPerspectiveOfPerson).toHaveBeenCalled();
                expect(vars.ackFn).toHaveBeenCalled();
            });
        });
    });

    describe(EVENT_IDS.START_GAME, () => {
        describe('stateChange', () => {
            it('should start the game', async () => {
                game.isFull = true;
                await Events.find((e) => e.id === EVENT_IDS.START_GAME)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager });
                expect(game.status).toEqual(STATUS.IN_PROGRESS);
            });
            it('should not start the game if it is not full', async () => {
                await Events.find((e) => e.id === EVENT_IDS.START_GAME)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager });
                expect(game.status).toEqual(STATUS.LOBBY);
            });
            it('should start the game and run the timer if the game has one', async () => {
                game.isFull = true;
                game.hasTimer = true;
                game.timerParams = {};
                spyOn(timerManager, 'runTimer').and.callFake((a, b) => {});
                await Events.find((e) => e.id === EVENT_IDS.START_GAME)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager, timerManager: timerManager });
                expect(game.status).toEqual(STATUS.IN_PROGRESS);
                expect(game.timerParams.paused).toEqual(true);
                expect(timerManager.runTimer).toHaveBeenCalled();
            });
        });
        describe('communicate', () => {
            it('should communicate the start event to the room', async () => {
                await Events.find((e) => e.id === EVENT_IDS.START_GAME)
                    .communicate(game, {}, { gameManager: gameManager });
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(EVENT_IDS.START_GAME);
            });
            it('should communicate the start event to the room and acknowledge the client', async () => {
                const vars = { ackFn: () => {}, gameManager: gameManager };
                spyOn(vars, 'ackFn').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.START_GAME)
                    .communicate(game, {}, vars);
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(EVENT_IDS.START_GAME);
                expect(vars.ackFn).toHaveBeenCalled();
            });
        });
    });
    describe(EVENT_IDS.KILL_PLAYER, () => {
        describe('stateChange', () => {
            it('should kill the indicated player', async () => {
                await Events.find((e) => e.id === EVENT_IDS.KILL_PLAYER)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                const person = game.people.find(p => p.id === 'b');
                expect(person.userType).toEqual(USER_TYPES.KILLED_PLAYER);
                expect(person.out).toBeTrue();
                expect(person.killed).toBeTrue();
            });
            it('should not kill the player if they are already out', async () => {
                await Events.find((e) => e.id === EVENT_IDS.KILL_PLAYER)
                    .stateChange(game, { personId: 'a' }, { gameManager: gameManager });
                const person = game.people.find(p => p.id === 'a');
                expect(person.userType).toEqual(USER_TYPES.MODERATOR);
                expect(person.out).toBeTrue();
                expect(person.killed).toBeFalse();
            });
        });
        describe('communicate', () => {
            it('should communicate the killed player to the room', async () => {
                await Events.find((e) => e.id === EVENT_IDS.KILL_PLAYER)
                    .communicate(game, { personId: 'b' }, { gameManager: gameManager });
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(
                    EVENT_IDS.KILL_PLAYER,
                    'b'
                );
            });
        });
    });
    describe(EVENT_IDS.REVEAL_PLAYER, () => {
        describe('stateChange', () => {
            it('should reveal the indicated player', async () => {
                await Events.find((e) => e.id === EVENT_IDS.REVEAL_PLAYER)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                const person = game.people.find(p => p.id === 'b');
                expect(person.userType).toEqual(USER_TYPES.PLAYER);
                expect(person.out).toBeFalse();
                expect(person.killed).toBeFalse();
                expect(person.revealed).toBeTrue();
            });
        });
        describe('communicate', () => {
            it('should communicate the killed player to the room', async () => {
                await Events.find((e) => e.id === EVENT_IDS.REVEAL_PLAYER)
                    .communicate(game, { personId: 'b' }, { gameManager: gameManager });
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(
                    EVENT_IDS.REVEAL_PLAYER,
                    { id: 'b', gameRole: 'Villager', alignment: 'good' }
                );
            });
        });
    });
    describe(EVENT_IDS.END_GAME, () => {
        describe('stateChange', () => {
            it('should end the game and reveal all players', async () => {
                await Events.find((e) => e.id === EVENT_IDS.END_GAME)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager });
                expect(game.status).toEqual(STATUS.ENDED);
                expect(game.people.find(p => p.id === 'b').revealed).toBeTrue();
            });
            it('should end the game and kill the associated timer thread', async () => {
                game.hasTimer = true;
                timerManager.timerThreads = { ABCD: { kill: () => {} } };
                spyOn(timerManager.timerThreads.ABCD, 'kill').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.END_GAME)
                    .stateChange(game, { id: 'b', assigned: true }, { gameManager: gameManager, timerManager: timerManager, logger: { trace: () => {} } });
                expect(game.status).toEqual(STATUS.ENDED);
                expect(game.people.find(p => p.id === 'b').revealed).toBeTrue();
                expect(timerManager.timerThreads.ABCD.kill).toHaveBeenCalled();
            });
        });
        describe('communicate', () => {
            it('should communicate the end event to the room', async () => {
                await Events.find((e) => e.id === EVENT_IDS.END_GAME)
                    .communicate(game, {}, { gameManager: gameManager });
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(EVENT_IDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
            });
            it('should communicate the end event to the room and acknowledge the client', async () => {
                const vars = { ackFn: () => {}, gameManager: gameManager };
                spyOn(vars, 'ackFn').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.END_GAME)
                    .communicate(game, {}, vars);
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(EVENT_IDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
                expect(vars.ackFn).toHaveBeenCalled();
            });
        });
    });
    describe(EVENT_IDS.TRANSFER_MODERATOR, () => {
        describe('stateChange', () => {
            it('should transfer from a dedicated mod to a spectator', async () => {
                await Events.find((e) => e.id === EVENT_IDS.TRANSFER_MODERATOR)
                    .stateChange(game, { personId: 'c' }, { gameManager: gameManager });
                expect(game.currentModeratorId).toEqual('c');
                expect(game.previousModeratorId).toEqual('a');
                expect(game.people.find(p => p.id === 'a').userType).toEqual(USER_TYPES.SPECTATOR);
                expect(game.people.find(p => p.id === 'c').userType).toEqual(USER_TYPES.MODERATOR);
            });
            it('should transfer from a dedicated mod to a killed player', async () => {
                await Events.find((e) => e.id === EVENT_IDS.KILL_PLAYER)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                await Events.find((e) => e.id === EVENT_IDS.TRANSFER_MODERATOR)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                expect(game.currentModeratorId).toEqual('b');
                expect(game.previousModeratorId).toEqual('a');
                expect(game.people.find(p => p.id === 'a').userType).toEqual(USER_TYPES.SPECTATOR);
                expect(game.people.find(p => p.id === 'b').userType).toEqual(USER_TYPES.MODERATOR);
            });
            it('should transfer from a dedicated mod who was a former player, restoring their status to "killed player"', async () => {
                await Events.find((e) => e.id === EVENT_IDS.KILL_PLAYER)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                await Events.find((e) => e.id === EVENT_IDS.TRANSFER_MODERATOR)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                await Events.find((e) => e.id === EVENT_IDS.TRANSFER_MODERATOR)
                    .stateChange(game, { personId: 'a' }, { gameManager: gameManager });
                expect(game.currentModeratorId).toEqual('a');
                expect(game.previousModeratorId).toEqual('b');
                expect(game.people.find(p => p.id === 'a').userType).toEqual(USER_TYPES.MODERATOR);
                expect(game.people.find(p => p.id === 'b').userType).toEqual(USER_TYPES.KILLED_PLAYER);
            });
        });
        describe('communicate', () => {
            it('should communicate the transfer moderator event to the room', async () => {
                await Events.find((e) => e.id === EVENT_IDS.TRANSFER_MODERATOR)
                    .communicate(game, {}, { gameManager: gameManager });
                expect(namespace.to).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.to().emit).toHaveBeenCalledWith(EVENT_IDS.SYNC_GAME_STATE);
            });
            it('should communicate the transfer moderator to the room and acknowledge the client', async () => {
                const vars = { ackFn: () => {}, gameManager: gameManager };
                spyOn(vars, 'ackFn').and.callThrough();
                await Events.find((e) => e.id === EVENT_IDS.TRANSFER_MODERATOR)
                    .communicate(game, {}, vars);
                expect(namespace.to).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.to().emit).toHaveBeenCalledWith(EVENT_IDS.SYNC_GAME_STATE);
                expect(vars.ackFn).toHaveBeenCalled();
            });
        });
    });
    describe(EVENT_IDS.ASSIGN_DEDICATED_MOD, () => {
        beforeEach(() => {
            game.people = [
                { id: 'a', gameRole: 'Villager', alignment: 'good', assigned: true, out: false, killed: false, userType: USER_TYPES.TEMPORARY_MODERATOR },
                { id: 'b', gameRole: 'Villager', alignment: 'good', assigned: true, out: false, killed: false, userType: USER_TYPES.PLAYER },
                { id: 'c', assigned: true, out: true, killed: false, userType: USER_TYPES.SPECTATOR }
            ];
        });
        describe('stateChange', () => {
            it('should assign a dedicated mod who is different from the requesting temp mod', async () => {
                await Events.find((e) => e.id === EVENT_IDS.ASSIGN_DEDICATED_MOD)
                    .stateChange(game, { personId: 'b' }, { gameManager: gameManager });
                expect(game.currentModeratorId).toEqual('b');
                expect(game.previousModeratorId).toEqual('a');
                expect(game.people.find(p => p.id === 'a').userType).toEqual(USER_TYPES.PLAYER);
                expect(game.people.find(p => p.id === 'b').userType).toEqual(USER_TYPES.MODERATOR);
            });
            it('should assign a dedicated mod who is the same as the requesting temp mod', async () => {
                await Events.find((e) => e.id === EVENT_IDS.ASSIGN_DEDICATED_MOD)
                    .stateChange(game, { personId: 'a' }, { gameManager: gameManager });
                expect(game.currentModeratorId).toEqual('a');
                expect(game.previousModeratorId).toEqual('a');
                expect(game.people.find(p => p.id === 'a').userType).toEqual(USER_TYPES.MODERATOR);
                expect(game.people.find(p => p.id === 'b').userType).toEqual(USER_TYPES.PLAYER);
            });
        });
        describe('communicate', () => {
            it('should communicate to the new mod and the previous mod', async () => {
                game.currentModeratorId = 'a';
                game.previousModeratorId = 'b';
                game.people.find(p => p.id === 'a').socketId = 'aaa';
                game.people.find(p => p.id === 'b').socketId = 'bbb';
                const socketToObj = { emit: () => {} };
                const mockSocket = {
                    join: () => {},
                    to: () => {
                        return socketToObj;
                    }
                };
                spyOn(mockSocket, 'to').and.callThrough();
                spyOn(socketToObj, 'emit').and.callThrough();
                namespace.sockets.set('aaa', mockSocket);
                namespace.sockets.set('bbb', mockSocket);
                await Events.find((e) => e.id === EVENT_IDS.ASSIGN_DEDICATED_MOD)
                    .communicate(game, { personId: 'cookie' }, { gameManager: gameManager });
                // verify the current mod's view is synced
                expect(namespace.to).toHaveBeenCalledWith('aaa');
                expect(namespace.to().emit).toHaveBeenCalledWith(EVENT_IDS.SYNC_GAME_STATE);
                // verify the old mod's view is synced
                expect(namespace.to).toHaveBeenCalledWith('bbb');
                expect(namespace.to().emit).toHaveBeenCalledWith(EVENT_IDS.SYNC_GAME_STATE);
                // verify the "kill player" event is sent to everyone but the sender
                expect(mockSocket.to).toHaveBeenCalledWith(game.accessCode);
                expect(socketToObj.emit).toHaveBeenCalledWith(EVENT_IDS.KILL_PLAYER, 'a');
            });
            it('should not communicate to the current or previous mod if their sockets are not found', async () => {
                game.currentModeratorId = 'a';
                game.previousModeratorId = 'b';
                game.people.find(p => p.id === 'a').socketId = 'aaa';
                game.people.find(p => p.id === 'b').socketId = 'bbb';
                const socketToObj = { emit: () => {} };
                const mockSocket = {
                    join: () => {},
                    to: () => {
                        return socketToObj;
                    }
                };
                spyOn(mockSocket, 'to').and.callThrough();
                spyOn(socketToObj, 'emit').and.callThrough();
                namespace.sockets.set('yyy', mockSocket);
                namespace.sockets.set('zzz', mockSocket);
                await Events.find((e) => e.id === EVENT_IDS.ASSIGN_DEDICATED_MOD)
                    .communicate(game, { personId: 'cookie' }, { gameManager: gameManager });
                // verify the current mod's view is synced
                expect(namespace.to).not.toHaveBeenCalledWith('aaa');
                expect(namespace.to().emit).not.toHaveBeenCalled();
                // verify the old mod's view is synced
                expect(namespace.to).not.toHaveBeenCalledWith('bbb');
                expect(namespace.to().emit).not.toHaveBeenCalled();
                // verify the "kill player" event is sent to everyone but the sender
                expect(namespace.in).toHaveBeenCalledWith(game.accessCode);
                expect(namespace.in().emit).toHaveBeenCalledWith(EVENT_IDS.KILL_PLAYER, 'a');
            });
        });
    });
});
