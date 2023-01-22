import { globals } from '../../config/globals.js';
import { Confirmation } from '../front_end_components/Confirmation.js';

export class GameTimerManager {
    constructor (stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.playListener = () => {
            socket.emit(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, globals.EVENT_IDS.RESUME_TIMER, this.stateBucket.currentGameState.accessCode);
        };
        this.pauseListener = () => {
            socket.emit(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, globals.EVENT_IDS.PAUSE_TIMER, this.stateBucket.currentGameState.accessCode);
        };
    }

    resumeGameTimer (totalTime, tickRate, soundManager, timerWorker) {
        if (window.Worker) {
            if (
                this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            ) {
                this.swapToPauseButton();
            }
            const instance = this;
            const timer = document.getElementById('game-timer');
            timer.classList.remove('paused');
            timer.classList.remove('paused-low');
            timer.classList.remove('low');
            if (totalTime < 60000) {
                timer.classList.add('low');
            }
            timer.innerText = totalTime < 60000
                ? returnHumanReadableTime(totalTime, true)
                : returnHumanReadableTime(totalTime);
            timerWorker.onmessage = function (e) {
                if (e.data.hasOwnProperty('timeRemainingInMilliseconds') && e.data.timeRemainingInMilliseconds >= 0) {
                    if (e.data.timeRemainingInMilliseconds === 0) {
                        instance.displayExpiredTime();
                    } else if (e.data.timeRemainingInMilliseconds < 60000) {
                        timer.classList.add('low');
                        timer.innerText = e.data.displayTime;
                    } else {
                        timer.innerText = e.data.displayTime;
                    }
                }
            };
            timerWorker.postMessage({ totalTime: totalTime, tickInterval: tickRate });
        }
    }

    pauseGameTimer (timerWorker, timeRemaining) {
        if (window.Worker) {
            if (
                this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            ) {
                this.swapToPlayButton();
            }

            timerWorker.postMessage('stop');
            const timer = document.getElementById('game-timer');
            if (timeRemaining < 60000) {
                timer.innerText = returnHumanReadableTime(timeRemaining, true);
                timer.classList.add('paused-low');
                timer.classList.add('low');
            } else {
                timer.innerText = returnHumanReadableTime(timeRemaining);
                timer.classList.add('paused');
            }
        }
    }

    displayPausedTime (time) {
        if (
            this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR
            || this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        ) {
            this.swapToPlayButton();
        }

        const timer = document.getElementById('game-timer');
        if (time < 60000) {
            timer.innerText = returnHumanReadableTime(time, true);
            timer.classList.add('paused-low');
            timer.classList.add('low');
        } else {
            timer.innerText = returnHumanReadableTime(time);
            timer.classList.add('paused');
        }
    }

    displayExpiredTime () {
        if (this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            || this.stateBucket.currentGameState.client.userType === globals.USER_TYPES.MODERATOR) {
            const currentBtn = document.querySelector('#timer-container-moderator #play-pause img');
            if (currentBtn) {
                currentBtn.removeEventListener('click', this.pauseListener);
                currentBtn.removeEventListener('click', this.playListener);
                currentBtn.classList.add('disabled');
                currentBtn.setAttribute('src', '/images/play-pause-placeholder.svg');
            } else {
                document.querySelector('#play-pause-placeholder')?.remove();
                const placeholderBtn = document.createElement('img');
                placeholderBtn.setAttribute('src', '../images/play-pause-placeholder.svg');
                placeholderBtn.classList.add('disabled');
                document.getElementById('play-pause').appendChild(placeholderBtn);
            }
        }

        const timer = document.getElementById('game-timer');
        timer.innerText = returnHumanReadableTime(0, true);
    }

    attachTimerSocketListeners (socket, timerWorker) {
        globals.TIMER_EVENTS().forEach(e => socket.removeAllListeners(e));

        socket.on(globals.COMMANDS.PAUSE_TIMER, (timeRemaining) => {
            this.pauseGameTimer(timerWorker, timeRemaining);
        });

        socket.on(globals.COMMANDS.RESUME_TIMER, (timeRemaining) => {
            this.resumeGameTimer(timeRemaining, globals.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
        });

        socket.once(globals.COMMANDS.GET_TIME_REMAINING, (timeRemaining, paused) => {
            if (paused) {
                this.displayPausedTime(timeRemaining);
            } else if (timeRemaining === 0) {
                this.displayExpiredTime();
            } else {
                this.resumeGameTimer(timeRemaining, globals.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
            }
        });

        socket.on(globals.COMMANDS.END_TIMER, () => {
            Confirmation('The timer has expired!');
        });
    }

    swapToPlayButton () {
        const currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.pauseListener);
            currentBtn.remove();
        }

        const playBtn = document.createElement('img');
        playBtn.setAttribute('src', '../images/play-button.svg');
        playBtn.addEventListener('click', this.playListener);
        document.querySelector('#play-pause-placeholder')?.remove();
        document.getElementById('play-pause').appendChild(playBtn);
    }

    swapToPauseButton () {
        const currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.playListener);
            currentBtn.remove();
        }

        const pauseBtn = document.createElement('img');
        pauseBtn.setAttribute('src', '../images/pause-button.svg');
        pauseBtn.addEventListener('click', this.pauseListener);
        document.querySelector('#play-pause-placeholder')?.remove();
        document.getElementById('play-pause').appendChild(pauseBtn);
    }
}

function returnHumanReadableTime (milliseconds, tenthsOfSeconds = false) {
    const tenths = Math.floor((milliseconds / 100) % 10);
    let seconds = Math.floor((milliseconds / 1000) % 60);
    let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    return tenthsOfSeconds
        ? hours + ':' + minutes + ':' + seconds + '.' + tenths
        : hours + ':' + minutes + ':' + seconds;
}
