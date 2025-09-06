import ModalStore from "./stores/modal-store.js";

document.addEventListener( "alpine:init", () => {
    Alpine.store( "modal", ModalStore );
} );