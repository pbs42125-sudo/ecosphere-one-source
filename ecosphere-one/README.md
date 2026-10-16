# EcoSphere One — Sustainable Campus Digital Twin

A responsive, light-themed hackathon prototype for an AI-powered sustainable campus. It demonstrates a conceptual 3D campus, sustainability dashboard, waste image upload workflow, energy savings calculator, water observation form, rule-based sustainability advisor, and CSV exports.

## Important transparency notes

- Dashboard KPI values are **simulated demonstration data**, not measured DSU campus data.
- The 3D scene is a conceptual illustration, not a survey-accurate DSU reconstruction.
- The 360° campus tour opens the official Turiya URL in a new tab. No data is scraped from the tour.
- Waste image upload works, but actual computer-vision classification is **not connected**.
- EcoAdvisor uses local rule-based responses; no generative AI service is connected.
- Water observations entered in this prototype are stored in the current browser using localStorage, not in a shared database.
- No physical campus equipment is controlled.

## Run locally

1. Download and extract this repository.
2. Open the folder in VS Code.
3. Start a local static server. For example, install the VS Code **Live Server** extension and choose **Open with Live Server** on `index.html`.
4. The 3D scene loads the Three.js library from a CDN, so an internet connection is needed.

You can also serve the folder with Python:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy free with GitHub Pages

1. Create a public GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
5. Wait for GitHub Pages to publish and open the URL it provides.

## Project structure

- `index.html` — all page markup and navigation
- `styles.css` — responsive light-theme styles
- `app.js` — navigation, charts, 3D scene, demo interactions and CSV exports

## Extending the prototype

To make this production-ready, connect a real computer-vision model, secure AI service, persistent database, authenticated administrator workflow, and authorized campus energy/water data sources. Store secrets only in a server-side environment, never in frontend code or a public repository.
