import {globals} from "../config/globals.js";

export class GameTimerManager {
    constructor(gameState, socket) {
        this.gameState = gameState;
        this.playListener = () => {
            socket.emit(globals.COMMANDS.RESUME_TIMER, this.gameState.accessCode);
        }
        this.pauseListener = () => {
            socket.emit(globals.COMMANDS.PAUSE_TIMER, this.gameState.accessCode);
        }
    }

    resumeGameTimer(totalTime, tickRate, soundManager, timerWorker) {
        if (window.Worker) {
            if (
                this.gameState.client.userType === globals.USER_TYPES.MODERATOR
                || this.gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            ) {
                this.swapToPauseButton();
            }
            let instance = this;
            let timer = document.getElementById('game-timer');
            timer.classList.remove('paused');
            timer.innerText = totalTime < 60000
                ? returnHumanReadableTime(totalTime, true)
                : returnHumanReadableTime(totalTime);
            timerWorker.onmessage = function (e) {
                if (e.data.hasOwnProperty('timeRemainingInMilliseconds') && e.data.timeRemainingInMilliseconds >= 0) {
                    if (e.data.timeRemainingInMilliseconds === 0) {
                        instance.displayExpiredTime();
                    } else {
                        timer.innerText = e.data.displayTime;
                    }
                }
            };
            timerWorker.postMessage({ totalTime: totalTime, tickInterval: tickRate });
        }
    }

    pauseGameTimer(timerWorker, timeRemaining) {
        if (window.Worker) {
            if (
                this.gameState.client.userType === globals.USER_TYPES.MODERATOR
                || this.gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
            ) {
                this.swapToPlayButton();
            }

            timerWorker.postMessage('stop');
            let timer = document.getElementById('game-timer');
            timer.innerText = timeRemaining < 60000
                ? returnHumanReadableTime(timeRemaining, true)
                : returnHumanReadableTime(timeRemaining);
            timer.classList.add('paused');
        }
    }

    displayPausedTime(time) {
        if (
            this.gameState.client.userType === globals.USER_TYPES.MODERATOR
            || this.gameState.client.userType === globals.USER_TYPES.TEMPORARY_MODERATOR
        ) {
            this.swapToPlayButton();
        }

        let timer = document.getElementById('game-timer');
        timer.innerText = time < 60000
            ? returnHumanReadableTime(time, true)
            : returnHumanReadableTime(time);
        timer.classList.add('paused');
    }

    displayExpiredTime() {
        let currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.pauseListener);
            currentBtn.removeEventListener('click', this.playListener);
            currentBtn.remove();
        }

        let timer = document.getElementById('game-timer');
        timer.innerText = returnHumanReadableTime(0, true);
    }

    attachTimerSocketListeners(socket, timerWorker, gameStateRenderer) {
        if(!socket.hasListeners(globals.COMMANDS.PAUSE_TIMER)) {
            socket.on(globals.COMMANDS.PAUSE_TIMER, (timeRemaining) => {
                this.pauseGameTimer(timerWorker, timeRemaining)
            });
        }

        if(!socket.hasListeners(globals.COMMANDS.RESUME_TIMER)) {
            socket.on(globals.COMMANDS.RESUME_TIMER, (timeRemaining) => {
                this.resumeGameTimer(timeRemaining, globals.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
            });
        }

        if(!socket.hasListeners(globals.COMMANDS.GET_TIME_REMAINING)) {
            socket.on(globals.COMMANDS.GET_TIME_REMAINING, (timeRemaining, paused) => {
                console.log('received time remaining from server');
                if (paused) {
                    this.displayPausedTime(timeRemaining);
                } else if (timeRemaining === 0) {
                    this.displayExpiredTime();
                } else {
                   this.resumeGameTimer(timeRemaining, globals.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
                }
            });
        }
    }

    swapToPlayButton() {
        let currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.pauseListener);
            currentBtn.remove();
        }

        let playBtn = document.createElement('img');
        playBtn.setAttribute('src', '../images/play-button.svg');
        playBtn.addEventListener('click', this.playListener);
        document.getElementById('play-pause').appendChild(playBtn);
    }

    swapToPauseButton() {
        let currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.playListener);
            currentBtn.remove();
        }

        let pauseBtn = document.createElement('img');
        pauseBtn.setAttribute('src', '../images/pause-button.svg');
        pauseBtn.addEventListener('click', this.pauseListener);
        document.getElementById('play-pause').appendChild(pauseBtn);
    }
}

function returnHumanReadableTime(milliseconds, tenthsOfSeconds=false) {

    let tenths = Math.floor((milliseconds / 100) % 10);
    let seconds = Math.floor((milliseconds / 1000) % 60);
    let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    return tenthsOfSeconds
        ? hours + ":" + minutes + ":" + seconds + '.' + tenths
        : hours + ":" + minutes + ":" + seconds;
}
