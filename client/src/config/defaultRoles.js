export const defaultRoles = [
    {
        role: 'Villager',
        team: 'good',
        description: 'During the day, find the Werewolves and kill them.'
    },
    {
        role: 'Werewolf',
        team: 'evil',
        description: "During the night, choose a player to eliminate."
    },
    {
        role: 'Dream Wolf',
        team: 'evil',
        description: "You are a Werewolf, but you don't wake up with the other Werewolves until one of them dies."
    },
    {
        role: 'Sorceress',
        team: 'evil',
        description: 'Each night, learn if a chosen person is the Seer.'
    },
    {
        role: 'Knowing Minion',
        team: 'evil',
        description: 'You are an evil Villager, and you know who the Werewolves are. You win if the Werewolves win.'
    },
    {
        role: 'Blind Minion',
        team: 'evil',
        description: "You are an evil villager, but you do NOT know who the Werewolves are. You win if the Werewolves win."
    },
    {
        role: 'Seer',
        team: 'good',
        description: 'Each night, learn if a chosen person is a Werewolf.'
    },
    {
        role: 'Doctor',
        team: 'good',
        description: 'Each night, choose a player to protect from the Werewolves. This can be yourself. If the Werewolves ' +
            'target this person, they still survive to the following day.'
    },
    {
        role: 'Witch',
        team: 'good',
        description: 'You have two potions. One saves a player from the Werewolves, and one kills a player. You may use each of them once per game during the night.'
    },
    {
        role: 'Parity Hunter',
        team: 'good',
        description: 'If you and a Werewolf are the only two players remaining, the Village wins.'
    },
    {
        role: 'Brutal Hunter',
        team: 'good',
        description: 'When you are eliminated, choose another player to be eliminated with you.'
    }
];
