import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = fileURLToPath( new URL( '.', import.meta.url ) );

export default defineConfig( {
    // Root directory where Vite will look for files
    root: '.',

    // Entry points for your assets
    build: {
        // Output directory for built assets
        outDir: 'dist',

        // Clear the output directory before each build
        emptyOutDir: true,

        // Generate manifest for BoxLang integration
        manifest: true,

        // Configure rollup options
        rollupOptions: {
            input: {
                // Main entry points
                app: resolve( __dirname, 'resources/assets/js/app.js' ),
                styles: resolve( __dirname, 'resources/assets/scss/app.scss' )
            },
            output: {
                // Configure output file names
                entryFileNames: 'js/[name]-[hash].js',
                chunkFileNames: 'js/[name]-[hash].js',
                assetFileNames: ( assetInfo ) => {
                    if ( assetInfo.name?.endsWith( '.css' ) ) {
                        return 'css/[name]-[hash][extname]';
                    }
                    if ( assetInfo.name?.match( /\.(woff|woff2|eot|ttf|otf)$/ ) ) {
                        return 'fonts/[name]-[hash][extname]';
                    }
                    if ( assetInfo.name?.match( /\.(png|jpg|jpeg|gif|svg|webp)$/ ) ) {
                        return 'images/[name]-[hash][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    },

    // Asset handling
    assetsInclude: [
        '**/*.woff',
        '**/*.woff2',
        '**/*.eot',
        '**/*.ttf',
        '**/*.otf'
    ],

    // Development server configuration
    server: {
        host: '127.0.0.1',
        port: 3000,
        // Enable CORS for BoxLang integration
        cors: true,
        // Serve static assets
        fs: {
            allow: [
                // Allow serving files from these directories
                resolve( __dirname, 'resources' ),
                resolve( __dirname, 'dist' ),
                resolve( __dirname, '.' )
            ]
        }
    },

    // Path resolution
    resolve: {
        alias: {
            '@': resolve( __dirname, 'resources/assets' ),
            '@js': resolve( __dirname, 'resources/assets/js' ),
            '@scss': resolve( __dirname, 'resources/assets/scss' ),
            '@fonts': resolve( __dirname, 'resources/assets/fonts' )
        }
    },

    // CSS configuration
    css: {
        preprocessorOptions: {
            scss: {
                // Add any SCSS options here
                additionalData: `
                    // Global SCSS variables and mixins can be imported here
                `
            }
        }
    },

    // Plugin configuration
    plugins: [
        // Add any Vite plugins you need
    ],

    // Define global constants
    define: {
        // Useful for conditional compilation
        __DEVELOPMENT__: JSON.stringify( process.env.NODE_ENV === 'development' ),
        __ELECTRON__: JSON.stringify( true )
    },

    // Enable source maps in development
    sourcemap: process.env.NODE_ENV === 'development'
} );
