export const cards = [
    {
      role: "Villager",
      team: "village",
      description: "During the day, find the wolves and kill them.",
      powerRole: false
    },
    {
        role: "Werewolf",
        team: "wolf",
        description: "During the night, choose a villager to kill. Don't get killed.",
        powerRole: false
    },
    {
        role: "Minion",
        team: "wolf",
        description: "You are an evil villager - you know who the wolves are, and you want them to win.",
        powerRole: true
    },
    {
        role: "Wolf Cub",
        team: "wolf",
        description: "If a wolf dies, you then become a wolf. Until then, you do not wake up with the other wolves.",
        powerRole: true
    },
    {
      role: "Seer",
      team: "village",
      description: "During the night, choose one person. The moderator will tell you whether that player is a wolf.",
      powerRole: true
    },
    {
      role: "Hunter",
      team: "village",
      description: "If you are alive with a wolf at the end of the game, you best the wolf, and the village wins.",
      powerRole: true
    },
    {
        role: "Sorcerer",
        team: "village",
        description: "Once a game, change who the wolves are going to kill to someone else, including yourself. You will" +
            " see who is going to die each night until you use this power.",
        powerRole: true
    },
    {
        role: "Prince",
        team: "village",
        description: "If you die, take someone else with you.",
        powerRole: true
    }
];
