import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mini/shared': resolve(__dirname, '../../packages/shared/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
