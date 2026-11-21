import React, { useEffect, useReducer } from 'react';
import useSound from 'use-sound';
import tadaSound from '../sounds/tada-fanfare-a-6313.mp3';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
    COLS, ROWS, HUMAN, COMPUTER, createBoard, cloneBoard, canPlay, isFull, play, winLineAt, chooseMove,
} from '../game/connect4Logic';
import '../css/puissance4Solo.css';

const THINK_MS = 500; // petite pause avant que l'ordinateur joue, pour que ce soit naturel
const LEVEL_LABELS = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
const LEVEL_HINTS = {
    easy: 'Il joue surtout au hasard.',
    medium: 'Il réfléchit à quelques coups, mais il peut se tromper.',
    hard: 'Il réfléchit loin et ne fait pas de cadeau.',
};
const ROWS_FROM_TOP = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i); // la ligne du haut est dessinée en premier

const initialState = {
    phase: 'setup', // setup | playing | over
    level: 'medium',
    humanStarts: true,
    board: createBoard(),
    turn: HUMAN,
    last: null, // dernier jeton posé { col, row, id } : sert à l'animation de chute
    winLine: null, // les 4 cases gagnantes
    winner: 0, // 0 = personne (match nul ou partie en cours)
};

function reducer(state, action) {
    switch (action.type) {
        case 'choose': // choix du niveau ou de celui qui commence, avant la partie
            return { ...state, level: action.level ?? state.level, humanStarts: action.humanStarts ?? state.humanStarts };
        case 'start': // nouvelle partie avec les mêmes réglages
            return {
                ...initialState,
                phase: 'playing',
                level: state.level,
                humanStarts: state.humanStarts,
                board: createBoard(),
                turn: state.humanStarts ? HUMAN : COMPUTER,
            };
        case 'move': {
            // `player` évite qu'un coup soit joué deux fois ou par le mauvais joueur
            if (state.phase !== 'playing' || state.turn !== action.player || !canPlay(state.board, action.col)) return state;
            const board = cloneBoard(state.board);
            const row = play(board, action.col, state.turn);
            const last = { col: action.col, row, id: board.moves };
            const winLine = winLineAt(board, action.col, row);
            if (winLine) return { ...state, board, last, winLine, winner: state.turn, phase: 'over' };
            if (isFull(board)) return { ...state, board, last, phase: 'over' };
            return { ...state, board, last, turn: state.turn === HUMAN ? COMPUTER : HUMAN };
        }
        case 'menu': // retour au choix du niveau
            return { ...initialState, level: state.level, humanStarts: state.humanStarts };
        default:
            return state;
    }
}

const Puissance4Solo = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [playWinSound] = useSound(tadaSound);
    const { phase, level, humanStarts, board, turn, last, winLine, winner } = state;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    //-------------------- Tour de l'ordinateur : il réfléchit après une courte pause ------------------
    useEffect(() => {
        if (phase !== 'playing' || turn !== COMPUTER) return undefined;
        const timer = setTimeout(() => {
            dispatch({ type: 'move', col: chooseMove(board, COMPUTER, level), player: COMPUTER });
        }, THINK_MS);
        return () => clearTimeout(timer);
    }, [phase, turn, board, level]);

    useEffect(() => {
        if (phase === 'over' && winner === HUMAN) playWinSound();
    }, [phase, winner, playWinSound]);

    //-------------------- Écran de départ : niveau et premier joueur ------------------
    if (phase === 'setup') {
        return (
            <div id="mainPart" className="p4solo">
                <Header />
                <main>
                    <h1>4 à la suite</h1>
                    <p>Joue contre l'ordinateur</p>
                    <fieldset className="p4Choice">
                        <legend>Niveau</legend>
                        {Object.keys(LEVEL_LABELS).map((key) => (
                            <button key={key} type="button" aria-pressed={level === key}
                                className={level === key ? 'p4Chosen' : undefined}
                                onClick={() => dispatch({ type: 'choose', level: key })}>
                                {LEVEL_LABELS[key]}
                            </button>
                        ))}
                        <p className="p4Hint">{LEVEL_HINTS[level]}</p>
                    </fieldset>
                    <fieldset className="p4Choice">
                        <legend>Qui commence ?</legend>
                        <button type="button" aria-pressed={humanStarts}
                            className={humanStarts ? 'p4Chosen' : undefined}
                            onClick={() => dispatch({ type: 'choose', humanStarts: true })}>
                            Moi
                        </button>
                        <button type="button" aria-pressed={!humanStarts}
                            className={!humanStarts ? 'p4Chosen' : undefined}
                            onClick={() => dispatch({ type: 'choose', humanStarts: false })}>
                            L'ordinateur
                        </button>
                    </fieldset>
                    <button type="button" className="p4Main" onClick={() => dispatch({ type: 'start' })} autoFocus>Jouer</button>
                </main>
                <Footer />
            </div>
        );
    }

    //-------------------- La partie ------------------
    const humanCanPlay = phase === 'playing' && turn === HUMAN;
    const winCells = new Set((winLine || []).map(([c, r]) => `${c}-${r}`));
    let status = turn === HUMAN ? 'À toi de jouer !' : "L'ordinateur réfléchit…";
    if (phase === 'over') {
        status = winner === HUMAN ? 'Bravo, tu as gagné !' : winner === COMPUTER ? "L'ordinateur a gagné." : 'Match nul.';
    }

    return (
        <div id="mainPart" className="p4solo">
            <Header />
            <main>
                <p className="p4Status" aria-live="polite">{status}</p>
                <div className="p4Board" role="group" aria-label="Plateau : choisis une colonne pour y poser ton jeton">
                    {Array.from({ length: COLS }, (_, col) => (
                        <button key={col} type="button" className="p4Col"
                            disabled={!humanCanPlay || !canPlay(board, col)}
                            aria-label={`Colonne ${col + 1}`}
                            onClick={() => dispatch({ type: 'move', col, player: HUMAN })}>
                            {ROWS_FROM_TOP.map((row) => {
                                const owner = board.cells[col * ROWS + row];
                                const classes = ['p4Cell'];
                                if (owner === HUMAN) classes.push('p4Red');
                                if (owner === COMPUTER) classes.push('p4Yellow');
                                if (last && last.col === col && last.row === row) classes.push('p4Drop');
                                if (winCells.has(`${col}-${row}`)) classes.push('p4Win');
                                // `key` change à chaque coup pour le dernier jeton : l'animation de chute repart
                                const isLast = last && last.col === col && last.row === row;
                                return (
                                    <span key={isLast ? `${row}-${last.id}` : row} className={classes.join(' ')}
                                        style={isLast ? { '--fall': ROWS - 1 - row } : undefined} />
                                );
                            })}
                        </button>
                    ))}
                </div>
                <p className="p4Info">Niveau : {LEVEL_LABELS[level]}</p>
                <div className="p4Actions">
                    {phase === 'over' && (
                        <button type="button" className="p4Main" onClick={() => dispatch({ type: 'start' })} autoFocus>Rejouer</button>
                    )}
                    <button type="button" className="p4Second" onClick={() => dispatch({ type: 'menu' })}>Changer de niveau</button>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Puissance4Solo;
