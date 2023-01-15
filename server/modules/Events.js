const globals = require('../config/globals');
const GameStateCurator = require('./GameStateCurator');
const EVENT_IDS = globals.EVENT_IDS;

const Events = [
    {
        id: EVENT_IDS.PLAYER_JOINED,
        stateChange: async (game, socketArgs, vars) => {
            const toBeAssignedIndex = game.people.findIndex(
                (person) => person.id === socketArgs.id && person.assigned === false
            );
            if (toBeAssignedIndex >= 0) {
                game.people[toBeAssignedIndex] = socketArgs;
                game.isFull = vars.gameManager.isGameFull(game);
            }
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                globals.EVENTS.PLAYER_JOINED,
                GameStateCurator.mapPerson(socketArgs),
                game.isFull
            );
        }
    },
    {
        id: EVENT_IDS.ADD_SPECTATOR,
        stateChange: async (game, socketArgs, vars) => {
            game.people.push(socketArgs);
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                globals.EVENT_IDS.ADD_SPECTATOR,
                GameStateCurator.mapPerson(socketArgs)
            );
        }
    },
    {
        id: EVENT_IDS.FETCH_GAME_STATE,
        stateChange: async (game, socketArgs, vars) => {
            const matchingPerson = vars.gameManager.findPersonByField(game, 'cookie', socketArgs.personId);
            if (matchingPerson && matchingPerson.socketId !== vars.socketId) {
                matchingPerson.socketId = vars.socketId;
                vars.gameManager.namespace.sockets.get(vars.socketId)?.join(game.accessCode);
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (!vars.ackFn) return;
            const matchingPerson = vars.gameManager.findPersonByField(game, 'cookie', socketArgs.personId);
            if (matchingPerson && vars.gameManager.namespace.sockets.get(matchingPerson.socketId)) {
                vars.ackFn(GameStateCurator.getGameStateFromPerspectiveOfPerson(game, matchingPerson));
            } else {
                vars.ackFn(null);
            }
        }
    },
    {
        id: EVENT_IDS.SYNC_GAME_STATE,
        stateChange: async (game, socketArgs, vars) => {},
        communicate: async (game, socketArgs, vars) => {
            const matchingPerson = vars.gameManager.findPersonByField(game, 'id', socketArgs.personId);
            if (matchingPerson && vars.gameManager.namespace.sockets.get(matchingPerson.socketId)) {
                vars.gameManager.namespace.to(matchingPerson.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
            }
        }
    },
    {
        id: EVENT_IDS.START_GAME,
        stateChange: async (game, socketArgs, vars) => {
            if (game.isFull) {
                game.status = globals.STATUS.IN_PROGRESS;
                if (game.hasTimer) {
                    game.timerParams.paused = true;
                    await vars.timerManager.runTimer(game, vars.gameManager.namespace, vars.eventManager, vars.gameManager);
                }
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.START_GAME);
        }
    },
    {
        id: EVENT_IDS.KILL_PLAYER,
        stateChange: async (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person && !person.out) {
                person.userType = globals.USER_TYPES.KILLED_PLAYER;
                person.out = true;
                person.killed = true;
            }
        },
        communicate: async (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person) {
                vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.KILL_PLAYER, person.id);
            }
        }
    },
    {
        id: EVENT_IDS.REVEAL_PLAYER,
        stateChange: async (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person && !person.revealed) {
                person.revealed = true;
            }
        },
        communicate: async (game, socketArgs, vars) => {
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
        stateChange: async (game, socketArgs, vars) => {
            game.status = globals.STATUS.ENDED;
            if (vars.timerManager.timerThreads[game.accessCode]) {
                vars.logger.trace('KILLING TIMER PROCESS FOR ENDED GAME ' + game.accessCode);
                vars.timerManager.timerThreads[game.accessCode].kill();
            }
            for (const person of game.people) {
                person.revealed = true;
            }
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode)
                .emit(globals.EVENT_IDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
            if (vars.ackFn) {
                vars.ackFn();
            }
        }
    },
    {
        id: EVENT_IDS.TRANSFER_MODERATOR,
        stateChange: async (game, socketArgs, vars) => {
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
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.to(game.accessCode).emit(globals.EVENT_IDS.SYNC_GAME_STATE);
        }
    },
    {
        id: EVENT_IDS.ASSIGN_DEDICATED_MOD,
        stateChange: async (game, socketArgs, vars) => {
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
        communicate: async (game, socketArgs, vars) => {
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
        stateChange: async (game, socketArgs, vars) => {
            if (vars.instanceId !== vars.senderInstanceId
                && vars.timerManager.timerThreads[game.accessCode]
                && !vars.timerManager.timerThreads[game.accessCode].killed
            ) {
                vars.timerManager.timerThreads[game.accessCode].kill();
                delete vars.timerManager.timerThreads[game.accessCode];
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(globals.EVENT_IDS.RESTART_GAME);
        }
    },
    {
        id: EVENT_IDS.TIMER_EVENT,
        stateChange: async (game, socketArgs, vars) => {},
        communicate: async (game, socketArgs, vars) => {
            const thread = vars.timerManager.timerThreads[game.accessCode];
            if (thread && (!thread.killed && thread.exitCode === null)) {
                thread.send({
                    command: vars.timerEventSubtype,
                    accessCode: game.accessCode,
                    socketId: vars.socketId,
                    logLevel: vars.logger.logLevel
                });
            } else if (thread) {
                if (vars.timerEventSubtype === EVENT_IDS.GET_TIME_REMAINING && game.timerParams && game.timerParams.timeRemaining === 0) {
                    // vars.gameManager.namespace.to(vars.socketId)
                    //     .emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                    // await vars.eventManager.publisher.publish(
                    //     globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    //     game.accessCode + ';' + globals.EVENT_IDS.SHARE_TIME_REMAINING + ';' +
                    //     JSON.stringify({
                    //         socketId: vars.socketId,
                    //         timeRemaining: game.timerParams.timeRemaining,
                    //         paused: game.timerParams.paused
                    //     }) +
                    //     ';' + vars.instanceId
                    // );
                }
            } else { // we need to consult another container for the timer data
                await vars.eventManager.publisher?.publish(
                    globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    game.accessCode + ';' + globals.EVENT_IDS.SOURCE_TIMER_EVENT + ';' +
                    JSON.stringify({ socketId: vars.socketId, timerEventSubtype: vars.timerEventSubtype }) + ';' + vars.instanceId
                );
            }
        }
    },
    {
        /* This event is a request from another instance to consult its timer data. In response
        * to this event, this instance will check if it is home to a particular timer thread. */
        id: EVENT_IDS.SOURCE_TIMER_EVENT,
        stateChange: async (game, socketArgs, vars) => {},
        communicate: async (game, socketArgs, vars) => {
            const thread = vars.timerManager.timerThreads[game.accessCode];
            if (thread && (!thread.killed && thread.exitCode === null)) {
                thread.send({
                    command: socketArgs.timerEventSubtype,
                    accessCode: game.accessCode,
                    socketId: socketArgs.socketId,
                    logLevel: vars.logger.logLevel
                });
            } else if (thread) {
                if (game.timerParams && game.timerParams.timeRemaining === 0) {
                    vars.gameManager.namespace.to(vars.socketId)
                        .emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                }
                await vars.eventManager.publisher.publish(
                    globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    game.accessCode + ';' + globals.EVENT_IDS.SHARE_TIME_REMAINING + ';' +
                    JSON.stringify({
                        socketId: socketArgs.socketId,
                        timeRemaining: game.timerParams.timeRemaining,
                        paused: game.timerParams.paused
                    }) +
                    ';' + vars.instanceId
                );
            }
        }
    },
    {
        id: EVENT_IDS.END_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            if (vars.timerManager.timerThreads[game.accessCode]) {
                delete vars.timerManager.timerThreads[game.accessCode];
            }
            game.timerParams.paused = false;
            game.timerParams.timeRemaining = 0;
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.END_TIMER);
        }
    },
    {
        id: EVENT_IDS.PAUSE_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            game.timerParams.paused = true;
            game.timerParams.timeRemaining = socketArgs.timeRemaining;
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER, socketArgs.timeRemaining);
        }
    },
    {
        id: EVENT_IDS.RESUME_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            game.timerParams.paused = false;
            game.timerParams.timeRemaining = socketArgs.timeRemaining;
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.RESUME_TIMER, socketArgs.timeRemaining);
        }
    },
    {
        id: EVENT_IDS.GET_TIME_REMAINING,
        stateChange: async (game, socketArgs, vars) => {
            game.timerParams.timeRemaining = socketArgs.timeRemaining;
        },
        communicate: async (game, socketArgs, vars) => {
            const socket = vars.gameManager.namespace.sockets.get(socketArgs.socketId);
            if (socket) {
                vars.gameManager.namespace.to(socket.id).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, socketArgs.timeRemaining, game.timerParams.paused);
            }
        }
    }
];

module.exports = Events;
