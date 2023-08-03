export const mockGames = {
    gameInLobby: {
        accessCode: 'TVV6',
        status: 'lobby',
        currentModeratorId: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
        client: {
            name: 'Alec',
            hasEnteredName: false,
            id: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
            cookie: '28p80dbhY2k1iP1NuEy8UPFmuOctLx3nR0EMONU4MlJFfVrCzNncdNdsav9wEuGEswLQ70DKqa3',
            userType: 'moderator'
        },
        deck: [
            {
                role: 'Villager',
                team: 'good',
                description: 'During the day, find the wolves and kill them.',
                id: '52u5w81ryq5h30qu1gri56xxq',
                quantity: 6
            },
            {
                role: 'Werewolf',
                team: 'evil',
                description: "During the night, choose a villager to kill. Don't get killed.",
                id: '9uk0jcrm1hkhygzb6iw8xh2a7',
                quantity: 1
            }
        ],
        gameSize: 7,
        people: [
            {
                name: 'Alec',
                id: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
                userType: 'moderator',
                gameRole: null,
                gameRoleDescription: null,
                alignment: null,
                out: true,
                killed: false,
                revealed: false
            }
        ],
        timerParams: {
            hours: null,
            minutes: 10,
            paused: true,
            timeRemaining: 600000
        },
        isStartable: false
    },
    inProgressGame: {
        accessCode: 'TVV6',
        status: 'in progress',
        currentModeratorId: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
        client: {
            name: 'Andrea',
            hasEnteredName: false,
            id: 'pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW',
            cookie: 'iIXXtc4BMtMSKOiDnz7sp20AE5QEIEzw7Ro2djXkZax4PQo3jR3VQGEAaD3WvaEBt06ZWgqi8s9',
            userType: 'player',
            gameRole: 'Villager',
            gameRoleDescription: 'During the day, find the wolves and kill them.',
            alignment: 'good',
            out: false,
            killed: false
        },
        deck: [
            {
                role: 'Villager',
                team: 'good',
                description: 'During the day, find the wolves and kill them.',
                id: '52u5w81ryq5h30qu1gri56xxq',
                quantity: 6
            },
            {
                role: 'Werewolf',
                team: 'evil',
                description: "During the night, choose a villager to kill. Don't get killed.",
                id: '9uk0jcrm1hkhygzb6iw8xh2a7',
                quantity: 1
            }
        ],
        gameSize: 7,
        people: [
            {
                name: 'Andrea',
                id: 'pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW',
                userType: 'player',
                out: false,
                killed: false,
                revealed: false
            },
            {
                name: 'Hannah',
                id: 'ojCjJqIXfNkOunHD9v2gQSNXRUQPzZCJzzuPTKyQy5TiyZ83ziHMvr2ZzDLWMb4M6dXqa8rN3O3',
                userType: 'killed',
                out: true,
                killed: true,
                revealed: true,
                gameRole: 'Villager',
                alignment: 'good'
            },
            {
                name: 'Greg',
                id: '1o2IntIivHV4pMqV2iMBi3lrMloHcShQiXObuedyc1DqeUho5aD0DI6Vqhja97c1GIMNzfyNC4a',
                userType: 'player',
                out: false,
                killed: false,
                revealed: false
            },
            {
                name: 'Jerret',
                id: 'eaxAqb1nj25jqWHnsWirSdYjLhHQVkQtnIkC4eHvmuleN7FtaG8XYnLJnBv4hhFvXWNbUguTrLJ',
                userType: 'player',
                out: false,
                killed: false,
                revealed: false
            },
            {
                name: 'Lys',
                id: 'v2eOvaYKusGfiUpuZWTCJ0JUiESC29OuH6fpivwMuwcqizpYTCAzetrPl7fF8F5CoR35pTMIKxh',
                userType: 'player',
                out: false,
                killed: false,
                revealed: false
            },
            {
                name: 'Matt',
                id: 'pUDrpiGF1vuMfhztT2KY9bllBoGILVl2vIpRWVFH27SnqGiVP3LunjO0wy0otXToWzwbXBlx7ga',
                userType: 'player',
                out: false,
                killed: false,
                revealed: false
            },
            {
                name: 'Steve',
                id: 'Csz1haKdNa3WLIbqllRwV2e9TgwMlDoQwzbpZkTa0JhioUT5MD1GopUHU90f6cyfQ2Uv7YBTZo1',
                userType: 'player',
                out: false,
                killed: false,
                revealed: false
            },
            {
                name: 'Alec',
                id: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
                userType: 'moderator',
                out: true,
                killed: false,
                revealed: false
            },
            {
                name: 'Stav',
                id: 'BKfs1N0cfvwc309eOdwrTeum8NScSX7S8CTCGXgiI6JZufjAgD4WAdkkryn3sqIqKeswCFpIuTc',
                userType: 'spectator',
                out: true,
                killed: false,
                revealed: false
            }
        ],
        timerParams: {
            hours: null,
            minutes: 10,
            paused: true,
            timeRemaining: 600000
        },
        isStartable: true
    },
    moderatorGame:
        {
            accessCode: 'TVV6',
            status: 'in progress',
            currentModeratorId: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
            client: {
                name: 'Alec',
                hasEnteredName: false,
                id: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
                cookie: '28p80dbhY2k1iP1NuEy8UPFmuOctLx3nR0EMONU4MlJFfVrCzNncdNdsav9wEuGEswLQ70DKqa3',
                userType: 'moderator',
                gameRole: null,
                gameRoleDescription: null,
                alignment: null,
                out: true,
                killed: false
            },
            deck: [
                {
                    role: 'Villager',
                    team: 'good',
                    description: 'During the day, find the wolves and kill them.',
                    id: '52u5w81ryq5h30qu1gri56xxq',
                    quantity: 6
                },
                {
                    role: 'Werewolf',
                    team: 'evil',
                    description: "During the night, choose a villager to kill. Don't get killed.",
                    id: '9uk0jcrm1hkhygzb6iw8xh2a7',
                    quantity: 1
                }
            ],
            gameSize: 7,
            people: [
                {
                    name: 'Andrea',
                    id: 'pTtVXDJaxtXcrlbG8B43Wom67snoeO24RNEkO6eB2BaIftTdvpnfe1QR65DVj9A6I3VOoKZkYQW',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Hannah',
                    id: 'ojCjJqIXfNkOunHD9v2gQSNXRUQPzZCJzzuPTKyQy5TiyZ83ziHMvr2ZzDLWMb4M6dXqa8rN3O3',
                    userType: 'killed',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: true,
                    killed: true,
                    revealed: true
                },
                {
                    name: 'Greg',
                    id: '1o2IntIivHV4pMqV2iMBi3lrMloHcShQiXObuedyc1DqeUho5aD0DI6Vqhja97c1GIMNzfyNC4a',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Jerret',
                    id: 'eaxAqb1nj25jqWHnsWirSdYjLhHQVkQtnIkC4eHvmuleN7FtaG8XYnLJnBv4hhFvXWNbUguTrLJ',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Lys',
                    id: 'v2eOvaYKusGfiUpuZWTCJ0JUiESC29OuH6fpivwMuwcqizpYTCAzetrPl7fF8F5CoR35pTMIKxh',
                    userType: 'player',
                    gameRole: 'Werewolf',
                    gameRoleDescription: "During the night, choose a villager to kill. Don't get killed.",
                    alignment: 'evil',
                    out: false,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Matt',
                    id: 'pUDrpiGF1vuMfhztT2KY9bllBoGILVl2vIpRWVFH27SnqGiVP3LunjO0wy0otXToWzwbXBlx7ga',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Steve',
                    id: 'Csz1haKdNa3WLIbqllRwV2e9TgwMlDoQwzbpZkTa0JhioUT5MD1GopUHU90f6cyfQ2Uv7YBTZo1',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Alec',
                    id: 'w8qarnG6FgAZQvRYsAFefldwU2r6KIeOce3nGaLxnfMlKIBOLj0DhUSC951bQ7yLwbRjDAS72r4',
                    userType: 'moderator',
                    gameRole: null,
                    gameRoleDescription: null,
                    alignment: null,
                    out: true,
                    killed: false,
                    revealed: false
                },
                {
                    name: 'Stav',
                    id: 'BKfs1N0cfvwc309eOdwrTeum8NScSX7S8CTCGXgiI6JZufjAgD4WAdkkryn3sqIqKeswCFpIuTc',
                    userType: 'spectator',
                    gameRole: null,
                    gameRoleDescription: null,
                    alignment: null,
                    out: true,
                    killed: false,
                    revealed: false
                }
            ],
            timerParams: {
                hours: null,
                minutes: 10,
                paused: true,
                timeRemaining: 600000
            },
            isStartable: true
        }
};
