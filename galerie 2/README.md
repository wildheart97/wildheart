# ✦ ta galerie d'avatars

Un site statique (HTML/CSS/JS, aucune dépendance) pour partager tes avatars et icônes.
Les visiteurs naviguent dans les dossiers, cliquent sur une image pour l'agrandir et copient
son lien (lien direct, `[img]…[/img]` pour les forums, ou `<img>`).

## Ranger tes images

Tout se passe dans le dossier `images/`. Chaque sous-dossier devient un dossier dans la galerie,
sur autant de niveaux que tu veux :

```
images/
├── avatars/
│   ├── sza/
│   │   ├── sza1.png
│   │   └── sza2.png
│   └── robert pattinson/
└── icônes/
    └── ellie/
```

Les noms de dossiers peuvent contenir des espaces et des accents. Les fichiers sont triés
« naturellement » (sza2 avant sza10). Formats acceptés : png, jpg, gif, webp, avif, svg.

Les dossiers `avatars/` et `icônes/` fournis sont des exemples : supprime-les et mets les tiens.

## Personnaliser

Ouvre `config.js` : titre, phrase d'accroche, pied de page, format de copie par défaut.
Les couleurs sont tout en haut de `style.css` (thème clair et thème sombre).

## Mettre en ligne sur GitHub Pages (gratuit)

1. Crée un dépôt sur GitHub et envoie-y tout le contenu de ce dossier (y compris `.github/`).
2. Dans le dépôt : **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**.
3. Dans **Settings → Actions → General → Workflow permissions**, coche **Read and write permissions**.
4. Ton site est en ligne sur `https://<ton-pseudo>.github.io/<nom-du-depot>/`.

À chaque fois que tu ajoutes des images dans `images/` et que tu les envoies sur GitHub,
l'action « Mettre à jour la galerie » régénère `manifest.json` toute seule (1 minute environ).

**Plan B sans action :** dans `config.js`, remplis `github: { user: "ton-pseudo", repo: "nom-du-depot" }`
et supprime `manifest.json`. La galerie lira alors le dépôt en direct (une seule requête par visite).

## Ailleurs (Netlify, Cloudflare Pages, ton propre hébergement…)

C'est un site 100 % statique : il suffit de déposer les fichiers. Pense juste à régénérer la liste
avant d'envoyer :

```
node tools/build-manifest.mjs
```

## Tester sur ton ordinateur

Le site doit être servi par un petit serveur (pas en double-cliquant sur `index.html`) :

```
python3 -m http.server 8000
```

puis ouvre http://localhost:8000

## Raccourcis

- `/` : chercher
- dans l'aperçu : `←` `→` pour naviguer, `C` pour copier, `Échap` pour fermer
- sur téléphone : glisser à gauche / à droite dans l'aperçu
