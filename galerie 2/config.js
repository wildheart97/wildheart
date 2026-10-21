/* ─────────────────────────────────────────────
   Réglages de ta galerie — c'est le seul fichier
   que tu as besoin de modifier.
   ───────────────────────────────────────────── */
window.SITE = {
  // Nom affiché en haut de la page et dans l'onglet
  title: "l'archive",
  // Petite phrase sous le titre
  subtitle: "avatars & icônes en libre service — clique, copie, c'est à toi.",
  // Texte du pied de page
  footer: "merci de ne pas réhéberger sans créditer ♡",

  // Dossier qui contient toutes tes images (avec tes sous-dossiers dedans)
  root: "images",

  // Liste des images, générée automatiquement (voir README)
  manifest: "manifest.json",

  // Format copié par défaut : "url", "bbcode", "html" ou "markdown"
  defaultFormat: "url",

  // Optionnel — si le manifest est absent, la galerie lit directement
  // ton dépôt GitHub. Mets ton pseudo et le nom du dépôt.
  github: { user: "", repo: "", branch: "main" },

  // Optionnel — adresse de base pour les liens copiés (ex. un CDN).
  // Laisse vide pour utiliser l'adresse du site.
  imageBase: ""
};
