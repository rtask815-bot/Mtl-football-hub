import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],

    server: {
        port: 5173,
        host: true,
        proxy: {
            "/api": {
                target: "http://localhost:5000",
                changeOrigin: true,
                secure: false
            }
        }
    },

    build: {
        outDir: "dist",
        sourcemap: true,
        rollupOptions: {
            // Externalize 'three' so Rollup doesn't try to bundle it if it's not installed locally
            external: ["three"]
        }
    }
});
