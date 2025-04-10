
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
  plugins: [
    react(),
    // Only include componentTagger in development mode
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean), // Filter out false values (when not in development)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize production build
    minify: 'terser',
    sourcemap: false, // Disable source maps in production for security
    chunkSizeWarningLimit: 1000, // Increase warning limit for chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code to improve caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@/components/ui'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    // Add tree shaking
    target: 'es2018',
    cssCodeSplit: true,
    reportCompressedSize: false // Skip compressed size reporting to speed up builds
  }
}));
