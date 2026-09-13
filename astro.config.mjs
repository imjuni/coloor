import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  base: "/coloor",
  integrations: [react()],
  site: "https://imjuni.github.io",
});
