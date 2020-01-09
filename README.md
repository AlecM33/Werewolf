<img alt="Werewolf" src="/assets/images/roles-small/wolf_logo.png" />

This is the code currently running at <a href="https://play-werewolf.herokuapp.com">https://play-werewolf.herokuapp.com</a>

An online multiplayer version of the social deception game Werewolf.

This is a Javascript application running on a node express server. I am using the socket.io package as a wrapper for Javascript Websocket. This was built from scratch as a learning project. 

<br>
<div>
  <img align="left" alt="create" width="200" src="/assets/images/screenshots/create.PNG" />
  <img align="left" alt="lobby" width="200" src="/assets/images/screenshots/lobby.PNG" />
  <img alt="hunter" width="200" src="/assets/images/screenshots/game.PNG" />
  <img alt="game" width="200" src="/assets/images/screenshots/hunter.PNG" />
</div>
<br>
<br>
<br>

This is meant to facilitate the game in a real-life social setting and provide utility/convenience - not control all aspects of the game flow. The app allows players to create or join a game lobby where state is synchronized. The creator of the game will have built a deck with certain roles in it, and once the game begins, this deck will be randomly dealt to all participants. 

Players will see their card (which can be flipped up and down), an optional timer, and a button to say that they have been killed off. If a player presses the button, they will be removed from the game, and their role revealed to other players. The game will continue until the end of the game is detected, or the timer expires.

To learn more about this type of game, see the Wikipedia entry on the game's ancestor, <a href="https://en.wikipedia.org/wiki/Mafia_(party_game)">Mafia</a>.

# Run Locally

Run node server.js from the root directory, navigate to localhost:5000
