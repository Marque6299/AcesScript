/**
 * Sentinel.js - Security Overlay Library
 * Version 1.0.0
 * 
 * A lightweight security overlay that protects web pages with access code authentication
 * Connected to Cloudflare Workers and D1 Database
 * 
 * Usage:
 * <script src="sentinel.js" data-worker-url="https://your-worker.workers.dev/verify"></script>
 * 
 * Or manually:
 * <script src="sentinel.js"></script>
 * <script>Sentinel.init({ workerUrl: 'https://your-worker.workers.dev/verify' });</script>
 */

(function(window, document) {
    'use strict';

    const DEFAULT_CONFIG = {
        workerUrl: null,
        sessionKey: 'sentinel_authenticated',
        overlayId: 'sentinelOverlay',
        autoInit: true,
        fadeDelay: 1500,
        debug: false
    };

    class SentinelSecurityOverlay {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            
            // Modified this section to handle missing workerUrl
            this.overlay = null;
            this.elements = {};
            this.isAuthenticated = false;
            this.stylesInjected = false;

            if (this.config.autoInit) {
                this.init();
            }
        }

        init() {
            // Check if already authenticated
            if (sessionStorage.getItem(this.config.sessionKey) === 'true') {
                this.isAuthenticated = true;
                this.log('User already authenticated, skipping overlay');
                return;
            }

            // Skip overlay creation if workerUrl is not provided
            if (!this.config.workerUrl) {
                this.log('No workerUrl provided, skipping security overlay');
                this.isAuthenticated = true; // Auto-authenticate when no workerUrl
                return;
            }

            this.log('Initializing Sentinel security overlay');
            this.injectStyles();
            this.createOverlay();
            this.bindEvents();
            
            // Focus input after DOM is ready
            setTimeout(() => {
                if (this.elements.input) {
                    this.elements.input.focus();
                }
            }, 100);
        }

        injectStyles() {
            if (this.stylesInjected) return;

            const style = document.createElement('style');
            style.id = 'sentinel-styles';
            style.textContent = `
                /* Sentinel Security Overlay Styles */
                .sentinel-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.95);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999999;
                    backdrop-filter: blur(5px);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    opacity: 1;
                    transition: opacity 0.5s ease;
                    box-sizing: border-box;
                }
                
                .sentinel-overlay.fade-out {
                    opacity: 0;
                }
                
                .sentinel-form {
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    animation: sentinelSlideIn 0.3s ease-out;
                    box-sizing: border-box;
                }
                
                @keyframes sentinelSlideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .sentinel-title {
                    color: #333;
                    margin: 0 0 30px 0;
                    font-size: 24px;
                    font-weight: bold;
                }
                
                .sentinel-subtitle {
                    margin: 0 0 20px 0;
                    color: #666;
                    font-size: 16px;
                }
                
                .sentinel-input {
                    width: 100%;
                    padding: 15px;
                    font-size: 16px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    box-sizing: border-box;
                    text-align: center;
                    font-family: monospace;
                    transition: border-color 0.3s ease, box-shadow 0.3s ease;
                }
                
                .sentinel-input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
                }
                
                .sentinel-button {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    width: 100%;
                    font-weight: bold;
                    box-sizing: border-box;
                }
                
                .sentinel-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }
                
                .sentinel-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                
                .sentinel-error {
                    color: #e74c3c;
                    margin-top: 15px;
                    font-size: 14px;
                    display: none;
                    background: #fdf2f2;
                    padding: 10px;
                    border-radius: 5px;
                    border: 1px solid #fecaca;
                }
                
                .sentinel-loading {
                    display: none;
                    margin-top: 15px;
                }
                
                .sentinel-spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    animation: sentinelSpin 1s linear infinite;
                    margin: 0 auto;
                }
                
                @keyframes sentinelSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .sentinel-loading-text {
                    margin: 10px 0 0 0;
                    color: #666;
                    font-size: 14px;
                }
                
                .sentinel-success {
                    color: #27ae60;
                    margin-top: 15px;
                    font-size: 14px;
                    display: none;
                    background: #f0f9f0;
                    padding: 10px;
                    border-radius: 5px;
                    border: 1px solid #c3e6c3;
                }

                /* Responsive design */
                @media (max-width: 480px) {
                    .sentinel-form {
                        padding: 30px 20px;
                        margin: 20px;
                    }
                    
                    .sentinel-title {
                        font-size: 20px;
                    }
                    
                    .sentinel-input, .sentinel-button {
                        padding: 12px;
                        font-size: 14px;
                    }
                }
            `;
            
            document.head.appendChild(style);
            this.stylesInjected = true;
        }

        createOverlay() {
            // Create overlay container
            this.overlay = document.createElement('div');
            this.overlay.id = this.config.overlayId;
            this.overlay.className = 'sentinel-overlay';

            // Create form container
            const form = document.createElement('div');
            form.className = 'sentinel-form';

            // Create title
            const title = document.createElement('div');
            title.className = 'sentinel-title';
            title.innerHTML = '🛡️ SENTINEL SECURITY';

            // Create subtitle
            const subtitle = document.createElement('p');
            subtitle.className = 'sentinel-subtitle';
            subtitle.textContent = 'Enter access code to continue';

            // Create input field
            const input = document.createElement('input');
            input.type = 'password';
            input.className = 'sentinel-input';
            input.placeholder = 'Enter access code...';
            input.maxLength = 50;
            input.autocomplete = 'off';
            input.spellcheck = false;
            this.elements.input = input;

            // Create submit button
            const button = document.createElement('button');
            button.className = 'sentinel-button';
            button.textContent = 'Verify Access';
            this.elements.button = button;

            // Create loading indicator
            const loading = document.createElement('div');
            loading.className = 'sentinel-loading';
            
            const spinner = document.createElement('div');
            spinner.className = 'sentinel-spinner';
            
            const loadingText = document.createElement('p');
            loadingText.className = 'sentinel-loading-text';
            loadingText.textContent = 'Verifying access...';
            
            loading.appendChild(spinner);
            loading.appendChild(loadingText);
            this.elements.loading = loading;

            // Create error message container
            const error = document.createElement('div');
            error.className = 'sentinel-error';
            this.elements.error = error;

            // Create success message container
            const success = document.createElement('div');
            success.className = 'sentinel-success';
            success.innerHTML = '✅ Access granted! Welcome.';
            this.elements.success = success;

            // Assemble the form
            form.appendChild(title);
            form.appendChild(subtitle);
            form.appendChild(input);
            form.appendChild(button);
            form.appendChild(loading);
            form.appendChild(error);
            form.appendChild(success);

            this.overlay.appendChild(form);

            // Add to document
            document.body.appendChild(this.overlay);

            this.log('Security overlay created and added to DOM');
        }

        bindEvents() {
            // Submit button click
            this.elements.button.addEventListener('click', (e) => {
                e.preventDefault();
                this.verifyCode();
            });

            // Enter key press
            this.elements.input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.verifyCode();
                }
            });

            // Prevent form submission if wrapped in a form
            this.overlay.addEventListener('submit', (e) => {
                e.preventDefault();
            });

            // Security: Prevent closing overlay with escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay && !this.overlay.classList.contains('fade-out')) {
                    e.preventDefault();
                    this.log('Escape key blocked for security');
                }
            });

            // Security: Prevent right-click context menu on overlay
            this.overlay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });

            this.log('Event handlers bound');
        }

        async verifyCode() {
            const code = this.elements.input.value.trim();

            if (!code) {
                this.showError('Please enter an access code');
                return;
            }

            this.log('Verifying access code...');
            this.showLoading(true);
            this.hideError();

            try {
                const response = await fetch(this.config.workerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code: code })
                });

                const result = await response.json();

                if (response.ok && result.valid) {
                    this.log('Access code verified successfully');
                    this.showSuccess();
                    this.isAuthenticated = true;
                    sessionStorage.setItem(this.config.sessionKey, 'true');

                    // Dispatch success event
                    this.dispatchEvent('authenticated', { 
                        user: result.user,
                        message: result.message 
                    });

                    // Remove overlay after delay
                    setTimeout(() => {
                        this.removeOverlay();
                    }, this.config.fadeDelay);

                } else {
                    this.log('Access code verification failed:', result.message);
                    this.showError(result.message || 'Invalid access code');
                    this.elements.input.value = '';
                    this.elements.input.focus();

                    // Dispatch failure event
                    this.dispatchEvent('authenticationFailed', { 
                        message: result.message || 'Invalid access code'
                    });
                }

            } catch (error) {
                this.log('Network error during verification:', error);
                this.showError('Connection error. Please check your internet connection and try again.');

                // Dispatch error event
                this.dispatchEvent('authenticationError', { 
                    error: error.message || 'Network error'
                });
            }

            this.showLoading(false);
        }

        showLoading(show) {
            this.elements.loading.style.display = show ? 'block' : 'none';
            this.elements.button.disabled = show;
            this.elements.input.disabled = show;
        }

        showError(message) {
            this.elements.error.textContent = message;
            this.elements.error.style.display = 'block';
            
            // Add shake animation
            this.elements.error.style.animation = 'none';
            setTimeout(() => {
                this.elements.error.style.animation = 'sentinelShake 0.5s ease-in-out';
            }, 10);
        }

        hideError() {
            this.elements.error.style.display = 'none';
        }

        showSuccess() {
            this.elements.success.style.display = 'block';
            this.hideError();
        }

        removeOverlay() {
            if (this.overlay) {
                this.log('Removing security overlay');
                this.overlay.classList.add('fade-out');
                
                setTimeout(() => {
                    if (this.overlay && this.overlay.parentNode) {
                        this.overlay.parentNode.removeChild(this.overlay);
                        this.overlay = null;
                    }
                    this.dispatchEvent('overlayRemoved');
                    this.log('Security overlay removed successfully');
                }, 500);
            }
        }

        // Public API methods
        logout() {
            this.log('Logging out user');
            sessionStorage.removeItem(this.config.sessionKey);
            this.isAuthenticated = false;
            
            if (!this.overlay) {
                this.init();
            }
            
            this.dispatchEvent('logout');
        }

        isLoggedIn() {
            return this.isAuthenticated || sessionStorage.getItem(this.config.sessionKey) === 'true';
        }

        destroy() {
            this.log('Destroying Sentinel instance');
            
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            
            const styles = document.getElementById('sentinel-styles');
            if (styles && styles.parentNode) {
                styles.parentNode.removeChild(styles);
            }
            
            this.overlay = null;
            this.elements = {};
            this.stylesInjected = false;
        }

        // Event system
        dispatchEvent(eventName, detail = {}) {
            const event = new CustomEvent(`sentinel:${eventName}`, { 
                detail: { ...detail, timestamp: new Date().toISOString() }
            });
            document.dispatchEvent(event);
            this.log(`Event dispatched: sentinel:${eventName}`, detail);
        }

        // Logging utility
        log(...args) {
            if (this.config.debug) {
                console.log('[Sentinel]', ...args);
            }
        }

        // Static initialization method
        static init(config) {
            return new SentinelSecurityOverlay(config);
        }
    }

    // Auto-initialize if data attributes are present
    function autoInit() {
        // Look for script tag with data attributes
        const scripts = document.querySelectorAll('script[src*="sentinel"], script[data-worker-url]');
        
        for (let script of scripts) {
            const workerUrl = script.getAttribute('data-worker-url') || 
                            script.getAttribute('data-sentinel-worker');
            
            if (workerUrl) {
                const debug = script.getAttribute('data-debug') === 'true';
                const sessionKey = script.getAttribute('data-session-key') || 'sentinel_authenticated';
                
                window.Sentinel = SentinelSecurityOverlay.init({ 
                    workerUrl, 
                    debug,
                    sessionKey
                });
                break;
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }

    // Export to global scope
    window.Sentinel = window.Sentinel || SentinelSecurityOverlay;

    // AMD/CommonJS compatibility
    if (typeof define === 'function' && define.amd) {
        define([], function() { return SentinelSecurityOverlay; });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = SentinelSecurityOverlay;
    }

})(window, document);