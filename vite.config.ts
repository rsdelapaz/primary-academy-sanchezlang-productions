import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/primary-academy-sanchezlang-productions/',
  plugins: [vue()],
  build: {
    sourcemap: false,
  },
})
