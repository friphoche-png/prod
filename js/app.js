/* ═══════════════════════════════════════════════════
   FRIP'HOCHE — Connexion à la base et outils partagés
   Fichier : js/app.js
   Chargé par toutes les pages.
   ═══════════════════════════════════════════════════ */

// ─── Connexion à Supabase ──────────────────────────

const SUPABASE_URL = 'https://mqzydpahdrngtzibppzi.supabase.co';
const SUPABASE_CLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xenlkcGFoZHJuZ3R6aWJwcHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzOTAxMDMsImV4cCI6MjEwMTk2NjEwM30.VUVDKTjF2xBc0TS-MnQxDZ-136dux_eEajESV3lg6wE';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_CLE);


// ─── Listes de valeurs ─────────────────────────────

const TAILLES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'];
const POINTURES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];

const GENRES = [
  { code: 'femme',   nom: 'Femme' },
  { code: 'homme',   nom: 'Homme' },
  { code: 'unisexe', nom: 'Unisexe' },
];

const ETATS = [
  { code: 'neuf',     nom: 'Neuf' },
  { code: 'tres_bon', nom: 'Très bon' },
  { code: 'bon',      nom: 'Bon état' },
];

const STATUTS = {
  brouillon:  { nom: 'Brouillon',  classe: 'pill-brouillon' },
  disponible: { nom: 'Disponible', classe: 'pill-dispo' },
  reserve:    { nom: 'Réservé',    classe: 'pill-reserve' },
  vendu:      { nom: 'Vendu',      classe: 'pill-vendu' },
};

const COULEURS = [
  { nom: 'Noir',     hex: '#1A1A2E' }, { nom: 'Blanc',    hex: '#FFFFFF' },
  { nom: 'Gris',     hex: '#8A8A8A' }, { nom: 'Beige',    hex: '#E8DCC8' },
  { nom: 'Marron',   hex: '#8B5E3C' }, { nom: 'Camel',    hex: '#C9A96B' },
  { nom: 'Bleu',     hex: '#3A5A9B' }, { nom: 'Marine',   hex: '#1B2A4A' },
  { nom: 'Ciel',     hex: '#6BA8D8' }, { nom: 'Denim',    hex: '#7BA3C9' },
  { nom: 'Vert',     hex: '#4A8B45' }, { nom: 'Kaki',     hex: '#3F5637' },
  { nom: 'Rouge',    hex: '#C23B3B' }, { nom: 'Bordeaux', hex: '#8B2942' },
  { nom: 'Orange',   hex: '#E07B39' }, { nom: 'Jaune',    hex: '#E8C547' },
  { nom: 'Rose',     hex: '#D98BB5' }, { nom: 'Violet',   hex: '#9B72CF' },
  { nom: 'Doré',     hex: '#D4AF37' }, { nom: 'Argenté',  hex: '#C0C0C8' },
  { nom: 'Motif',    hex: 'motif'   }, { nom: 'Multicolore', hex: 'multi' },
];

const CLASSES = [
  'Seconde 1','Seconde 2','Seconde 3','Seconde 4','Seconde 5','Seconde 6',
  'Première 1','Première 2','Première 3','Première 4','Première 5','Première 6',
  'Terminale 1','Terminale 2','Terminale 3','Terminale 4','Terminale 5','Terminale 6',
  'CPGE 1re année','CPGE 2e année','Autre',
];

const PRIX_JETON = 0.50;


// ─── Session ───────────────────────────────────────

let _profil = null;

/** Renvoie le profil connecté, ou null. */
async function profilActuel() {
  if (_profil) return _profil;
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data } = await db.from('profils').select('*').eq('id', user.id).single();
  if (data) { _profil = data; _profil.email = user.email; }
  return _profil;
}

/** Redirige vers la connexion si personne n'est connecté. */
async function exigerConnexion() {
  const p = await profilActuel();
  if (!p) { window.location.href = 'index.html'; return null; }
  if (!p.actif) {
    await db.auth.signOut();
    window.location.href = 'index.html?desactive=1';
    return null;
  }
  return p;
}

/** Redirige si la personne n'est ni bénévole ni admin. */
async function exigerEquipe() {
  const p = await exigerConnexion();
  if (!p) return null;
  if (p.role !== 'admin' && p.role !== 'benevole') {
    window.location.href = 'catalogue.html';
    return null;
  }
  return p;
}

async function deconnexion() {
  await db.auth.signOut();
  _profil = null;
  window.location.href = 'index.html';
}

/** Droits d'un bénévole (les admins ont tout). */
async function mesDroits() {
  const p = await profilActuel();
  if (!p) return {};
  if (p.role === 'admin') {
    return {
      ajouter_article: true, modifier_article: true, supprimer_article: true,
      crediter_jetons: true, valider_vente: true,
      voir_etudiants: true, creer_marque: true, admin: true,
    };
  }
  if (p.role !== 'benevole') return {};
  const { data } = await db.from('droits_benevole')
    .select('*').eq('profil_id', p.id).single();
  return data || {};
}


// ─── Jetons ────────────────────────────────────────

async function monSolde() {
  const p = await profilActuel();
  if (!p) return 0;
  const { data } = await db.rpc('solde_jetons', { p_etudiant: p.id });
  return data ?? 0;
}

async function soldeDe(etudiantId) {
  const { data } = await db.rpc('solde_jetons', { p_etudiant: etudiantId });
  return data ?? 0;
}


// ─── Affichage ─────────────────────────────────────

function echapper(t) {
  if (t == null) return '';
  return String(t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function initiales(prenom, nom) {
  return ((prenom || '?')[0] + (nom || '')[0] || '').toUpperCase();
}

function motJetons(n) {
  return n === 1 || n === -1 ? 'jeton' : 'jetons';
}

/** Taille ou pointure selon la catégorie. */
function tailleAffichee(article) {
  return article.pointure ? String(article.pointure) : (article.taille || '—');
}

function nomEtat(code) {
  const e = ETATS.find(x => x.code === code);
  return e ? e.nom : '';
}

function dateCourte(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR',
    { day: 'numeric', month: 'short', year: 'numeric' });
}

/** « il y a 2 h », « hier », « il y a 3 j ». */
function depuis(iso) {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (min < 1)   return "à l'instant";
  if (min < 60)  return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j === 1)   return 'hier';
  if (j < 31)    return `il y a ${j} j`;
  return dateCourte(iso);
}

/** Jours restants avant expiration d'une réservation. */
function joursRestants(iso) {
  const j = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  return Math.max(0, j);
}


// ─── Messages à l'écran ────────────────────────────

function notifier(message, type = 'info') {
  document.querySelectorAll('.notification').forEach(n => n.remove());
  const n = document.createElement('div');
  n.className = `notification notification-${type}`;
  n.textContent = message;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3600);
}

/** Traduit les messages d'erreur de Supabase en français. */
function messageErreur(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login'))        return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed'))  return "Ton adresse n'est pas encore confirmée. Vérifie ta boîte mail.";
  if (m.includes('already registered'))   return 'Un compte existe déjà avec cette adresse.';
  if (m.includes('password should be'))   return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Connexion impossible. Vérifie ton accès internet.';
  return err?.message || 'Une erreur est survenue.';
}


// ─── Photos ────────────────────────────────────────

/**
 * Réduit et compresse une image avant envoi.
 * Indispensable : le plan gratuit n'offre qu'1 Go de stockage.
 */
function compresserImage(fichier, cotéMax = 1000, qualite = 0.78) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible.'));
      img.onload = () => {
        let { width: l, height: h } = img;
        if (l > cotéMax || h > cotéMax) {
          const r = Math.min(cotéMax / l, cotéMax / h);
          l = Math.round(l * r); h = Math.round(h * r);
        }
        const c = document.createElement('canvas');
        c.width = l; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, l, h);
        ctx.drawImage(img, 0, 0, l, h);
        c.toBlob(b => b ? resolve(b) : reject(new Error('Compression impossible.')),
                 'image/jpeg', qualite);
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/** Envoie une photo d'article et renvoie son adresse. */
async function envoyerPhotoArticle(fichier) {
  const blob = await compresserImage(fichier);
  const nom = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await db.storage.from('articles')
    .upload(nom, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return db.storage.from('articles').getPublicUrl(nom).data.publicUrl;
}

/** Envoie une photo de profil et renvoie son adresse. */
async function envoyerPhotoProfil(fichier, profilId) {
  const blob = await compresserImage(fichier, 400, 0.8);
  const chemin = `${profilId}/avatar-${Date.now()}.jpg`;
  const { error } = await db.storage.from('profils')
    .upload(chemin, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return db.storage.from('profils').getPublicUrl(chemin).data.publicUrl;
}


// ─── Barre de navigation ───────────────────────────

async function afficherNavigation(pageActive) {
  const p = await profilActuel();
  const equipe = p && (p.role === 'admin' || p.role === 'benevole');

  const onglets = [
    { id: 'catalogue',    lien: 'catalogue.html',    icone: '👕', nom: 'Catalogue' },
    { id: 'recherche',    lien: 'recherche.html',    icone: '🔍', nom: 'Recherche' },
    { id: 'reservations', lien: 'reservations.html', icone: '🪙', nom: 'Jetons' },
  ];
  if (equipe) onglets.push({ id: 'admin', lien: 'admin.html', icone: '⚙️', nom: 'Admin' });
  onglets.push({ id: 'profil', lien: 'profil.html', icone: '👤', nom: 'Profil' });

  const barre = document.createElement('nav');
  barre.className = 'barre-bas';
  barre.innerHTML = onglets.map(o => `
    <a href="${o.lien}" class="${o.id === pageActive ? 'actif' : ''}">
      <span class="icone">${o.icone}</span><span>${o.nom}</span>
    </a>`).join('');
  document.body.appendChild(barre);
}


// ─── Entretien automatique ─────────────────────────

/** Libère les réservations dépassées. Appelé au chargement du catalogue. */
async function libererReservationsExpirees() {
  try { await db.rpc('annuler_reservations_expirees'); } catch (e) { /* sans gravité */ }
}
