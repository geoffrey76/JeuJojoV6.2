const Form = ({ values, errors, sending, onChange, onSubmit }) => {
    return (
        <form id="contactForm" onSubmit={onSubmit} noValidate>
            <div id="contactArea">
                <div id="personalInfo">
                    <label className="contactInput" htmlFor="fName">Prénom</label>
                    <input type="text" id="fName" name="firstName" value={values.firstName} onChange={onChange} maxLength={60} autoFocus />
                    <label className="contactInput" htmlFor="lName">Nom</label>
                    <input type="text" id="lName" name="lastName" value={values.lastName} onChange={onChange} maxLength={60} />
                    <div id="eMailContainer">
                        <label className="contactInput" htmlFor="eMail">e-mail<span className="requiredStar">*</span></label>
                        <div id="requiredEMail" className="contactInput" style={{ visibility: errors.email ? 'visible' : 'hidden' }}>Entrez un email valide</div>
                    </div>
                    <input type="email" id="eMail" name="email" value={values.email} onChange={onChange} maxLength={200}
                        className={errors.email ? 'requiredItem' : 'contactInput'} />
                </div>
                <div id="comments">
                    <div id="commentsContainer">
                        <label className="contactInput" htmlFor="commentBox">Commentaires<span className="requiredStar">*</span></label>
                        <div id="requiredComment" className="contactInput" style={{ visibility: errors.comments ? 'visible' : 'hidden' }}>Entrez un commentaire</div>
                    </div>
                    <textarea id="commentBox" name="comments" value={values.comments} onChange={onChange} maxLength={5000}
                        className={errors.comments ? 'requiredItem' : 'contactInput'} />
                </div>
            </div>
            <button type="submit" id="sendContactButton" disabled={sending}>{sending ? 'Envoi…' : 'Envoyer'}</button>
        </form>
    );
};

export default Form;
