import React from 'react';

// `children` : lignes supplémentaires affichées sous le copyright (ex. mention de la musique)
const Footer = ({ children }) => {
    return (
        <footer>
            <p>&copy; copyright Gillet Geoffrey 2022</p>
            {children}
        </footer>
    );
};

export default Footer;
