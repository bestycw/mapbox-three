import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'MapboxThree',
      fileName: 'mapbox-three',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['three', 'mapbox-gl'],
      output: {
        globals: {
          three: 'THREE',
          'mapbox-gl': 'mapboxgl'
        }
      }
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'dist/**']
    })
  ],
  server: {
    open: '/examples/basic.html',
    port: 3000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}) 