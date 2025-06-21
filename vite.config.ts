import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from 'child_process';
import fs from 'fs';

let version = process.env.VERSION;
if (!version) {
  try {
    version = execSync('git describe --tags --abbrev=0').toString().trim();
  } catch {
    version = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/configure/',
  publicDir: 'configure/public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./configure/src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
}));