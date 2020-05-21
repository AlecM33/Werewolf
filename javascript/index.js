let gameModeSelect = false;

window.onload = function() {
    document.getElementById("create-game").addEventListener("click", toggleGameModeSelect);
    document.getElementById("game-mode-back").addEventListener("click", toggleGameModeSelect)
};

function toggleGameModeSelect() {
    gameModeSelect = !gameModeSelect;
    let mainButtons = document.getElementById("main-buttons");
    let gameModes = document.getElementById("game-mode-select");
    if (gameModeSelect) {
        mainButtons.classList.remove("slide-in");
        mainButtons.offsetWidth;
        mainButtons.classList.add("slide-out");
        mainButtons.addEventListener("animationend", function() { mainButtons.style.display = "none" }, {capture: true, once: true});

        gameModes.style.display = "flex";
    } else {
        gameModes.style.display = "none";

        mainButtons.style.display = "flex";
        mainButtons.classList.remove("slide-out");
        mainButtons.offsetWidth;
        mainButtons.classList.add("slide-in");
    }
}
