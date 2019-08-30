export const cards = [
    {
      role: "Villager",
      team: "village",
      description: "During the day, find the wolves and kill them.",
      powerRole: false
    },
   {
      role: "Seer",
      team: "village",
      description: "During the night, choose one person. The moderator will tell you whether that player is evil.",
      powerRole: true
    },
    {
      role: "Hunter",
      team: "village",
      description: "If you are alive with a wolf at the end of the game, the village wins.",
      powerRole: true
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
      description: "You are villager, but you know who the wolves are - and want them to win.",
      powerRole: true
    }
];
