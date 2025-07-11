import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '../../.env' });

// Read DFX environment variables and make them available with VITE_ prefix
const dfxEnv = {};
const envPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const match = line.match(/^(?:export\s+)?(\w+)=['"](.*)['"]$/);
    if (match) {
      const [, key, value] = match;
      // Add VITE_ prefix to DFX variables
      if (key.startsWith('DFX_') || key.startsWith('CANISTER_')) {
        dfxEnv[`VITE_${key}`] = value;
      }
    }
  });
}

export default defineConfig({
  build: {
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  define: {
    // Make DFX env variables available with VITE_ prefix
    ...dfxEnv,
    // Explicitly define these variables for development
    'import.meta.env.VITE_DFX_NETWORK': JSON.stringify(process.env.DFX_NETWORK || 'local'),
    'import.meta.env.VITE_CANISTER_ID_INTERNET_IDENTITY': JSON.stringify(process.env.CANISTER_ID_INTERNET_IDENTITY || 'u6s2n-gx777-77774-qaaba-cai'),
    'import.meta.env.VITE_CANISTER_ID_MEDIVET_BACKEND': JSON.stringify(process.env.CANISTER_ID_MEDIVET_BACKEND || 'uxrrr-q7777-77774-qaaaq-cai'),
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
  ],
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("../declarations", import.meta.url)
        ),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
});
