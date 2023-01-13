const globals = require('../config/globals');
const GameStateCurator = require('./GameStateCurator');
const EVENT_IDS = globals.EVENT_IDS;

const Events = [
    {
        id: EVENT_IDS.PLAYER_JOINED,
        stateChange: (game, socketArgs, vars) => {
            const toBeAssignedIndex = game.people.findIndex(
                (person) => person.id === socketArgs.id && person.assigned === false
            );
            if (toBeAssignedIndex >= 0) {
                game.people[toBeAssignedIndex] = socketArgs;
                game.isFull = vars.gameManager.isGameFull(game);
            }
        },
        communicate: (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                globals.EVENTS.PLAYER_JOINED,
                GameStateCurator.mapPerson(socketArgs),
                game.isFull
            );
        }
    },
    {
        id: EVENT_IDS.ADD_SPECTATOR,
        stateChange: (game, socketArgs, vars) => {
            game.people.push(socketArgs);
        },
        communicate: (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                globals.EVENT_IDS.ADD_SPECTATOR,
                GameStateCurator.mapPerson(socketArgs)
            );
        }
    },
    {
        id: EVENT_IDS.FETCH_GAME_STATE,
        stateChange: (game, socketArgs, vars) => {
            const matchingPerson = vars.gameManager.findPersonByField(game, 'cookie', socketArgs.personId);
            if (matchingPerson && matchingPerson.socketId !== vars.socketId) {
                matchingPerson.socketId = vars.socketId;
                vars.gameManager.namespace.sockets.get(vars.socketId)?.join(game.accessCode);
            }
        },
        communicate: (game, socketArgs, vars) => {
            if (!vars.ackFn) return;
            const matchingPerson = vars.gameManager.findPersonByField(game, 'cookie', socketArgs.personId);
            if (matchingPerson && vars.gameManager.namespace.sockets.get(matchingPerson.socketId)) {
                vars.ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
            } else {
                vars.ackFn(null);
            }
        }
    },
    // {
    //     id: EVENT_IDS.UPDATE_SOCKET,
    //     stateChange: (game, socketArgs, vars) => {
    //         const matchingPerson = vars.gameManager.findPersonByField(game, 'id', socketArgs.personId);
    //         if (matchingPerson) {
    //             matchingPerson.socketId = socketArgs.socketId;
    //         }
    //     }
    // }
    {
        id: EVENT_IDS.SYNC_GAME_STATE,
        stateChange: (game, socketArgs, vars) => {},
        communicate: (game, socketArgs, vars) => {
            const matchingPerson = vars.gameManager.findPersonByField(game, 'id', socketArgs.personId);
            if (matchingPerson && vars.gameManager.namespace.sockets.get(matchingPerson.socketId)) {
                vars.gameManager.namespace.to(matchingPerson.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
            }
        }
    },
    {
        id: EVENT_IDS.START_GAME,
        stateChange: (game, socketArgs, vars) => {
            if (game.isFull) {
                game.status = globals.STATUS.IN_PROGRESS;
                if (game.hasTimer) {
                    game.timerParams.paused = true;
                    // this.activeGameRunner.runGame(game, namespace);
                }
            }
        },
        communicate: (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.START_GAME);
        }
    },
    {
        id: EVENT_IDS.KILL_PLAYER,
        stateChange: (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person && !person.out) {
                person.userType = globals.USER_TYPES.KILLED_PLAYER;
                person.out = true;
                person.killed = true;
            }
        },
        communicate: (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person) {
                vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, person.id);
            }
        }
    },
    {
        id: EVENT_IDS.REVEAL_PLAYER,
        stateChange: (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person && !person.revealed) {
                person.revealed = true;
            }
        },
        communicate: (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person) {
                vars.gameManager.namespace.in(game.accessCode).emit(
                    globals.EVENT_IDS.REVEAL_PLAYER,
                    {
                        id: person.id,
                        gameRole: person.gameRole,
                        alignment: person.alignment
                    }
                );
            }
        }
    },
    {
        id: EVENT_IDS.END_GAME,
        stateChange: (game, socketArgs, vars) => {
            game.status = globals.STATUS.ENDED;
            // if (this.activeGameRunner.timerThreads[game.accessCode]) {
            //     this.logger.trace('KILLING TIMER PROCESS FOR ENDED GAME ' + game.accessCode);
            //     this.activeGameRunner.timerThreads[game.accessCode].kill();
            // }
            for (const person of game.people) {
                person.revealed = true;
            }
        },
        communicate: (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode)
                .emit(globals.EVENT_IDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
            if (vars.ackFn) {
                vars.ackFn();
            }
        }
    },
    {
        id: EVENT_IDS.TRANSFER_MODERATOR,
        stateChange: (game, socketArgs, vars) => {
            const currentModerator = vars.gameManager.findPersonByField(game, 'id', game.currentModeratorId);
            const toTransferTo = vars.gameManager.findPersonByField(game, 'id', socketArgs.personId);
            if (currentModerator) {
                if (currentModerator.gameRole) {
                    currentModerator.userType = globals.USER_TYPES.KILLED_PLAYER;
                } else {
                    currentModerator.userType = globals.USER_TYPES.SPECTATOR;
                }
                game.previousModeratorId = currentModerator.id;
            }
            if (toTransferTo) {
                toTransferTo.userType = globals.USER_TYPES.MODERATOR;
                game.currentModeratorId = toTransferTo.id;
            }
        },
        communicate: (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.to(game.accessCode).emit(globals.EVENT_IDS.SYNC_GAME_STATE);
        }
    },
    {
        id: EVENT_IDS.ASSIGN_DEDICATED_MOD,
        stateChange: (game, socketArgs, vars) => {
            const currentModerator = vars.gameManager.findPersonByField(game, 'id', game.currentModeratorId);
            const toTransferTo = vars.gameManager.findPersonByField(game, 'id', socketArgs.personId);
            if (currentModerator && toTransferTo) {
                if (currentModerator.id !== toTransferTo.id) {
                    currentModerator.userType = globals.USER_TYPES.PLAYER;
                }

                toTransferTo.userType = globals.USER_TYPES.MODERATOR;
                toTransferTo.out = true;
                toTransferTo.killed = true;
                game.previousModeratorId = currentModerator.id;
                game.currentModeratorId = toTransferTo.id;
            }
        },
        communicate: (game, socketArgs, vars) => {
            const moderator = vars.gameManager.findPersonByField(game, 'id', game.currentModeratorId);
            const moderatorSocket = vars.gameManager.namespace.sockets.get(moderator?.socketId);
            if (moderator && moderatorSocket) {
                vars.gameManager.namespace.to(moderator.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
                moderatorSocket.to(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, game.previousModeratorId);
            } else {
                vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, game.currentModeratorId);
            }
            const previousModerator = vars.gameManager.findPersonByField(game, 'id', game.previousModeratorId);
            if (previousModerator && previousModerator.id !== moderator.id && vars.gameManager.namespace.sockets.get(previousModerator.socketId)) {
                vars.gameManager.namespace.to(previousModerator.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
            }
        }
    },
    {
        id: EVENT_IDS.RESTART_GAME,
        stateChange: (game, socketArgs, vars) => {},
        communicate: (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.RESTART_GAME);
        }
    }
];

module.exports = Events;
