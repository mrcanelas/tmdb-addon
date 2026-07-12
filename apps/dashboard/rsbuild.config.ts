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
    title: 'MetaLayer Dashboard',
    template: './index.html',
  },
  server: {
    port: 5175,
    base: '/admin',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:1338',
        changeOrigin: true,
      },
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
    assetPrefix: process.env.METALAYER_DASHBOARD_BASE || '/admin/',
  },
});
