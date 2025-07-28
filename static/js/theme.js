// Theme switching logic for Rubik's Cube Solver UI
(function() {
    const body = document.body;
    const toggle = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const logo = document.getElementById('site-logo');
    // Load theme from localStorage
    let theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        body.classList.add('light-theme');
        icon.textContent = '☀️';
    } else {
        icon.textContent = '🌙';
    }
    toggle.addEventListener('click', function() {
        body.classList.toggle('light-theme');
        const isLight = body.classList.contains('light-theme');
        icon.textContent = isLight ? '☀️' : '🌙';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        icon.animate([
            { transform: 'rotate(0deg) scale(1)' },
            { transform: 'rotate(180deg) scale(1.2)' },
            { transform: 'rotate(360deg) scale(1)' }
        ], { duration: 500, easing: 'ease' });
    });
    // Logo click animation
    if (logo) {
        logo.addEventListener('click', function() {
            logo.animate([
                { transform: 'rotate(0deg) scale(1)' },
                { transform: 'rotate(-20deg) scale(1.2)' },
                { transform: 'rotate(0deg) scale(1)' }
            ], { duration: 600, easing: 'cubic-bezier(.4,2,.6,1)' });
        });
    }
})(); 