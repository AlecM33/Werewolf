// TODO: clean up these deep relative paths? jsconfig.json is not working...
const LOG_LEVEL = require('../../../../server/config/globals.js').LOG_LEVEL;
const ServerTimer = require('../../../../server/modules/ServerTimer.js');
const logger = require('../../../../server/modules/Logger.js')(LOG_LEVEL.DEBUG);

describe('ServerTimer', () => {
    let serverTimer;

    it('should run a timer for the specified time', async () => {
        serverTimer = new ServerTimer(0, 0.001, 10, logger);
        spyOn(global, 'clearTimeout');
        await serverTimer.runTimer(false).then(() => {
            expect(serverTimer.currentTimeInMillis).toBeLessThanOrEqual(0);
            expect(clearTimeout).toHaveBeenCalledWith(serverTimer.ticking);
        }).catch((e) => {
            fail(e);
        });
    });

    it('should stop the timer', () => {
        serverTimer = new ServerTimer(1, 0, 10, logger);
        spyOn(global, 'clearTimeout');
        serverTimer.runTimer(false).then(() => {
            serverTimer.stopTimer();
            expect(clearTimeout).toHaveBeenCalledWith(serverTimer.ticking);
        }).catch((e) => {
            fail(e);
        });
    });

    it('should stop and resume the timer', async () => {
        serverTimer = new ServerTimer(0, 1, 10, logger);
        spyOn(global, 'clearTimeout');
        serverTimer.runTimer(false).then(() => {
            fail();
        }).catch((e) => {
            fail(e);
        });

        await new Promise(function (resolve) {
            setTimeout(function () {
                serverTimer.stopTimer();
                const timeRemainingWhenStopped = serverTimer.currentTimeInMillis;
                serverTimer.resumeTimer();

                expect(clearTimeout).toHaveBeenCalledTimes(1);
                expect(serverTimer.totalTime).toEqual(timeRemainingWhenStopped);

                serverTimer.stopTimer();
                resolve();
            }, 50);
        });
    });
});
