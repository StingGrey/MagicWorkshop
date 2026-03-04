# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magic Workshop (魔法工坊) V2.0 — a fully client-side image metadata editor for AI-generated images. The application uses Vite as a build tool with modular JavaScript (ES Modules) and CSS.

## Development Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

## Architecture

### Project Structure

```
MagicWorkshop/
├── index.html                  # Main HTML (UI structure only)
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite configuration
├── src/
│   ├── main.js                 # Entry point (CSS + JS imports)
│   ├── css/
│   │   ├── variables.css       # CSS custom properties (light/dark theme)
│   │   ├── animations.css      # Keyframes & orb background
│   │   ├── layout.css          # Grid, cards, app structure
│   │   └── components.css      # Buttons, inputs, tabs, toast, etc.
│   └── js/
│       ├── state.js            # Global state object & constants
│       ├── i18n.js             # Internationalization (zh-CN / en)
│       ├── utils.js            # Utility functions (DOM, binary, file)
│       ├── ui.js               # Tab switching, theme toggle
│       ├── app.js              # Entry: event listeners, loadFile, parseMetadata
│       ├── parsers/
│       │   ├── png.js          # PNG chunk read/write (tEXt, iTXt, zTXt, CRC32)
│       │   ├── jpeg.js         # JPEG EXIF via piexifjs
│       │   └── sd-parser.js    # SD WebUI / NovelAI / ComfyUI format parsing
│       └── editors/
│           ├── meta-editor.js  # Metadata form logic & save
│           ├── info-inspector.js # Read-only info panel & JSON tree
│           ├── exif-editor.js  # EXIF form logic & save
│           └── obfuscation.js  # Gilbert curve pixel scrambling
├── .github/workflows/
│   └── deploy.yml              # GitHub Pages auto-deploy
└── MagicWorkshop.html          # Original single-file version (legacy)
```

### Module Dependency Graph

```
state.js ← (no deps, exports shared state)
i18n.js ← state
utils.js ← (no deps)
ui.js ← (no deps)
parsers/png.js ← utils (crc32)
parsers/jpeg.js ← utils (setFieldVal, dmsRationalToDeg)
parsers/sd-parser.js ← state, utils
editors/meta-editor.js ← state, i18n, utils, parsers/png, parsers/jpeg, parsers/sd-parser
editors/info-inspector.js ← state, i18n, utils, parsers/png, parsers/sd-parser
editors/exif-editor.js ← state, i18n, utils, parsers/jpeg
editors/obfuscation.js ← state, i18n, utils, parsers/png
app.js ← everything (orchestrator)
```

### Key Patterns

- **State**: All mutable global state lives in `state.js` as a single exported object
- **Window globals**: Functions referenced by `onclick` in HTML are attached to `window` in `app.js`
- **CSS variables**: All colors/shadows/radii defined in `variables.css` — never hardcode
- **Theme**: Light/dark via `[data-theme="dark"]` CSS selectors

### External Dependencies (npm)

- **piexifjs** — JPEG EXIF read/write
- **exifreader** — EXIF parsing
- **pako** — zlib decompression for PNG zTXt chunks

### Deployment

- GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- Vite builds to `dist/` with relative paths (`base: './'`)
