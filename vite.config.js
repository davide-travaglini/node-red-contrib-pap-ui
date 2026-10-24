import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.png'],
            // basePath is only known at runtime (configured per ui-pap-server node), so
            // start_url/scope must stay relative — resolved against the page's <base href>.
            manifest: {
                name:             'PAP UI',
                short_name:       'PAP UI',
                description:      'Standalone home automation dashboard for Node-RED',
                start_url:        '.',
                scope:            '.',
                display:          'standalone',
                background_color: '#1a1a1e',
                theme_color:      '#3dd28d',
                icons: [
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            workbox: {
                // /api/* and socket.io must always hit the network — never cached or
                // served as the SPA fallback.
                navigateFallbackDenylist: [/\/api\//, /socket\.io/],
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.includes('/api/'),
                        handler: 'NetworkFirst',
                        options: { cacheName: 'pap-api', networkTimeoutSeconds: 5 }
                    }
                ]
            }
        })
    ],

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
