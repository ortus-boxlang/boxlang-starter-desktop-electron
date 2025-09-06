import coldbox from "coldbox-vite-plugin";
import { defineConfig, loadEnv } from "vite";

export default defineConfig( ( { mode } ) => {
    const env = loadEnv( mode, process.cwd() );
    return {
      plugins      : [
        coldbox({
          input: [
            "resources/assets/scss/app.scss",
            "resources/assets/js/app.js"
          ],
          refresh: true,
          publicDirectory: "dist",
          buildDirectory: "."
        } ),
      ],
      build: {
        outDir: "dist"
      },
      resolve: {}
    }
});