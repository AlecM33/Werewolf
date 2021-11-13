import { XHRUtility } from "../modules/XHRUtility.js";
import { toast } from "../modules/Toast.js";

export const home = () => {
    document.getElementById("join-form").onsubmit = (e) => {
        e.preventDefault();
        let userCode = document.getElementById("room-code").value;
        if (roomCodeIsValid(userCode)) {
            attemptToJoinGame(userCode);
        }
    }
};

function roomCodeIsValid(code) {
    return typeof code === "string" && /^[a-z0-9]{6}$/.test(code);
}

function attemptToJoinGame(code) {
    XHRUtility.xhr(
        '/api/games/availability/' + code,
        'GET',
        null,
        null
    )
    .then((res) => {
        if (res.status === 200) {
            window.location = '/game/' + res.content;
        } else if (res.status === 404) {
            toast("Game not found", "error", true);
        } else if (res.status === 400) {
            toast(res.content, "error", true);
        } else {
            toast("An unknown error occurred. Please try again later.", "error", true);
        }
    });
}

