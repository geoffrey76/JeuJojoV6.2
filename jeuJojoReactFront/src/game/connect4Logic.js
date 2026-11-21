// Règles du 4 à la suite et ordinateur adverse, sans React : on peut les tester avec `npm test`.
// Plateau de 7 colonnes x 6 lignes. Une case = colonne * 6 + ligne, la ligne 0 étant en BAS.
// Joueurs : 1 = humain (rouge), 2 = ordinateur (jaune), 0 = case vide.

export const COLS = 7;
export const ROWS = 6;
export const HUMAN = 1;
export const COMPUTER = 2;
export const LEVELS = ['easy', 'medium', 'hard'];

const WIN = 100000;
// Les colonnes du centre d'abord : l'élagage coupe beaucoup plus de branches
const ORDER = [3, 2, 4, 1, 5, 0, 6];
const other = (player) => 3 - player;
const at = (col, row) => col * ROWS + row;

// Toutes les lignes de 4 cases possibles (69), calculées une seule fois
const WINDOWS = [];
for (let col = 0; col < COLS; col++) {
  for (let row = 0; row < ROWS; row++) {
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const endCol = col + 3 * dc;
      const endRow = row + 3 * dr;
      if (endCol < 0 || endCol >= COLS || endRow < 0 || endRow >= ROWS) continue;
      WINDOWS.push([0, 1, 2, 3].map((k) => at(col + k * dc, row + k * dr)));
    }
  }
}

export function createBoard() {
  return { cells: new Array(COLS * ROWS).fill(0), heights: new Array(COLS).fill(0), moves: 0 };
}

export function cloneBoard(board) {
  return { cells: board.cells.slice(), heights: board.heights.slice(), moves: board.moves };
}

export const canPlay = (board, col) => col >= 0 && col < COLS && board.heights[col] < ROWS;
export const isFull = (board) => board.moves >= COLS * ROWS;
export const playableColumns = (board) => ORDER.filter((col) => canPlay(board, col));

// Pose un jeton (modifie le plateau) et renvoie la ligne où il tombe
export function play(board, col, player) {
  const row = board.heights[col];
  board.cells[at(col, row)] = player;
  board.heights[col] = row + 1;
  board.moves += 1;
  return row;
}

export function undo(board, col) {
  board.heights[col] -= 1;
  board.cells[at(col, board.heights[col])] = 0;
  board.moves -= 1;
}

// Si le jeton posé en (col, row) forme une ligne de 4 ou plus, renvoie les 4 cases [col, row] ; sinon null
export function winLineAt(board, col, row) {
  const player = board.cells[at(col, row)];
  if (!player) return null;
  for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const line = [[col, row]];
    for (const sign of [1, -1]) {
      let c = col + sign * dc;
      let r = row + sign * dr;
      while (c >= 0 && c < COLS && r >= 0 && r < ROWS && board.cells[at(c, r)] === player) {
        line.push([c, r]);
        c += sign * dc;
        r += sign * dr;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

const isWinningMove = (board, col) => winLineAt(board, col, board.heights[col] - 1) !== null;

// Note d'une position du point de vue de `player` (utilisée quand on arrête de chercher plus loin)
function evaluate(board, player) {
  const foe = other(player);
  const cells = board.cells;
  let score = 0;
  for (let row = 0; row < ROWS; row++) {
    const cell = cells[at(3, row)]; // la colonne centrale offre le plus de lignes possibles
    if (cell === player) score += 3;
    else if (cell === foe) score -= 3;
  }
  for (const w of WINDOWS) {
    let mine = 0;
    let theirs = 0;
    for (let k = 0; k < 4; k++) {
      const cell = cells[w[k]];
      if (cell === player) mine++;
      else if (cell === foe) theirs++;
    }
    if (theirs === 0) {
      if (mine === 3) score += 5;
      else if (mine === 2) score += 2;
    } else if (mine === 0) {
      if (theirs === 3) score -= 6;
      else if (theirs === 2) score -= 2;
    }
  }
  return score;
}

// Minimax sous la forme « negamax » avec élagage alpha-bêta. Renvoie la note pour `player`, qui joue.
function negamax(board, depth, alpha, beta, player, ply) {
  if (isFull(board)) return 0;
  if (depth === 0) return evaluate(board, player);
  let best = -Infinity;
  for (const col of ORDER) {
    if (!canPlay(board, col)) continue;
    play(board, col, player);
    const score = isWinningMove(board, col)
      ? WIN - ply // gagner vite vaut plus que gagner tard
      : -negamax(board, depth - 1, -beta, -alpha, other(player), ply + 1);
    undo(board, col);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Réglages par niveau : profondeur de réflexion (en coups), part d'erreur volontaire, blocage du coup gagnant adverse
export const LEVEL_SETTINGS = {
  easy: { depth: 0, blunder: 1, blockChance: 0.6 },
  medium: { depth: 3, blunder: 0.15, blockChance: 1 },
  hard: { depth: 6, blunder: 0, blockChance: 1 },
};

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// Colonnes où `player` gagne tout de suite
function winningColumns(board, player) {
  const wins = [];
  for (const col of playableColumns(board)) {
    play(board, col, player);
    if (isWinningMove(board, col)) wins.push(col);
    undo(board, col);
  }
  return wins;
}

// Choisit la colonne à jouer pour `player`. Ne modifie pas le plateau reçu.
export function chooseMove(original, player, level = 'medium', rng = Math.random) {
  const settings = LEVEL_SETTINGS[level] || LEVEL_SETTINGS.medium;
  const board = cloneBoard(original);
  const legal = playableColumns(board);
  if (legal.length === 0) return -1;

  // Un coup gagnant tout de suite est toujours joué, à tous les niveaux
  const wins = winningColumns(board, player);
  if (wins.length > 0) return wins[0];

  // Faute volontaire (niveaux facile et moyen) : un coup au hasard, qui évite si possible d'offrir la victoire
  const blocks = winningColumns(board, other(player));
  const mustBlock = blocks.length > 0 && rng() < settings.blockChance;
  if (mustBlock) return blocks[0];
  if (settings.depth === 0) return pick(legal, rng);
  if (rng() < settings.blunder) {
    const safe = legal.filter((col) => {
      play(board, col, player);
      const gift = winningColumns(board, other(player)).length > 0;
      undo(board, col);
      return !gift;
    });
    return pick(safe.length > 0 ? safe : legal, rng);
  }

  // Recherche : on note chaque colonne et on garde la meilleure (au hasard entre les ex æquo)
  let best = -Infinity;
  let candidates = [];
  for (const col of legal) {
    play(board, col, player);
    // Fenêtre (best - 1) : une note égale au meilleur score reste exacte, ce qui permet de départager les ex æquo
    const score = -negamax(board, settings.depth - 1, -Infinity, -(best - 1), other(player), 1);
    undo(board, col);
    if (score > best) {
      best = score;
      candidates = [col];
    } else if (score === best) {
      candidates.push(col);
    }
  }
  return pick(candidates, rng);
}
