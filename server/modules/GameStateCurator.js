const globals = require("../config/globals")

const GameStateCurator = {
    getGameStateFromPerspectiveOfPerson: (game, person, gameRunner, socket, logger) => {
        return getGameStateBasedOnPermissions(game, person, gameRunner);
    }
}

function getGameStateBasedOnPermissions(game, person, gameRunner) {
    let client = game.status === globals.STATUS.LOBBY // people won't be able to know their role until past the lobby stage.
        ? { name: person.name, cookie: person.cookie, userType: person.userType }
        : {
            name: person.name,
            cookie: person.cookie,
            userType: person.userType,
            gameRole: person.gameRole,
            gameRoleDescription: person.gameRoleDescription,
            alignment: person.alignment
        }
    switch (person.userType) {
        case globals.USER_TYPES.PLAYER:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                people: game.people
                    .filter((person) => {
                        return person.assigned === true && person.cookie !== client.cookie
                            && (person.userType !== globals.USER_TYPES.MODERATOR && person.userType !== globals.USER_TYPES.TEMPORARY_MODERATOR)
                    })
                    .map((filteredPerson) => ({ name: filteredPerson.name, userType: filteredPerson.userType })),
                timerParams: game.timerParams,
                isFull: game.isFull,
            }
        case globals.USER_TYPES.MODERATOR:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                people: mapPeopleForModerator(game.people, client),
                timerParams: game.timerParams,
                isFull: game.isFull
            }
        case globals.USER_TYPES.TEMPORARY_MODERATOR:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                people: mapPeopleForTempModerator(game.people, client),
                timerParams: game.timerParams,
                isFull: game.isFull
            }
        default:
            break;
    }
}

function mapPeopleForModerator(people, client) {
    return people
        .filter((person) => {
            return person.assigned === true && person.cookie !== client.cookie
        })
        .map((person) => ({
        name: person.name,
        id: person.id,
        userType: person.userType,
        gameRole: person.gameRole,
        gameRoleDescription: person.gameRoleDescription,
        alignment: person.alignment,
        out: person.out
    }));
}

function mapPeopleForTempModerator(people, client) {
    return people
        .filter((person) => {
            return person.assigned === true && person.cookie !== client.cookie
        })
        .map((person) => ({
            name: person.name,
            id: person.id,
            userType: person.userType,
            out: person.out
        }));
}

function mapPerson(person) {
    return { name: person.name, userType: person.userType, out: person.out };
}

module.exports = GameStateCurator;
