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
        const mockSocket = {
            eventHandlers: {},
            on: function (message, handler) {
                console.log('REGISTERED MOCK SOCKET HANDLER: ' + message);
                this.eventHandlers[message] = handler;
            },
            emit: function (eventName, ...args) {
                switch (args[0]) { // eventName is currently always "inGameMessage" - the first arg after that is the specific message type
                    case globals.EVENT_IDS.FETCH_GAME_STATE:
                        args[args.length - 1](mockGames.gameInLobby);
                }
            },
            hasListeners: function (listener) {
                return false;
            }
        };

        beforeAll(async () => {
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

    describe('in-progress game', () => {
        const mockSocket = {
            eventHandlers: {},
            on: function (message, handler) {
                console.log('REGISTERED MOCK SOCKET HANDLER: ' + message);
                this.eventHandlers[message] = handler;
            },
            emit: function (eventName, ...args) {
                switch (args[0]) { // eventName is currently always "inGameMessage" - the first arg after that is the specific message type
                    case globals.EVENT_IDS.FETCH_GAME_STATE:
                        args[args.length - 1](mockGames.inProgressGame);
                        break;
                    default:
                        break;
                }
            },
            hasListeners: function (listener) {
                return false;
            }
        };

        beforeAll(async () => {
            await gameHandler(mockSocket, XHRUtility, { location: { href: 'host/game/ABCD' } }, gameTemplate);
            mockSocket.eventHandlers.connect();
            mockSocket.eventHandlers.getTimeRemaining(120000, true);
        });

        it('should display the game role of the client', () => {
            expect(document.getElementById('role-name').innerText).toEqual('Parity Hunter');
            expect(document.getElementById('role-image').getAttribute('src')).toEqual('../images/roles/ParityHunter.png');
            expect(document.getElementById('game-timer').innerText).toEqual('00:02:00');
            expect(document.getElementById('game-timer').classList.contains('paused')).toEqual(true);
            expect(document.getElementById('players-alive-label').innerText).toEqual('Players: 4 / 5 Alive');
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
            expect(document.getElementById('players-alive-label').innerText).toEqual('Players: 4 / 5 Alive');
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
});
