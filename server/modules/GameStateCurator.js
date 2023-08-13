const { USER_TYPES, STATUS } = require('../config/globals');

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
                return person.assigned === true || (person.userType === USER_TYPES.SPECTATOR || person.userType === USER_TYPES.MODERATOR);
            })
            .map((person) => ({
                name: person.name,
                id: person.id,
                userType: person.userType,
                gameRole: person.gameRole,
                gameRoleDescription: person.gameRoleDescription,
                alignment: person.alignment,
                out: person.out,
                killed: person.killed,
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
                killed: person.killed,
                revealed: person.revealed,
                gameRole: person.gameRole,
                alignment: person.alignment
            };
        } else {
            return { name: person.name, id: person.id, userType: person.userType, out: person.out, killed: person.killed, revealed: person.revealed };
        }
    }
};

function getGameStateBasedOnPermissions (game, person) {
    const client = game.status === STATUS.LOBBY // people won't be able to know their role until past the lobby stage.
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
            out: person.out,
            killed: person.killed
        };
    switch (person.userType) {
        case USER_TYPES.MODERATOR:
            return {
                accessCode: game.accessCode,
                status: game.status,
                currentModeratorId: game.currentModeratorId,
                client: client,
                deck: game.deck,
                gameSize: game.gameSize,
                people: GameStateCurator.mapPeopleForModerator(game.people, client),
                timerParams: game.timerParams,
                isStartable: game.isStartable
            };
        case USER_TYPES.TEMPORARY_MODERATOR:
        case USER_TYPES.SPECTATOR:
        case USER_TYPES.PLAYER:
        case USER_TYPES.KILLED_PLAYER:
            return {
                accessCode: game.accessCode,
                status: game.status,
                currentModeratorId: game.currentModeratorId,
                client: client,
                deck: game.deck,
                gameSize: game.gameSize,
                people: game.people
                    .filter((person) => {
                        return person.assigned === true || person.userType === USER_TYPES.SPECTATOR;
                    })
                    .map((filteredPerson) => GameStateCurator.mapPerson(filteredPerson)),
                timerParams: game.timerParams,
                isStartable: game.isStartable
            };
        default:
            break;
    }
}

module.exports = GameStateCurator;
