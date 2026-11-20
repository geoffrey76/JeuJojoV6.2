import { useCallback, useEffect, useReducer } from 'react';
import { createGame, flip, isMatch, resolve } from '../game/memoryLogic';

const MATCH_DELAY = 800; // temps pour voir la paire trouvée
const MISMATCH_DELAY = 1200; // temps pour mémoriser deux cartes différentes

function reducer(state, action) {
  switch (action.type) {
    case 'flip':
      return flip(state, action.index);
    case 'resolve':
      return resolve(state);
    case 'reset':
      return createGame(state.players);
    default:
      return state;
  }
}

export function useMemoryGame(players = 1) {
  const [state, dispatch] = useReducer(reducer, players, createGame);

  // Quand deux cartes sont retournées, on attend un peu puis on les compare
  useEffect(() => {
    if (state.selected.length !== 2) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'resolve' }), isMatch(state) ? MATCH_DELAY : MISMATCH_DELAY);
    return () => clearTimeout(timer);
  }, [state]);

  const flipCard = useCallback((index) => dispatch({ type: 'flip', index }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return { state, flipCard, reset };
}
