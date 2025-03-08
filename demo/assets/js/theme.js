/**
 * theme.js - Theme management for COSMOS Demo
 * Handles theme switching between light and dark modes with
 * persistence, auto-detection, and smooth transitions
 */

// Theme Constants
const THEME = {
    // Theme keys for storage
    STORAGE_KEY: 'cosmos-theme-preference',
    
    // Theme modes
    LIGHT: 'light',
    DARK: 'dark',
    
    // CSS Variables (will be updated based on theme)
    VARIABLES: {
        '--primary': { light: '#5B56E7', dark: '#6C63FF' },
        '--secondary': { light: '#4338CA', dark: '#4F46E5' },
        '--success': { light: '#059669', dark: '#10B981' },
        '--danger': { light: '#DC2626', dark: '#EF4444' },
        '--warning': { light: '#D97706', dark: '#F59E0B' },
        '--info': { light: '#2563EB', dark: '#3B82F6' },
        '--dark': { light: '#374151', dark: '#1F2937' },
        '--light': { light: '#FFFFFF', dark: '#F9FAFB' },
        '--gray': { light: '#4B5563', dark: '#6B7280' },
        '--bg-dark': { light: '#F3F4F6', dark: '#111827' },
        '--bg-light': { light: '#FFFFFF', dark: '#F3F4F6' },
        '--blue-glow': { light: '0 0 15px rgba(37, 99, 235, 0.3)', dark: '0 0 15px rgba(59, 130, 246, 0.5)' },
        '--purple-glow': { light: '0 0 15px rgba(91, 86, 231, 0.3)', dark: '0 0 15px rgba(108, 99, 255, 0.5)' },
        '--shadow-sm': { light: '0 1px 2px rgba(0, 0, 0, 0.05)', dark: '0 1px 2px rgba(0, 0, 0, 0.3)' },
        '--shadow-md': { light: '0 4px 6px rgba(0, 0, 0, 0.05)', dark: '0 4px 6px rgba(0, 0, 0, 0.3)' },
        '--shadow-lg': { light: '0 10px 15px rgba(0, 0, 0, 0.05)', dark: '0 10px 15px rgba(0, 0, 0, 0.3)' }
    },
    
    // Selector mappings for theme-specific elements
    SELECTORS: {
        'body': {
            light: { backgroundColor: 'var(--bg-light)', color: 'var(--dark)' },
            dark: { backgroundColor: 'var(--bg-dark)', color: 'var(--light)' }
        },
        'header': {
            light: { backgroundColor: 'rgba(255, 255, 255, 0.8)', boxShadow: 'var(--shadow-sm)' },
            dark: { backgroundColor: 'rgba(17, 24, 39, 0.7)', boxShadow: 'none' }
        },
        '.card': {
            light: { backgroundColor: 'white', boxShadow: 'var(--shadow-md)' },
            dark: { backgroundColor: 'var(--dark)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }
        },
        '.console': {
            light: { backgroundColor: '#F8FAFC', color: '#0F172A', borderColor: '#E2E8F0' },
            dark: { backgroundColor: '#0F172A', color: '#E2E8F0', borderColor: 'rgba(255, 255, 255, 0.1)' }
        },
        '.code-block': {
            light: { backgroundColor: '#F8FAFC', color: '#334155', borderColor: '#E2E8F0' },
            dark: { backgroundColor: '#0F172A', color: '#E2E8F0', borderColor: 'rgba(255, 255, 255, 0.1)' }
        }
    }
};

// Theme Manager
const themeManager = {
    // Current theme
    currentTheme: THEME.DARK,
    
    // DOM elements
    elements: {
        toggle: null,
        styleEl: null
    },
    
    // Initialize the theme manager
    init() {
        // Create or get toggle button
        this.elements.toggle = document.querySelector('.theme-toggle');
        
        if (!this.elements.toggle) {
            console.warn('Theme toggle element not found');
            return;
        }
        
        // Create style element for dynamic CSS
        this.elements.styleEl = document.createElement('style');
        this.elements.styleEl.id = 'cosmos-dynamic-theme';
        document.head.appendChild(this.elements.styleEl);
        
        // Set initial theme based on:
        // 1. Stored preference
        // 2. OS preference
        // 3. Default to dark mode
        const storedTheme = localStorage.getItem(THEME.STORAGE_KEY);
        
        if (storedTheme) {
            this.setTheme(storedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            this.setTheme(THEME.LIGHT);
        } else {
            this.setTheme(THEME.DARK);
        }
        
        // Add event listener to toggle
        this.elements.toggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Listen for OS theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem(THEME.STORAGE_KEY)) {
                    this.setTheme(e.matches ? THEME.DARK : THEME.LIGHT);
                }
            });
        }
    },
    
    // Toggle between light and dark themes
    toggleTheme() {
        const newTheme = this.currentTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
        this.setTheme(newTheme);
        
        // Show toast notification
        if (typeof showToast === 'function') {
            showToast(
                'info', 
                `${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode Activated`, 
                `Switched to ${newTheme} mode for better ${newTheme === THEME.LIGHT ? 'daytime' : 'nighttime'} visibility.`
            );
        }
    },
    
    // Set theme to light or dark
    setTheme(theme) {
        if (theme !== THEME.LIGHT && theme !== THEME.DARK) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }
        
        // Update current theme
        this.currentTheme = theme;
        
        // Save preference to localStorage
        localStorage.setItem(THEME.STORAGE_KEY, theme);
        
        // Update toggle button state
        if (this.elements.toggle) {
            if (theme === THEME.LIGHT) {
                this.elements.toggle.classList.add('light');
            } else {
                this.elements.toggle.classList.remove('light');
            }
        }
        
        // Add/remove theme class from body
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);
        
        // Update CSS variables
        this.updateCssVariables();
        
        // Update specific elements
        this.updateElementStyles();
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    },
    
    // Update CSS variables based on current theme
    updateCssVariables() {
        let cssText = ':root {\n';
        
        // Add all theme variables
        Object.entries(THEME.VARIABLES).forEach(([variable, values]) => {
            cssText += `  ${variable}: ${values[this.currentTheme]};\n`;
        });
        
        cssText += '}\n';
        
        // Set the CSS
        this.elements.styleEl.textContent = cssText;
    },
    
    // Update specific element styles based on selectors
    updateElementStyles() {
        Object.entries(THEME.SELECTORS).forEach(([selector, themeStyles]) => {
            const elements = document.querySelectorAll(selector);
            const styles = themeStyles[this.currentTheme];
            
            elements.forEach(element => {
                Object.entries(styles).forEach(([property, value]) => {
                    element.style[property] = value;
                });
            });
        });
    },
    
    // Get current theme
    getTheme() {
        return this.currentTheme;
    },
    
    // Check if current theme is dark
    isDarkTheme() {
        return this.currentTheme === THEME.DARK;
    },
    
    // Check if current theme is light
    isLightTheme() {
        return this.currentTheme === THEME.LIGHT;
    }
};

// Additional theme-specific adjustments for charts
function updateChartsTheme(theme) {
    // If Chart.js is available, update default config
    if (window.Chart) {
        Chart.defaults.color = theme === THEME.DARK ? '#F9FAFB' : '#1F2937';
        Chart.defaults.borderColor = theme === THEME.DARK ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        // Update all existing charts
        Chart.instances.forEach(chart => {
            // Update scales
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    scale.grid = scale.grid || {};
                    scale.grid.color = theme === THEME.DARK ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                    scale.ticks = scale.ticks || {};
                    scale.ticks.color = theme === THEME.DARK ? '#F9FAFB' : '#1F2937';
                });
            }
            
            // Update legend
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
                chart.options.plugins.legend.labels.color = theme === THEME.DARK ? '#F9FAFB' : '#1F2937';
            }
            
            chart.update();
        });
    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    
    // Listen for theme changes to update charts
    window.addEventListener('themechange', (e) => {
        updateChartsTheme(e.detail.theme);
    });
});
