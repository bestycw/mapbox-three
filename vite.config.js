import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'MapboxThree',
      fileName: 'mapbox-three',
      formats: ['umd']
    },
    rollupOptions: {
      external: ['mapbox-gl'],
      output: {
        globals: {
          'mapbox-gl': 'mapboxgl'
        }
      }
    }
  }
}) 