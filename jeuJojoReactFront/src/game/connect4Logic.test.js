// Lancer avec : npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBoard, cloneBoard, play, undo, canPlay, isFull, winLineAt, playableColumns, chooseMove,
  COLS, ROWS, HUMAN, COMPUTER, LEVELS,
} from './connect4Logic.js';

function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Construit un plateau : une liste de [colonne, joueur] jouée dans l'ordre
function boardOf(moves) {
  const board = createBoard();
  for (const [col, player] of moves) play(board, col, player);
  return board;
}
const lastWin = (board, col) => winLineAt(board, col, board.heights[col] - 1);

test('un jeton tombe tout en bas, puis s\'empile', () => {
  const board = createBoard();
  assert.equal(play(board, 3, HUMAN), 0);
  assert.equal(play(board, 3, COMPUTER), 1);
  assert.equal(board.heights[3], 2);
  undo(board, 3);
  assert.equal(board.heights[3], 1);
  assert.equal(board.moves, 1);
});

test('une colonne pleine n\'accepte plus de jeton', () => {
  const board = createBoard();
  for (let i = 0; i < ROWS; i++) play(board, 0, i % 2 ? COMPUTER : HUMAN);
  assert.equal(canPlay(board, 0), false);
  assert.equal(canPlay(board, 1), true);
  assert.ok(!playableColumns(board).includes(0));
});

test('détecte les quatre directions', () => {
  // horizontal
  assert.ok(lastWin(boardOf([[0, 1], [1, 1], [2, 1], [3, 1]]), 3));
  // vertical
  assert.ok(lastWin(boardOf([[2, 2], [2, 2], [2, 2], [2, 2]]), 2));
  // diagonale montante : (0,0) (1,1) (2,2) (3,3)
  const up = boardOf([[0, 1], [1, 2], [1, 1], [2, 2], [2, 2], [2, 1], [3, 2], [3, 2], [3, 2], [3, 1]]);
  assert.equal(up.cells[3 * ROWS + 3], 1);
  assert.equal(lastWin(up, 3).length, 4);
  // diagonale descendante : (3,0) (2,1) (1,2) (0,3)
  const down = boardOf([[3, 1], [2, 2], [2, 1], [1, 2], [1, 2], [1, 1], [0, 2], [0, 2], [0, 2], [0, 1]]);
  assert.equal(lastWin(down, 0).length, 4);
});

test('trois jetons alignés ne suffisent pas, et un jeton adverse coupe la ligne', () => {
  assert.equal(lastWin(boardOf([[0, 1], [1, 1], [2, 1]]), 2), null);
  assert.equal(lastWin(boardOf([[0, 1], [1, 2], [2, 1], [3, 1]]), 3), null);
});

test('plateau plein = match nul', () => {
  const board = createBoard();
  // Remplissage sans quatre alignés : colonnes en motifs décalés de deux en deux
  const pattern = [
    [1, 1, 2, 2, 1, 1],
    [2, 2, 1, 1, 2, 2],
    [1, 1, 2, 2, 1, 1],
    [2, 2, 1, 1, 2, 2],
    [1, 1, 2, 2, 1, 1],
    [2, 2, 1, 1, 2, 2],
    [1, 1, 2, 2, 1, 1],
  ];
  for (let col = 0; col < COLS; col++) for (let row = 0; row < ROWS; row++) play(board, col, pattern[col][row]);
  assert.ok(isFull(board));
  for (let col = 0; col < COLS; col++) assert.equal(lastWin(board, col), null);
  assert.equal(chooseMove(board, COMPUTER, 'hard'), -1);
});

test('chooseMove ne modifie pas le plateau reçu', () => {
  const board = boardOf([[3, 1], [3, 2], [2, 1]]);
  const before = JSON.stringify(board);
  for (const level of LEVELS) chooseMove(board, COMPUTER, level, seeded(3));
  assert.equal(JSON.stringify(board), before);
});

test('à tous les niveaux, l\'ordinateur gagne quand il le peut', () => {
  // L'ordinateur a trois jetons sur la rangée du bas ; la colonne 3 gagne
  const board = boardOf([[0, 2], [0, 1], [1, 2], [1, 1], [2, 2], [4, 1]]);
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 20; seed++) {
      assert.equal(chooseMove(board, COMPUTER, level, seeded(seed)), 3, `niveau ${level}`);
    }
  }
});

test('niveaux moyen et difficile : bloquent le coup gagnant adverse', () => {
  // L'humain a trois jetons en bas (colonnes 0, 1, 2) : il faut jouer en 3
  const board = boardOf([[0, 1], [1, 1], [2, 1], [6, 2], [6, 2]]);
  assert.equal(chooseMove(board, COMPUTER, 'hard', seeded(5)), 3);
  // moyen : le blocage vient de la recherche, sauf faute volontaire (15 %) — on vérifie que ça tient la plupart du temps
  let blocked = 0;
  for (let seed = 1; seed <= 100; seed++) if (chooseMove(board, COMPUTER, 'medium', seeded(seed)) === 3) blocked++;
  assert.ok(blocked >= 75, `bloque ${blocked}/100`);
});

test('niveau difficile : ne joue pas un coup qui offre la victoire', () => {
  // L'humain a trois jetons sur la 2e rangée (colonnes 0, 1, 2). Si l'ordinateur joue en colonne 3,
  // il remplit la case du dessous et l'humain gagne en (3, 1) : c'est le piège à éviter.
  const board = boardOf([[0, 2], [1, 1], [2, 2], [0, 1], [1, 1], [2, 1]]);
  for (let seed = 1; seed <= 20; seed++) {
    assert.notEqual(chooseMove(board, COMPUTER, 'hard', seeded(seed)), 3);
  }
});

test('niveau difficile : trouve une victoire forcée en trois coups (trois ouverts)', () => {
  // L'ordinateur a 2 et 3 sur la rangée du bas, avec 0, 1, 4, 5 libres :
  // jouer en 1 ou en 4 crée un trois ouvert aux deux bouts, impossible à parer
  const board = boardOf([[2, 2], [2, 1], [3, 2], [3, 1], [6, 1]]);
  const col = chooseMove(board, COMPUTER, 'hard', seeded(4));
  assert.ok(col === 1 || col === 4, `a joué ${col}`);
});

test('parties complètes : tous les coups sont valides, et chaque niveau finit par terminer la partie', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 10; seed++) {
      const rng = seeded(seed * 17);
      const board = createBoard();
      let player = seed % 2 ? HUMAN : COMPUTER;
      let finished = false;
      for (let turn = 0; turn < COLS * ROWS; turn++) {
        const playableBefore = playableColumns(board);
        // le « humain » joue au hasard ; l'ordinateur utilise son niveau
        const col = player === HUMAN ? playableBefore[Math.floor(rng() * playableBefore.length)] : chooseMove(board, player, level, rng);
        assert.ok(playableBefore.includes(col), `coup invalide (${level})`);
        play(board, col, player);
        if (lastWin(board, col) || isFull(board)) { finished = true; break; }
        player = 3 - player;
      }
      assert.ok(finished, 'la partie doit se terminer');
    }
  }
});

test('niveau difficile : bat presque toujours un joueur qui joue au hasard', () => {
  let wins = 0;
  const games = 20;
  for (let seed = 1; seed <= games; seed++) {
    const rng = seeded(seed * 101);
    const board = createBoard();
    let player = seed % 2 ? HUMAN : COMPUTER;
    for (let turn = 0; turn < COLS * ROWS; turn++) {
      const playable = playableColumns(board);
      const col = player === HUMAN ? playable[Math.floor(rng() * playable.length)] : chooseMove(board, player, 'hard', rng);
      play(board, col, player);
      if (lastWin(board, col)) { if (player === COMPUTER) wins++; break; }
      if (isFull(board)) break;
      player = 3 - player;
    }
  }
  assert.ok(wins >= 19, `victoires : ${wins}/${games}`);
});

test('cloneBoard donne une vraie copie', () => {
  const board = boardOf([[1, 1]]);
  const copy = cloneBoard(board);
  play(copy, 1, COMPUTER);
  assert.equal(board.moves, 1);
  assert.equal(board.heights[1], 1);
});
