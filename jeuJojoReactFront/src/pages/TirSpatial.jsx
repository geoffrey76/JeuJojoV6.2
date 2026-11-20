import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { WIDTH, HEIGHT, createGame, step, scrollStars, getScore, START_LIVES, TIME_POINTS_PER_SECOND } from '../game/shooterLogic';
import { draw } from '../game/shooterRender';
import { playShot } from '../game/sound';
import musicUrl from '../sounds/dream-protocol-space-invaders-classic-arcade-game-116826.mp3';
import '../css/tirSpatial.css';

const BEST_KEY = 'tirSpatialBest';

const readBest = () => {
    try {
        return parseInt(window.localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (error) {
        return 0; // stockage indisponible : on joue quand même
    }
};
const saveBest = (score) => {
    try {
        window.localStorage.setItem(BEST_KEY, String(score));
    } catch (error) {
        // rien à faire
    }
};
const MUSIC_KEY = 'tirSpatialMusic';
const SFX_KEY = 'tirSpatialSfx';
const MUSIC_VOLUME = 0.35;
const TOP_SIZE = 10;
const PIXABAY_USER = 'https://pixabay.com/fr/users/dream-protocol-9556087/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116826';
const PIXABAY_SITE = 'https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116826';

// Réglage son/musique mémorisé sur l'appareil (activé par défaut)
const readFlag = (key) => {
    try {
        return window.localStorage.getItem(key) !== 'off';
    } catch (error) {
        return true;
    }
};
const saveFlag = (key, on) => {
    try {
        window.localStorage.setItem(key, on ? 'on' : 'off');
    } catch (error) {
        // rien à faire
    }
};
const formatTime = (seconds) => `${Math.floor(seconds / 60)} min ${String(Math.floor(seconds % 60)).padStart(2, '0')} s`;

// Classement : le rang n°1 en haut. `highlight` = rang (0 à 9) à mettre en valeur.
const TopList = ({ scores, highlight = -1 }) => {
    if (scores === null) return <p className="tirHelp">Chargement du classement…</p>;
    if (scores === 'error') return <p className="tirHelp">Classement indisponible pour le moment.</p>;
    if (scores.length === 0) return <p className="tirHelp">Aucun score pour l'instant : sois le premier !</p>;
    return (
        <ol className="tirTop">
            {scores.slice(0, TOP_SIZE).map((entry, i) => (
                <li key={i} className={i === highlight ? 'tirTopMine' : undefined}>
                    <span className="tirTopName">{entry.name}</span>
                    <span className="tirTopScore">{entry.score}</span>
                </li>
            ))}
        </ol>
    );
};

const TirSpatial = () => {
    const canvasRef = useRef(null);
    const gameRef = useRef(createGame());
    const inputRef = useRef({ left: false, right: false, fire: false, targetX: null });
    const pointerDownRef = useRef(false);
    const statusRef = useRef('ready');
    const musicRef = useRef(null);
    const sfxRef = useRef(true);
    const [status, setStatus] = useState('ready'); // ready | playing | paused | over | scores
    const [result, setResult] = useState(null);
    const [musicOn, setMusicOn] = useState(() => readFlag(MUSIC_KEY));
    const [sfxOn, setSfxOn] = useState(() => readFlag(SFX_KEY));
    // Top 10 : null = en chargement, 'error' = serveur indisponible
    const [topScores, setTopScores] = useState(null);
    const [pseudo, setPseudo] = useState('');
    const [scoreSent, setScoreSent] = useState(false);
    const [myRank, setMyRank] = useState(-1);

    const changeStatus = useCallback((next) => {
        statusRef.current = next;
        setStatus(next);
    }, []);

    //-------------------- Top 10 (MongoDB) : le jeu n'attend jamais la réponse ------------------
    const loadTopScores = useCallback(() => {
        setTopScores(null);
        axios.get('/api/tirSpatial/scores')
            .then((response) => setTopScores(Array.isArray(response.data) ? response.data : 'error'))
            .catch(() => setTopScores('error')); // serveur endormi ou en panne : on joue quand même
    }, []);

    const sendScore = async (e) => {
        e.preventDefault();
        const name = pseudo.trim() || 'Anonyme';
        try {
            const response = await axios.post('/api/tirSpatial/scores', { score: result.score, name });
            const list = response.data.scores;
            setTopScores(list);
            setMyRank(list.findIndex((entry) => entry.name === name && entry.score === result.score));
        } catch (error) {
            if (Array.isArray(error.response?.data?.scores)) setTopScores(error.response.data.scores);
        }
        setScoreSent(true);
    };

    const showScores = () => {
        loadTopScores();
        setMyRank(-1);
        changeStatus('scores');
    };

    const startGame = () => {
        gameRef.current = createGame();
        setPseudo('');
        setScoreSent(false);
        setMyRank(-1);
        inputRef.current = { left: false, right: false, fire: false, targetX: null };
        pointerDownRef.current = false;
        setResult(null);
        changeStatus('playing');
    };

    //-------------------- Boucle du jeu : avance, puis dessine ------------------------
    useEffect(() => {
        window.scrollTo(0, 0);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const ratio = Math.min(window.devicePixelRatio || 1, 2); // image nette sur écrans haute définition
        canvas.width = WIDTH * ratio;
        canvas.height = HEIGHT * ratio;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

        const finish = (game) => {
            const score = getScore(game);
            const previousBest = readBest();
            const isBest = score > previousBest;
            if (isBest) saveBest(score);
            setResult({
                score,
                time: game.time,
                level: game.level,
                kills: game.kills,
                best: Math.max(score, previousBest),
                isBest,
            });
            setPseudo('');
            setScoreSent(false);
            setMyRank(-1);
            loadTopScores();
            changeStatus('over');
        };

        let frame = 0;
        let last = performance.now();
        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            const game = gameRef.current;
            if (statusRef.current === 'playing') {
                const shotsBefore = game.shots;
                step(game, dt, inputRef.current);
                if (game.shots > shotsBefore && sfxRef.current) playShot();
                if (game.over) finish(game);
            } else {
                scrollStars(game, dt);
            }
            draw(ctx, game, now / 1000);
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [changeStatus, loadTopScores]);

    //-------------------- Musique et bruitages ------------------------
    useEffect(() => {
        sfxRef.current = sfxOn;
        saveFlag(SFX_KEY, sfxOn);
    }, [sfxOn]);

    // La musique joue pendant la partie ; elle s'arrête en pause (reprend là où elle était) et repart du début à chaque nouvelle partie.
    useEffect(() => {
        saveFlag(MUSIC_KEY, musicOn);
        if (!musicRef.current) {
            const audio = new Audio(musicUrl);
            audio.loop = true;
            audio.volume = MUSIC_VOLUME;
            audio.preload = 'none'; // le fichier (5 Mo) n'est téléchargé qu'au premier lancement
            musicRef.current = audio;
        }
        const audio = musicRef.current;
        if (status === 'playing' && musicOn) {
            audio.play().catch(() => {}); // refusé par le navigateur : le jeu continue sans musique
        } else {
            audio.pause();
            if (status === 'ready' || status === 'over' || status === 'scores') audio.currentTime = 0;
        }
    }, [status, musicOn]);
    useEffect(() => () => {
        if (musicRef.current) musicRef.current.pause();
    }, []);

    //-------------------- Clavier : flèches ou Q/D (AZERTY), espace pour tirer, P pour la pause ------------------
    useEffect(() => {
        const setKey = (e, down) => {
            const input = inputRef.current;
            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA': // touche « Q » sur un clavier AZERTY
                    input.left = down;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    input.right = down;
                    break;
                case 'Space':
                    input.fire = down;
                    break;
                default:
                    return;
            }
            if (statusRef.current === 'playing') e.preventDefault(); // la page ne défile pas pendant le jeu
        };
        const onKeyDown = (e) => {
            if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
                if (statusRef.current === 'playing') changeStatus('paused');
                else if (statusRef.current === 'paused') changeStatus('playing');
                return;
            }
            if (e.code === 'KeyM' && !e.repeat && e.target.tagName !== 'INPUT') {
                setMusicOn((on) => !on); // M : musique activée / coupée
                return;
            }
            setKey(e, true);
        };
        const onKeyUp = (e) => setKey(e, false);
        const pauseIfPlaying = () => {
            if (statusRef.current === 'playing') changeStatus('paused');
        };
        const onVisibility = () => {
            if (document.hidden) pauseIfPlaying();
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', pauseIfPlaying);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', pauseIfPlaying);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [changeStatus]);

    //-------------------- Souris et doigt : on touche l'écran pour déplacer le vaisseau et tirer ------------------
    const toGameX = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return ((e.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onPointerDown = (e) => {
        if (statusRef.current !== 'playing') return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerDownRef.current = true;
        inputRef.current.fire = true;
        inputRef.current.targetX = toGameX(e);
    };
    const onPointerMove = (e) => {
        if (pointerDownRef.current) inputRef.current.targetX = toGameX(e);
    };
    const onPointerEnd = () => {
        if (!pointerDownRef.current) return;
        pointerDownRef.current = false;
        inputRef.current.fire = false;
        inputRef.current.targetX = null;
    };

    // Le score entre dans le top 10 s'il reste de la place ou s'il bat le dernier
    const qualifies = status === 'over' && result !== null && result.score > 0 && Array.isArray(topScores)
        && (topScores.length < TOP_SIZE || result.score > topScores[topScores.length - 1].score);

    return (
        <div id="mainPart" className="tir">
            <Header />
            <main>
                <div className="tirWrapper">
                    <canvas
                        ref={canvasRef}
                        className="tirCanvas"
                        role="img"
                        aria-label="Zone de jeu : un vaisseau en bas, des objets qui descendent"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerEnd}
                        onPointerCancel={onPointerEnd}
                    />
                    {status !== 'playing' && (
                        <div className="tirOverlay" role="dialog" aria-live="polite">
                            {status === 'ready' && (
                                <>
                                    <h1>Tir spatial</h1>
                                    <p>Détruis les objets qui descendent avant qu'ils n'atteignent le bas de l'écran ou ton vaisseau. Tu as {START_LIVES} vies.</p>
                                    <p>Plus tu tiens longtemps, plus ça va vite !</p>
                                    <p className="tirHelp">
                                        Clavier : ← → (ou Q D) pour bouger, espace pour tirer, P pour la pause, M pour la musique.<br />
                                        Écran tactile : touche et glisse pour bouger et tirer.
                                    </p>
                                    <p className="tirHelp">
                                        Points : {TIME_POINTS_PER_SECOND} par seconde, plus 10, 25 ou 40 points par objet détruit, multipliés par le niveau.
                                    </p>
                                    <button type="button" onClick={startGame} autoFocus>Jouer</button>
                                    <button type="button" className="tirSecondary" onClick={showScores}>Meilleurs scores</button>
                                </>
                            )}
                            {status === 'scores' && (
                                <>
                                    <h1>Top 10</h1>
                                    <TopList scores={topScores} />
                                    <button type="button" onClick={() => changeStatus('ready')} autoFocus>Retour</button>
                                </>
                            )}
                            {status === 'paused' && (
                                <>
                                    <h1>Pause</h1>
                                    <button type="button" onClick={() => changeStatus('playing')} autoFocus>Reprendre</button>
                                </>
                            )}
                            {status === 'over' && result && (
                                <>
                                    <h1>Partie terminée</h1>
                                    <p className="tirScore">{result.score} points</p>
                                    {result.isBest && <p className="tirRecord">Nouveau record !</p>}
                                    <p className="tirHelp">
                                        {formatTime(result.time)} · niveau {result.level} · {result.kills} objet{result.kills > 1 ? 's' : ''} détruit{result.kills > 1 ? 's' : ''}
                                    </p>
                                    <p className="tirHelp">Meilleur score sur cet appareil : {result.best}</p>
                                    {qualifies && !scoreSent && (
                                        <form className="tirPseudoForm" onSubmit={sendScore}>
                                            <label htmlFor="tirPseudo">Tu entres dans le top 10 ! Ton pseudo :</label>
                                            <div>
                                                <input id="tirPseudo" type="text" value={pseudo} maxLength={20} autoComplete="off"
                                                    onChange={(e) => setPseudo(e.target.value.replace(/^\s+/, ''))} autoFocus />
                                                <button type="submit">OK</button>
                                            </div>
                                        </form>
                                    )}
                                    <h2>Top 10</h2>
                                    <TopList scores={topScores} highlight={myRank} />
                                    {(!qualifies || scoreSent) && <button type="button" onClick={startGame} autoFocus>Rejouer</button>}
                                </>
                            )}
                        </div>
                    )}
                    <div className="tirSound">
                        <button type="button" aria-pressed={musicOn} onClick={() => setMusicOn(!musicOn)}>
                            {musicOn ? '🎵 Musique : oui' : '🔇 Musique : non'}
                        </button>
                        <button type="button" aria-pressed={sfxOn} onClick={() => setSfxOn(!sfxOn)}>
                            {sfxOn ? '🔊 Tirs : oui' : '🔇 Tirs : non'}
                        </button>
                    </div>
                </div>
            </main>
            <Footer>
                <p className="tirCredit">
                    Music by <a href={PIXABAY_USER} target="_blank" rel="noopener noreferrer">Dream-Protocol</a> from <a href={PIXABAY_SITE} target="_blank" rel="noopener noreferrer">Pixabay</a>
                </p>
            </Footer>
        </div>
    );
};

export default TirSpatial;
