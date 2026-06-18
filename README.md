# Serrurier Protectop — Site vitrine

Site vitrine immersif (refonte) pour **Serrurier Protectop**, serrurier artisan à Paris 14ᵉ.
HTML/CSS/JavaScript **vanilla**, sans build step. Animations GSAP + ScrollTrigger, smooth
scroll Lenis, hero WebGL Three.js. Concept : *« Le Mécanisme de Confiance »* — anthracite
nuit + laiton brossé, premium et rassurant.

---

## 1. Lancer le site

Aucune compilation. Il faut juste servir les fichiers via **HTTP** (et non `file://`,
sinon la carte et certains comportements échouent).

```bash
# Option 1 — npx (Node installé)
npx serve .

# Option 2 — Python
python -m http.server 8000

# Option 3 — extension type "Live Server" (VS Code)
```

Puis ouvrir l'URL indiquée (ex. http://localhost:3000). C'est un site **statique** : il peut
être déposé tel quel sur n'importe quel hébergement (Netlify, Vercel, OVH, Nginx, Apache…).

---

## 2. Structure

```
protectop-site/
├── index.html        # Structure, SEO, Open Graph, données structurées (Schema.org)
├── styles.css        # Design tokens + tous les styles (1 seul fichier)
├── js/
│   └── main.js       # Smooth scroll, reveals, curseur, hero WebGL, carte, formulaire
├── assets/           # (vide) emplacement pour logo, photos, og-cover.jpg
└── README.md
```

Tout le design est piloté par des **design tokens** CSS (`:root` en haut de `styles.css`) :
couleurs, typographie, espacements, rayons, ombres, durées et easings. Ne pas mettre de
valeurs « en dur » : modifier les tokens.

---

## 3. Où remplacer le contenu

| Élément | Emplacement | Détail |
|---|---|---|
| **Logo** | `index.html` (SVG `.brand__mark`, header + footer) | Wordmark « Protectop » + icône bouclier/serrure. Remplacer le `<svg>` ou pointer une image. |
| **Photos** | `assets/` | Ajouter les vraies photos (serrures, portes, artisan). Penser à l'attribut `alt`. |
| **Image de partage** | `assets/og-cover.jpg` | 1200×630 px recommandé (Open Graph / aperçu réseaux). |
| **Avis clients** | `index.html` › section `#avis` (`.quote`) | Structure répétable `<figure class="quote">`. Remplacer par de vrais avis Google. |
| **Tarifs** | `index.html` › section `#tarifs` (`.price-row`) | Fourchettes indicatives. Ajuster les montants. |
| **Coordonnées** | `index.html` (header, contact, footer) + **JSON-LD** dans le `<head>` | Téléphone `tel:+33140470991`, adresse, horaires. **Mettre à jour le JSON-LD en même temps** (SEO). |
| **Note Google** | JSON-LD (`aggregateRating`) + hero + section avis | 5,0 / 80 avis. |
| **Couleurs / typo** | `styles.css` › `:root` | Tokens `--brass-*`, `--ink-*`, `--font-display`, `--font-body`. |

---

## 4. Note de sécurité (à lire avant mise en production)

Le front est durci (validation, échappement, anti-spam, SRI, fallbacks). **Mais un site
vitrine n'est sécurisé que si le back l'est aussi.** Points à traiter côté serveur :

### 4.1 Le formulaire n'envoie rien pour l'instant
`js/main.js › submit()` **ne transmet aucune donnée** (démo). Pour le mettre en service :

1. Créer un **endpoint serveur** (PHP, Node, fonction serverless…) qui reçoit le POST.
2. **Re-valider toutes les entrées côté serveur** (ne jamais faire confiance au client) :
   nom, téléphone, email, message, et surtout les **photos** (type MIME réel, taille,
   extension, nombre, ré-encodage/strip EXIF, stockage hors webroot).
3. Anti-spam serveur : vérifier le **honeypot** (`company` doit être vide), poser un
   **rate-limit** par IP, idéalement un captcha invisible.
4. N'envoyer l'email / n'écrire en base **qu'après** validation serveur.
5. Aucune clé d'API, aucun secret ne doit apparaître dans le code front : passer par une
   **variable d'environnement** côté serveur (ou un proxy) si un service tiers est appelé.

Le code client est déjà prêt : `new FormData(form)` est construit dans `submit()`, il suffit
de le `fetch('/votre-endpoint', { method:'POST', body })` avec gestion `try/catch`.

### 4.2 Content-Security-Policy recommandée
À servir via **en-tête HTTP** (pas seulement en `<meta>`). Exemple strict adapté à ce site :

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self'
    https://cdnjs.cloudflare.com https://cdn.jsdelivr.net
    'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw=';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  img-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://*.google.com;
  frame-src https://www.google.com https://maps.google.com;
  connect-src 'self' https://*.googleapis.com https://*.google.com;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  object-src 'none'
```

- Le `sha256-…` autorise l'unique script inline (le marqueur « JS actif » dans le `<head>`).
  Pour le bloc **JSON-LD** inline, préférez une approche par **nonce** (`nonce-XXXX` régénéré
  à chaque requête côté serveur) plutôt que `'unsafe-inline'`.
- `style-src 'unsafe-inline'` est requis par les quelques styles inline d'animation. Pour
  l'éliminer, basculer ces styles vers des classes + nonce.

### 4.3 Autres en-têtes conseillés
```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

### 4.4 Carte (Google Maps) — RGPD : consentement intégré ✅
La carte est l'`iframe` **Google Maps** de l'établissement. Google Maps dépose des cookies de
pistage : conformément au RGPD / à la CNIL, **l'iframe n'est chargée qu'après un clic explicite**
de l'utilisateur sur le bouton « Afficher la carte Google » (mécanisme *click-to-load*). Tant
que l'utilisateur n'a pas cliqué, **aucun appel n'est fait à Google** ; un fallback affiche
l'adresse, la mention cookies et un lien direct vers Google Maps. L'`iframe` est en `sandbox`
restreint.

- Le comportement est dans `js/main.js › initMap()` : le clic sur `[data-map-consent]`
  déclenche `build()`, qui crée l'iframe à partir de `data-map-src`.
- Pour aller plus loin (mémoriser le choix, gérer plusieurs traceurs), branchez ce clic sur
  votre **CMP / bandeau de consentement** global.
- Pour une carte **sans cookie** (aucun consentement requis), remplacez `data-map-src` par une
  URL OpenStreetMap (`https://www.openstreetmap.org/export/embed.html?bbox=…&layer=mapnik&marker=…`) ;
  s'il n'y a pas de bouton `[data-map-consent]`, la carte se charge alors directement.

### 4.5 CDN
Toutes les librairies sont **épinglées** (versions fixes) avec **SRI** (`integrity`) +
`crossorigin` : un fichier CDN altéré est rejeté par le navigateur. Pour mettre à jour une
version, **recalculer le hash SRI** correspondant.

---

## 5. Accessibilité & performance

- **Intro cinématique** (séquence de déverrouillage : remplissage de l'arc 0→100 %, rotation
  de la serrure, ouverture de l'écran en deux) gérée dans `js/main.js › initPreloader()`. Elle
  est **désactivée en `prefers-reduced-motion`** et protégée par un garde-fou (l'overlay est
  retiré au bout de 5 s quoi qu'il arrive — jamais de page bloquée).
- **`prefers-reduced-motion`** respecté : intro, smooth scroll, curseur, WebGL et reveals sont
  désactivés, le contenu reste pleinement visible.
- **Sans JavaScript** : tout le contenu reste lisible (les animations ne font que révéler).
- Navigation **clavier** (focus visible, skip link), **ARIA** sur les zones dynamiques,
  contrastes visant **WCAG AA**, cibles tactiles ≥ 44 px.
- Animations sur `transform` / `opacity`, `will-change` ciblé, WebGL en pause hors-vue et
  onglet caché, particules réduites sur petit écran, désactivé en `save-data` / mobile tactile.
- Carte et librairies en chargement différé ; toutes les instances (Lenis, Three.js,
  observers, listeners, `requestAnimationFrame`) sont **détruites** au `pagehide`.

---

## 6. Librairies (CDN épinglé)

| Lib | Version | Usage |
|---|---|---|
| GSAP | 3.12.5 | Animations / timeline |
| ScrollTrigger | 3.12.5 | Reveals au scroll, compteurs |
| Lenis | 1.1.18 | Smooth scroll (sync ScrollTrigger) |
| Three.js | 0.149.0 | Hero WebGL (cylindre laiton) |

> Three.js est volontairement en r149 (dernière version au build global stable **sans
> avertissement de dépréciation**). Pour passer en r160+, migrer vers les ES Modules.
