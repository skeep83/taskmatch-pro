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
        manualChunks: undefined, // Disable manual chunks to prevent React duplication
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
      // Force all React imports to use the same instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
    },
    // Critical: dedupe all React-related packages
    dedupe: [
      "react", 
      "react-dom", 
      "react-is",
      "react/jsx-runtime",
      "react/jsx-dev-runtime"
    ],
  },
  optimizeDeps: {
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
    // Force re-optimization to ensure single React instance
    force: true,
    esbuildOptions: {
      // Ensure JSX is handled consistently
      jsx: 'automatic',
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  // Ensure external dependencies use our React instance
  ssr: {
    noExternal: ['react', 'react-dom']
  }
}));