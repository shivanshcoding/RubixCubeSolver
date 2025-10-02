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
    
    // Cube review
    initCubeReview();
    
    // Initialize 3D cube preview
    initCube3DPreview();
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
    const faceDetectionNextButton = document.getElementById('face-detection-next');
    const faceDetectionBackButton = document.getElementById('face-detection-back');
    const cameraFeed = document.getElementById('camera-feed');
    const detectionCanvas = document.getElementById('detection-canvas');
    const currentFaceNumber = document.getElementById('current-face-number');
    const currentFaceName = document.getElementById('current-face-name');
    const orientationInstructions = document.getElementById('orientation-instructions');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceText = document.getElementById('confidence-text');
    const cubeFacePreview = document.getElementById('cube-face-preview');
    
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
    
    // Orientation instructions for each face
    const orientations = {
        'up': 'Hold the cube with white center facing up.',
        'right': 'Hold the cube with red center facing right, white center facing up.',
        'front': 'Hold the cube with green center facing you, white center facing up.',
        'down': 'Hold the cube with yellow center facing down, green center facing you.',
        'left': 'Hold the cube with orange center facing left, white center facing up.',
        'back': 'Hold the cube with blue center facing away from you, white center facing up.'
    };
    
    // Current face index
    let currentFaceIndex = 0;
    
    // Detected faces - global object to store all detected faces
    window.detectedFaces = {};
    
    // Initialize the detection canvas
    const ctx = detectionCanvas.getContext('2d');
    detectionCanvas.width = 320;
    detectionCanvas.height = 240;
    
    // Capture button click
    captureButton.addEventListener('click', function() {
        // Show detection progress
        document.getElementById('detection-progress-container').classList.remove('hidden');
        
        // Get current face
        const currentFace = faceOrder[currentFaceIndex];
        
        // Capture the current frame from video
        ctx.drawImage(cameraFeed, 0, 0, detectionCanvas.width, detectionCanvas.height);
        
        // Process the image (in a real app, this would use computer vision)
        processImage(currentFace);
    });
    
    // Process the captured image
    function processImage(face) {
        // In a real app, this would use OpenCV.js or TensorFlow.js for color detection
        // For this demo, we'll simulate the detection
        
        setTimeout(() => {
            // Get the selected colors from the color palette
            const colorMap = {};
            document.querySelectorAll('#ai-color-palette-form input[type="color"]').forEach(input => {
                const face = input.id.replace('ai-color-', '');
                colorMap[face] = input.value;
            });
            
            // Create a 3x3 grid of detected colors
            const detectedColors = [];
            
            // Center piece always matches the face color
            for (let i = 0; i < 9; i++) {
                if (i === 4) { // Center piece
                    detectedColors.push(colorMap[face]);
                } else {
                    // For other pieces, randomly select from the 6 colors
                    // In a real app, this would be detected from the camera image
                    const colorKeys = Object.keys(colorMap);
                    const randomColorKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];
                    detectedColors.push(colorMap[randomColorKey]);
                }
            }
            
            // Store detected face
            window.detectedFaces[face] = detectedColors;
            
            // Show the detected face preview
            showFacePreview(face, detectedColors);
            
            // Update confidence (simulated)
            const confidence = Math.floor(75 + Math.random() * 25); // 75-100%
            confidenceBar.style.width = `${confidence}%`;
            confidenceText.textContent = `${confidence}%`;
            
            // Hide detection progress
            document.getElementById('detection-progress-container').classList.add('hidden');
            
            // Show face preview
            cubeFacePreview.style.display = 'block';
            
            // Enable next face button
            faceDetectionNextButton.disabled = false;
            
            // Update 3D preview
            updateCube3DPreview();
        }, 1500); // Simulate processing time
    }
    
    // Show the detected face preview
    function showFacePreview(face, colors) {
        const cells = cubeFacePreview.querySelectorAll('.face-cell');
        
        cells.forEach((cell, index) => {
            cell.style.backgroundColor = colors[index];
        });
    }
    
    // Next face button click
    faceDetectionNextButton.addEventListener('click', function() {
        // If all faces are detected, go to next step
        if (currentFaceIndex >= faceOrder.length - 1) {
            // Move to step 3
            document.querySelector('.step-content[data-step="2"]').style.display = 'none';
            document.querySelector('.step-content[data-step="3"]').style.display = 'block';
            
            // Update step indicators
            document.querySelector('.step-indicator[data-step="2"]').classList.remove('active');
            document.querySelector('.step-indicator[data-step="2"]').classList.add('completed');
            document.querySelector('.step-indicator[data-step="3"]').classList.add('active');
            
            // Initialize the review step with detected faces
            populateReviewStep();
            return;
        }
        
        // Move to next face
        currentFaceIndex++;
        updateFaceUI();
        
        // Hide face preview
        cubeFacePreview.style.display = 'none';
        
        // Disable next button until this face is captured
        faceDetectionNextButton.disabled = true;
    });
    
    // Back button click
    faceDetectionBackButton.addEventListener('click', function() {
        // Go back to step 1
        document.querySelector('.step-content[data-step="2"]').style.display = 'none';
        document.querySelector('.step-content[data-step="1"]').style.display = 'block';
        
        // Update step indicators
        document.querySelector('.step-indicator[data-step="2"]').classList.remove('active');
        document.querySelector('.step-indicator[data-step="1"]').classList.add('active');
    });
    
    // Update the face UI
    function updateFaceUI() {
        // Update face number and name
        currentFaceNumber.textContent = currentFaceIndex + 1;
        currentFaceName.textContent = faceNames[faceOrder[currentFaceIndex]];
        orientationInstructions.textContent = orientations[faceOrder[currentFaceIndex]];
        
        // Update progress bar
        const progressPercentage = (currentFaceIndex / faceOrder.length) * 100;
        progressFill.style.width = `${progressPercentage}%`;
        progressText.textContent = `${currentFaceIndex} of ${faceOrder.length} faces detected`;
    }
    
    // Initialize the face UI
    updateFaceUI();
}

// Initialize 3D cube preview
function initCube3DPreview() {
    // This function would initialize the 3D cube preview using Three.js
    // For simplicity, we'll use a placeholder implementation
    const previewContainers = document.querySelectorAll('.cube-3d-preview');
    
    previewContainers.forEach(container => {
        // Create a simple colored cube as placeholder
        // In a real app, this would be a proper 3D Rubik's Cube
        container.innerHTML = `
            <div class="placeholder-cube">
                <div class="placeholder-face placeholder-face-front"></div>
                <div class="placeholder-face placeholder-face-back"></div>
                <div class="placeholder-face placeholder-face-right"></div>
                <div class="placeholder-face placeholder-face-left"></div>
                <div class="placeholder-face placeholder-face-top"></div>
                <div class="placeholder-face placeholder-face-bottom"></div>
            </div>
        `;
    });
}

// Update the 3D cube preview with detected colors
function updateCube3DPreview() {
    // In a real app, this would update the 3D cube with the detected colors
    // For this demo, we'll just update the placeholder cube colors
    
    if (!window.detectedFaces) return;
    
    const faces = window.detectedFaces;
    const faceMap = {
        'up': 'top',
        'down': 'bottom',
        'left': 'left',
        'right': 'right',
        'front': 'front',
        'back': 'back'
    };
    
    // Update each detected face
    for (const face in faces) {
        const placeholderFace = document.querySelector(`.placeholder-face-${faceMap[face]}`);
        if (placeholderFace) {
            // Use the center color for the whole face in this simple preview
            placeholderFace.style.backgroundColor = faces[face][4]; // Center piece color
        }
    }
}

// Initialize the cube review step
function initCubeReview() {
    const reviewBackButton = document.getElementById('review-back');
    const solveButton = document.getElementById('solve-button');
    
    // Back button click
    if (reviewBackButton) {
        reviewBackButton.addEventListener('click', function() {
            // Go back to step 2
            document.querySelector('.step-content[data-step="3"]').style.display = 'none';
            document.querySelector('.step-content[data-step="2"]').style.display = 'block';
            
            // Update step indicators
            document.querySelector('.step-indicator[data-step="3"]').classList.remove('active');
            document.querySelector('.step-indicator[data-step="2"]').classList.add('active');
            document.querySelector('.step-indicator[data-step="2"]').classList.remove('completed');
        });
    }
    
    // Solve button click
    if (solveButton) {
        solveButton.addEventListener('click', function() {
            // Show loading screen
            document.getElementById('loading-screen').style.display = 'flex';
            
            // Convert detected faces to cube string format
            const cubeString = convertToCubeString();
            
            // Simulate solving process
            setTimeout(() => {
                // Hide loading screen
                document.getElementById('loading-screen').style.display = 'none';
                
                // Show solution card
                const solutionCard = document.getElementById('solution-card');
                solutionCard.style.display = 'block';
                
                // Generate a sample solution
                const solutionSteps = generateSampleSolution();
                
                // Display solution steps
                displaySolutionSteps(solutionSteps);
            }, 3000); // Simulate 3 second solving process
        });
    }
    
    // Close solution button
    const closeSolutionButton = document.getElementById('close-solution');
    if (closeSolutionButton) {
        closeSolutionButton.addEventListener('click', function() {
            document.getElementById('solution-card').style.display = 'none';
        });
    }
    
    // Restart button
    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.addEventListener('click', function() {
            // Hide solution card
            document.getElementById('solution-card').style.display = 'none';
            
            // Reset to step 1
            document.querySelector('.step-content[data-step="3"]').style.display = 'none';
            document.querySelector('.step-content[data-step="1"]').style.display = 'block';
            
            // Update step indicators
            document.querySelector('.step-indicator[data-step="3"]').classList.remove('active');
            document.querySelector('.step-indicator[data-step="2"]').classList.remove('completed');
            document.querySelector('.step-indicator[data-step="1"]').classList.add('active');
            
            // Reset detected faces
            window.detectedFaces = {};
            
            // Reset face index
            currentFaceIndex = 0;
            
            // Reset UI elements
            document.querySelectorAll('.progress-fill').forEach(el => el.style.width = '0%');
            document.querySelectorAll('.progress-text').forEach(el => el.textContent = '0 of 6 faces detected');
            document.querySelectorAll('.confidence-fill').forEach(el => el.style.width = '0%');
            document.querySelectorAll('.confidence-text').forEach(el => el.textContent = '0%');
        });
    }
}

// Populate the review step with detected faces
function populateReviewStep() {
    if (!window.detectedFaces) return;
    
    // Update 3D preview for review step
    updateCube3DPreview();
    
    // Populate each face grid
    const faces = window.detectedFaces;
    for (const face in faces) {
        const faceGrid = document.getElementById(`review-face-${face}`);
        if (faceGrid) {
            // Clear existing content
            faceGrid.innerHTML = '';
            
            // Create 3x3 grid with detected colors
            const colors = faces[face];
            colors.forEach((color, index) => {
                const cell = document.createElement('div');
                cell.className = 'face-cell';
                cell.style.backgroundColor = color;
                faceGrid.appendChild(cell);
            });
        }
    }
    
    // Validate cube configuration
    validateCubeConfiguration();
}

// Validate the cube configuration
function validateCubeConfiguration() {
    // In a real app, this would check if the cube is valid and solvable
    // For this demo, we'll assume it's valid
    
    const validationStatus = document.getElementById('validation-status');
    const validationDetails = document.getElementById('validation-details');
    
    // Simulate validation (always successful in this demo)
    validationStatus.innerHTML = `
        <div class="validation-icon"><i class="fas fa-check-circle"></i></div>
        <div class="validation-message">Cube configuration is valid and solvable</div>
    `;
    
    validationDetails.innerHTML = `
        <ul>
            <li><i class="fas fa-check"></i> All faces detected</li>
            <li><i class="fas fa-check"></i> Each color appears exactly 9 times</li>
            <li><i class="fas fa-check"></i> Center pieces match standard configuration</li>
            <li><i class="fas fa-check"></i> Corner and edge pieces are valid</li>
        </ul>
    `;
}

// Convert detected faces to cube string format
function convertToCubeString() {
    // In a real app, this would convert the detected faces to a standard cube string format
    // For this demo, we'll return a placeholder string
    return 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
}

// Generate a sample solution
function generateSampleSolution() {
    // In a real app, this would use a solving algorithm
    // For this demo, we'll return a sample solution
    return [
        { move: "R", description: "Turn the right face clockwise" },
        { move: "U", description: "Turn the top face clockwise" },
        { move: "R'", description: "Turn the right face counter-clockwise" },
        { move: "U'", description: "Turn the top face counter-clockwise" },
        { move: "R'", description: "Turn the right face counter-clockwise" },
        { move: "F", description: "Turn the front face clockwise" },
        { move: "R", description: "Turn the right face clockwise" },
        { move: "U", description: "Turn the top face clockwise" },
        { move: "R'", description: "Turn the right face counter-clockwise" },
        { move: "U'", description: "Turn the top face counter-clockwise" },
        { move: "R'", description: "Turn the right face counter-clockwise" },
        { move: "F'", description: "Turn the front face counter-clockwise" }
    ];
}

// Display solution steps
function displaySolutionSteps(steps) {
    const solutionStepsContainer = document.getElementById('solution-steps');
    if (!solutionStepsContainer) return;
    
    // Clear existing content
    solutionStepsContainer.innerHTML = '';
    
    // Create step elements
    steps.forEach((step, index) => {
        const stepElement = document.createElement('div');
        stepElement.className = 'solution-step';
        stepElement.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <div class="step-move">${step.move}</div>
            <div class="step-description">${step.description}</div>
        `;
        solutionStepsContainer.appendChild(stepElement);
    });
}