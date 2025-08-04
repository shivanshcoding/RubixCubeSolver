// AI Input Interactions - CubeMasterAI

document.addEventListener('DOMContentLoaded', function() {
    // Step navigation
    initStepNavigation();
    
    // Color selection
    initColorSelection();
    
    // Camera initialization
    initCamera();
    
    // Face detection
    initFaceDetection();
});

// Step Navigation
function initStepNavigation() {
    const stepIndicators = document.querySelectorAll('.step-indicator');
    const stepContents = document.querySelectorAll('.step-content');
    const nextButtons = document.querySelectorAll('[id$="-next"]');
    const backButtons = document.querySelectorAll('[id^="back-to"]');
    
    // Next buttons
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentStep = parseInt(this.closest('.step-content').getAttribute('data-step'));
            const nextStep = currentStep + 1;
            
            // Hide current step
            document.querySelector(`.step-content[data-step="${currentStep}"]`).style.display = 'none';
            
            // Show next step
            document.querySelector(`.step-content[data-step="${nextStep}"]`).style.display = 'block';
            
            // Update step indicators
            document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');
            document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.add('completed');
            document.querySelector(`.step-indicator[data-step="${nextStep}"]`).classList.add('active');
        });
    });
    
    // Back buttons
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            const currentStepId = this.id.replace('back-to-step-', '');
            const currentStep = parseInt(this.closest('.step-content').getAttribute('data-step'));
            const prevStep = currentStep - 1;
            
            // Hide current step
            document.querySelector(`.step-content[data-step="${currentStep}"]`).style.display = 'none';
            
            // Show previous step
            document.querySelector(`.step-content[data-step="${prevStep}"]`).style.display = 'block';
            
            // Update step indicators
            document.querySelector(`.step-indicator[data-step="${currentStep}"]`).classList.remove('active');
            document.querySelector(`.step-indicator[data-step="${prevStep}"]`).classList.remove('completed');
            document.querySelector(`.step-indicator[data-step="${prevStep}"]`).classList.add('active');
        });
    });
    
    // Step indicators click
    stepIndicators.forEach(indicator => {
        indicator.addEventListener('click', function() {
            const clickedStep = parseInt(this.getAttribute('data-step'));
            const currentStep = getCurrentStep();
            
            // Only allow clicking on completed steps or the next available step
            if (this.classList.contains('completed') || clickedStep === currentStep || clickedStep === currentStep + 1) {
                // Hide all steps
                stepContents.forEach(content => {
                    content.style.display = 'none';
                });
                
                // Show clicked step
                document.querySelector(`.step-content[data-step="${clickedStep}"]`).style.display = 'block';
                
                // Update step indicators
                stepIndicators.forEach(ind => {
                    ind.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });
    
    function getCurrentStep() {
        const activeIndicator = document.querySelector('.step-indicator.active');
        return parseInt(activeIndicator.getAttribute('data-step'));
    }
}

// Color Selection
function initColorSelection() {
    const colorOptions = document.querySelectorAll('.color-option');
    const colorSummaryGrid = document.querySelector('.color-summary-grid');
    const colorValidationMessage = document.querySelector('.color-validation-message');
    const colorSelectionNextButton = document.getElementById('color-selection-next');
    
    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            const face = this.closest('.color-item').getAttribute('data-face');
            const selectedColorDisplay = this.closest('.color-item').querySelector('.selected-color');
            const selectedColorText = this.closest('.color-item').querySelector('.selected-color-display span');
            
            // Remove selected class from all options in this face
            this.closest('.color-options').querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Update selected color display
            selectedColorDisplay.style.backgroundColor = this.style.backgroundColor;
            selectedColorText.textContent = `Selected: ${color.charAt(0).toUpperCase() + color.slice(1)}`;
            
            // Store selected color in data attribute
            this.closest('.color-item').setAttribute('data-selected-color', color);
            
            // Update color summary
            updateColorSummary();
        });
    });
    
    function updateColorSummary() {
        // Clear summary grid
        colorSummaryGrid.innerHTML = '';
        
        // Get all selected colors
        const colorItems = document.querySelectorAll('.color-item');
        const selectedColors = {};
        let allSelected = true;
        
        colorItems.forEach(item => {
            const face = item.getAttribute('data-face');
            const color = item.getAttribute('data-selected-color');
            
            if (color) {
                selectedColors[face] = color;
                
                // Create summary item
                const summaryItem = document.createElement('div');
                summaryItem.className = 'color-summary-item';
                summaryItem.innerHTML = `
                    <div class="summary-color" style="background-color: ${item.querySelector('.selected-color').style.backgroundColor}"></div>
                    <div class="summary-label">${face.toUpperCase()}</div>
                `;
                colorSummaryGrid.appendChild(summaryItem);
            } else {
                allSelected = false;
            }
        });
        
        // Validate color selection
        if (allSelected) {
            // Check if all colors are unique
            const uniqueColors = new Set(Object.values(selectedColors));
            if (uniqueColors.size === 6) {
                colorValidationMessage.textContent = 'All colors selected correctly!';
                colorValidationMessage.className = 'color-validation-message success';
                colorSelectionNextButton.disabled = false;
            } else {
                colorValidationMessage.textContent = 'Each face must have a unique color!';
                colorValidationMessage.className = 'color-validation-message error';
                colorSelectionNextButton.disabled = true;
            }
        } else {
            colorValidationMessage.textContent = 'Please select a color for each face';
            colorValidationMessage.className = 'color-validation-message';
            colorSelectionNextButton.disabled = true;
        }
    }
}

// Camera Initialization
function initCamera() {
    const cameraFeed = document.getElementById('camera-feed');
    const captureButton = document.getElementById('capture-button');
    
    // Initialize camera when step 2 is shown
    document.getElementById('color-selection-next').addEventListener('click', function() {
        // Check if camera is already initialized
        if (!cameraFeed.srcObject) {
            // Request camera access
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(stream => {
                    cameraFeed.srcObject = stream;
                })
                .catch(err => {
                    console.error('Error accessing camera:', err);
                    alert('Camera access is required for face detection. Please allow camera access and try again.');
                });
        }
    });
    
    // Clean up camera when going back to step 1
    const backToStep1Button = document.getElementById('back-to-step-1');
    if (backToStep1Button) {
        backToStep1Button.addEventListener('click', function() {
            if (cameraFeed.srcObject) {
                cameraFeed.srcObject.getTracks().forEach(track => track.stop());
                cameraFeed.srcObject = null;
            }
        });
    }
}

// Face Detection
function initFaceDetection() {
    const captureButton = document.getElementById('capture-button');
    const cameraFeed = document.getElementById('camera-feed');
    const detectionCanvas = document.getElementById('detection-canvas');
    const currentFaceNumber = document.getElementById('current-face-number');
    const currentFaceName = document.getElementById('current-face-name');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const livePreview = document.getElementById('live-preview');
    
    // Face order and names
    const faceOrder = ['up', 'right', 'front', 'down', 'left', 'back'];
    const faceNames = {
        'up': 'Top Face',
        'right': 'Right Face',
        'front': 'Front Face',
        'down': 'Bottom Face',
        'left': 'Left Face',
        'back': 'Back Face'
    };
    
    // Current face index
    let currentFaceIndex = 0;
    
    // Detected faces
    const detectedFaces = {};
    
    // Capture button click
    captureButton.addEventListener('click', function() {
        // Show detection progress
        document.getElementById('detection-progress-container').classList.remove('hidden');
        
        // Simulate detection process
        setTimeout(() => {
            // Get current face
            const currentFace = faceOrder[currentFaceIndex];
            
            // Simulate detected colors (in a real app, this would be done with computer vision)
            const colors = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];
            const detectedColors = [];
            
            // Get the selected color for the center of this face
            const centerColor = document.querySelector(`.color-item[data-face="${currentFace}"]`).getAttribute('data-selected-color');
            
            // Center piece is always the selected color for this face
            for (let i = 0; i < 9; i++) {
                if (i === 4) { // Center piece
                    detectedColors.push(centerColor);
                } else {
                    // Randomly select other colors (in a real app, this would be detected from the camera)
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    detectedColors.push(randomColor);
                }
            }
            
            // Store detected face
            detectedFaces[currentFace] = detectedColors;
            
            // Update progress
            currentFaceIndex++;
            updateProgress();
            
            // Hide detection progress
            document.getElementById('detection-progress-container').classList.add('hidden');
            
            // If all faces detected, enable next button
            if (currentFaceIndex >= faceOrder.length) {
                document.getElementById('continue-to-step-3').disabled = false;
                captureButton.disabled = true;
                captureButton.textContent = 'All Faces Captured';
            }
        }, 2000); // Simulate 2 second detection process
    });
    
    function updateProgress() {
        // Update face number and name
        if (currentFaceIndex < faceOrder.length) {
            currentFaceNumber.textContent = currentFaceIndex + 1;
            currentFaceName.textContent = faceNames[faceOrder[currentFaceIndex]];
        }
        
        // Update progress bar
        const progressPercentage = (currentFaceIndex / faceOrder.length) * 100;
        progressFill.style.width = `${progressPercentage}%`;
        progressText.textContent = `${currentFaceIndex} of ${faceOrder.length} faces detected`;
        
        // Update live preview (in a real app, this would show the actual detected cube)
        updateLivePreview();
    }
    
    function updateLivePreview() {
        // In a real app, this would render a 3D cube with the detected colors
        // For this example, we'll just show a simple text representation
        let previewHTML = '<div class="preview-placeholder">';
        
        if (Object.keys(detectedFaces).length > 0) {
            previewHTML += '<div class="detected-faces-summary">';
            
            for (const face in detectedFaces) {
                previewHTML += `<div class="detected-face">${face.toUpperCase()}: Detected</div>`;
            }
            
            previewHTML += '</div>';
        } else {
            previewHTML += 'No faces detected yet';
        }
        
        previewHTML += '</div>';
        livePreview.innerHTML = previewHTML;
    }
}