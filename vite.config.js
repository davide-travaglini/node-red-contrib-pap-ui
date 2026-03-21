import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],

    root: 'ui',
    base: './',

    build: {
        outDir: resolve(__dirname, 'resources/dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'ui/index.html')
        },
        chunkSizeWarningLimit: 600
    },

    server: {
        proxy: {
            '/pap/api':       { target: 'http://localhost:1880', changeOrigin: true },
            '/pap/socket.io': { target: 'http://localhost:1880', ws: true }
        }
    }
})
