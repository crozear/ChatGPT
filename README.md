UI json: src/lib/ui.cartridge.json

# H-dungeon Codex Starter

Minimal Vite + React 18 + Tailwind project configured for running the H-dungeon UI locally.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (installs `npm`)

## Installation

```bash
npm install
```

## Running the app

Start the Vite development server:

```bash
npm run dev
```

The dev server is configured to listen on `0.0.0.0:1111`, so you can open the printed URL (for example, `http://127.0.0.1:1111/`) directly in your browser outside of the container.

## Using the UI

The UI boots with the bundled `src/lib/ui.cartridge.json`. Vite watches this file, so you can edit it locally and reload the browser to try new descriptors or tuning. The UI also persists your working state to `localStorage` under the key `"v0.7"`; clear that key (or the entire site storage) if you need to fall back to the freshly bundled cartridge.

To swap in a different cartridge without touching the filesystem, open the **Misc** tab and use the **Import** control to select a JSON file. The app will merge the uploaded data into the current session, including body stats and stash contents. When you're happy with your adjustments, click **Export JSON** in the same toolbar to download the live bundle so it can be reused or shared.

## Building for production

Create an optimized production build:

```bash
npm run build
```

The generated assets are written to the `dist/` directory.
