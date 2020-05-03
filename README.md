<img alt="Werewolf" src="/assets/images/roles-small/wolf_logo.png" />

This app is still in active development. The latest deployment can be found <a href="https://play-werewolf.herokuapp.com">here</a>

A Werewolf utility that provides the tools to run games smoothly in the absence of a deck, or in any context in which traditional moderation is hindered. 

This is a Javascript application running on a node express server. I am using the socket.io package as a wrapper for Javascript Websocket. This was built from scratch as a learning project; I do not claim it as a shining example of socket programming or web app design in general. I welcome collaboration and suggestions for improvements. 

All pixel art is my own (for better or for worse).

This is meant to facilitate the game in a face-to-face social setting and provide utility/convenience - not control all aspects of the game flow. The app allows players to create or join a game lobby where state is synchronized. The creator of the game can build a deck from either the standard set of provided cards, or from any number of custom cards the user creates. Once the game begins, this deck will be randomly dealt to all participants. 

Players will see their card (which can be flipped up and down), an optional timer, and a button to say that they have been killed off. If a player presses the button, they will be removed from the game, and their role revealed to other players. The game will continue until the end of the game is detected, or the timer expires.

To learn more about this type of game, see the Wikipedia entry on the game's ancestor, <a href="https://en.wikipedia.org/wiki/Mafia_(party_game)">Mafia</a>.

<br>
<div>
  <img alt="home" width="200" src="/assets/images/screenshots/home.PNG" />
  <img alt="create" width="200" src="/assets/images/screenshots/create.PNG" />
  <img alt="lobby" width="200" src="/assets/images/screenshots/lobby.PNG" />
</div>
<br>
<div>
  <img alt="game" width="200" src="/assets/images/screenshots/game.PNG" />
  <img alt="killed" width="200" src="/assets/images/screenshots/killed.PNG" />
  <img alt="hunter" width="200" src="/assets/images/screenshots/hunter.PNG" />
</div>
<br>
<br>
<br>

# Run Locally

Run `npm install` from the root directory.

Run `node server.js` from the root directory, navigate to **localhost:5000**

# Testing/Debugging

Use `npm run test` to run unit tests using <a href='https://jasmine.github.io/'>Jasmine</a> (test coverage is barebones and is currently being expanded)
<br><br>
To turn on logging at the debug level, add the `debug` argument like so:

`node server.js -- debug`

# Contributing

Contributions of any kind are welcome. Simply open an issue or pull request and I can respond accordingly. 
