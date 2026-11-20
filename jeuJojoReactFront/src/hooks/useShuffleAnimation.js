import { useEffect } from 'react';

// Pendant que `active` est vrai, les cartes de la grille rebondissent dans tous les sens,
// puis elles reviennent en douceur à leur place. C'est uniquement visuel : l'état du jeu n'est pas touché.
// La grille doit avoir position: relative (déjà le cas dans le CSS).
const MIN_SPEED = 500; // pixels par seconde
const MAX_SPEED = 1000;
const RETURN_MS = 500;

export function useShuffleAnimation(gridRef, active) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!active || !grid) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const elements = Array.from(grid.querySelectorAll('.cardContainer'));
    // Les cartes restent dans la zone utile de la grille (sans les marges intérieures)
    const style = getComputedStyle(grid);
    const left = parseFloat(style.paddingLeft) || 0;
    const right = grid.clientWidth - (parseFloat(style.paddingRight) || 0);
    const top = parseFloat(style.paddingTop) || 0;
    const bottom = grid.clientHeight - (parseFloat(style.paddingBottom) || 0);
    const randomSpeed = () => (MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)) * (Math.random() < 0.5 ? -1 : 1);

    // Pour chaque carte : sa position de départ, sa vitesse et les limites de la grille
    const cards = elements.map((element) => ({
      element,
      x: 0,
      y: 0,
      vx: randomSpeed(),
      vy: randomSpeed(),
      minX: left - element.offsetLeft,
      maxX: right - element.offsetWidth - element.offsetLeft,
      minY: top - element.offsetTop,
      maxY: bottom - element.offsetHeight - element.offsetTop,
    }));
    elements.forEach((element) => {
      element.style.transition = 'none';
      element.style.zIndex = String(Math.floor(Math.random() * elements.length));
    });

    let frame = 0;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      cards.forEach((card) => {
        card.x += card.vx * dt;
        card.y += card.vy * dt;
        if (card.x < card.minX || card.x > card.maxX) {
          card.x = Math.min(Math.max(card.x, card.minX), card.maxX);
          card.vx = -card.vx;
        }
        if (card.y < card.minY || card.y > card.maxY) {
          card.y = Math.min(Math.max(card.y, card.minY), card.maxY);
          card.vy = -card.vy;
        }
        card.element.style.transform = `translate(${card.x}px, ${card.y}px)`;
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    // Fin du mélange : les cartes glissent jusqu'à leur place
    return () => {
      cancelAnimationFrame(frame);
      elements.forEach((element) => {
        element.style.transition = `transform ${RETURN_MS}ms ease`;
        element.style.transform = '';
      });
      setTimeout(() => {
        elements.forEach((element) => {
          element.style.transition = '';
          element.style.zIndex = '';
        });
      }, RETURN_MS);
    };
  }, [gridRef, active]);
}
