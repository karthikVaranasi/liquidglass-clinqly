## Clinqly Dashboard - Clinic Appointment Booking

Modern React + TypeScript + Vite application with a neumorphic UI for administering clinics, doctors, patients, analytics, and more.

The app is built with:

- **React 19**
- **Tailwind CSS 4**

---

## Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+ (comes with Node)
- A terminal (PowerShell, cmd, or your preferred shell)

To verify:

```bash
node -v
npm -v
```

---

## Local Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ezmedtech-ai/clinic-assistant-ui.git
   cd clinic-assistant-ui
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

   - Vite will print a **local URL** (typically `http://localhost:5173`).
   - Open it in your browser to view the app.

---

## Available npm Scripts

- **`npm run dev`**: Starts the Vite dev server with hot module reload.
- **`npm run build`**: Type-checks the project (`tsc -b`) and builds the production bundle into the `dist` folder.
- **`npm run preview`**: Serves the built app from `dist` using Vite’s preview server (use after `npm run build`).
- **`npm run lint`**: Runs ESLint across the project.
- **`npm run start`**: Serves the already-built `dist` folder on port **8081** using `serve`. Useful for hosting a local production build.

---

## Building for Production

1. **Create a production build**

   ```bash
   npm run build
   ```

   - Output goes to the `dist` directory.

2. **Preview the production build (Vite)**

   ```bash
   npm run preview
   ```

   - Opens a local server to test the built app.

3. **Serve the build on port 8081 (optional)**

   ```bash
   npm run start
   ```

   - Uses the `serve` package to host `dist` at `http://localhost:8081`.

---

## Code Quality

- **Linting**

  ```bash
  npm run lint
  ```

  This runs ESLint using the configuration in `eslint.config.js`.

---

## Project Structure (High Level)

- **`src/`**: Main application source code
  - **`components/`**: UI components and pages (admin, doctor, login, layout, etc.)
  - **`api/`**: API client modules for admin, doctor, and shared functionality
  - **`contexts/`**: React context providers (session, counts, etc.)
  - **`hooks/`**: Custom React hooks
  - **`lib/`**: Utility helpers (dates, error handling, general utils)
  - **`stores/`**: State management (if used/expanded)
- **`public/`**: Static assets (logos, images)
- **`dist/`**: Generated production build (after `npm run build`)

---

## Notes for Local Development

- If the dev server port is already in use, Vite will prompt to use a different port; check the terminal output.
- For best experience, use a modern browser (Chrome, Edge, Firefox) with DevTools open while developing.
- Commit and push `dist` only if your deployment strategy requires it; otherwise, it can usually be generated on demand via `npm run build`.

