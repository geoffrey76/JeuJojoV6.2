import express from 'express';
import rateLimit from 'express-rate-limit';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 8800; // Render fournit PORT
const app = express();

app.set('trust proxy', 1); // derrière le proxy de Render : nécessaire pour la limite par IP
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

//---------------------------- Connexion à MongoDB -----------------------------
// Variables : MONGODB_URI (adresse complète) OU MONGODB_USERNAME + MONGODB_PASSWORD.
// L'ancien nom avec la faute de frappe (MONOGODB_USERNAME) reste accepté pour ne pas casser la config actuelle.
const mongoUser = process.env.MONGODB_USERNAME || process.env.MONOGODB_USERNAME;
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${encodeURIComponent(mongoUser || '')}:${encodeURIComponent(process.env.MONGODB_PASSWORD || '')}@cluster0.yraaamz.mongodb.net/?retryWrites=true&w=majority`;

let scores = null; // collection Mongo du Memory, définie quand la connexion réussit
let tirScores = null; // collection Mongo du Tir spatial (top 10)

async function connectDb() {
  try {
    const client = new MongoClient(mongoUri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    const db = client.db('jeuJojo');
    scores = db.collection('memory1Player');
    tirScores = db.collection('tirSpatial');
    // Index pour trier vite le classement ; sans gravité s'il échoue
    tirScores.createIndex({ score: -1, date: 1 }).catch((error) => console.error('Index tirSpatial :', error.message));
    console.log('Connecté avec succès à MongoDB');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB :', error.message);
    setTimeout(connectDb, 30_000); // nouvel essai dans 30 s
  }
}
connectDb();

const dbUnavailable = (res) =>
  res.status(503).json({ message: 'Base de données indisponible pour le moment.' });

//---------------------------- Santé du service -----------------------------
app.get('/healthz', (req, res) => res.json({ ok: true, db: scores !== null }));

//--------------------- Meilleur score du Memory (1 joueur) ------------------------
// Le score = nombre d'ERREURS (paires ratées) : moins il y en a, meilleur c'est, 0 = partie parfaite.
// L'ancien système comptait chaque tentative, paires trouvées comprises (12 paires = 12 tentatives
// de plus). Un ancien record est donc converti : erreurs = ancien score - 12.
const LEGACY_PAIRS = 12;
function normalizeRecord(doc) {
  if (!doc || !Number.isInteger(doc.bestScore)) return null;
  const bestScore = doc.scoring === 'errors' ? doc.bestScore : Math.max(0, doc.bestScore - LEGACY_PAIRS);
  const name = Array.isArray(doc.bestScoreName) ? doc.bestScoreName.join('') : doc.bestScoreName;
  return { bestScore, bestScoreName: name || 'Anonyme' };
}

app.get('/api/getBestScore', async (req, res) => {
  if (!scores) return dbUnavailable(res);
  try {
    const record = normalizeRecord(await scores.findOne({}));
    res.json(record ? [record] : []);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/newBestScore', async (req, res) => {
  if (!scores) return dbUnavailable(res);

  const score = Number(req.body?.bestScore);
  if (!Number.isInteger(score) || score < 0 || score > 999) {
    return res.status(400).json({ message: 'Score invalide.' });
  }
  let name = req.body?.bestScoreName;
  if (Array.isArray(name)) name = name.join('');
  name = typeof name === 'string' ? name.trim().slice(0, 20) : '';
  if (!name) name = 'Anonyme';

  try {
    const current = normalizeRecord(await scores.findOne({}));
    // Moins d'erreurs = meilleur. On n'écrase le record que s'il est battu.
    if (current && current.bestScore <= score) {
      return res.status(409).json({ message: 'Ce score ne bat pas le record.' });
    }
    await scores.replaceOne({}, { bestScore: score, bestScoreName: name, scoring: 'errors' }, { upsert: true });
    res.json({ ok: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

//---------------------------- Tir spatial : les 10 meilleurs scores ------------------------
// Collection « tirSpatial » : { name, score, date }. Plus le score est haut, meilleur c'est.
// À score égal, le plus ancien passe devant. On ne garde que les 10 meilleurs.
const TIR_TOP = 10;
const TIR_MAX_SCORE = 999_999;

async function readTirTop() {
  const docs = await tirScores
    .find({}, { projection: { _id: 0, name: 1, score: 1 } })
    .sort({ score: -1, date: 1 })
    .limit(TIR_TOP)
    .toArray();
  return docs.map((d) => ({ name: d.name || 'Anonyme', score: d.score }));
}

const tirLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30, // 30 envois de score par IP et par 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de scores envoyés. Réessaie un peu plus tard.' },
});

app.get('/api/tirSpatial/scores', async (req, res) => {
  if (!tirScores) return dbUnavailable(res);
  try {
    res.json(await readTirTop());
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/tirSpatial/scores', tirLimiter, async (req, res) => {
  if (!tirScores) return dbUnavailable(res);

  const score = Number(req.body?.score);
  if (!Number.isInteger(score) || score <= 0 || score > TIR_MAX_SCORE) {
    return res.status(400).json({ message: 'Score invalide.' });
  }
  let name = req.body?.name;
  name = typeof name === 'string' ? name.trim().slice(0, 20) : '';
  if (!name) name = 'Anonyme';

  try {
    const top = await readTirTop();
    if (top.length >= TIR_TOP && score <= top[TIR_TOP - 1].score) {
      return res.status(409).json({ message: 'Ce score n\u2019entre pas dans le top 10.', scores: top });
    }
    await tirScores.insertOne({ name, score, date: new Date() });

    // On supprime ce qui sort du top 10 (sans toucher à un score plus haut arrivé entre-temps)
    const kept = await tirScores
      .find({}, { projection: { _id: 1, score: 1 } })
      .sort({ score: -1, date: 1 })
      .limit(TIR_TOP)
      .toArray();
    if (kept.length === TIR_TOP) {
      await tirScores.deleteMany({
        _id: { $nin: kept.map((d) => d._id) },
        score: { $lte: kept[TIR_TOP - 1].score },
      });
    }
    res.json({ ok: true, scores: await readTirTop() });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

//---------------------------- Formulaire de contact ------------------------
// Envoi via l'API HTTP de Resend (port 443) : Render bloque le SMTP sur l'offre gratuite.
// Variables : RESEND_API_KEY, USER_MAIL (destinataire), MAIL_FROM (optionnel).
const mailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // 5 messages par IP et par 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de messages envoyés. Réessaie un peu plus tard.' },
});

const looksLikeEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

app.post('/api/mailForm', mailLimiter, async (req, res) => {
  const firstName = clean(req.body?.firstName, 60);
  const lastName = clean(req.body?.lastName, 60);
  const email = clean(req.body?.email, 200);
  const comments = clean(req.body?.comments, 5000);

  if (!looksLikeEmail(email) || !comments) {
    return res.status(400).json({ message: 'Email ou commentaire invalide.' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.USER_MAIL) {
    console.error('RESEND_API_KEY ou USER_MAIL manquant dans les variables d’environnement');
    return res.status(500).json({ message: "Le service d'envoi n'est pas configuré." });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Jeux de JoJo <onboarding@resend.dev>',
        to: [process.env.USER_MAIL],
        reply_to: email,
        subject: 'Message du formulaire du site Les Jeux de JoJo',
        text: `Prénom : ${firstName}\nNom : ${lastName}\nE-mail : ${email}\n\nMessage :\n${comments}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error('Resend a refusé le message :', response.status, await response.text());
      return res.status(502).json({ message: "Erreur lors de l'envoi du message." });
    }
    res.json({ ok: true, message: 'Message bien envoyé. Merci.' });
  } catch (error) {
    console.error("Erreur lors de l'envoi :", error.message);
    res.status(502).json({ message: "Erreur lors de l'envoi du message." });
  }
});

app.use('/api', (req, res) => res.status(404).json({ message: 'Route inconnue.' }));

//---------------------------- Sert le site (front compilé) ------------------------
const distDir = path.join(__dirname, '..', 'jeuJojoReactFront', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  // Les routes React (/memory, /contact…) renvoient index.html
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(port, () => console.log(`Serveur à l'écoute sur le port ${port}`));
