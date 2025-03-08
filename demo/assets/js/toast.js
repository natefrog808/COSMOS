/**
 * toast.js - Toast notification system for COSMOS Demo
 * Provides elegant, customizable notifications that automatically disappear
 */

// Toast configuration
const TOAST_CONFIG = {
    displayDuration: 5000,      // Time in ms that a toast remains visible
    animationDuration: 300,     // Animation duration in ms
    maxToasts: 3,               // Maximum number of toasts visible at once
    position: 'bottom-right',   // Toast position
    spacing: 16,                // Spacing between toasts in pixels
    zIndex: 1000,               // z-index for toast container
    icons: {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-exclamation-circle'
    }
};

// Toast container for tracking active toasts
const toastManager = {
    container: null,
    activeToasts: [],
    queue: [],
    
    // Initialize the toast system
    init() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.querySelector('.toast-container');
            
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }
            
            // Set position based on config
            this.container.style.position = 'fixed';
            
            switch (TOAST_CONFIG.position) {
                case 'top-right':
                    this.container.style.top = TOAST_CONFIG.spacing + 'px';
                    this.container.style.right = TOAST_CONFIG.spacing + 'px';
                    break;
                case 'top-left':
                    this.container.style.top = TOAST_CONFIG.spacing + 'px';
                    this.container.style.left = TOAST_CONFIG.spacing + 'px';
                    break;
                case 'bottom-left':
                    this.container.style.bottom = TOAST_CONFIG.spacing + 'px';
                    this.container.style.left = TOAST_CONFIG.spacing + 'px';
                    break;
                case 'bottom-right':
                default:
                    this.container.style.bottom = TOAST_CONFIG.spacing + 'px';
                    this.container.style.right = TOAST_CONFIG.spacing + 'px';
            }
            
            this.container.style.zIndex = TOAST_CONFIG.zIndex;
        }
    },
    
    // Check if we can display more toasts or need to queue
    canShowMore() {
        return this.activeToasts.length < TOAST_CONFIG.maxToasts;
    },
    
    // Process the queue if possible
    processQueue() {
        if (this.queue.length > 0 && this.canShowMore()) {
            const nextToast = this.queue.shift();
            this.displayToast(nextToast.type, nextToast.title, nextToast.message, nextToast.options);
        }
    },
    
    // Display a toast notification
    displayToast(type, title, message, options = {}) {
        this.init();
        
        // If we can't show more toasts, add to queue
        if (!this.canShowMore()) {
            this.queue.push({ type, title, message, options });
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Get icon for this toast type
        let iconClass = TOAST_CONFIG.icons.info;
        if (TOAST_CONFIG.icons[type]) {
            iconClass = TOAST_CONFIG.icons[type];
        }
        
        // Toast content
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-close">
                <i class="fas fa-times"></i>
            </div>
        `;
        
        // Add unique ID to track this toast
        const toastId = 'toast-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        toast.id = toastId;
        
        // Add to container and track
        this.container.appendChild(toast);
        this.activeToasts.push({
            id: toastId,
            element: toast,
            timeout: null
        });
        
        // Set timeout for auto-dismiss
        const timeout = setTimeout(() => {
            this.dismissToast(toastId);
        }, options.duration || TOAST_CONFIG.displayDuration);
        
        // Store timeout reference
        const toastIndex = this.activeToasts.findIndex(t => t.id === toastId);
        if (toastIndex !== -1) {
            this.activeToasts[toastIndex].timeout = timeout;
        }
        
        // Add close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismissToast(toastId);
        });
        
        // Slide-in animation
        requestAnimationFrame(() => {
            // Initial state off-screen
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            // Trigger animation
            requestAnimationFrame(() => {
                toast.style.transition = `transform ${TOAST_CONFIG.animationDuration / 1000}s ease-out, opacity ${TOAST_CONFIG.animationDuration / 1000}s ease-out`;
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            });
        });
        
        // Add progress bar if enabled
        if (options.showProgress !== false) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-progress';
            progressBar.style.height = '3px';
            progressBar.style.background = 'rgba(255, 255, 255, 0.3)';
            progressBar.style.position = 'absolute';
            progressBar.style.bottom = '0';
            progressBar.style.left = '0';
            progressBar.style.width = '100%';
            progressBar.style.transform = 'scaleX(1)';
            progressBar.style.transformOrigin = 'left';
            progressBar.style.transition = `transform ${(options.duration || TOAST_CONFIG.displayDuration) / 1000}s linear`;
            
            toast.style.position = 'relative';
            toast.style.overflow = 'hidden';
            toast.appendChild(progressBar);
            
            // Start progress animation
            requestAnimationFrame(() => {
                progressBar.style.transform = 'scaleX(0)';
            });
        }
        
        return toastId;
    },
    
    // Dismiss a toast notification
    dismissToast(toastId) {
        const toastIndex = this.activeToasts.findIndex(t => t.id === toastId);
        
        if (toastIndex !== -1) {
            const { element, timeout } = this.activeToasts[toastIndex];
            
            // Clear timeout if it exists
            if (timeout) {
                clearTimeout(timeout);
            }
            
            // Start slide-out animation
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            
            // Remove toast after animation
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                
                // Remove from tracking array
                this.activeToasts.splice(toastIndex, 1);
                
                // Process queue if we have pending toasts
                this.processQueue();
            }, TOAST_CONFIG.animationDuration);
        }
    },
    
    // Dismiss all toasts
    dismissAll() {
        // Copy the array since we'll be modifying it
        const toastsToRemove = [...this.activeToasts];
        
        // Dismiss each toast
        toastsToRemove.forEach(toast => {
            this.dismissToast(toast.id);
        });
        
        // Clear the queue
        this.queue = [];
    }
};

/**
 * Show a toast notification
 * @param {string} type - Toast type: 'info', 'success', 'warning', or 'error'
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {Object} options - Additional options
 * @returns {string} Toast ID
 */
function showToast(type, title, message, options = {}) {
    return toastManager.displayToast(type, title, message, options);
}

/**
 * Dismiss a specific toast
 * @param {string} toastId - ID of the toast to dismiss
 */
function dismissToast(toastId) {
    toastManager.dismissToast(toastId);
}

/**
 * Dismiss all active toasts
 */
function dismissAllToasts() {
    toastManager.dismissAll();
}

// Shorthand functions for each toast type
function showInfoToast(title, message, options = {}) {
    return showToast('info', title, message, options);
}

function showSuccessToast(title, message, options = {}) {
    return showToast('success', title, message, options);
}

function showWarningToast(title, message, options = {}) {
    return showToast('warning', title, message, options);
}

function showErrorToast(title, message, options = {}) {
    return showToast('error', title, message, options);
}

// Initialize toast system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    toastManager.init();
});
