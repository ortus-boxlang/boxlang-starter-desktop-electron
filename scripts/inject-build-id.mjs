#!/usr/bin/env node
/**
 * Injects the git short SHA (or BUILD_ID env var) into Main.js
 * by replacing the @buildId@ token.
 *
 * Usage:
 *   node scripts/inject-build-id.mjs
 *
 * In CI, set BUILD_ID env var to override the git SHA.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );
const projectRoot = join( __dirname, '..' );
const mainJsPath = join( projectRoot, 'app', 'electron', 'Main.js' );

// Get build ID from env or git
let buildId = process.env.BUILD_ID;
if ( !buildId ) {
	try {
		buildId = execSync( 'git rev-parse --short HEAD', { cwd: projectRoot, encoding: 'utf8' } ).trim();
	} catch ( e ) {
		console.warn( '⚠️  Could not get git SHA, using "unknown"' );
		buildId = 'unknown';
	}
}

console.log( `🔧 Injecting build ID: ${buildId}` );

// Read Main.js
let content = readFileSync( mainJsPath, 'utf8' );

// Replace the token
const token = '@buildId@';
if ( !content.includes( token ) ) {
	console.warn( `⚠️  Token "${token}" not found in Main.js — skipping` );
	process.exit( 0 );
}

content = content.replaceAll( token, buildId );

// Write back
writeFileSync( mainJsPath, content, 'utf8' );
console.log( `✅ Build ID injected into Main.js` );
