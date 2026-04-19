const Game = require('../../../../../server/model/Game');
const globals = require('../../../../../server/config/globals');
const USER_TYPES = globals.USER_TYPES;
const STATUS = globals.STATUS;
const EVENT_IDS = globals.EVENT_IDS;
const GameManager = require('../../../../../server/modules/singletons/GameManager.js');
const EventManager = require('../../../../../server/modules/singletons/EventManager.js');
const logger = require('../../../../../server/modules/Logger.js')(false);

describe('EventManager', () => {
    let gameManager, eventManager, namespace, game;

    beforeAll(() => {
        spyOn(logger, 'debug');
        spyOn(logger, 'error');
        spyOn(logger, 'warn');

        const inObj = { emit: () => {} };
        const toObj = { emit: () => {} };
        namespace = { in: () => { return inObj; }, to: () => { return toObj; }, sockets: new Map() };
        gameManager = GameManager.instance ? GameManager.instance : new GameManager(logger, globals.ENVIRONMENTS.PRODUCTION, 'test');
        eventManager = EventManager.instance ? EventManager.instance : new EventManager(logger, 'test');
        eventManager.publisher = { publish: async (...a) => {} };
        gameManager.eventManager = eventManager;
        eventManager.gameManager = gameManager;
        gameManager.setGameSocketNamespace(namespace);
    });

    beforeEach(() => {
        game = new Game(
            'ABCD',
            STATUS.IN_PROGRESS,
            [
                { id: 'a', name: 'ModPerson', socketId: 'socket-a', assigned: true, out: true, killed: false, userType: USER_TYPES.MODERATOR },
                { id: 'b', name: 'PlayerOne', socketId: 'socket-b', gameRole: 'Villager', alignment: 'good', assigned: true, out: false, killed: false, userType: USER_TYPES.PLAYER },
                { id: 'c', name: 'Spectator', socketId: 'socket-c', assigned: true, out: false, killed: false, userType: USER_TYPES.SPECTATOR }
            ],
            [{ quantity: 1 }, { quantity: 1 }],
            false,
            'a',
            true,
            'a',
            new Date().toJSON(),
            null
        );
        game.currentModeratorId = 'a';
        namespace.sockets = new Map();
        spyOn(namespace, 'in').and.callThrough();
        spyOn(namespace.in(), 'emit').and.callThrough();
    });

    describe('#handleEventById - authorization', () => {
        it('should block a regular player from killing when hasAllKillPermission is false', async () => {
            game.hasAllKillPermission = false;
            await eventManager.handleEventById(
                EVENT_IDS.KILL_PLAYER, null, game, 'socket-b', game.accessCode, { personId: 'b' }, null, false
            );
            const person = game.people.find(p => p.id === 'b');
            expect(person.out).toBeFalse();
            expect(person.killed).toBeFalse();
        });

        it('should allow a regular player to kill when hasAllKillPermission is true', async () => {
            game.hasAllKillPermission = true;
            await eventManager.handleEventById(
                EVENT_IDS.KILL_PLAYER, null, game, 'socket-b', game.accessCode, { personId: 'b' }, null, false
            );
            const person = game.people.find(p => p.id === 'b');
            expect(person.out).toBeTrue();
            expect(person.killed).toBeTrue();
        });

        it('should allow a moderator to kill regardless of hasAllKillPermission', async () => {
            game.hasAllKillPermission = false;
            await eventManager.handleEventById(
                EVENT_IDS.KILL_PLAYER, null, game, 'socket-a', game.accessCode, { personId: 'b' }, null, false
            );
            const person = game.people.find(p => p.id === 'b');
            expect(person.out).toBeTrue();
            expect(person.killed).toBeTrue();
        });

        it('should block a spectator from killing even when hasAllKillPermission is true', async () => {
            game.hasAllKillPermission = true;
            game.people.find(p => p.id === 'c').out = false;
            await eventManager.handleEventById(
                EVENT_IDS.KILL_PLAYER, null, game, 'socket-c', game.accessCode, { personId: 'b' }, null, false
            );
            const person = game.people.find(p => p.id === 'b');
            expect(person.out).toBeFalse();
        });

        it('should block a regular player from starting the game', async () => {
            game.status = STATUS.LOBBY;
            game.isStartable = true;
            await eventManager.handleEventById(
                EVENT_IDS.START_GAME, null, game, 'socket-b', game.accessCode, {}, null, false
            );
            expect(game.status).toEqual(STATUS.LOBBY);
        });

        it('should allow events without authorize to proceed for any user', async () => {
            await eventManager.handleEventById(
                EVENT_IDS.CHANGE_NAME, null, game, 'socket-b', game.accessCode,
                { personId: 'b', newName: 'NewName' },
                (result) => { },
                false
            );
            expect(game.people.find(p => p.id === 'b').name).toEqual('NewName');
        });
    });
});
