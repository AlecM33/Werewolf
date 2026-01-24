const GameStateCurator = require('./GameStateCurator');
const GameCreationRequest = require('../model/GameCreationRequest');
const { EVENT_IDS, STATUS, USER_TYPES, GAME_PROCESS_COMMANDS, REDIS_CHANNELS, PRIMITIVES } = require('../config/globals');

const Events = [
    {
        id: EVENT_IDS.PLAYER_JOINED,
        stateChange: async (game, socketArgs, vars) => {
            game.people.push(socketArgs);
            game.isStartable = vars.gameManager.isGameStartable(game);
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                EVENT_IDS.PLAYER_JOINED,
                GameStateCurator.mapPerson(socketArgs),
                game.isStartable
            );
        }
    },
    {
        id: EVENT_IDS.KICK_PERSON,
        stateChange: async (game, socketArgs, vars) => {
            const toBeClearedIndex = game.people.findIndex(
                (person) => person.id === socketArgs.personId && person.assigned === true
            );
            if (toBeClearedIndex >= 0) {
                game.people.splice(toBeClearedIndex, 1);
                game.isStartable = vars.gameManager.isGameStartable(game);
            }
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                EVENT_IDS.KICK_PERSON,
                socketArgs.personId,
                game.isStartable
            );
        }
    },
    {
        id: EVENT_IDS.LEAVE_ROOM,
        stateChange: async (game, socketArgs, vars) => {
            const toBeClearedIndex = game.people.findIndex(
                (person) => person.id === socketArgs.personId && person.assigned === true
            );
            if (toBeClearedIndex >= 0) {
                game.people.splice(toBeClearedIndex, 1);
                game.isStartable = vars.gameManager.isGameStartable(game);
            }
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(
                EVENT_IDS.LEAVE_ROOM,
                socketArgs.personId,
                game.isStartable
            );
        }
    },
    {
        id: EVENT_IDS.CHANGE_NAME,
        stateChange: async (game, socketArgs, vars) => {
            const toChangeIndex = game.people.findIndex(
                (person) => person.id === socketArgs.personId
            );
            if (toChangeIndex >= 0) {
                if (vars.gameManager.isNameTaken(game, socketArgs.newName)) {
                    vars.hasNameChanged = false;
                    if (game.people[toChangeIndex].name.toLowerCase().trim() === socketArgs.newName.toLowerCase().trim()) {
                        return;
                    }
                    vars.ackFn({ errorFlag: 1, message: 'This name is taken.' });
                } else if (socketArgs.newName.length > PRIMITIVES.MAX_PERSON_NAME_LENGTH) {
                    vars.ackFn({ errorFlag: 1, message: 'Your new name is too long - the max is ' + PRIMITIVES.MAX_PERSON_NAME_LENGTH + ' characters.' });
                    vars.hasNameChanged = false;
                } else if (socketArgs.newName.length === 0) {
                    vars.ackFn({ errorFlag: 1, message: 'Your new name cannot be empty.' });
                    vars.hasNameChanged = false;
                } else {
                    game.people[toChangeIndex].name = socketArgs.newName;
                    vars.ackFn({ errorFlag: 0, message: 'Name updated!' });
                    vars.hasNameChanged = true;
                }
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.hasNameChanged) {
                vars.gameManager.namespace.in(game.accessCode).emit(
                    EVENT_IDS.CHANGE_NAME,
                    socketArgs.personId,
                    socketArgs.newName
                );
            }
        }
    },
    {
        id: EVENT_IDS.UPDATE_GAME_ROLES,
        stateChange: async (game, socketArgs, vars) => {
            if (GameCreationRequest.deckIsValid(socketArgs.deck)) {
                game.deck = socketArgs.deck;
                game.gameSize = socketArgs.deck.reduce(
                    (accumulator, currentValue) => accumulator + currentValue.quantity,
                    0
                );
                game.isStartable = vars.gameManager.isGameStartable(game);
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(
                EVENT_IDS.UPDATE_GAME_ROLES,
                game.deck,
                game.gameSize,
                game.isStartable
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
                EVENT_IDS.ADD_SPECTATOR,
                GameStateCurator.mapPerson(socketArgs)
            );
        }
    },
    {
        id: EVENT_IDS.FETCH_GAME_STATE,
        stateChange: async (game, socketArgs, vars) => {
            const matchingPerson = vars.gameManager.findPersonByField(game, 'cookie', socketArgs.personId);
            if (matchingPerson && matchingPerson.socketId !== vars.requestingSocketId) {
                matchingPerson.socketId = vars.requestingSocketId;
                vars.gameManager.namespace.sockets.get(vars.requestingSocketId)?.join(game.accessCode);
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
                vars.gameManager.namespace.to(matchingPerson.socketId).emit(EVENT_IDS.SYNC_GAME_STATE);
            }
        }
    },
    {
        id: EVENT_IDS.START_GAME,
        stateChange: async (game, socketArgs, vars) => {
            if (game.isStartable) {
                game.status = STATUS.IN_PROGRESS;
                vars.gameManager.deal(game);
                if (game.hasTimer) {
                    game.timerParams.paused = true;
                    await vars.gameManager.runTimer(game);
                }
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(EVENT_IDS.START_GAME);
        }
    },
    {
        id: EVENT_IDS.KILL_PLAYER,
        stateChange: async (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person && !person.out) {
                person.userType = person.userType === USER_TYPES.BOT
                    ? USER_TYPES.KILLED_BOT
                    : USER_TYPES.KILLED_PLAYER;
                person.out = true;
                person.killed = true;
            }
        },
        communicate: async (game, socketArgs, vars) => {
            const person = game.people.find((person) => person.id === socketArgs.personId);
            if (person) {
                vars.gameManager.namespace.in(game.accessCode).emit(EVENT_IDS.KILL_PLAYER, person);
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
                    EVENT_IDS.REVEAL_PLAYER,
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
            game.status = STATUS.ENDED;
            if (game.hasTimer && vars.gameManager.timers[game.accessCode]) {
                vars.logger.trace('STOPPING TIMER FOR ENDED GAME ' + game.accessCode);
                vars.gameManager.timers[game.accessCode].stopTimer();
                delete vars.gameManager.timers[game.accessCode];
            }
            for (const person of game.people) {
                person.revealed = true;
            }
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode)
                .emit(EVENT_IDS.END_GAME, GameStateCurator.mapPeopleForModerator(game.people));
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
                    currentModerator.userType = USER_TYPES.KILLED_PLAYER;
                } else {
                    currentModerator.userType = USER_TYPES.SPECTATOR;
                }
                game.previousModeratorId = currentModerator.id;
            }
            if (toTransferTo) {
                toTransferTo.userType = USER_TYPES.MODERATOR;
                game.currentModeratorId = toTransferTo.id;
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.to(game.accessCode).emit(EVENT_IDS.SYNC_GAME_STATE);
        }
    },
    {
        id: EVENT_IDS.ASSIGN_DEDICATED_MOD,
        stateChange: async (game, socketArgs, vars) => {
            const currentModerator = vars.gameManager.findPersonByField(game, 'id', game.currentModeratorId);
            const toTransferTo = vars.gameManager.findPersonByField(game, 'id', socketArgs.personId);
            if (currentModerator && toTransferTo) {
                if (currentModerator.id !== toTransferTo.id) {
                    currentModerator.userType = USER_TYPES.PLAYER;
                }

                toTransferTo.userType = USER_TYPES.MODERATOR;
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
                vars.gameManager.namespace.to(moderator.socketId).emit(EVENT_IDS.SYNC_GAME_STATE);
                moderatorSocket.to(game.accessCode).emit(EVENT_IDS.KILL_PLAYER, moderator);
            } else {
                vars.gameManager.namespace.in(game.accessCode).emit(EVENT_IDS.KILL_PLAYER, moderator);
            }
            const previousModerator = vars.gameManager.findPersonByField(game, 'id', game.previousModeratorId);
            if (previousModerator && previousModerator.id !== moderator.id && vars.gameManager.namespace.sockets.get(previousModerator.socketId)) {
                vars.gameManager.namespace.to(previousModerator.socketId).emit(EVENT_IDS.SYNC_GAME_STATE);
            }
        }
    },
    {
        id: EVENT_IDS.RESTART_GAME,
        stateChange: async (game, socketArgs, vars) => {
            if (vars.instanceId !== vars.senderInstanceId
                && vars.gameManager.timers[game.accessCode]
            ) {
                vars.gameManager.timers[game.accessCode].stopTimer();
                delete vars.gameManager.timers[game.accessCode];
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(EVENT_IDS.RESTART_GAME);
        }
    },
    {
        id: EVENT_IDS.TIMER_EVENT,
        stateChange: async (game, socketArgs, vars) => {},
        communicate: async (game, socketArgs, vars) => {
            const timer = vars.gameManager.timers[game.accessCode];
            if (timer) {
                // Timer is running on this instance, handle the request directly
                switch (vars.timerEventSubtype) {
                    case GAME_PROCESS_COMMANDS.PAUSE_TIMER:
                        const pauseTimeRemaining = await vars.gameManager.pauseTimer(game);
                        if (pauseTimeRemaining !== null) {
                            // Trigger PAUSE_TIMER event to update state and notify clients
                            await vars.eventManager.handleEventById(
                                EVENT_IDS.PAUSE_TIMER,
                                null,
                                game,
                                null,
                                game.accessCode,
                                { timeRemaining: pauseTimeRemaining },
                                null,
                                false
                            );
                            await vars.gameManager.refreshGame(game);
                            await vars.eventManager.publisher.publish(
                                REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                                vars.eventManager.createMessageToPublish(
                                    game.accessCode,
                                    EVENT_IDS.PAUSE_TIMER,
                                    vars.instanceId,
                                    JSON.stringify({ timeRemaining: pauseTimeRemaining })
                                )
                            );
                        }
                        break;
                    case GAME_PROCESS_COMMANDS.RESUME_TIMER:
                        const resumeTimeRemaining = await vars.gameManager.resumeTimer(game);
                        if (resumeTimeRemaining !== null) {
                            // Trigger RESUME_TIMER event to update state and notify clients
                            await vars.eventManager.handleEventById(
                                EVENT_IDS.RESUME_TIMER,
                                null,
                                game,
                                null,
                                game.accessCode,
                                { timeRemaining: resumeTimeRemaining },
                                null,
                                false
                            );
                            await vars.gameManager.refreshGame(game);
                            await vars.eventManager.publisher.publish(
                                REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                                vars.eventManager.createMessageToPublish(
                                    game.accessCode,
                                    EVENT_IDS.RESUME_TIMER,
                                    vars.instanceId,
                                    JSON.stringify({ timeRemaining: resumeTimeRemaining })
                                )
                            );
                        }
                        break;
                    case GAME_PROCESS_COMMANDS.GET_TIME_REMAINING:
                        await vars.gameManager.getTimeRemaining(game, vars.requestingSocketId);
                        break;
                }
            } else { // we need to consult another container for the timer data
                await vars.eventManager.publisher?.publish(
                    REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    vars.eventManager.createMessageToPublish(
                        game.accessCode,
                        EVENT_IDS.SOURCE_TIMER_EVENT,
                        vars.instanceId,
                        JSON.stringify({ socketId: vars.requestingSocketId, timerEventSubtype: vars.timerEventSubtype })
                    )
                );
            }
        }
    },
    {
        /* This event is a request from another instance to consult its timer data. In response
        * to this event, this instance will check if it is home to a particular timer. */
        id: EVENT_IDS.SOURCE_TIMER_EVENT,
        stateChange: async (game, socketArgs, vars) => {},
        communicate: async (game, socketArgs, vars) => {
            const timer = vars.gameManager.timers[game.accessCode];
            if (timer) {
                // Timer is running on this instance, handle the request
                switch (socketArgs.timerEventSubtype) {
                    case GAME_PROCESS_COMMANDS.PAUSE_TIMER:
                        const pauseTimeRemaining = await vars.gameManager.pauseTimer(game);
                        if (pauseTimeRemaining !== null) {
                            await vars.eventManager.handleEventById(
                                EVENT_IDS.PAUSE_TIMER,
                                null,
                                game,
                                null,
                                game.accessCode,
                                { timeRemaining: pauseTimeRemaining },
                                null,
                                false
                            );
                            await vars.gameManager.refreshGame(game);
                            await vars.eventManager.publisher.publish(
                                REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                                vars.eventManager.createMessageToPublish(
                                    game.accessCode,
                                    EVENT_IDS.PAUSE_TIMER,
                                    vars.instanceId,
                                    JSON.stringify({ timeRemaining: pauseTimeRemaining })
                                )
                            );
                        }
                        break;
                    case GAME_PROCESS_COMMANDS.RESUME_TIMER:
                        const resumeTimeRemaining = await vars.gameManager.resumeTimer(game);
                        if (resumeTimeRemaining !== null) {
                            await vars.eventManager.handleEventById(
                                EVENT_IDS.RESUME_TIMER,
                                null,
                                game,
                                null,
                                game.accessCode,
                                { timeRemaining: resumeTimeRemaining },
                                null,
                                false
                            );
                            await vars.gameManager.refreshGame(game);
                            await vars.eventManager.publisher.publish(
                                REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                                vars.eventManager.createMessageToPublish(
                                    game.accessCode,
                                    EVENT_IDS.RESUME_TIMER,
                                    vars.instanceId,
                                    JSON.stringify({ timeRemaining: resumeTimeRemaining })
                                )
                            );
                        }
                        break;
                    case GAME_PROCESS_COMMANDS.GET_TIME_REMAINING:
                        await vars.gameManager.getTimeRemaining(game, socketArgs.socketId);
                        break;
                }
            } else {
                // Timer not running here, publish stored timer state
                await vars.eventManager.publisher.publish(
                    REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    vars.eventManager.createMessageToPublish(
                        game.accessCode,
                        socketArgs.timerEventSubtype,
                        vars.instanceId,
                        JSON.stringify({
                            socketId: socketArgs.socketId,
                            timeRemaining: game.timerParams.timeRemaining,
                            paused: game.timerParams.paused
                        })
                    )
                );
            }
        }
    },
    {
        id: EVENT_IDS.UPDATE_GAME_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            if (GameCreationRequest.timerParamsAreValid(socketArgs.hasTimer, socketArgs.timerParams)) {
                game.hasTimer = socketArgs.hasTimer;
                game.timerParams = socketArgs.timerParams;
            }
        },
        communicate: async (game, socketArgs, vars) => {
            if (vars.ackFn) {
                vars.ackFn();
            }
            vars.gameManager.namespace.in(game.accessCode).emit(
                EVENT_IDS.UPDATE_GAME_TIMER,
                game.hasTimer,
                game.timerParams
            );
        }
    },
    {
        id: EVENT_IDS.END_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            game.timerParams.paused = false;
            game.timerParams.timeRemaining = 0;
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(GAME_PROCESS_COMMANDS.END_TIMER);
        }
    },
    {
        id: EVENT_IDS.PAUSE_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            game.timerParams.paused = true;
            game.timerParams.timeRemaining = socketArgs.timeRemaining;
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(GAME_PROCESS_COMMANDS.PAUSE_TIMER, socketArgs.timeRemaining);
        }
    },
    {
        id: EVENT_IDS.RESUME_TIMER,
        stateChange: async (game, socketArgs, vars) => {
            game.timerParams.paused = false;
            game.timerParams.timeRemaining = socketArgs.timeRemaining;
        },
        communicate: async (game, socketArgs, vars) => {
            vars.gameManager.namespace.in(game.accessCode).emit(GAME_PROCESS_COMMANDS.RESUME_TIMER, socketArgs.timeRemaining);
        }
    },
    {
        id: EVENT_IDS.GET_TIME_REMAINING,
        stateChange: async (game, socketArgs, vars) => {},
        communicate: async (game, socketArgs, vars) => {
            const socket = vars.gameManager.namespace.sockets.get(socketArgs.socketId);
            if (socket) {
                vars.gameManager.namespace.to(socket.id).emit(GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, socketArgs.timeRemaining, game.timerParams.paused);
            }
        }
    }
];

module.exports = Events;
