import { gameHandler } from '../../client/src/modules/page_handlers/gameHandler.js';
import { mockGames } from '../support/MockGames.js';
import gameTemplate from '../../client/src/view_templates/GameTemplate.js';
import { globals } from '../../client/src/config/globals.js';

describe('game page', () => {
    const XHRUtility = {
        xhr (url, method = 'GET', headers, body = null) {
            switch (url) {
                case '/api/games/environment':
                    return new Promise((resolve, reject) => {
                        resolve({ content: 'production' });
                    });
            }
        }
    };

    describe('lobby game', () => {
        let mockSocket;

        beforeEach(async function () {
            document.body.innerHTML = '';
            mockSocket = {
                eventHandlers: {},
                on: function (message, handler) {
                    this.eventHandlers[message] = handler;
                },
                once: function (message, handler) {
                    this.eventHandlers[message] = handler;
                },
                timeout: (duration) => {
                    return mockSocket;
                },
                emit: function (eventName, ...args) {
                    switch (args[0]) { // eventName is currently always "inGameMessage" - the first arg after that is the specific message type
                        case globals.EVENT_IDS.FETCH_GAME_STATE:
                            args[args.length - 1](deepCopy(mockGames.gameInLobby)); // copy the game object to prevent leaking of state between specs
                    }
                },
                removeAllListeners: function (...names) {

                },
                hasListeners: function (listener) {
                    return false;
                }
            };
            await gameHandler(mockSocket, XHRUtility, { location: { href: 'host/game/ABCD' } }, gameTemplate);
            mockSocket.eventHandlers.connect();
        });

        it('should display the connected client', () => {
            expect(document.getElementById('client-name').innerText).toEqual('Alec');
            expect(document.getElementById('client-user-type').innerText).toEqual('moderator \uD83D\uDC51');
        });

        it('should display the QR Code', () => {
            expect(document.getElementById('canvas').innerText).not.toBeNull();
        });

        it('should display a new player when they join', () => {
            mockSocket.eventHandlers[globals.EVENT_IDS.PLAYER_JOINED]({
                name: 'Jane',
                id: '123',
                userType: globals.USER_TYPES.PLAYER,
                out: false,
                revealed: false
            }, false);
            expect(document.querySelectorAll('.lobby-player').length).toEqual(2);
            expect(document.getElementById('current-info-message').innerText).toEqual('Jane joined!');
        });

        it('should activate the start button for the moderator when the game is full', () => {
            expect(document.getElementById('start-game-button').classList.contains('disabled')).toBeTrue();
            mockSocket.eventHandlers[globals.EVENT_IDS.PLAYER_JOINED]({
                name: 'Jack',
                id: '456',
                userType: globals.USER_TYPES.PLAYER,
                out: false,
                revealed: false
            }, true);
            expect(document.getElementById('start-game-button').classList.contains('disabled')).toBeFalse();
        });

        afterAll(() => {
            document.body.innerHTML = '';
        });
    });

    describe('in-progress game - player view', () => {
        let mockSocket;

        beforeEach(async () => {
            document.body.innerHTML = '';
            mockSocket = {
                eventHandlers: {},
                on: function (message, handler) {
                    this.eventHandlers[message] = handler;
                },
                timeout: (duration) => {
                    return mockSocket;
                },
                emit: function (eventName, ...args) {
                    switch (args[0]) { // eventName is currently always "inGameMessage" - the first arg after that is the specific message type
                        case globals.EVENT_IDS.FETCH_GAME_STATE:
                            args[args.length - 1](deepCopy(mockGames.inProgressGame)); // copy the game object to prevent leaking of state between specs
                            break;
                        default:
                            break;
                    }
                },
                hasListeners: function (listener) {
                    return false;
                },
                removeAllListeners: function (...names) {

                },
                once: function (message, handler) {
                    this.eventHandlers[message] = handler;
                }
            };
            await gameHandler(mockSocket, XHRUtility, { location: { href: 'host/game/ABCD' } }, gameTemplate);
            mockSocket.eventHandlers.connect();
            mockSocket.eventHandlers.getTimeRemaining(120000, true);
        });

        it('should display the game role of the client', () => {
            expect(document.getElementById('role-name').innerText).toEqual('Villager');
            expect(document.getElementById('role-image').getAttribute('src')).toContain('../images/roles/Villager');
            expect(document.getElementById('game-timer').innerText).toEqual('00:02:00');
            expect(document.getElementById('game-timer').classList.contains('paused')).toEqual(true);
            expect(document.getElementById('players-alive-label').innerText).toEqual('Players: 6 / 7 Alive');
        });

        it('should flip the role card of the client', () => {
            const clickEvent = document.createEvent('MouseEvents');
            clickEvent.initEvent('dblclick', true, true);
            document.getElementById('game-role-back').dispatchEvent(clickEvent);

            expect(document.getElementById('game-role').style.display).toEqual('flex');
            expect(document.getElementById('game-role-back').style.display).toEqual('none');
        });

        it('should display the timer', () => {
            expect(document.getElementById('game-timer').innerText).toEqual('00:02:00');
            expect(document.getElementById('game-timer').classList.contains('paused')).toEqual(true);
        });

        it('should display the number of alive players', () => {
            expect(document.getElementById('players-alive-label').innerText).toEqual('Players: 6 / 7 Alive');
        });

        it('should display the role info modal when the button is clicked', () => {
            document.getElementById('role-info-button').click();
            expect(document.getElementById('role-info-modal').style.display).toEqual('flex');
        });

        it('should NOT display the ability to play/pause the timer when the client is NOT a moderator', () => {
            expect(document.getElementById('play-pause')).toBeNull();
        });

        afterAll(() => {
            document.body.innerHTML = '';
        });
    });

    describe('in-progress game - moderator view', () => {
        let mockSocket;

        beforeEach(async () => {
            document.body.innerHTML = '';
            mockSocket = {
                eventHandlers: {},
                on: function (message, handler) {
                    this.eventHandlers[message] = handler;
                },
                timeout: (duration) => {
                    return mockSocket;
                },
                once: function (message, handler) {
                    this.eventHandlers[message] = handler;
                },
                emit: function (eventName, ...args) {
                    switch (args[0]) { // eventName is currently always "inGameMessage" - the first arg after that is the specific message type
                        case globals.EVENT_IDS.FETCH_GAME_STATE:
                            args[args.length - 1](deepCopy(mockGames.moderatorGame)); // copy the game object to prevent leaking of state between specs
                            break;
                        case globals.EVENT_IDS.END_GAME:
                            args[args.length - 1]();
                            break;
                        default:
                            break;
                    }
                },
                hasListeners: function (listener) {
                    return false;
                },
                removeAllListeners: function (...names) {

                }
            };
            await gameHandler(mockSocket, XHRUtility, { location: { href: 'host/game/ABCD' } }, gameTemplate);
            mockSocket.eventHandlers.connect();
            mockSocket.eventHandlers.getTimeRemaining(120000, true);
            spyOn(mockSocket, 'emit');
        });

        it('should display the button to play/pause the timer', () => {
            expect(document.getElementById('play-pause')).not.toBeNull();
        });

        it('should intially have the play button displayed', () => {
            expect(document.getElementById('play-pause').firstElementChild.getAttribute('src')).toEqual('../images/play-button.svg');
        });

        it('should display players by their alignment', () => {
            expect(document.querySelector('.evil-players')).not.toBeNull();
            expect(document.querySelector('.good-players')).not.toBeNull();
            expect(document.querySelector('div[data-pointer="v2eOvaYKusGfiUpuZWTCJ0JUiESC29OuH6fpivwMuwcqizpYTCAzetrPl7fF8F5CoR35pTMIKxh"]')
                .querySelector('.game-player-role').innerText).toEqual('Werewolf');
        });

        it('should display the mod transfer button', () => {
            expect(document.getElementById('mod-transfer-button')).not.toBeNull();
        });

        it('should display the mod transfer modal, with the single spectator available for selection', () => {
            document.getElementById('mod-transfer-button').click();
            expect(document.querySelector('div[data-pointer="BKfs1N0cfvwc309eOdwrTeum8NScSX7S8CTCGXgiI6JZufjAgD4WAdkkryn3sqIqKeswCFpIuTc"].potential-moderator')
                .innerText).toContain('Stav');
            document.getElementById('close-mod-transfer-modal-button').click();
        });

        it('should emit the appropriate socket event when killing a player, and indicate the result on the UI', () => {
            document.querySelector('div[data-pointer="pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW"]')
                .querySelector('.kill-player-button').click();
            document.getElementById('confirmation-yes-button').click();
            expect(mockSocket.emit).toHaveBeenCalledWith(
                globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                globals.EVENT_IDS.KILL_PLAYER,
                mockGames.moderatorGame.accessCode,
                { personId: 'pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW' }
            );
            mockSocket.eventHandlers.killPlayer('pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW');
            expect(document.querySelector('div[data-pointer="pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW"].game-player.killed')
            ).not.toBeNull();
        });

        it('should emit the appropriate socket event when revealing a player, and indicate the result on the UI', () => {
            document.querySelector('div[data-pointer="pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW"]')
                .querySelector('.reveal-role-button').click();
            document.getElementById('confirmation-yes-button').click();
            expect(mockSocket.emit).toHaveBeenCalledWith(
                globals.SOCKET_EVENTS.IN_GAME_MESSAGE,
                globals.EVENT_IDS.REVEAL_PLAYER,
                mockGames.moderatorGame.accessCode,
                { personId: 'pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW' }
            );
            mockSocket.eventHandlers.revealPlayer({ id: 'pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW', gameRole: 'Werewolf', alignment: 'evil' });
            expect(document.querySelector('div[data-pointer="pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW"]')
                .querySelector('.reveal-role-button')).toBeNull();
        });

        it('should emit the event to end the game, and display the result in the UI', () => {
            document.getElementById('end-game-button').click();
            document.getElementById('confirmation-yes-button').click();
            expect(mockSocket.emit).toHaveBeenCalled();
            mockSocket.eventHandlers.endGame([
                {
                    name: 'Greg',
                    id: 'HVB3SK3XPGNSP34W2GVD5G3SP',
                    userType: 'player',
                    gameRole: 'Seer',
                    gameRoleDescription: 'Each night, learn if a chosen person is a Werewolf.',
                    alignment: 'good',
                    out: false,
                    revealed: true
                },
                {
                    name: 'Lys',
                    id: 'XJNHYX85HCKYDQLKYN584CRKK',
                    userType: 'player',
                    gameRole: 'Sorceress',
                    gameRoleDescription: 'Each night, learn if a chosen person is the Seer.',
                    alignment: 'evil',
                    out: false,
                    revealed: true
                },
                {
                    name: 'Colette',
                    id: 'MLTP5M76K6NN83VQBDTNC6ZP5',
                    userType: 'player',
                    gameRole: 'Parity Hunter',
                    gameRoleDescription: 'You beat a werewolf in a 1v1 situation, winning the game for the village.',
                    alignment: 'good',
                    out: false,
                    revealed: true
                },
                {
                    name: 'Hannah',
                    id: 'FCVSGJFYWLDL5S3Y8B74ZVZLZ',
                    userType: 'killed',
                    gameRole: 'Werewolf',
                    gameRoleDescription: "During the night, choose a villager to kill. Don't get killed.",
                    alignment: 'evil',
                    out: true,
                    revealed: true
                },
                {
                    name: 'Andrea',
                    id: 'VWLJ298FVTZR22R4TNCMRTB5B',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    revealed: true
                }
            ]);
            expect(document.getElementById('end-of-game-header')).not.toBeNull();
            expect(document.getElementById('restart-game-button')).not.toBeNull();
        });

        afterAll(() => {
            document.body.innerHTML = '';
        });
    });
});

function deepCopy (object) {
    return JSON.parse(JSON.stringify(object));
}
