class Person {
    constructor(id, name, userType, gameRole=null, gameRoleDescription=null, assigned=false) {
        this.id = id;
        this.socketId = null;
        this.name = name;
        this.userType = userType;
        this.gameRole = gameRole;
        this.gameRoleDescription = gameRoleDescription;
        this.assigned = assigned;
        this.out = false;
    }
}

module.exports = Person;
