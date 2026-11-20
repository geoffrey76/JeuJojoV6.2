import React, { useState } from 'react';
import validator from 'validator';
import axios from 'axios';
import '../css/contact.css';
import Form from '../components/ContactForm';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Contact = () => {
    const [values, setValues] = useState({ firstName: '', lastName: '', email: '', comments: '' });
    const [errors, setErrors] = useState({ email: false, comments: false });
    const [sending, setSending] = useState(false);
    // message : { text, ok } affiché à la place du formulaire (succès) ou au-dessus (erreur)
    const [message, setMessage] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {
            email: !validator.isEmail(values.email.trim()),
            comments: values.comments.trim() === '',
        };
        setErrors(newErrors);
        if (newErrors.email || newErrors.comments) return;

        setSending(true);
        setMessage(null);
        try {
            const response = await axios.post('/api/mailForm', {
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                email: values.email.trim(),
                comments: values.comments.trim(),
            });
            setMessage({ text: response.data.message || 'Message bien envoyé. Merci.', ok: true });
            setValues({ firstName: '', lastName: '', email: '', comments: '' });
        } catch (error) {
            const serverText = error.response && error.response.data && error.response.data.message;
            setMessage({
                text: serverText || "Impossible d'envoyer le message pour le moment. Réessaie un peu plus tard.",
                ok: false,
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div id="mainPart">
            <Header />
            <main>
                {message && message.ok ? (
                    <h1 id="mailResponse">{message.text}</h1>
                ) : (
                    <>
                        <Form values={values} errors={errors} sending={sending} onChange={handleChange} onSubmit={handleSubmit} />
                        {message && <p role="alert" style={{ color: '#ff9a9a', margin: '15px 5%', fontSize: '1.2em' }}>{message.text}</p>}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default Contact;
