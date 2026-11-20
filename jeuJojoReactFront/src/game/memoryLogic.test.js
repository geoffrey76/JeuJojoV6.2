// Lancer avec : npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, flip, resolve, isMatch, isFinished, getWinner, shuffle, PAIRS } from './memoryLogic.js';

// Jeu non mélangé : les cartes 0 et 1 forment la paire 0, 2 et 3 la paire 1, etc.
const ordered = (players = 1) => createGame(players, () => 0.999999);
const orderedPairs = (state) => state.cards.map((c) => c.pairId);

test('le mélange garde les 24 cartes, 2 par paire', () => {
  const game = createGame(1);
  assert.equal(game.cards.length, PAIRS * 2);
  for (let pair = 0; pair < PAIRS; pair++) {
    assert.equal(game.cards.filter((c) => c.pairId === pair).length, 2);
  }
});

test('shuffle ne modifie pas le tableau de départ', () => {
  const source = [1, 2, 3, 4];
  shuffle(source);
  assert.deepEqual(source, [1, 2, 3, 4]);
});

test('on ne peut pas retourner trois cartes', () => {
  let game = ordered();
  game = flip(flip(flip(game, 0), 1), 2);
  assert.equal(game.selected.length, 2);
  assert.equal(game.cards[2].status, 'hidden');
});

test('on ne peut pas retourner deux fois la même carte', () => {
  let game = flip(flip(ordered(), 0), 0);
  assert.equal(game.selected.length, 1);
});

test('deux cartes différentes se recachent et on passe au joueur suivant', () => {
  let game = ordered(2);
  const pairs = orderedPairs(game);
  const first = 0;
  const second = pairs.findIndex((p, i) => i !== first && p !== pairs[first]);
  game = flip(flip(game, first), second);
  assert.equal(isMatch(game), false);
  game = resolve(game);
  assert.equal(game.cards[first].status, 'hidden');
  assert.equal(game.cards[second].status, 'hidden');
  assert.equal(game.attempts, 1);
  assert.equal(game.current, 1);
  assert.deepEqual(game.scores, [0, 0]);
});

test('une paire trouvée rapporte un point et le joueur rejoue', () => {
  let game = ordered(2);
  const pairs = orderedPairs(game);
  const first = 0;
  const second = pairs.findIndex((p, i) => i !== first && p === pairs[first]);
  game = resolve(flip(flip(game, first), second));
  assert.equal(game.cards[first].status, 'matched');
  assert.equal(game.attempts, 1);
  assert.equal(game.current, 0);
  assert.deepEqual(game.scores, [1, 0]);
  assert.deepEqual(game.wonPairs[0], [pairs[first]]);
});

test('une partie gagnée en 12 tentatives parfaites', () => {
  let game = createGame(1);
  for (let pair = 0; pair < PAIRS; pair++) {
    const [a, b] = game.cards.flatMap((c, i) => (c.pairId === pair ? [i] : []));
    game = resolve(flip(flip(game, a), b));
  }
  assert.equal(isFinished(game), true);
  assert.equal(game.attempts, PAIRS);
});

test('le gagnant et l’égalité', () => {
  const base = createGame(2);
  assert.equal(getWinner({ ...base, scores: [7, 5] }), 0);
  assert.equal(getWinner({ ...base, scores: [4, 8] }), 1);
  assert.equal(getWinner({ ...base, scores: [6, 6] }), null);
});

test('resolve sans deux cartes ne fait rien', () => {
  const game = flip(createGame(1), 0);
  assert.equal(resolve(game), game);
});

test('une paire trouvée n’ajoute pas d’erreur, une paire ratée en ajoute une', () => {
  let game = ordered();
  const pairs = orderedPairs(game);
  const second = pairs.findIndex((p, i) => i !== 0 && p === pairs[0]);
  game = resolve(flip(flip(game, 0), second));
  assert.equal(game.attempts, 1);
  assert.equal(game.mistakes, 0);

  const other = game.cards.findIndex((c) => c.status === 'hidden');
  const different = game.cards.findIndex((c, i) => c.status === 'hidden' && c.pairId !== game.cards[other].pairId);
  game = resolve(flip(flip(game, other), different));
  assert.equal(game.attempts, 2);
  assert.equal(game.mistakes, 1);
});

test('une partie parfaite fait 0 erreur', () => {
  let game = createGame(1);
  for (let pair = 0; pair < PAIRS; pair++) {
    const [a, b] = game.cards.flatMap((c, i) => (c.pairId === pair ? [i] : []));
    game = resolve(flip(flip(game, a), b));
  }
  assert.equal(game.mistakes, 0);
});
