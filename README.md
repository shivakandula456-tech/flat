# Flat 501 — a provisional digital twin

A video-derived spatial study of a compact one-bedroom flat. The site combines a Three.js reconstruction, a synchronized SVG floor plan, a room dossier and the original walkthrough in one static, self-contained experience.

The project is deliberately honest about what the footage does and does not establish. Geometry, furniture positions and the overall envelope are provisional. The 400 sq ft area is owner-reported, not measured.

## What is included

- An interactive 3D model with perspective, cutaway, interior and plan views.
- Six linked spaces: living/entrance hall, far zone, wash alcove, closed room, bedroom and utility balcony.
- A synchronized SVG plan and room dossier with confidence labels.
- The original 23.2-second video with six chapter markers.
- Five reference stills, a frame lightbox and an evidence register.
- Responsive layouts for desktop and mobile, plus WebGL and no-JavaScript fallbacks.
- A local PowerShell preview server with no Python or Node.js dependency.

## Explore

- Select a room in the 3D model, the plan or the room index to keep all three views in step.
- Use **Perspective**, **Cutaway**, **Interior** and **Plan** to change the camera.
- Use the chapter list to jump through the source video; it plays independently of the 3D view.
- Open a reference still to read its timestamp and caption.
- The evidence section separates direct observations from interpretations and unresolved questions.

## Preview locally

The deployed site is entirely static. No build step, package install, server-side code or environment variables are required.

### Option 1: GitHub Pages

Publish the contents of this folder as a static site. `index.html` is the entry point and all module, media and vendor paths are relative.

### Option 2: Windows preview server

From this folder, run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Then open <http://localhost:8087/>. The port can be changed with `-Port`:

```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8090
```

The preview server supports byte ranges so the video can seek. It is a local convenience only and is not part of the deployed site.

Opening `index.html` directly from disk is not recommended. Browsers commonly block JavaScript modules and video metadata for `file://` pages; use a static server or GitHub Pages.

## Project structure

```text
flat-501-digital-twin/
  index.html
  css/                     base, layout, components and responsive styles
  js/
    app.js                 page orchestration and interactions
    property-data.js       canonical rooms, evidence, chapters and frames
    floorplan.js           synchronized SVG plan
    viewer3d.js            Three.js viewer, camera presets and labels
    viewer-geometry.js     shared geometry and material helpers
    model-architecture.js  shell, walls, openings, doors and lighting
    model-furniture.js     furniture builders
    model-fixtures.js      small fixtures and fittings
    model-textures.js      procedural surface materials
  assets/
    images/                stills extracted from the source video
    video/                 original walkthrough
  vendor/three/            Three.js and OrbitControls, MIT licensed
  docs/                    evidence, assumptions and test notes
  tools/serve.ps1          optional local preview server
```

`js/property-data.js` is the single source of truth for the plan, model, dossier and evidence register.

## Evidence and limits

- The supplied walkthrough is embedded unchanged. All timestamps refer to that file.
- The reconstruction is a visual estimate from a hand-held 23.2-second video. No photogrammetry, camera tracking, measured survey or metric calibration was used.
- The model uses an assumed 8.0 × 5.2 m envelope with 2.7 m walls. This is a planning assumption, not a measured footprint.
- The far zone's function is not established. The interior beyond the closed white door was never filmed. Exact dimensions, wall thicknesses, ceiling height, opening sizes and real-world orientation remain unknown.
- The north indicator is diagrammatic.
- The balcony opening and safety mesh are confirmed; the balcony dimensions are not.

See [docs/assumptions.md](docs/assumptions.md) for the working assumptions and [docs/evidence.md](docs/evidence.md) for the evidence register and timestamped observations.

## Testing

The site has been exercised in Chrome at desktop and mobile widths, with automatic checks for JavaScript errors, 3D readiness, plan synchronization, chapter playback, dialogs and horizontal overflow. See [docs/testing.md](docs/testing.md) for the current test matrix and known gaps.

## Assets and attribution

The walkthrough and derived reference stills were supplied for this project. Their use remains subject to the owner's rights. Three.js and OrbitControls are included under the MIT license in [`vendor/three/LICENSE`](vendor/three/LICENSE). No runtime asset is loaded from a third-party CDN.
