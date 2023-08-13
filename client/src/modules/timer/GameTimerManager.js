import { EVENT_IDS, SOCKET_EVENTS, USER_TYPES, TIMER_EVENTS, PRIMITIVES } from '../../config/globals.js';
import { Confirmation } from '../front_end_components/Confirmation.js';
import { SharedStateUtil } from '../game_state/states/shared/SharedStateUtil.js';

export class GameTimerManager {
    constructor (stateBucket, socket) {
        this.stateBucket = stateBucket;
        this.playListener = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                socket.emit(SOCKET_EVENTS.IN_GAME_MESSAGE, EVENT_IDS.RESUME_TIMER, this.stateBucket.currentGameState.accessCode);
            }
        };
        this.pauseListener = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                socket.emit(SOCKET_EVENTS.IN_GAME_MESSAGE, EVENT_IDS.PAUSE_TIMER, this.stateBucket.currentGameState.accessCode);
            }
        };
    }

    resumeGameTimer (totalTime, tickRate, soundManager, timerWorker) {
        if (window.Worker) {
            if (
                this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
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
                ? SharedStateUtil.returnHumanReadableTime(totalTime, true)
                : SharedStateUtil.returnHumanReadableTime(totalTime);
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
                this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
                || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
            ) {
                this.swapToPlayButton();
            }

            timerWorker.postMessage('stop');
            populateTimerElement(timeRemaining);
        }
    }

    displayPausedTime (time) {
        if (
            this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR
            || this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
        ) {
            this.swapToPlayButton();
        }

        populateTimerElement(time);
    }

    displayExpiredTime () {
        if (this.stateBucket.currentGameState.client.userType === USER_TYPES.TEMPORARY_MODERATOR
            || this.stateBucket.currentGameState.client.userType === USER_TYPES.MODERATOR) {
            const currentBtn = document.querySelector('#timer-container-moderator #play-pause img');
            if (currentBtn) {
                currentBtn.removeEventListener('click', this.pauseListener);
                currentBtn.removeEventListener('keyup', this.pauseListener);
                currentBtn.removeEventListener('click', this.playListener);
                currentBtn.removeEventListener('keyup', this.playListener);
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
        timer.innerText = SharedStateUtil.returnHumanReadableTime(0, true);
    }

    attachTimerSocketListeners (socket, timerWorker) {
        TIMER_EVENTS().forEach(e => socket.removeAllListeners(e));

        socket.on(EVENT_IDS.PAUSE_TIMER, (timeRemaining) => {
            this.pauseGameTimer(timerWorker, timeRemaining);
        });

        socket.on(EVENT_IDS.RESUME_TIMER, (timeRemaining) => {
            this.resumeGameTimer(timeRemaining, PRIMITIVES.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
        });

        socket.once(EVENT_IDS.GET_TIME_REMAINING, (timeRemaining, paused) => {
            if (paused) {
                this.displayPausedTime(timeRemaining);
            } else if (timeRemaining === 0) {
                this.displayExpiredTime();
            } else {
                this.resumeGameTimer(timeRemaining, PRIMITIVES.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
            }
        });

        socket.on(EVENT_IDS.END_TIMER, () => {
            Confirmation('The timer has expired!');
        });
    }

    swapToPlayButton () {
        const currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.pauseListener);
            currentBtn.removeEventListener('keyup', this.pauseListener);
            currentBtn.remove();
        }

        const playBtn = document.createElement('img');
        playBtn.setAttribute('src', '../images/play-button.svg');
        playBtn.setAttribute('alt', 'play button');
        playBtn.setAttribute('tabindex', '0');
        playBtn.addEventListener('click', this.playListener);
        playBtn.addEventListener('keyup', this.playListener);
        document.querySelector('#play-pause-placeholder')?.remove();
        document.getElementById('play-pause').appendChild(playBtn);
    }

    swapToPauseButton () {
        const currentBtn = document.querySelector('#play-pause img');
        if (currentBtn) {
            currentBtn.removeEventListener('click', this.playListener);
            currentBtn.removeEventListener('keyup', this.playListener);
            currentBtn.remove();
        }

        const pauseBtn = document.createElement('img');
        pauseBtn.setAttribute('src', '../images/pause-button.svg');
        pauseBtn.setAttribute('tabindex', '0');
        pauseBtn.addEventListener('click', this.pauseListener);
        pauseBtn.addEventListener('keyup', this.pauseListener);
        document.querySelector('#play-pause-placeholder')?.remove();
        document.getElementById('play-pause').appendChild(pauseBtn);
    }
}

function populateTimerElement (timeRemaining) {
    const timer = document.getElementById('game-timer');
    if (timeRemaining < 60000) {
        timer.innerText = SharedStateUtil.returnHumanReadableTime(timeRemaining, true);
        timer.classList.add('paused-low');
        timer.classList.add('low');
    } else {
        timer.innerText = SharedStateUtil.returnHumanReadableTime(timeRemaining);
        timer.classList.add('paused');
    }
}
