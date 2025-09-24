import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/metadata': 'http://localhost:8000',
      '/content': 'http://localhost:8000',
      '/ls': 'http://localhost:8000'
    }
  }
})
