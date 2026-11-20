// Bruitage du tir, fabriqué en direct avec la Web Audio API : aucun fichier à télécharger,
// donc aucun droit d'auteur à respecter (le son est généré par ce code).

let audioContext = null;

function getContext() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

// Petit « piou » de laser : une note aiguë qui chute vite, avec un volume qui s'éteint.
export function playShot() {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(900, now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain.gain.setValueAtTime(0.07, now); // volume du tir : à baisser ou monter ici
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch (error) {
    // pas de son possible sur cet appareil : le jeu continue sans
  }
}
