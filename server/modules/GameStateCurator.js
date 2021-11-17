const globals = require("../config/globals")

const GameStateCurator = {
    getGameStateFromPerspectiveOfPerson: (game, person) => {
        return getGameStateBasedOnPermissions(game, person);
    }
}

function getGameStateBasedOnPermissions(game, person) {
    let client = game.status === globals.STATUS.LOBBY // people won't be able to know their role until past the lobby stage.
        ? { name: person.name, id: person.id }
        : {
            name: person.name,
            id: person.id,
            gameRole: person.gameRole,
            roleDescription: person.roleDescription
        }
    switch (person.userType) {
        case globals.USER_TYPES.PLAYER:
            return {
                status: game.status,
                moderator: mapPerson(game.moderator),
                userType: globals.USER_TYPES.PLAYER,
                client: client,
                deck: game.deck,
                people: game.people
                    .filter((person) => {
                        return person.assigned === true && person.id !== client.id && person.userType !== globals.USER_TYPES.MODERATOR
                    })
                    .map((filteredPerson) => ({ name: filteredPerson.name, userType: filteredPerson.userType })),
                timerParams: game.timerParams,
                isFull: game.isFull
            }
        case globals.USER_TYPES.MODERATOR:
            return {
                status: game.status,
                moderator: mapPerson(game.moderator),
                userType: globals.USER_TYPES.MODERATOR,
                client: client,
                deck: game.deck,
                people: mapPeopleForModerator(game.people, client),
                timerParams: game.timerParams,
                isFull: game.isFull
            }
        case globals.USER_TYPES.TEMPORARY_MODERATOR:
            return {
                status: game.status,
                moderator: mapPerson(game.moderator),
                userType: globals.USER_TYPES.TEMPORARY_MODERATOR,
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
            return person.assigned === true && person.id !== client.id
        })
        .map((person) => ({
        name: person.name,
        gameRole: person.gameRole,
        gameRoleDescription: person.gameRoleDescription
    }));
}

function mapPeopleForTempModerator(people, client) {
    return people
        .filter((person) => {
            return person.assigned === true && person.id !== client.id
        })
        .map((person) => ({
            name: person.name,
        }));
}

function mapPerson(person) {
    return { name: person.name };
}

module.exports = GameStateCurator;
