export const defaultRoles = [
    {
        role: 'Villager',
        team: 'good',
        description: 'During the day, find the wolves and kill them.'
    },
    {
        role: 'Werewolf',
        team: 'evil',
        description: "During the night, choose a villager to kill. Don't get killed."
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
        description: 'You are an evil Villager, and you know who the Werewolves are.'
    },
    {
        role: 'Blind Minion',
        team: 'evil',
        description: "You are an evil villager, but you don't know who the Werewolves are."
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
        description: 'You beat a werewolf in a 1v1 situation, winning the game for the village.'
    },
    {
        role: 'Brutal Hunter',
        team: 'good',
        description: 'When you are eliminated, choose another player to go with you.'
    }
];
