import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        // Completely disable manual chunks to prevent React splitting
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force ALL React-related imports to use the same instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    // Aggressive deduplication
    dedupe: [
      "react", 
      "react-dom", 
      "react-is",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query"
    ],
  },
  optimizeDeps: {
    // Include all React-related dependencies 
    include: [
      "react", 
      "react-dom", 
      "react/jsx-runtime",
      "react-is",
      "@radix-ui/react-tooltip",
      "@tanstack/react-query",
      "react-i18next",
      "i18next"
    ],
    exclude: [],
    // Force complete re-optimization
    force: true,
    esbuildOptions: {
      jsx: 'automatic',
      // Ensure single React instance in development
      define: {
        'process.env.NODE_ENV': JSON.stringify(mode),
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    // Add React debugging in development
    __DEV__: mode === 'development',
  },
  // Additional configuration to prevent React duplication
  esbuild: {
    jsx: 'automatic',
  }
}));