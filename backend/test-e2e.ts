import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { SocketHandler } from './src/handlers/SocketHandler.js';

async function runE2ETest() {
  console.log('🧪 Starting Skribbl.io Full-Stack E2E Integration Test...');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const handler = new SocketHandler(io);
  handler.register();

  const TEST_PORT = 5055;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  console.log(`✅ Test server running on port ${TEST_PORT}`);

  const SERVER_URL = `http://localhost:${TEST_PORT}`;

  // 1. Connect Client 1 (Alice - Host)
  const client1 = Client(SERVER_URL);
  await new Promise<void>((resolve) => client1.on('connect', () => resolve()));
  console.log('✅ Client 1 (Alice) connected:', client1.id);

  // 2. Client 1 Creates Room
  let createdRoomId = '';
  await new Promise<void>((resolve, reject) => {
    client1.emit('create_room', {
      hostName: 'Alice',
      avatar: { color: '#f59e0b', eyes: 1, mouth: 1 },
      isPrivate: false,
      settings: { rounds: 2, drawTime: 30 }
    }, (res: any) => {
      if (res.success) {
        createdRoomId = res.roomId;
        console.log('✅ Room created with code:', createdRoomId);
        resolve();
      } else {
        reject(new Error(res.error));
      }
    });
  });

  // 3. Connect Client 2 (Bob - Guesser)
  const client2 = Client(SERVER_URL);
  await new Promise<void>((resolve) => client2.on('connect', () => resolve()));
  console.log('✅ Client 2 (Bob) connected:', client2.id);

  // 4. Client 2 Joins Room
  await new Promise<void>((resolve, reject) => {
    client2.emit('join_room', {
      roomId: createdRoomId,
      playerName: 'Bob',
      avatar: { color: '#3b82f6', eyes: 2, mouth: 0 }
    }, (res: any) => {
      if (res.success) {
        console.log('✅ Client 2 (Bob) joined room successfully');
        resolve();
      } else {
        reject(new Error(res.error));
      }
    });
  });

  // 5. Host Starts Game
  let currentDrawerId = '';
  let aliceWordOptions: any[] = [];
  let bobWordOptions: any = null;

  const wordSelectionPromise = new Promise<void>((resolve) => {
    let aliceReady = false;
    let bobReady = false;

    client1.on('game_state', (state: any) => {
      if (state.phase === 'SELECTING_WORD') {
        currentDrawerId = state.drawerId;
        aliceWordOptions = state.wordChoices;
        console.log('✅ Alice received SELECTING_WORD phase with choices:', aliceWordOptions?.map(c => c.word));
        aliceReady = true;
        if (aliceReady && bobReady) resolve();
      }
    });

    client2.on('game_state', (state: any) => {
      if (state.phase === 'SELECTING_WORD') {
        bobWordOptions = state.wordChoices; // Should be undefined for guesser!
        console.log('✅ Bob received SELECTING_WORD phase. Word choices hidden:', bobWordOptions === undefined);
        bobReady = true;
        if (aliceReady && bobReady) resolve();
      }
    });
  });

  client1.emit('start_game');
  await wordSelectionPromise;

  if (bobWordOptions !== undefined) {
    throw new Error('SECURITY VULNERABILITY: Guesser saw word options!');
  }

  // 6. Drawer chooses a word
  const chosenWordObj = aliceWordOptions[0];
  const chosenWord = chosenWordObj.word;
  console.log(`🎨 Alice is choosing word: "${chosenWord}"`);

  let drawingStartedPromise = new Promise<void>((resolve) => {
    let aliceDrawing = false;
    let bobDrawing = false;

    client1.on('game_state', (state: any) => {
      if (state.phase === 'DRAWING') {
        console.log('✅ Alice sees secret word:', state.word);
        if (state.word !== chosenWord) {
          throw new Error('Alice secret word does not match chosen word!');
        }
        aliceDrawing = true;
        if (aliceDrawing && bobDrawing) resolve();
      }
    });

    client2.on('game_state', (state: any) => {
      if (state.phase === 'DRAWING') {
        console.log('✅ Bob sees secret word masked as null:', state.word === null);
        console.log('✅ Bob sees blanks array length:', state.hints.length);
        if (state.word !== null) {
          throw new Error('SECURITY VULNERABILITY: Bob saw secret word!');
        }
        bobDrawing = true;
        if (aliceDrawing && bobDrawing) resolve();
      }
    });
  });

  client1.emit('word_chosen', { word: chosenWord });
  await drawingStartedPromise;

  // 7. Test Real-time Drawing Stroke Sync
  const drawSyncPromise = new Promise<void>((resolve) => {
    client2.on('draw_start', (data) => {
      console.log('✅ Bob received draw_start at:', data.x, data.y, 'color:', data.color);
    });

    client2.on('draw_move', (data) => {
      console.log('✅ Bob received draw_move at:', data.x, data.y);
    });

    client2.on('draw_end', () => {
      console.log('✅ Bob received draw_end');
      resolve();
    });
  });

  client1.emit('draw_start', { x: 100, y: 100, color: '#ef4444', size: 8, tool: 'brush' });
  client1.emit('draw_move', { x: 150, y: 150 });
  client1.emit('draw_end');
  await drawSyncPromise;

  // 8. Test Stroke Undo
  const undoPromise = new Promise<void>((resolve) => {
    client2.on('draw_undo', () => {
      console.log('✅ Bob received draw_undo event');
      resolve();
    });
  });
  client1.emit('draw_undo');
  await undoPromise;

  // 9. Test Guessing: Close Guess
  const closeGuessPromise = new Promise<void>((resolve) => {
    client2.on('guess_result', (res) => {
      if (res.close) {
        console.log('✅ Bob received close guess whisper:', res.text);
        resolve();
      }
    });
  });

  // Make a guess with 1 typo to trigger close guess
  const closeGuessText = chosenWord.slice(0, -1) + 'z';
  console.log(`💬 Bob sending close guess: "${closeGuessText}"`);
  client2.emit('send_message', { text: closeGuessText });
  await closeGuessPromise;

  // 10. Test Guessing: Correct Guess
  const correctGuessPromise = new Promise<void>((resolve) => {
    client2.on('guess_result', (res) => {
      if (res.correct) {
        console.log(`✅ Correct guess confirmed! Points awarded: +${res.points}`);
        resolve();
      }
    });
  });

  console.log(`💬 Bob sending correct guess: "${chosenWord}"`);
  client2.emit('send_message', { text: chosenWord });
  await correctGuessPromise;

  // 11. Test Round End Broadcast
  const roundEndPromise = new Promise<void>((resolve) => {
    client1.on('round_end', (payload) => {
      console.log('✅ Round ended! Revealed word:', payload.word);
      console.log('✅ Final scores for turn:', payload.scores);
      resolve();
    });
  });
  await roundEndPromise;

  // Clean up
  client1.disconnect();
  client2.disconnect();
  server.close();

  console.log('\n🎉 ALL E2E INTEGRATION TESTS PASSED PERFECTLY! 100% SUCCESS!\n');
  process.exit(0);
}

runE2ETest().catch((err) => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
