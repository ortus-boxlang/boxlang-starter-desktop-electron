/**
 * Modal
 */
const isOpenClass = "modal-is-open";
const openingClass = "modal-is-opening";
const closingClass = "modal-is-closing";
const scrollbarWidthCssVar = "--pico-scrollbar-width";
const animationDuration = 400; // ms

export default  {
  visibleModal: null,

  init () {
    // Close with a click outside
    // var self = this;
    document.addEventListener( "click", ( event ) => {
      if ( this.visibleModal === null ) return;
      const modalContent = this.visibleModal.querySelector( "article" );
      const isClickInside = modalContent.contains( event.target );
      !isClickInside && this.closeModal( this.visibleModal );
    } );

    // Close with Esc key
    document.addEventListener( "keydown", ( event ) => {
      if ( event.key === "Escape" && this.visibleModal ) {
        this.closeModal( this.visibleModal );
      }
    } );
  },

  toggleModal ( event ) {
    console.log( this );
     // event.preventDefault();
    const modal = document.getElementById( event.currentTarget.dataset.target );
    if ( !modal ) return;
    modal && ( modal.open ? this.closeModal( modal ) : this.openModal( modal ) );
  },

    // Close modal
  closeModal ( modal ) {
    this.visibleModal = null;
    const { documentElement: html } = document;
    html.classList.add( closingClass );
    setTimeout( () => {
      html.classList.remove( closingClass, isOpenClass );
      html.style.removeProperty( scrollbarWidthCssVar );
      modal.close();
    }, animationDuration );
  },

  openModal ( modal ) {
    const { documentElement: html } = document;
    const scrollbarWidth = this.getScrollbarWidth();
    if ( scrollbarWidth ) {
      html.style.setProperty( scrollbarWidthCssVar, `${scrollbarWidth}px` );
    }
    html.classList.add( isOpenClass, openingClass );
    setTimeout( () => {
      this.visibleModal = modal;
      html.classList.remove( openingClass );
    }, animationDuration );
    modal.showModal();
  },

  // Get scrollbar width
  getScrollbarWidth () {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    return scrollbarWidth;
  },
  // Is scrollbar visible
  isScrollbarVisible () {
    return document.body.scrollHeight > screen.height;
  }

};
