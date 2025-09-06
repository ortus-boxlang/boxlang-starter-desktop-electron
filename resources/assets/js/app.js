// Import styles
import '../scss/app.scss';

// Import Alpine.js store
import ModalStore from "./stores/modal-store.js";

// Initialize Alpine.js stores
document.addEventListener( "alpine:init", () => {
    Alpine.store( "modal", ModalStore );
} );

// Application initialization
document.addEventListener( "DOMContentLoaded", () => {
    console.log( "BoxLang Electron App initialized" );

    // Add any app-specific initialization here
} );

// Hot module replacement for development
if ( import.meta.hot ) {
    import.meta.hot.accept();
}