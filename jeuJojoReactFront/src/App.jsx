import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Accueil from './pages/Accueil';
import './css/jeuJojo.css';

// Chaque jeu n'est téléchargé que lorsqu'on ouvre sa page
const Contact = lazy(() => import('./pages/Contact'));
const APropos = lazy(() => import('./pages/APropos'));
const JeuNombre = lazy(() => import('./pages/JeuNombre'));
const PenduIntro = lazy(() => import('./pages/PenduIntro'));
const JeuPendu = lazy(() => import('./pages/JeuPendu'));
const ColorBallInfo = lazy(() => import('./pages/ColorBallInfo'));
const ColorBall = lazy(() => import('./pages/ColorBall'));
const Memory = lazy(() => import('./pages/Memory'));
const Memory1Player = lazy(() => import('./pages/Memory1Player'));
const Memory2PlayersReact = lazy(() => import('./pages/Memory2PlayersReact'));
const Puissance4 = lazy(() => import('./pages/Puissance4'));
const TirSpatial = lazy(() => import('./pages/TirSpatial'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/apropos" element={<APropos />} />
          <Route path="/jeuNombre" element={<JeuNombre />} />
          <Route path="/penduIntro" element={<PenduIntro />} />
          <Route path="/jeuPendu" element={<JeuPendu />} />
          <Route path="/colorBallInfo" element={<ColorBallInfo />} />
          <Route path="/colorBall" element={<ColorBall />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/memory1Player" element={<Memory1Player />} />
          <Route path="/memory2Players" element={<Memory2PlayersReact />} />
          <Route path="/4aLaSuite" element={<Puissance4 />} />
          <Route path="/tirSpatial" element={<TirSpatial />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
