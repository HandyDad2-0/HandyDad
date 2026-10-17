import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The materials engine lives in ../backend (owned by Razee) and is a pure,
// dependency-free computation module, so the frontend scaffold imports it
// directly for now rather than duplicating the logic. `fs.allow` widens
// Vite's dev-server file access one level up so that import resolves.
// Once a real API layer exists (see Trello: "Backend/API integration
// layer"), this import should be replaced with a fetch/API call instead.
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
    // The challenge and Q&A APIs live in ../backend (npm start, port 3001).
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
