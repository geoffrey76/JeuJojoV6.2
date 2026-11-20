import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MemoryCard from '../components/MemoryCard';
import { IMAGES } from '../game/memoryImages';
import { getWinner, isFinished } from '../game/memoryLogic';
import { useMemoryGame } from '../hooks/useMemoryGame';
import { useShuffleAnimation } from '../hooks/useShuffleAnimation';
import '../css/memoryCard.css';
import '../css/memory2Players.css';

// Avant la partie : 'intro' (cartes cachées) -> 'preview' (aperçu des 12 images)
// -> 'shuffle' (les cartes bougent) -> 'play'
const PLAYERS = ['A', 'B'];

const Memory2PlayersReact = () => {
    const { state, flipCard, reset } = useMemoryGame(2);
    const [phase, setPhase] = useState('intro');
    const [round, setRound] = useState(0);
    const gridRef = useRef(null);
    const finished = isFinished(state);
    useShuffleAnimation(gridRef, phase === 'shuffle');

    useEffect(() => {
        window.scrollTo(0, 0);
        const timers = [
            setTimeout(() => setPhase('preview'), 400),
            setTimeout(() => setPhase('shuffle'), 2800),
            setTimeout(() => setPhase('play'), 6000),
        ];
        return () => timers.forEach(clearTimeout);
    }, [round]);

    const restart = () => {
        reset();
        setPhase('intro');
        setRound((r) => r + 1);
    };

    const winner = finished ? getWinner(state) : null;
    const winnerText = winner === null ? 'ÉGALITÉ' : `VICTOIRE DU JOUEUR ${PLAYERS[winner]}`;

    // Pendant l'aperçu, les cartes voisines montrent la même image (ce n'est pas la vraie disposition)
    const cardView = (card, i) =>
        phase === 'preview'
            ? { image: IMAGES[Math.floor(i / 2)], status: 'flipped' }
            : { image: IMAGES[card.pairId], status: phase === 'play' ? card.status : 'hidden' };

    const playerClass = (player) =>
        `player${phase === 'play' && !finished && state.current === player ? ' active' : ''}`;

    return (
        <div id="mainPartMemory2">
            <Header />
            <aside id="asideLeft" className="aside">
                <div id="wonCardsAGrid">
                    {state.wonPairs[0].map((pairId) => (
                        <div key={pairId} className="wonCardsASmall" style={{ backgroundImage: `url(${IMAGES[pairId]})` }} />
                    ))}
                </div>
                <p id="playerA" className={playerClass(0)}>Joueur A : {state.scores[0]}</p>
            </aside>
            <main id="memoryGrid" ref={gridRef} className={`memoryGrid${finished ? ' victory' : ''}`}>
                {finished ? (
                    <>
                        <p>{winnerText}</p>
                        <button type="button" id="restartButton" onClick={restart}>RECOMMENCER</button>
                    </>
                ) : (
                    state.cards.map((card, i) => {
                        const view = cardView(card, i);
                        return (
                            <MemoryCard
                                key={i}
                                index={i}
                                image={view.image}
                                status={view.status}
                                onClick={() => phase === 'play' && flipCard(i)}
                            />
                        );
                    })
                )}
            </main>
            <aside id="asideRight" className="aside">
                <p id="playerB" className={playerClass(1)}>Joueur B : {state.scores[1]}</p>
                <div id="wonCardsBGrid">
                    {state.wonPairs[1].map((pairId) => (
                        <div key={pairId} className="wonCardsBSmall" style={{ backgroundImage: `url(${IMAGES[pairId]})` }} />
                    ))}
                </div>
            </aside>
            <Footer />
        </div>
    );
};

export default Memory2PlayersReact;
