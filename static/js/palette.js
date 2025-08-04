// unified_palette.js - A unified color palette handler for both manual and AI input pages
(function() {
    // Configuration object to handle differences between pages
    const config = {
        manual: {
            formId: 'color-palette-form',
            colorInputPrefix: 'color-',
            paletteSection: 'color-palette-section',
            manualSection: 'manual-cube-section',
            nextStepAction: function(userColors) {
                // Hide palette, show manual input
                const paletteSection = document.getElementById(this.paletteSection);
                const manualSection = document.getElementById(this.manualSection);
                
                if (paletteSection) paletteSection.style.display = 'none';
                if (manualSection) manualSection.style.display = '';
                
                // Trigger cube input to use new colors
                if (window.initManualCubeWithUserColors) {
                    window.initManualCubeWithUserColors(userColors);
                } else if (window.drawColorBtns) {
                    window.drawColorBtns();
                }
                if (window.resetCube) window.resetCube();
                if (window.drawCube) {
                    window.drawCube();
                    console.log('drawCube called from unified_palette.js');
                }
            }
        },
        ai: {
            formId: 'ai-color-palette-form',
            colorInputPrefix: 'ai-color-',
            nextStepAction: function() {
                // Move to the next step (Face Detection)
                const currentStep = 1;
                const nextStep = 2;
                
                // Hide current step
                document.querySelector(`.step-content[data-step="${currentStep}"]`).style.display = 'none';
                
                // Show next step
                document.querySelector(`.step-content[data-step="${nextStep}"]`).style.display = 'block';
                
                // Update step indicators
                document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');
                document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('completed');
                document.querySelector(`.step-indicator[data-step="${nextStep}"]`).classList.add('active');
            }
        }
    };
    
    // Determine which page we're on
    let pageType = 'manual';
    if (document.getElementById('ai-color-palette-form')) {
        pageType = 'ai';
    }
    
    const currentConfig = config[pageType];
    const paletteForm = document.getElementById(currentConfig.formId);
    let userColors = [];
    let cube3DInitialized = false;
    
    // Define cube state for 3D preview
    let cubeState = [
        [[0,0,0],[0,0,0],[0,0,0]], // U
        [[1,1,1],[1,1,1],[1,1,1]], // R
        [[2,2,2],[2,2,2],[2,2,2]], // F
        [[3,3,3],[3,3,3],[3,3,3]], // D
        [[4,4,4],[4,4,4],[4,4,4]], // L
        [[5,5,5],[5,5,5],[5,5,5]]  // B
    ];
    
    // Define COLORS object for the 3D cube
    const COLORS = {
        0: { name: 'white', hex: '#ffffff' },
        1: { name: 'red', hex: '#ff2222' },
        2: { name: 'green', hex: '#17d016' },
        3: { name: 'yellow', hex: '#ffe900' },
        4: { name: 'orange', hex: '#ff9900' },
        5: { name: 'blue', hex: '#1177ff' }
    };
    
    // Initialize 3D cube preview when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        if (document.getElementById('cube-3d-preview')) {
            // Make COLORS and cubeState globally available for cube_3d.js
            window.COLORS = COLORS;
            window.cubeState = cubeState;
            
            // Initialize 3D cube
            if (typeof init3D === 'function') {
                init3D();
                cube3DInitialized = true;
                updateCubeColors();
            } else {
                // Load cube_3d.js if not already loaded
                const script = document.createElement('script');
                script.src = '/static/js/cube_3d.js';
                script.onload = function() {
                    init3D();
                    cube3DInitialized = true;
                    updateCubeColors();
                };
                document.head.appendChild(script);
            }
        }
    });
    
    // Update cube colors based on color inputs
    function updateCubeColors() {
        if (!cube3DInitialized) return;
        
        const prefix = currentConfig.colorInputPrefix;
        
        // Update COLORS object with user-selected colors
        COLORS[0].hex = document.getElementById(prefix + 'up').value;
        COLORS[1].hex = document.getElementById(prefix + 'right').value;
        COLORS[2].hex = document.getElementById(prefix + 'front').value;
        COLORS[3].hex = document.getElementById(prefix + 'down').value;
        COLORS[4].hex = document.getElementById(prefix + 'left').value;
        COLORS[5].hex = document.getElementById(prefix + 'back').value;
        
        // Update 3D cube
        if (typeof update3DCube === 'function') {
            update3DCube();
        }
    }
    
    // Add input event listeners to color inputs
    function addColorInputListeners() {
        const prefix = currentConfig.colorInputPrefix;
        const colorInputs = [
            document.getElementById(prefix + 'up'),
            document.getElementById(prefix + 'right'),
            document.getElementById(prefix + 'front'),
            document.getElementById(prefix + 'down'),
            document.getElementById(prefix + 'left'),
            document.getElementById(prefix + 'back')
        ];
        
        colorInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', updateCubeColors);
            }
        });
    }
    
    // Call addColorInputListeners when DOM is loaded
    document.addEventListener('DOMContentLoaded', addColorInputListeners);

    // Only initialize form submission if the form exists on this page
    if (paletteForm) {
        paletteForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const prefix = currentConfig.colorInputPrefix;
            userColors = [
                document.getElementById(prefix + 'up').value,
                document.getElementById(prefix + 'right').value,
                document.getElementById(prefix + 'front').value,
                document.getElementById(prefix + 'down').value,
                document.getElementById(prefix + 'left').value,
                document.getElementById(prefix + 'back').value
            ];
            
            // Store in localStorage for use by other scripts
            localStorage.setItem('cube_user_colors', JSON.stringify(userColors));
            
            // Execute the appropriate next step action based on page type
            currentConfig.nextStepAction(userColors);
        });
    }
})();