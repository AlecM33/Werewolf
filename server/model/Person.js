// noinspection DuplicatedCode
const globals = require('../config/globals');

class Person {
    constructor (id, cookie, name, userType, gameRole = null, gameRoleDescription = null, alignment = null, assigned = false) {
        this.id = id;
        this.cookie = cookie;
        this.socketId = null;
        this.name = name;
        this.userType = userType;
        this.gameRole = gameRole;
        this.gameRoleDescription = gameRoleDescription;
        this.alignment = alignment;
        this.assigned = assigned;
        this.out = userType === globals.USER_TYPES.MODERATOR || userType === globals.USER_TYPES.SPECTATOR;
        this.killed = false;
        this.revealed = false;
        this.hasEnteredName = false;
    }
}

module.exports = Person;
