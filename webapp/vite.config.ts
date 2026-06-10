import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Plain SPA: no server needed. `npm run build` produces a static bundle you can
// open in Chrome (Web Serial requires https or localhost, which `dev`/`preview`
// both satisfy).
export default defineConfig({
  plugins: [svelte()],
});
