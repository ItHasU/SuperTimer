# SuperTimer

Minuteur PWA pour entraînements sportifs par intervalles (exercices / pauses / séries).

## Développement

```bash
npm install
npm run dev
```

## Build (packaging)

```bash
npm run build
```

Génère `dist/index.html` : un fichier HTML unique et autonome (CSS + JS TypeScript compilé inlinés), accompagné de `dist/manifest.webmanifest`, `dist/sw.js` et `dist/icon.svg` (fichiers requis par les navigateurs pour l'installation PWA et le mode hors-ligne, impossibles à inliner dans le HTML).

```bash
npm run preview
```

pour tester le build de production localement.

## Déploiement

Déposer le contenu de `dist/` sur n'importe quel hébergeur statique servant du HTTPS (requis pour le service worker). Ouvrir le site sur mobile puis « Ajouter à l'écran d'accueil » pour l'installer comme une app.

## Publier une release

Un tag `v*.*.*` déclenche `.github/workflows/release.yml`, qui build l'app et publie une release GitHub avec `dist/` en pièce jointe (`supertimer-vX.Y.Z.zip` + `index.html` seul) :

```bash
git tag v1.0.0
git push origin v1.0.0
```
