Hooks.on("ready", () => {
    // Configurar un observador para detectar cuando aparece el pause screen
    const observer = new MutationObserver((mutations) => {
        const pauseScreen = document.getElementById("pause");
        if (pauseScreen) {
            const img = pauseScreen.querySelector("img");
            if (img && !img.classList.contains('customized')) {
                img.src = "systems/TWID/art/logo.png";
                img.classList.add('customized'); // Marcar como modificado
                
                // Opcional: Cambiar el texto
                const caption = pauseScreen.querySelector("figcaption");
                if (caption) caption.textContent = "Juego en Pausa";
            }
        }
    });

    // Observar cambios en el body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
