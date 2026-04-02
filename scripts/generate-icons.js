/**
 * Icon generator — produces includes/icon.ico for Windows packaging.
 *
 * Requires: npm install --save-dev png-to-ico
 * Usage:    node scripts/generate-icons.js
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const root      = path.resolve( __dirname, '..' );

const sources = [
    'includes/icon.iconset/icon_16x16.png',
    'includes/icon.iconset/icon_32x32.png',
    'includes/icon.iconset/icon_256x256.png',
].map( ( p ) => path.join( root, p ) );

const dest = path.join( root, 'includes', 'icon.ico' );

pngToIco( sources )
    .then( ( buf ) => {
        writeFileSync( dest, buf );
        console.log( `icon.ico written to ${dest}` );
    } )
    .catch( ( err ) => {
        console.error( 'Failed to generate icon.ico:', err.message );
        process.exit( 1 );
    } );
