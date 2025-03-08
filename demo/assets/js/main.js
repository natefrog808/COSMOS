document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initTabs();
    initConsole();
    initToasts();
    initThemeToggle();
    initDashboardCharts();
    
    // Welcome notification after a short delay
    setTimeout(() => {
        showToast('info', 'Welcome to COSMOS', 'Explore the future of intelligent automation');
    }, 1000);
    
    // Demo notifications
    setTimeout(() => {
        showToast('success', 'System Connected', 'COSMOS agent is now monitoring your system');
    }, 3000);
    
    setTimeout(() => {
        showToast('warning', 'Pattern Detected', 'Repetitive task detected - consider automating');
    }, 8000);
    
    // Animate dashboard elements on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateDashboardItem(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    document.querySelectorAll('.card').forEach(card => {
        observer.observe(card);
    });
});

// Helper functions for animations
function animateDashboardItem(element) {
    element.classList.add('animated');
    
    // Animate progress bars within the element
    element.querySelectorAll('.progress-fill').forEach(fill => {
        const width = fill.dataset.width || fill.style.width;
        fill.style.width = '0';
        setTimeout(() => {
            fill.style.width = width;
        }, 300);
    });
}
