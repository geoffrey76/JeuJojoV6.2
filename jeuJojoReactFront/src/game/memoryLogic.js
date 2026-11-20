// Règles du Memory, sans React : des fonctions pures faciles à tester (npm test).
// Une carte = { pairId, status }, avec status = 'hidden' | 'flipped' | 'matched'.

export const PAIRS = 12;

// Mélange de Fisher-Yates : chaque ordre est équiprobable
export function shuffle(array, random = Math.random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createGame(players = 1, random = Math.random) {
  const pairIds = [];
  for (let pair = 0; pair < PAIRS; pair++) pairIds.push(pair, pair);
  return {
    players,
    cards: shuffle(pairIds, random).map((pairId) => ({ pairId, status: 'hidden' })),
    selected: [], // indices des cartes retournées en attente de comparaison
    attempts: 0, // une tentative = deux cartes retournées (réussie ou non)
    mistakes: 0, // seulement les tentatives ratées : c'est le score du Memory 1 joueur
    current: 0, // joueur dont c'est le tour (0 = A, 1 = B)
    scores: Array(players).fill(0),
    wonPairs: Array.from({ length: players }, () => []),
  };
}

// Retourne une carte. Ignoré si la carte n'est pas cachée ou si deux cartes sont déjà retournées.
export function flip(state, index) {
  const card = state.cards[index];
  if (!card || card.status !== 'hidden' || state.selected.length >= 2) return state;
  return {
    ...state,
    cards: state.cards.map((c, i) => (i === index ? { ...c, status: 'flipped' } : c)),
    selected: [...state.selected, index],
  };
}

export function isMatch(state) {
  if (state.selected.length !== 2) return false;
  const [a, b] = state.selected;
  return state.cards[a].pairId === state.cards[b].pairId;
}

// Compare les deux cartes retournées : paire trouvée (le joueur rejoue) ou cartes recachées (au suivant).
export function resolve(state) {
  if (state.selected.length !== 2) return state;
  const [a, b] = state.selected;
  const match = isMatch(state);
  const cards = state.cards.map((c, i) =>
    i === a || i === b ? { ...c, status: match ? 'matched' : 'hidden' } : c
  );
  if (!match) {
    return {
      ...state,
      cards,
      selected: [],
      attempts: state.attempts + 1,
      mistakes: state.mistakes + 1,
      current: (state.current + 1) % state.players,
    };
  }
  const scores = [...state.scores];
  scores[state.current] += 1;
  const wonPairs = state.wonPairs.map((list, player) =>
    player === state.current ? [...list, state.cards[a].pairId] : list
  );
  return { ...state, cards, selected: [], attempts: state.attempts + 1, scores, wonPairs };
}

export const isFinished = (state) => state.cards.every((c) => c.status === 'matched');

// Index du gagnant, ou null en cas d'égalité (2 joueurs)
export function getWinner(state) {
  const best = Math.max(...state.scores);
  const leaders = state.scores.flatMap((s, i) => (s === best ? [i] : []));
  return leaders.length === 1 ? leaders[0] : null;
}
