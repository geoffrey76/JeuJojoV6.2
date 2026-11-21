import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StartButton from '../components/StartButton';

const Puissance4Menu = () => {
    return (
        <div id="mainPart">
            <Header />
            <main>
                <ul>
                    <StartButton title="4 à la suite contre l'ordinateur" link="/4aLaSuite1Player" id="puissance4Button" />
                    <StartButton title="4 à la suite 2 Joueurs" link="/4aLaSuite2Players" id="puissance4Button" />
                </ul>
            </main>
            <Footer />
        </div>
    );
};

export default Puissance4Menu;
