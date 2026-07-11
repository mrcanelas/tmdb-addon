import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/index.tsx',
    },
    define: {
      'process.env.PUBLIC_METALAYER_API_BASE': JSON.stringify(
        process.env.PUBLIC_METALAYER_API_BASE || '',
      ),
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
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:1338',
        changeOrigin: true,
      },
      '/c': {
        target: 'http://127.0.0.1:1338',
        changeOrigin: true,
      },
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
    // Served under /configure when behind the addon/API in Lite deployments.
    assetPrefix: process.env.METALAYER_CONFIGURE_BASE || '/',
  },
});
