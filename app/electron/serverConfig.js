import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const DEFAULT_SERVER_CONFIG = {
    port: 59700,
    host: '127.0.0.1',
    webRoot: 'public',
    serverHome: '.miniserver/home',
    rewrites: true,
    debug: false
};

function stripJsonComments( source ) {
    let result = '';
    let inString = false;
    let stringQuote = '';
    let inLineComment = false;
    let inBlockComment = false;

    for ( let index = 0; index < source.length; index++ ) {
        const current = source[ index ];
        const next = source[ index + 1 ];
        const previous = source[ index - 1 ];

        if ( inLineComment ) {
            if ( current === '\n' ) {
                inLineComment = false;
                result += current;
            }
            continue;
        }

        if ( inBlockComment ) {
            if ( current === '*' && next === '/' ) {
                inBlockComment = false;
                index++;
            }
            continue;
        }

        if ( inString ) {
            result += current;
            if ( current === stringQuote && previous !== '\\' ) {
                inString = false;
                stringQuote = '';
            }
            continue;
        }

        if ( current === '"' || current === "'" ) {
            inString = true;
            stringQuote = current;
            result += current;
            continue;
        }

        if ( current === '/' && next === '/' ) {
            inLineComment = true;
            index++;
            continue;
        }

        if ( current === '/' && next === '*' ) {
            inBlockComment = true;
            index++;
            continue;
        }

        result += current;
    }

    return result;
}

function parseBoolean( value ) {
    if ( value == null ) {
        return undefined;
    }

    const normalized = String( value ).trim().toLowerCase();

    if ( [ 'true', '1', 'yes', 'on' ].includes( normalized ) ) {
        return true;
    }

    if ( [ 'false', '0', 'no', 'off' ].includes( normalized ) ) {
        return false;
    }

    return undefined;
}

function parseNumber( value ) {
    if ( value == null || value === '' ) {
        return undefined;
    }

    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : undefined;
}

function buildEnvironmentOverrides( env ) {
    return {
        port: parseNumber( env.BOXLANG_MINISERVER_PORT ),
        host: env.BOXLANG_MINISERVER_HOST,
        webRoot: env.BOXLANG_MINISERVER_WEBROOT,
        serverHome: env.BOXLANG_MINISERVER_SERVER_HOME,
        rewrites: parseBoolean( env.BOXLANG_MINISERVER_REWRITES ),
        debug: parseBoolean( env.BOXLANG_MINISERVER_DEBUG )
    };
}

export function loadServerConfig( { projectRoot, path, env = process.env } ) {
    const configPath = path.join( projectRoot, 'miniserver.json' );
    const rawConfig = readFileSync( configPath, 'utf8' );
    const fileConfig = JSON.parse( stripJsonComments( rawConfig ) );
    const normalizedFileConfig = { ...fileConfig };

    // Support legacy `webroot` while standardizing on `webRoot`.
    if ( normalizedFileConfig.webroot && !normalizedFileConfig.webRoot ) {
        normalizedFileConfig.webRoot = normalizedFileConfig.webroot;
    }

    delete normalizedFileConfig.webroot;

    const envOverrides = buildEnvironmentOverrides( env );
    const config = {
        ...DEFAULT_SERVER_CONFIG,
        ...normalizedFileConfig,
        ...Object.fromEntries( Object.entries( envOverrides ).filter( ( [ , value ] ) => value !== undefined && value !== '' ) )
    };

    return {
        ...config,
        configPath,
        serverHomePath: path.resolve( projectRoot, config.serverHome )
    };
}

export function writeRuntimeServerConfig( { projectRoot, path, serverConfig } ) {
    const runtimeConfigDirectory = path.join( projectRoot, '.miniserver', 'runtime' );
    const runtimeConfigPath = path.join( runtimeConfigDirectory, 'miniserver.runtime.json' );
    const runtimeConfig = {
        port: serverConfig.port,
        host: serverConfig.host,
        webRoot: serverConfig.webRoot,
        serverHome: serverConfig.serverHome,
        rewrites: serverConfig.rewrites,
        debug: serverConfig.debug
    };

    mkdirSync( runtimeConfigDirectory, { recursive: true } );
    writeFileSync( runtimeConfigPath, JSON.stringify( runtimeConfig, null, 4 ) + '\n', 'utf8' );

    return runtimeConfigPath;
}

export function getServerOrigin( serverConfig ) {
    const localHost = [ '0.0.0.0', '::', '::0', '*' ].includes( serverConfig.host )
        ? '127.0.0.1'
        : serverConfig.host;

    return `http://${localHost}:${serverConfig.port}`;
}