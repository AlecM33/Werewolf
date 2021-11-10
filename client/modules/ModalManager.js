export const ModalManager = {
    displayModal: displayModal,
    dispelModal: dispelModal
}

function displayModal(modalId, backgroundId, closeButtonId) {
    const modal = document.getElementById(modalId);
    const modalOverlay = document.getElementById(backgroundId);
    const closeBtn = document.getElementById(closeButtonId);
    let closeModalHandler;
    if (modal && modalOverlay && closeBtn) {
        modal.style.display = 'flex';
        modalOverlay.style.display = 'flex';
        modalOverlay.removeEventListener("click", closeModalHandler);
        modalOverlay.addEventListener("click", closeModalHandler = function(e) {
            e.preventDefault();
            dispelModal(modalId, backgroundId);
        });
        closeBtn.removeEventListener("click", closeModalHandler);
        closeBtn.addEventListener("click", closeModalHandler);
    }
}

function dispelModal(modalId, backgroundId) {
    const modal = document.getElementById(modalId);
    const modalOverlay = document.getElementById(backgroundId);
    if (modal && modalOverlay) {
        modal.style.display = 'none';
        modalOverlay.style.display = 'none';
    }
}
