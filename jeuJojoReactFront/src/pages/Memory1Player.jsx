import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MemoryCard from '../components/MemoryCard';
import { IMAGES } from '../game/memoryImages';
import { isFinished } from '../game/memoryLogic';
import { useMemoryGame } from '../hooks/useMemoryGame';
import { useShuffleAnimation } from '../hooks/useShuffleAnimation';
import '../css/memoryCard.css';
import '../css/memory.css';

const SHUFFLE_MS = 3000; // durée du mélange avant de pouvoir jouer
const plural = (n) => (n > 1 ? 's' : '');

const Memory1Player = () => {
    const { state, flipCard, reset } = useMemoryGame(1);
    const gridRef = useRef(null);
    const [shuffling, setShuffling] = useState(true);
    // Le score est le nombre d'erreurs (paires ratées) : moins il y en a, mieux c'est. null = pas encore de record.
    const [bestScore, setBestScore] = useState(null);
    const [bestScoreName, setBestScoreName] = useState('');
    const [pseudo, setPseudo] = useState('');
    const [scoreSent, setScoreSent] = useState(false);

    const finished = isFinished(state);
    const isRecord = finished && (bestScore === null || state.mistakes < bestScore);

    useShuffleAnimation(gridRef, shuffling);
    useEffect(() => {
        if (!shuffling) return undefined;
        const timer = setTimeout(() => setShuffling(false), SHUFFLE_MS);
        return () => clearTimeout(timer);
    }, [shuffling]);

    //-------------------- Récupère le meilleur score (le jeu n'attend pas la réponse) ------------------
    useEffect(() => {
        window.scrollTo(0, 0);
        axios.get('/api/getBestScore')
            .then((response) => {
                const data = response.data;
                if (Array.isArray(data) && data.length !== 0) {
                    const name = data[0].bestScoreName;
                    setBestScoreName(Array.isArray(name) ? name.join('') : name);
                    setBestScore(data[0].bestScore);
                }
            })
            .catch(() => {}); // si le serveur dort ou est en panne, on joue quand même
    }, []);

    //-------------------- Envoie le nouveau record ------------------------------------
    const sendBestScore = async (e) => {
        e.preventDefault();
        const name = pseudo.trim() || 'Anonyme';
        try {
            await axios.post('/api/newBestScore', { bestScore: state.mistakes, bestScoreName: name });
            setBestScore(state.mistakes);
            setBestScoreName(name);
        } catch (error) {
            // le record n'a pas pu être enregistré ; on laisse quand même rejouer
        }
        setScoreSent(true);
    };

    const restart = () => {
        reset();
        setShuffling(true);
        setPseudo('');
        setScoreSent(false);
        window.scrollTo(0, 0);
    };

    return (
        <div id="mainPart" className="memory1">
            <Header />
            {!finished ? (
                <div id="centerPart">
                    <aside id="attempsNumberContainer">
                        <p>Erreur{plural(state.mistakes)}:</p>
                        <p id="attempsNumber" style={state.mistakes > 99 ? { fontSize: '2em' } : undefined}>{state.mistakes}</p>
                        <p>Meilleur Score:</p>
                        <p id="bestScoreName">{bestScoreName}</p>
                        <p id="bestScore">{bestScore === null ? '-' : bestScore}</p>
                    </aside>
                    <main id="memoryGrid" ref={gridRef} className="memoryGrid">
                        {state.cards.map((card, i) => (
                            <MemoryCard key={i} index={i} image={IMAGES[card.pairId]} status={card.status} onClick={() => !shuffling && flipCard(i)} />
                        ))}
                    </main>
                </div>
            ) : (
                <div id="victory">
                    <p>{state.mistakes === 0 ? 'Partie parfaite : aucune erreur !' : `Tu as fait ${state.mistakes} erreur${plural(state.mistakes)}`}</p>
                    {isRecord && !scoreSent ? (
                        <form id="bestScoreChange" onSubmit={sendBestScore}>
                            <label htmlFor="pseudo">Tu as le meilleur score. Entre ton pseudo</label>
                            <input id="pseudo" type="text" value={pseudo} maxLength={20} onChange={(e) => setPseudo(e.target.value)} autoFocus />
                            <button type="submit">OK</button>
                        </form>
                    ) : (
                        <button type="button" id="restartButtonMemory1" onClick={restart}>Recommencer</button>
                    )}
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Memory1Player;
