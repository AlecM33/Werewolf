<p align="center">
  <img width="300" src="/client/src/images/logo.gif"/>
</p>

Find the latest deployment here: https://playwerewolf.uk.r.appspot.com/.
I value your feedback.

An application to run games of <a href="https://en.wikipedia.org/wiki/Mafia_(party_game)">Werewolf (Mafia)</a>
smoothly when you don't have a deck, or when you and your friends are together virtually. Inspired by my time playing
<a href="https://boardgamegeek.com/boardgame/152242/ultimate-werewolf-deluxe-edition">Ultimate Werewolf</a> and by
2020's quarantine. The app is free to use and anonymous. 

After a long hiatus from maintaining the application, I have come back and undertaken a large-scale redesign, rewriting 
most of the code and producing a result that I believe is more stable and has much more sensible client-server interaction.
<br><br>
<p align="center">
  <img width="600" src="./client/src/images/screenshots/player.PNG"/>
</p>

## Features

This is meant to facilitate a game through a shared game state and various utilities - not to control
every aspect of the game flow. The app provides a host the ability to construct a deck with a custom distribution
of roles. Players can join a game with one click and are then dealt a role to their device. The app features a concealable 
role card, an optional shared timer (which the moderator can play/pause), a reference for roles in the game, and status 
information for players including who is alive/dead and who has had their role revealed. The app also provides the 
option for a "dedicated moderator" or a "temporary moderator." Dedicated moderators will never be dealt in, and will 
have all controls and information from the beginning of the game. Temporary moderators _will_ be dealt a role and will
have some moderator powers, but will only exist until the first player is out, at which point that player will be made 
the game's dedicated moderator. A dedicated moderator can transfer their powers to another player that is out of the 
game at any time. 

The application prioritizes responsiveness. A key scenario would be when a group is hanging out with only their phones.

## Tech Stack

This is a Node.js application. It is written purely using JavaScript/HTML/CSS. The main dependencies are
<a href="https://expressjs.com/">Express.js</a> and <a href="https://socket.io/">Socket.io</a>. It is fully open-source
and under the MIT license. This was (and still is) fundamentally a learning project, and thus I welcome collaboration 
and feedback of any kind.

All pixel art is my own, for better or for worse.

## Contributing and Developers' Guide

### Running Locally

If you haven't already, install <a href="https://nodejs.org/en/">Node.js.</a> This should include the node package 
manager, <a href="https://www.npmjs.com/">npm</a>.

Run `npm install` from the root directory to install the necessary dependencies.

These instructions assume you are somewhat familiar with Node.js and npm. At this point, we will use some of the run
commands defined in `package.json`.

First, start a terminal in the root directory. Execute `npm run build:dev`. This uses <a href="https://webpack.js.org/">
Webpack</a> to bundle javascript from the `client/src` directory and place it in the `client/dist` directory, which is ignored by Git.
If you look at this command as defined in `package.json`, it uses the `--watch` flag, which means the process will continue
to run in this terminal, watching for changes to JavaScript within the `client/src` directory and re-bundling automatically. You 
definitely want this if making frequent JavaScript changes to client-side source code. Any other changes, such as to HTML or CSS
files, are not bundled, and thus your changes will be picked up simply by refreshing the browser.

Next, in a separate terminal, we will start the application:

`npm run start:dev` (if developing on a linux machine)<br>
`npm run start:dev:windows` (if developing on a windows machine)

This will start the application and serve it on the default port of **5000**. This command uses <a href="https://www.npmjs.com/package/nodemon">nodemon</a>
to listen for changes to **server-side code** (Node.js modules) and automatically restart the server. If you do not want 
this, run instead `npm run start:dev:no-hot-reload` or `npm run start:dev:windows:no-hot-reload`. 

And there we go! You should be able to navigate to and use the application on localhost. There are additional CLI arguments
you can provide to the run commands that specify things such as port, HTTP vs HTTPS, or the log level. I **highly recommend**
consulting these below.

### CLI Options

These options will be at the end of your run command following two dashes e.g. `npm run start:dev -- [options]`.
Options are whitespace-delimited key-value pairs with the syntax `[key]=[value]` e.g. `port=4242`. Options include:

- `port`. Specify an integer port for the application.
- `loglevel` the log level for the application. Can be `info`, `error`, `warn`, `debug`, or `trace`. 
- `protocol` either `http` or `https`. If you specify HTTPS, the server will look in `client/certs` for localhost certificates
before serving the application over HTTPS - otherwise it will revert to HTTP. Using HTTPS is particularly useful if you
  want to make the application public on your home network, which would allow you to test it on your mobile device. **Careful -
  I had to disable my computer's firewall for this to work, which would of course make browsing the internet much riskier.**

## Testing

Unit tests are written using <a href="https://jasmine.github.io/">Jasmine</a>. Execute them by running `npm run test`. 
They reside in the `spec/unit` directory, which maps 1:1 to the application directory structure - i.e. unit tests for 
`server/modules/GameManager` are found in `spec/unit/server/modules/GameManager_Spec.js`

## Code Formatting

This application uses <a href="https://eslint.org/">ESLint</a> to enforce code formatting standards. This configuration is found at the root in `.eslintrc.json`. 
To audit the codebase, run `npx eslint [directory]`, and to fix them along with that, run `npx eslint [directory] --fix`.
