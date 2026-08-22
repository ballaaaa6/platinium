# Office Dashboard V1

A clean standalone 3D office dashboard built with Vite, vanilla modern JavaScript, and Three.js.

## Run

```bash
npm install
npm run dev
npm run build
```

The local development URL is `http://localhost:5173`.

## Runtime foundation

- Map = supplied GLB 3D geometry (`public/game-assets/map/default_office.glb`)
- Furniture = supplied GLB 3D assets
- Characters = supplied PNG camera-facing billboards
- Collision = 24×10 logical grid plus catalog footprint metadata

The V1 runtime includes 20 deterministic billboard actors, seeded cardinal random walking, selection/inspection, grid visibility, pause/resume, reset, and an Assets inventory. Tasks, workflows, schedules, memory, stamina, mood, AI reasoning, and backend orchestration remain intentionally inactive.

Validate the prepared asset foundation with:

```bash
npm run validate:assets
```
