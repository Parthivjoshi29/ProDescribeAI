// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');

    // Function to update theme
    function updateTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.add('dark');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        }
        localStorage.theme = isDark ? 'dark' : 'light';
    }

    // Initialize theme
    const isDarkMode = localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    updateTheme(isDarkMode);

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const isDark = !document.documentElement.classList.contains('dark');
        updateTheme(isDark);
    });
});