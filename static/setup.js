import {cards} from './cards.js'

class Card {
    constructor(name, team, description) {
        this.name = name;
        this.team = team;
        this.description = description;
    }
}

console.log(cards);

document.getElementById("card-select").onload = function() {
    let jsonCards = JSON.parse('')
}

function generateAccessCode() {
    let code = "";
    let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        code += charPool[getRandomInt(61)]
    }
    console.log("Access Code: " + code);
    return code;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
