export let cards = [
    {
        role: "Villager",
        team: "good",
        description: "During the day, find the wolves and kill them.",
        isTypeOfWerewolf: false
    },
    {
        role: "Werewolf",
        team: "evil",
        description: "During the night, choose a villager to kill. Don't get killed.",
        isTypeOfWerewolf: true        
    },
    {
        role: "Dream Wolf",
        team: "evil",
        description: "If a Werewolf dies, you become a Werewolf. You do not wake up with the Werewolves until this happens. You count for parity only after converting to a wolf.",
        isTypeOfWerewolf: false
    },
    {
        role: "Minion",
        team: "evil",
        description: "You are an evil villager - you know who the wolves are, and you want them to win.",
        isTypeOfWerewolf: false      
    },
    {
        role: "Seer",
        team: "good",
        description: "During each night, choose one person. The moderator will tell you whether that player is a wolf.",
        isTypeOfWerewolf: false
    },
    {
        role: "Shadow",
        team: "evil",
        description: "If the Seer checks you, the Seer dies that night instead of whoever the wolves chose to kill. Reveal" +
            " yourself to the moderator.",
        isTypeOfWerewolf: false 
    },
    {
        role: "Hunter",
        team: "good",
        description: "If you are alive with a wolf at the end of the game, you best the wolf, and the village wins.",
        isTypeOfWerewolf: false
    },
    {
        role: "Sorcerer",
        team: "good",
        description: "Once a game, change who the wolves are going to kill to someone else, including yourself.",
        isTypeOfWerewolf: false
    },
    {
        role: "Mason",
        team: "good",
        description: "Masons know who other Masons are. Wake them up to see each other on the first night.",
        isTypeOfWerewolf: false
    }
];
