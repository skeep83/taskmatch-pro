import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    sourcemap: true,
    modulePreload: true,
    rollupOptions: {
      external: [],
      output: {
        hoistTransitiveImports: false,
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/react-is/") ||
            id.includes("/use-sync-external-store/")
          ) {
            return "vendor-react";
          }

          if (id.includes("@supabase/supabase-js")) return "vendor-supabase";
          if (id.includes("react-i18next") || id.includes("/i18next/")) return "vendor-i18n";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (
            id.includes("@radix-ui/") ||
            id.includes("embla-carousel-react") ||
            id.includes("vaul") ||
            id.includes("cmdk") ||
            id.includes("/clsx/") ||
            id.includes("/tailwind-merge/") ||
            id.includes("/class-variance-authority/")
          ) {
            return "vendor-ui";
          }
        },
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
    pure: mode === 'production'
      ? ['console.log', 'console.debug', 'console.info']
      : [],
  }
}));