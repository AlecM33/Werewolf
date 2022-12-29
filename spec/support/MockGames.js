export const mockGames = {
    gameInLobby: {
        accessCode: 'ZS6M',
        status: 'lobby',
        moderator: {
            name: 'Alec',
            id: 'HZM64BVGXCSXS9L5YMGK2WTTQ',
            userType: 'moderator',
            out: false,
            revealed: false
        },
        client: {
            name: 'Alec',
            hasEnteredName: false,
            id: 'HZM64BVGXCSXS9L5YMGK2WTTQ',
            cookie: 'Q68BYSMM7DB5CH338TNPMF9CK',
            userType: 'moderator'
        },
        deck: [
            {
                role: 'Parity Hunter',
                team: 'good',
                description: 'You beat a werewolf in a 1v1 situation, winning the game for the village.',
                id: 'wli3r2i9zxxmnns5euvtc01v0',
                quantity: 1
            },
            {
                role: 'Seer',
                team: 'good',
                description: 'Each night, learn if a chosen person is a Werewolf.',
                id: '7q0xxfuflsjetzit1elu5rd2k',
                quantity: 1
            },
            {
                role: 'Villager',
                team: 'good',
                description: 'During the day, find the wolves and kill them.',
                id: '33pw77odkdt3042yumxtxbrda',
                quantity: 1
            },
            {
                role: 'Sorceress',
                team: 'evil',
                description: 'Each night, learn if a chosen person is the Seer.',
                id: '6fboglgqwua8n0twgh2f4a0xh',
                quantity: 1
            },
            {
                role: 'Werewolf',
                team: 'evil',
                description: "During the night, choose a villager to kill. Don't get killed.",
                id: 'ixpmpaouc3oj1llkm6gttxbor',
                quantity: 1
            }
        ],
        people: [],
        timerParams: {
            hours: null,
            minutes: 15,
            paused: false
        },
        isFull: false,
        spectators: []
    },
    inProgressGame: {
        accessCode: 'VVVG',
        status: 'in progress',
        moderator: {
            name: 'Alec',
            id: 'H24358C4GQ238LFK66RYMST9P',
            userType: 'moderator',
            out: false,
            revealed: false
        },
        client: {
            name: 'Andrea',
            hasEnteredName: false,
            id: 'THCX9K6MCKZXBXYH95FPLP68Y',
            cookie: 'ZLPHS946H33W7LVJ28M8XCRVZ',
            userType: 'player',
            gameRole: 'Parity Hunter',
            gameRoleDescription: 'You beat a werewolf in a 1v1 situation, winning the game for the village.',
            alignment: 'good',
            out: false
        },
        deck: [
            {
                role: 'Parity Hunter',
                team: 'good',
                description: 'You beat a werewolf in a 1v1 situation, winning the game for the village.',
                id: 'gw82x923gde5pcf3ru8y0w6mr',
                quantity: 1
            },
            {
                role: 'Seer',
                team: 'good',
                description: 'Each night, learn if a chosen person is a Werewolf.',
                id: '0it2wybz7mdoatqs60b847x5v',
                quantity: 1
            },
            {
                role: 'Villager',
                team: 'good',
                description: 'During the day, find the wolves and kill them.',
                id: 'v8oeyscxu53bg0a29uxsh4mzc',
                quantity: 1
            },
            {
                role: 'Sorceress',
                team: 'evil',
                description: 'Each night, learn if a chosen person is the Seer.',
                id: '52ooljj12xpah0dgirxay2lma',
                quantity: 1
            },
            {
                role: 'Werewolf',
                team: 'evil',
                description: "During the night, choose a villager to kill. Don't get killed.",
                id: '1oomauy0wc9pn5q55d2f4zq64',
                quantity: 1
            }
        ],
        people: [
            {
                name: 'Andrea',
                id: 'THCX9K6MCKZXBXYH95FPLP68Y',
                userType: 'player',
                out: false,
                revealed: false
            },
            {
                name: 'Greg',
                id: 'SFVBXJZNF3G3QDML63X34KG5X',
                userType: 'player',
                out: false,
                revealed: false
            },
            {
                name: 'Lys',
                id: 'S2496LVXL9CFP5B493XX6XMYL',
                userType: 'player',
                out: false,
                revealed: false
            },
            {
                name: 'Hannah',
                id: 'Y7P2LGDZL6NV283525PL5GZTB',
                userType: 'player',
                out: true,
                revealed: true
            },
            {
                name: 'Matthew',
                id: 'Z9YZ2JBM2GPRXFJB9J6ZFNSP9',
                userType: 'player',
                out: false,
                revealed: false
            }
        ],
        timerParams: {
            hours: null,
            minutes: 2,
            paused: true,
            timeRemaining: 120000
        },
        isFull: true,
        spectators: []
    },
    moderatorGame:
        {
            accessCode: 'LYG5',
            status: 'in progress',
            moderator: {
                name: 'Alec',
                id: 'F623SN7JJMV5QW8K9MNQWW4WP',
                userType: 'moderator',
                out: false,
                revealed: false
            },
            client: {
                name: 'Alec',
                hasEnteredName: false,
                id: 'F623SN7JJMV5QW8K9MNQWW4WP',
                cookie: 'ZJ9RQDF6CNZKZQCSKP4WSHDHQ',
                userType: 'moderator',
                gameRole: null,
                gameRoleDescription: null,
                alignment: null,
                out: false
            },
            deck: [
                {
                    role: 'Parity Hunter',
                    team: 'good',
                    description: 'You beat a werewolf in a 1v1 situation, winning the game for the village.',
                    id: 'bfs9pwk81yu9k47ho4xyidzy7',
                    quantity: 1
                },
                {
                    role: 'Seer',
                    team: 'good',
                    description: 'Each night, learn if a chosen person is a Werewolf.',
                    id: '0rob6qyg3eq7douedxen5pb44',
                    quantity: 1
                },
                {
                    role: 'Villager',
                    team: 'good',
                    description: 'During the day, find the wolves and kill them.',
                    id: 'fq9n3u95ka16smbu6zaivnuvv',
                    quantity: 1
                },
                {
                    role: 'Sorceress',
                    team: 'evil',
                    description: 'Each night, learn if a chosen person is the Seer.',
                    id: 'bwptvwzg0u1aao48045ht57wx',
                    quantity: 1
                },
                {
                    role: 'Werewolf',
                    team: 'evil',
                    description: "During the night, choose a villager to kill. Don't get killed.",
                    id: 'c9gziuv8bon9bhmyuanfvecpd',
                    quantity: 1
                }
            ],
            gameSize: 5,
            people: [
                {
                    name: 'Greg',
                    id: 'HVB3SK3XPGNSP34W2GVD5G3SP',
                    userType: 'player',
                    gameRole: 'Seer',
                    gameRoleDescription: 'Each night, learn if a chosen person is a Werewolf.',
                    alignment: 'good',
                    out: false,
                    revealed: false
                },
                {
                    name: 'Lys',
                    id: 'XJNHYX85HCKYDQLKYN584CRKK',
                    userType: 'player',
                    gameRole: 'Sorceress',
                    gameRoleDescription: 'Each night, learn if a chosen person is the Seer.',
                    alignment: 'evil',
                    out: false,
                    revealed: false
                },
                {
                    name: 'Colette',
                    id: 'MLTP5M76K6NN83VQBDTNC6ZP5',
                    userType: 'player',
                    gameRole: 'Parity Hunter',
                    gameRoleDescription: 'You beat a werewolf in a 1v1 situation, winning the game for the village.',
                    alignment: 'good',
                    out: false,
                    revealed: false
                },
                {
                    name: 'Hannah',
                    id: 'FCVSGJFYWLDL5S3Y8B74ZVZLZ',
                    userType: 'player',
                    gameRole: 'Werewolf',
                    gameRoleDescription: "During the night, choose a villager to kill. Don't get killed.",
                    alignment: 'evil',
                    out: false,
                    revealed: false
                },
                {
                    name: 'Andrea',
                    id: 'VWLJ298FVTZR22R4TNCMRTB5B',
                    userType: 'player',
                    gameRole: 'Villager',
                    gameRoleDescription: 'During the day, find the wolves and kill them.',
                    alignment: 'good',
                    out: false,
                    revealed: false
                }
            ],
            timerParams: {
                hours: null,
                minutes: 30,
                paused: true,
                timeRemaining: 1800000
            },
            isFull: true,
            spectators: [
                {
                    id: 'MGGVR8KQ7V7HGN3QBLJ5339ZL',
                    cookie: '9M2F677JBGWKCJBMXR54GBWWZ',
                    socketId: '3RdkA19luMvUfVh2AAAP',
                    name: 'Matt',
                    userType: 'spectator',
                    gameRole: null,
                    gameRoleDescription: null,
                    alignment: null,
                    assigned: false,
                    out: false,
                    revealed: false,
                    hasEnteredName: false
                }
            ]
        }
};
