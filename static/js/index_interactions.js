// Index Interactions - CubeMasterAI

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    initSmoothScrolling();
    
    // Initialize animations
    initAnimations();
    
    // Initialize cube logo animation
    initCubeLogoAnimation();
});

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for header height
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize animations
function initAnimations() {
    // Animate elements when they come into view
    const animatedElements = document.querySelectorAll('.feature-card, .method-card, .tech-category');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// Initialize cube logo animation
function initCubeLogoAnimation() {
    const cubeLogo = document.querySelector('.cube-logo');
    
    if (cubeLogo) {
        // Add hover effect
        cubeLogo.addEventListener('mouseenter', function() {
            this.classList.add('animate');
        });
        
        cubeLogo.addEventListener('mouseleave', function() {
            this.classList.remove('animate');
        });
    }
}