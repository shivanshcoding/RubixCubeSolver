/**
 * Theme Management for Rubik's Cube Solver
 * Handles theme switching between light/dark modes with smooth transitions
 * and persistent user preferences.
 */

(function() {
    // DOM Elements
    const html = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const logo = document.getElementById('site-logo');
    
    // Theme configuration
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    };
    
    // Check for saved theme preference or use system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    let currentTheme = localStorage.getItem('theme') || 
                      (prefersDarkScheme.matches ? THEMES.DARK : THEMES.LIGHT);
    
    /**
     * Apply the specified theme with smooth transition
     * @param {string} theme - Theme to apply ('light' or 'dark')
     */
    function applyTheme(theme) {
        // Set the theme attribute on the HTML element
        html.setAttribute('data-theme', theme);
        
        // Update the theme icon
        updateThemeIcon(theme);
        
        // Save the theme preference
        localStorage.setItem('theme', theme);
        currentTheme = theme;
        
        // Dispatch a custom event for other scripts to listen to
        document.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
    }
    
    /**
     * Toggle between light and dark themes
     */
    function toggleTheme() {
        const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
        applyTheme(newTheme);
        
        // Add animation class for the toggle effect
        themeIcon.classList.add('theme-transition');
        setTimeout(() => themeIcon.classList.remove('theme-transition'), 300);
    }
    
    /**
     * Update the theme icon based on the current theme
     * @param {string} theme - Current theme
     */
    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        
        // Animate the icon change
        themeIcon.animate(
            [
                { opacity: 1, transform: 'rotate(0deg) scale(1)' },
                { opacity: 0, transform: 'rotate(180deg) scale(0.8)' },
                { opacity: 0, transform: 'rotate(0deg) scale(0.8)' },
                { opacity: 1, transform: 'rotate(0deg) scale(1)' }
            ],
            {
                duration: 300,
                easing: 'ease-in-out'
            }
        );
        
        // Set the appropriate icon
        themeIcon.textContent = theme === THEMES.LIGHT ? '☀️' : '🌙';
    }
    
    /**
     * Initialize the theme functionality
     */
    function init() {
        // Apply the saved theme or system preference
        applyTheme(currentTheme);
        
        // Add event listeners if elements exist
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
            
            // Add keyboard accessibility
            themeToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleTheme();
                }
            });
        }
        
        // Add logo animation if logo exists
        if (logo) {
            logo.addEventListener('click', () => {
                logo.animate(
                    [
                        { transform: 'rotate(0deg) scale(1)' },
                        { transform: 'rotate(-20deg) scale(1.2)' },
                        { transform: 'rotate(0deg) scale(1)' }
                    ],
                    {
                        duration: 600,
                        easing: 'cubic-bezier(.4,2,.6,1)'
                    }
                );
            });
        }
        
        // Listen for system theme changes
        prefersDarkScheme.addEventListener('change', (e) => {
            // Only apply system theme if no user preference is set
            if (!localStorage.getItem('theme')) {
                applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
            }
        });
    }
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export functions for external use if needed
    window.themeManager = {
        toggleTheme,
        applyTheme,
        getCurrentTheme: () => currentTheme
    };
})();
