const globals = require('../config/globals');
const GameStateCurator = require("./GameStateCurator");
const EVENT_IDS = globals.EVENT_IDS;

const Events = [
    {
        id: EVENT_IDS.PLAYER_JOINED,
        stateChange: (game, args, gameManager) => {
            let toBeAssignedIndex = game.people.findIndex(
                (person) => person.id === args.id && person.assigned === false
            );
            if (toBeAssignedIndex >= 0) {
                game.people[toBeAssignedIndex] = args;
                game.isFull = gameManager.isGameFull(game);
            }
        },
        communicate: (game, args, gameManager) => {
            gameManager.namespace.in(game.accessCode).emit(
                globals.EVENTS.PLAYER_JOINED,
                GameStateCurator.mapPerson(args),
                game.isFull
            );
        }
    },
    {
        id: EVENT_IDS.UPDATE_SPECTATORS,
        stateChange: (game, args, gameManager) => {
            game.spectators = args;
        },
        communicate: (game, args, gameManager) => {
            gameManager.namespace.in(game.accessCode).emit(
                globals.EVENTS.UPDATE_SPECTATORS,
                game.spectators.map((spectator) => { return GameStateCurator.mapPerson(spectator); })
            );
        }
    },
    {
        id: EVENT_IDS.FETCH_GAME_STATE,
        stateChange: (game, args, gameManager) => {
            const matchingPerson = gameManager.findPersonByField(game, 'cookie', args.personId);
            if (matchingPerson) {
                if (matchingPerson.socketId === socketId) {
                    logger.debug('matching person found with an established connection to the room: ' + matchingPerson.name);
                    if (ackFn) {
                        ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
                    }
                } else {
                    logger.debug('matching person found with a new connection to the room: ' + matchingPerson.name);
                    this.namespace.sockets.get(socketId).join(accessCode);
                    matchingPerson.socketId = socketId;
                    await this.publisher.publish(
                        globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                        game.accessCode + ';' + globals.EVENT_IDS.UPDATE_SOCKET + ';' + JSON.stringify({ personId: matchingPerson.id, socketId: socketId }) + ';' + this.instanceId
                    );
                    if (ackFn) {
                        ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
                    }
                }
            } else {
                if (ackFn) {
                    rejectClientRequestForGameState(ackFn);
                }
            }
        }
    }
];

module.exports = Events;
