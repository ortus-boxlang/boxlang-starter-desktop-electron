# BoxLang Electron Desktop Application - Copilot Instructions

## Quick Context

This is a BoxLang Electron desktop application that combines BoxLang runtime with Electron for cross-platform desktop development. The application uses Vite for asset bundling and features modular architecture.

## BoxLang Language Specifics

### CLI Scripting and Arguments
- **CLI Arguments**: Use `CliGetArgs()` to get parsed command line arguments
- **Return Structure**: Returns a struct with `options` and `positionals` keys
- **Example**:
  ```boxlang
  function main( args = [] ) {
      var cliArgs = CliGetArgs();
      // cliArgs.options contains --flag and --key=value arguments
      // cliArgs.positionals contains non-flag arguments

      if ( cliArgs.options.force ) {
          println( "Force flag is enabled" );
      }

      if ( arrayLen( cliArgs.positionals ) > 0 ) {
          println( "First positional arg: " & cliArgs.positionals[1] );
      }
  }
  ```

### BoxLang Components
- **Component Execution**: Use tag-style syntax `bx:componentName{ }` for executing components
- **HTTP Component**: For HTTP requests, use:
  ```boxlang
  bx:http method="GET" url="#downloadUrl#" file="#filePath#" timeout="120" result="httpResult" {
      // Component body content
  }
  ```
- **Never use**: `new bx:http()` - this is incorrect syntax
- **Component Reference**: https://boxlang.ortusbooks.com/boxlang-language/reference/components/net/http

### File Operations
- **File Reading**: `fileRead( filePath ).trim()`
- **File Writing**: `fileWrite( filePath, content )`
- **File Existence**: `fileExists( filePath )`
- **Directory Operations**: `directoryExists()`, `directoryDelete()`, `directoryList()`
- **Path Operations**: `expandPath()` for relative to absolute paths

## Application Architecture

### Modular Structure
- **Main Entry**: `.electron/main.js` - Electron main process coordinator
- **TrayMenu.js**: System tray functionality
- **AppMenu.js**: Application menu management
- **Shortcuts.js**: Global keyboard shortcuts
- **BoxLang.js**: BoxLang miniserver lifecycle management

### Global Settings Object
```javascript
const globalSettings = {
    serverPort: 59700,
    serverDebugMode: true,
    appName: "BoxLang Starter Desktop",
    windowHeight: 800,
    windowWidth: 1200,
    projectRoot,
    path,
    loadingView: path.join( projectRoot, "views/loading.html" )
};
```

### BoxLang MiniServer Packaging
- **Version Control**: `.bvmrc` contains the BoxLang version to package
- **Packager**: `.miniserver/Package.bx` downloads and extracts BoxLang miniserver
- **Detection**: `BoxLang.js` detects packaged vs global miniserver installation
- **Priority**: Packaged miniserver (`.miniserver/bin/`) takes precedence over global installation

## Development Workflow

### NPM Scripts
- `npm run dev` - Development mode with hot reload
- `npm run package:miniserver` - Download and package BoxLang miniserver
- `npm run package:miniserver:force` - Force re-download miniserver
- `npm run package:full` - Package miniserver then build Electron app
- `npm run build` - Build Vite assets only
- `npm run package` - Build and package Electron application

### Asset Management
- **Vite Output**: Assets build to `includes/resources/`
- **ViteHelper.bx**: BoxLang integration for serving Vite-built assets
- **Development**: Assets served from Vite dev server
- **Production**: Assets served from built files

## Key Integration Points

### Electron ↔ BoxLang Communication
- **Server Detection**: Electron waits for "BoxLang MiniServer started" message
- **Error Handling**: BoxLang errors displayed in Electron dialogs
- **Process Management**: Electron manages BoxLang miniserver lifecycle

### File Structure
```
.electron/          # Electron main process modules
.miniserver/        # BoxLang miniserver packaging
├── Package.bx      # Packager script
├── bin/           # Downloaded miniserver binaries (gitignored)
└── lib/           # Downloaded miniserver libraries (gitignored)
includes/
├── resources/      # Vite build output (gitignored)
└── helpers/
    └── ViteHelper.bx # Vite integration helper
views/              # BoxLang views/templates
resources/assets/   # Source assets (JS, CSS, images)
```

## Code Standards

### BoxLang
- **Spacing**: Always use spaces around parentheses, brackets, braces, and operators
- **Components**: Use tag-style syntax `bx:component{ }` not `new` syntax
- **Arguments**: Access via `arguments.args` in main functions
- **Error Handling**: Use `try/catch` with descriptive error types and messages

### JavaScript (Electron)
- **ES Modules**: Use `import/export` syntax
- **Arrow Functions**: Prefer arrow functions for callbacks
- **Destructuring**: Use object destructuring for globalSettings access

### File Operations
- **Paths**: Use `path.join()` for cross-platform path construction
- **Existence Checks**: Always check file/directory existence before operations
- **Cleanup**: Clean up temporary files (zip downloads, etc.)

## Development Tips

1. **CLI Tools**: BoxLang scripts can be powerful CLI tools using argument parsing
2. **Component Usage**: Study BoxLang component documentation for proper syntax
3. **Error Messages**: Provide helpful error messages that suggest solutions
4. **Cross-platform**: Consider Windows, macOS, and Linux differences
5. **Packaging**: Test both packaged and global miniserver scenarios

## Common Patterns

### CLI Argument Parsing
```boxlang
function main( args = [] ) {
    var cliArgs = CliGetArgs();

    // Access options (--flag, --key=value)
    if ( cliArgs.options.force ) {
        println( "Force mode enabled" );
    }

    var configFile = cliArgs.options.config ?: "default.json";
    println( "Using config: " & configFile );

    // Access positional arguments
    for ( var path in cliArgs.positionals ) {
        println( "Processing: " & path );
    }
}
```

### HTTP Downloads
```boxlang
bx:http method="GET" url="#downloadUrl#" file="#localPath#" timeout="120" result="result" {
    // Optional: HTTP headers or body content
}

if ( result.statusCode != "200" ) {
    throw( type="DownloadError", message="Download failed", detail="HTTP " & result.statusCode );
}
```

### File Extraction
```boxlang
// Extract ZIP file
zip action="unzip" file="#zipPath#" destination="#extractPath#" overwrite="true";

// Verify extraction
if ( !directoryExists( expectedDir ) ) {
    throw( type="ExtractionError", message="Extraction failed" );
}
```
