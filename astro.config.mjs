import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react()],
  site: "https://coloor.pages.dev",
  vite: {
    plugins: [tailwindcss()],
  },
});
