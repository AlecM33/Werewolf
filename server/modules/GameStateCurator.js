const globals = require('../config/globals');

/* The purpose of this component is to only return the game state information that is necessary. For example, we only
    want to return player role information to moderators. This avoids any possibility of a player having access to
    information that they shouldn't.
 */
const GameStateCurator = {
    getGameStateFromPerspectiveOfPerson: (game, person) => {
        return getGameStateBasedOnPermissions(game, person);
    },

    mapPeopleForModerator: (people) => {
        return people
            .filter((person) => {
                return person.assigned === true;
            })
            .map((person) => ({
                name: person.name,
                id: person.id,
                userType: person.userType,
                gameRole: person.gameRole,
                gameRoleDescription: person.gameRoleDescription,
                alignment: person.alignment,
                out: person.out,
                revealed: person.revealed
            }));
    },
    mapPerson: (person) => {
        if (person.revealed) {
            return {
                name: person.name,
                id: person.id,
                userType: person.userType,
                out: person.out,
                revealed: person.revealed,
                gameRole: person.gameRole,
                alignment: person.alignment
            };
        } else {
            return { name: person.name, id: person.id, userType: person.userType, out: person.out, revealed: person.revealed };
        }
    }
};

function getGameStateBasedOnPermissions (game, person) {
    const client = game.status === globals.STATUS.LOBBY // people won't be able to know their role until past the lobby stage.
        ? { name: person.name, hasEnteredName: person.hasEnteredName, id: person.id, cookie: person.cookie, userType: person.userType }
        : {
            name: person.name,
            hasEnteredName: person.hasEnteredName,
            id: person.id,
            cookie: person.cookie,
            userType: person.userType,
            gameRole: person.gameRole,
            gameRoleDescription: person.gameRoleDescription,
            customRole: person.customRole,
            alignment: person.alignment,
            out: person.out
        };
    switch (person.userType) {
        case globals.USER_TYPES.MODERATOR:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: GameStateCurator.mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                gameSize: game.gameSize,
                people: GameStateCurator.mapPeopleForModerator(game.people, client),
                timerParams: game.timerParams,
                isFull: game.isFull,
                spectators: game.spectators.map((filteredPerson) =>
                    GameStateCurator.mapPerson(filteredPerson)
                )
            };
        case globals.USER_TYPES.TEMPORARY_MODERATOR:
        case globals.USER_TYPES.SPECTATOR:
        case globals.USER_TYPES.PLAYER:
        case globals.USER_TYPES.KILLED_PLAYER:
            return {
                accessCode: game.accessCode,
                status: game.status,
                moderator: GameStateCurator.mapPerson(game.moderator),
                client: client,
                deck: game.deck,
                gameSize: game.gameSize,
                people: game.people
                    .filter((person) => {
                        return person.assigned === true;
                    })
                    .map((filteredPerson) => GameStateCurator.mapPerson(filteredPerson)),
                timerParams: game.timerParams,
                isFull: game.isFull,
                spectators: game.spectators.map((filteredPerson) =>
                    GameStateCurator.mapPerson(filteredPerson)
                )
            };
        default:
            break;
    }
}

module.exports = GameStateCurator;
