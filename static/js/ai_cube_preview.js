// AI Cube Preview - Live 3D cube visualization during face detection
// This file handles the live preview of the cube as faces are detected

class AICubePreview {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.cubeState = Array(6).fill().map(() => Array(9).fill('#888888')); // Default gray
        this.faceMapping = {
            'Up': 0, 'Right': 1, 'Front': 2, 'Down': 3, 'Left': 4, 'Back': 5
        };
        this.isInitialized = false;
    }

    // Initialize the 3D preview
    init(containerId) {
        if (this.isInitialized) return;

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Preview container not found:', containerId);
            return;
        }

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a1f);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, 300 / 200, 0.1, 1000);
        this.camera.position.set(3, 3, 3);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(300, 200);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Create cube
        this.createCube();

        // Animation loop
        this.animate();

        this.isInitialized = true;
    }

    // Create the 3D cube with individual stickers
    createCube() {
        this.cube = new THREE.Group();

        const cubeSize = 1;
        const gap = 0.05;
        const stickerSize = (cubeSize - 2 * gap) / 3;

        // Face positions and rotations
        const faces = [
            { pos: [0, cubeSize/2, 0], rot: [-Math.PI/2, 0, 0] }, // Up (Y+)
            { pos: [cubeSize/2, 0, 0], rot: [0, Math.PI/2, 0] },  // Right (X+)
            { pos: [0, 0, cubeSize/2], rot: [0, 0, 0] },          // Front (Z+)
            { pos: [0, -cubeSize/2, 0], rot: [Math.PI/2, 0, 0] }, // Down (Y-)
            { pos: [-cubeSize/2, 0, 0], rot: [0, -Math.PI/2, 0] }, // Left (X-)
            { pos: [0, 0, -cubeSize/2], rot: [0, Math.PI, 0] }    // Back (Z-)
        ];

        faces.forEach((face, faceIndex) => {
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const geometry = new THREE.PlaneGeometry(stickerSize, stickerSize);
                    const material = new THREE.MeshLambertMaterial({ 
                        color: this.cubeState[faceIndex][row * 3 + col] 
                    });
                    
                    const sticker = new THREE.Mesh(geometry, material);
                    
                    // Position sticker
                    const x = (col - 1) * (stickerSize + gap * 0.5);
                    const y = (1 - row) * (stickerSize + gap * 0.5);
                    sticker.position.set(x, y, 0.001);
                    
                    // Rotate and position face
                    sticker.rotation.set(...face.rot);
                    sticker.position.add(new THREE.Vector3(...face.pos));
                    
                    // Store reference for updates
                    sticker.userData = { faceIndex, stickerIndex: row * 3 + col };
                    
                    this.cube.add(sticker);
                }
            }
        });

        this.scene.add(this.cube);
    }

    // Update a face with detected colors
    updateFace(faceName, colors) {
        const faceIndex = this.faceMapping[faceName];
        if (faceIndex === undefined) return;

        // Update cube state
        this.cubeState[faceIndex] = colors.slice(); // Copy array

        // Update 3D visualization
        this.cube.children.forEach(sticker => {
            if (sticker.userData.faceIndex === faceIndex) {
                const stickerIndex = sticker.userData.stickerIndex;
                sticker.material.color.setHex(colors[stickerIndex].replace('#', '0x'));
            }
        });

        // Add visual feedback
        this.highlightFace(faceIndex);
    }

    // Highlight a face briefly to show it was updated
    highlightFace(faceIndex) {
        this.cube.children.forEach(sticker => {
            if (sticker.userData.faceIndex === faceIndex) {
                const originalEmissive = sticker.material.emissive.clone();
                sticker.material.emissive.setHex(0x444444);
                
                setTimeout(() => {
                    sticker.material.emissive.copy(originalEmissive);
                }, 500);
            }
        });
    }

    // Reset cube to default state
    reset() {
        this.cubeState = Array(6).fill().map(() => Array(9).fill('#888888'));
        
        this.cube.children.forEach(sticker => {
            sticker.material.color.setHex(0x888888);
        });
    }

    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Gentle rotation
        if (this.cube) {
            this.cube.rotation.y += 0.005;
            this.cube.rotation.x += 0.002;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // Get current cube state as string
    getCubeString() {
        // Convert colors to face letters based on center colors
        // This is a simplified version - would need proper color mapping
        return this.cubeState.flat().map(color => {
            // Map colors to face letters (simplified)
            if (color === '#ffffff') return 'U';
            if (color === '#ff2222') return 'R';
            if (color === '#17d016') return 'F';
            if (color === '#ffe900') return 'D';
            if (color === '#ff9900') return 'L';
            if (color === '#1177ff') return 'B';
            return 'U'; // Default
        }).join('');
    }

    // Cleanup
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        this.isInitialized = false;
    }
}

// Global instance
window.aiCubePreview = new AICubePreview();

// Helper functions for integration
window.initAICubePreview = function(containerId) {
    window.aiCubePreview.init(containerId);
};

window.updatePreviewFace = function(faceName, colors) {
    window.aiCubePreview.updateFace(faceName, colors);
};

window.resetCubePreview = function() {
    window.aiCubePreview.reset();
};
