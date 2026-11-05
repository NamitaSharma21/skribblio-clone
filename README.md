# Skribbl.io Clone

A browser-based drawing and guessing game for playing with friends. One player
draws a secret word while everyone else tries to guess it before time runs out.
The app includes public and private rooms, live drawing, chat, and score tracking.

## What you can do

- Create a public room or a private room for invited players.
- Join a room with its six-character code or a shared invite link.
- Choose a nickname and customize your character.
- Draw with a brush, colors, different brush sizes, an eraser, and a fill tool.
- Guess words in chat, earn points, and see the live leaderboard.
- Change game settings as the room host.

## Play the game

1. Open the app and enter a nickname.
2. Choose **Play Now** to join a public game, or create a room for your group.
3. Share the room code or invite link with friends. A link contains a room code,
   for example `https://your-site.example/?room=VXSKBH`.
4. When everyone is in the lobby, the host starts the game.
5. If it is your turn to draw, choose a word and draw it. Otherwise, guess the
   word in the chat before the timer ends.

## Run it on your computer

### You will need

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node.js)

### 1. Install dependencies

From the project folder, run:

```bash
npm run install:all
```

### 2. Configure the local servers

The backend reads `backend/.env`, and the frontend reads `frontend/.env`.
Start with the included example files:



On Windows Command Prompt, use `copy` instead of `cp`. Make sure the local
settings point to each other:



### 3. Start the app

Open two terminals in the project folder.

In the first terminal, start the backend:

```bash
npm run dev:backend
```

In the second terminal, start the frontend:

```bash
npm run dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173). To try multiplayer,
open the app in another browser window and join the same room.

## Useful commands

Run these from the project folder:

| Command | What it does |
|---|---|
| `npm run dev:backend` | Starts the backend in development mode |
| `npm run dev:frontend` | Starts the Vite frontend |
| `npm run build:backend` | Type-checks and builds the backend |
| `npm run build:frontend` | Type-checks and builds the frontend |
| `npm run test:e2e` | Runs the Socket.IO multiplayer integration test |
| `npm start` | Starts the built backend |

Build the frontend and backend with `npm run build:frontend` and
`npm run build:backend`, respectively. The root `npm run build` script installs
dependencies and builds the backend.

## How the project is organized

```text
backend/
  src/
    handlers/   Socket.IO events and game actions
    models/     Room, player, and game state
    services/   Word selection and hints
    index.ts    HTTP and Socket.IO server
  test-e2e.ts   Multiplayer integration test
frontend/
  src/
    components/ Game screens and reusable UI
    services/   Socket connection and sound effects
    App.tsx     Main app and room/game state
    main.tsx    React entry point
```

The frontend is built with React, TypeScript, and Vite. The Node.js backend
uses Express and Socket.IO to keep rooms, game state, drawing, and chat in sync.
Room state is held in the running server, so players need to connect to the same
backend to play together.

## Deploying

The repository includes configuration for deploying the frontend to Vercel and
the backend to Render. Deploy the backend first, then configure the frontend to
use its URL.

### Backend (Render)

1. Create a Render Web Service using `backend` as the root directory.
2. Use `npm install --include=dev && npm run build` as the build command and
   `npm start` as the start command.
3. Set `NODE_ENV` to `production`, set `CLIENT_URL` to your deployed frontend's
   URL, and use the port assigned by Render.
4. Deploy and copy the backend service URL.

### Frontend (Vercel)

1. Import the repository into Vercel and set `frontend` as the root directory.
2. Set `VITE_BACKEND_URL` to the backend URL from Render.
3. Build with `npm run build` and use `dist` as the output directory.
4. Deploy the frontend. If needed, update the backend's `CLIENT_URL` to the
   deployed frontend URL.

## Troubleshooting

- **The app cannot connect to the game server:** Check that both servers are
  running and `VITE_BACKEND_URL` matches the backend address.
- **A room invite does not open the right room:** Check that the link includes a
  room code, such as `?room=VXSKBH`, and that the room still exists.
- **Friends cannot join your game:** Confirm everyone is using the same
  deployed app and that the backend is online.

## License

This project is available under the MIT License.
