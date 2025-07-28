// manual_palette.js
(function() {
    const paletteForm = document.getElementById('color-palette-form');
    const manualSection = document.getElementById('manual-cube-section');
    const paletteSection = document.getElementById('color-palette-section');
    let userColors = [];

    paletteForm.addEventListener('submit', function(e) {
        e.preventDefault();
        userColors = [
            document.getElementById('color-up').value,
            document.getElementById('color-right').value,
            document.getElementById('color-front').value,
            document.getElementById('color-down').value,
            document.getElementById('color-left').value,
            document.getElementById('color-back').value
        ];
        // Store in localStorage for use by cube_input.js
        localStorage.setItem('cube_user_colors', JSON.stringify(userColors));
        // Hide palette, show manual input
        paletteSection.style.display = 'none';
        manualSection.style.display = '';
        // Trigger cube input to use new colors
        if (window.initManualCubeWithUserColors) {
            window.initManualCubeWithUserColors(userColors);
        } else if (window.drawColorBtns) {
            window.drawColorBtns();
        }
        if (window.resetCube) window.resetCube();
        if (window.drawCube) {
            window.drawCube();
            console.log('drawCube called from manual_palette.js');
        }
    });
})(); 