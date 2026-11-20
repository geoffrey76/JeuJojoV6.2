// Une carte à deux faces : le dos (logo) et la face (image). Le retournement est géré en CSS.
const MemoryCard = ({ index, image, status, onClick }) => {
    const hidden = status === 'hidden';
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };
    return (
        <div
            className={`cardContainer${hidden ? '' : ' isFlipped'}${status === 'matched' ? ' isMatched' : ''}`}
            role="button"
            tabIndex={hidden ? 0 : -1}
            aria-label={hidden ? `Carte ${index + 1}, face cachée` : `Carte ${index + 1}, retournée`}
            aria-hidden={status === 'matched' ? true : undefined}
            onClick={onClick}
            onKeyDown={handleKeyDown}
        >
            <div className="cardInner">
                <div className="cardFace cardFront" />
                <div className="cardFace cardBack" style={{ backgroundImage: `url(${image})` }} />
            </div>
        </div>
    );
};

export default MemoryCard;
