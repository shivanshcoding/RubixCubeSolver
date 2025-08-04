/**
 * Unified Theme Management for Rubik's Cube Solver
 * Combines functionality from theme.js, theme-new.js, and theme_toggle.js
 * Handles theme switching between light/dark modes with smooth transitions
 * and persistent user preferences.
 */

(function() {
    // DOM Elements
    const html = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
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
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
    
    /**
     * Toggle between light and dark themes
     */
    function toggleTheme() {
        const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
        applyTheme(newTheme);
        
        // Add animation class for the toggle effect
        if (themeIcon) {
            themeIcon.classList.add('theme-transition');
            setTimeout(() => themeIcon.classList.remove('theme-transition'), 300);
        }
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
        
        // Set the appropriate icon and aria-label
        if (theme === THEMES.DARK) {
            themeIcon.textContent = '☀️';
            themeIcon.setAttribute('aria-label', 'Switch to light mode');
        } else {
            themeIcon.textContent = '🌙';
            themeIcon.setAttribute('aria-label', 'Switch to dark mode');
        }
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
        
        // Listen for system preference changes
        prefersDarkScheme.addEventListener('change', (e) => {
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
})();