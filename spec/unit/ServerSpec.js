const ServerHelper = require('../../server-helper.js');
const CronJob = require('cron').CronJob;

describe('server helper', function() {

    let serverHelper;
    
    beforeEach(function(){
        serverHelper = new ServerHelper(CronJob);
    });
    
    it('should be instantiated with a cron job', function() {
    
        expect(serverHelper.job).toBeDefined();
        expect(serverHelper.job instanceof CronJob).toBeTrue();
    
    });
    
    it('should find a specific game by code in activeGames', function() {
    
        const expectedGame = {"startTime": 12345};
        serverHelper.activeGames = {
            "somegame": {"startTime": 24156},
            "expected": expectedGame,
            "filler": {"eh": "i dunno"},
            "wrong": {"this is": -Infinity}
        };
        
        expect(serverHelper.findGame("expected")).toBe(expectedGame);
    
    });
    
    it('should create a new game', function(){
    
        const spy = jasmine.createSpy("spy");
        const game = {"accessCode": "werewolf"};
        
        serverHelper.newGame(game,spy);
    
        expect(serverHelper.findGame("werewolf")).toBeDefined();
        expect(serverHelper.findGame("werewolf").accessCode).toEqual("werewolf");
        expect(spy).toHaveBeenCalled();
    });
    
    xdescribe('should handle players joining', function() {
    
        const socket = {
            "emit": (value) => {
                return value;
            }
        };
        
        it('successful adds a player to game', function() {
        
        });
    
        it('rejects a player when the game is full', function() {
        
        });
        
        it('rejects a player when game is not found', function() {
        
        });
    });
});