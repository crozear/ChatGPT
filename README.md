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

The dev server is configured to listen on `0.0.0.0:4173`, so you can open the printed URL (for example, `http://127.0.0.1:4173/`) directly in your browser outside of the container.

## Using the UI

The application fetches your cartridge from `raw.githubusercontent.com` with CORS enabled. Once the dev server is running, open the app in your browser and interact with the UI as you normally would.

## Building for production

Create an optimized production build:

```bash
npm run build
```

The generated assets are written to the `dist/` directory.
