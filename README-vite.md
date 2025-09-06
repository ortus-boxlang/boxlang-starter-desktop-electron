# BoxLang Electron Starter with Vite

A modern starter template for building desktop applications with BoxLang, Electron, and Vite.

## Features

- 🚀 **BoxLang** - Modern CFML runtime for server-side logic
- ⚡ **Vite** - Fast build tool with HMR (Hot Module Replacement)
- 🖥️ **Electron** - Cross-platform desktop application framework
- 🎨 **SCSS** - Enhanced CSS with variables, mixins, and more
- 📦 **Asset Pipeline** - Automatic asset bundling and optimization
- 🔄 **Live Reload** - Instant feedback during development
- 📱 **Responsive** - Mobile-first CSS framework included

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- BoxLang runtime
- BoxLang MiniServer

### Installation

1. Clone or download this starter template
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

#### Option 1: Automatic (Recommended)
```bash
# Start both Vite dev server and Electron
npm run dev:electron
```

#### Option 2: Manual
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Start Electron (after Vite is running)
npm run start
```

#### Option 3: Use the development script
```bash
# Make the script executable (first time only)
chmod +x dev.sh

# Start development
./dev.sh dev
```

### Building for Production

```bash
# Build assets
npm run build

# Package the application
npm run package

# Create distributable
npm run make
```

## Project Structure

```
├── electron/
│   └── main.js              # Electron main process
├── resources/
│   └── assets/
│       ├── js/
│       │   ├── app.js       # Main JavaScript entry point
│       │   └── stores/      # Alpine.js stores
│       └── scss/
│           └── app.scss     # Main stylesheet entry point
├── includes/
│   └── helpers/
│       └── ViteHelper.bx    # BoxLang helper for Vite integration
├── views/
│   └── loading.html         # Loading screen
├── Application.bx           # BoxLang application settings
├── index.bxm               # Main application template
├── vite.config.js          # Vite configuration
├── package.json            # Node.js dependencies and scripts
└── dev.sh                  # Development helper script
```

## Asset Management

### JavaScript

Place your JavaScript files in `resources/assets/js/`. The main entry point is `app.js`.

```javascript
// resources/assets/js/app.js
import '../scss/app.scss';
// Your JavaScript code here
```

### Stylesheets

Place your SCSS files in `resources/assets/scss/`. The main entry point is `app.scss`.

```scss
// resources/assets/scss/app.scss
// Your styles here
```

### Using Assets in BoxLang Templates

The `ViteHelper.bx` component provides methods to include Vite-processed assets:

```boxlang
<bx:script>
    viteHelper = new includes.helpers.ViteHelper();
</bx:script>

<!-- Include CSS -->
<bx:output>#viteHelper.styles( "styles" )#</bx:output>

<!-- Include JavaScript -->
<bx:output>#viteHelper.scripts( "app" )#</bx:output>
```

## Configuration

### Vite Configuration

Edit `vite.config.js` to customize:
- Asset processing
- Development server settings
- Build output configuration

### Electron Configuration

Edit `electron/main.js` to customize:
- Window properties
- BoxLang server settings
- Application behavior

### BoxLang Configuration

Edit `config/boxlang.json` for BoxLang-specific settings.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build assets for production |
| `npm run preview` | Preview production build |
| `npm run dev:electron` | Start both Vite and Electron |
| `npm run start` | Start Electron app |
| `npm run package` | Package the application |
| `npm run make` | Create distributable packages |

## Development Helper Script

The included `dev.sh` script provides convenient commands:

```bash
./dev.sh dev      # Start development mode
./dev.sh build    # Build assets
./dev.sh package  # Package application
./dev.sh clean    # Clean build artifacts
./dev.sh install  # Install dependencies
```

## Environment Variables

You can set these environment variables to customize behavior:

- `ENVIRONMENT` - Set to "development" or "production"
- `VITE_HOST` - Vite dev server host (default: 127.0.0.1:3000)
- `VITE_PROTOCOL` - Protocol for dev server (default: http)

## Tips & Best Practices

1. **Development Workflow**
   - Use `npm run dev:electron` for the best development experience
   - The Vite dev server provides hot module replacement
   - BoxLang changes require a server restart

2. **Asset Organization**
   - Keep related JavaScript files together
   - Use SCSS partials for better organization
   - Import all dependencies in your main entry files

3. **Production Builds**
   - Always run `npm run build` before packaging
   - Test the production build with `npm run preview`
   - Assets are automatically optimized and hashed

4. **Cross-Platform Considerations**
   - Test on all target platforms
   - Use appropriate icons for each platform
   - Consider platform-specific features

## Troubleshooting

### Common Issues

1. **Assets not loading in production**
   - Ensure `npm run build` was run before packaging
   - Check that the manifest file is being generated

2. **Vite dev server not starting**
   - Check if port 3000 is available
   - Verify all dependencies are installed

3. **BoxLang server errors**
   - Check BoxLang MiniServer is installed and in PATH
   - Verify BoxLang configuration in `config/boxlang.json`

### Getting Help

- Check the console for error messages
- Review the Electron developer tools
- Examine the Vite build output

## License

This starter template is provided as-is for educational and development purposes.
