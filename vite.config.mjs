import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = fileURLToPath( new URL( '.', import.meta.url ) );

export default defineConfig( {
    // Root directory where Vite will look for files
    root: '.',

    // Avoid recursive copy: outDir is inside public/, so disable Vite publicDir copying.
    publicDir: false,

    // Entry points for your assets
    build: {
        // Output directory for built assets (separate from electron-builder)
        outDir: 'public/includes/resources/',

        // Clear the output directory before each build
        emptyOutDir: true,

        // Generate manifest for BoxLang integration
        manifest: true,

        // Configure rollup options
        rollupOptions: {
            input: {
                // Main entry points
                app: resolve( __dirname, 'resources/assets/js/app.js' ),
                styles: resolve( __dirname, 'resources/assets/scss/app.scss' ),
                theme: resolve( __dirname, 'resources/assets/scss/boxlang-theme.scss' )
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
        strictPort: true,
        // Enable CORS for BoxLang integration
        cors: true,
        // Serve static assets
        fs: {
            allow: [
                // Allow serving files from these directories
                resolve( __dirname, 'resources' ),
                resolve( __dirname, 'resources/dist' ),
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
            '@fonts': resolve( __dirname, 'resources/assets/fonts' ),
            '@images': resolve( __dirname, 'public/includes/images' )
        }
    },

    // CSS configuration
    css: {
        preprocessorOptions: {
            scss: {
                // Silence Bootstrap 5's use of deprecated Sass global color functions
                // (red(), green(), blue()). These are Bootstrap internals — the warnings
                // will resolve when Bootstrap publishes a Sass-modern-compatible release.
                silenceDeprecations: [ "color-functions", "global-builtin", "import" ],
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
