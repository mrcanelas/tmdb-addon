import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  html: {
    title: 'MetaLayer',
    template: './index.html',
  },
  server: {
    port: 5174,
  },
  output: {
    distPath: {
      root: 'dist',
    },
    // Served under /configure when behind the addon/API in Lite deployments.
    assetPrefix: process.env.METALAYER_CONFIGURE_BASE || '/',
  },
});
