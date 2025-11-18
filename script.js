// Cache DOM elements
const DOM = {
    channelSelect: document.getElementById('channel-selection'),
    scriptNavContainer: document.querySelector('.script-nav-container'),
    checklistNavContainer: document.querySelector('.check-list-nav-container'),
    scriptCanvas: document.querySelector('.script-canvas'),
    checklistCanvas: document.querySelector('.checklist-canvas'),
    scriptNavButtons: document.querySelectorAll('.script-nav-container .nav-btn'),
    checklistNavButtons: document.querySelectorAll('.check-list-nav-container .nav-btn'),
    scriptModules: document.querySelectorAll('.script-module'),
    checklistModules: document.querySelectorAll('.checklist-module'),
    navItems: document.querySelectorAll('.nav-item'),
    subPages: document.querySelectorAll('.sub-page'),
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-action'),
    scriptTitles: {
        chat: document.querySelectorAll('.script-title-chat'),
        voice: document.querySelectorAll('.script-title-voice')
    },
    resetButton: document.querySelector('.global-script-reset'),
    agentInput: document.getElementById('user'),
    customerInput: document.getElementById('customer')
};

// Create search clear button element
const searchClearButton = document.createElement('button');
searchClearButton.id = 'search-clear';
searchClearButton.innerHTML = '<i class="fa-solid fa-times"></i>';
searchClearButton.style.display = 'none'; // Hidden by default
searchClearButton.classList.add('search-clear-btn');

// Add the clear button after the search input
if (DOM.searchInput && DOM.searchInput.parentNode) {
    DOM.searchInput.parentNode.insertBefore(searchClearButton, DOM.searchInput.nextSibling);
}

// State management
const state = {
    currentChannel: 'all',
    activeScriptNavButton: null,
    activeChecklistNavButton: null
};

// Reset functionality for script canvas
const ResetManager = {
    init() {
        // Add event listener to reset button
        if (DOM.resetButton) {
            DOM.resetButton.addEventListener('click', () => this.resetAllManualEdits());
        }
    },

    // Reset all manual-edit elements to their default values
    resetAllManualEdits() {
        const manualEditElements = document.querySelectorAll('.manual-edit');
        const agentName = DOM.agentInput?.value || '';
        
        manualEditElements.forEach(element => {
            const defaultText = element.getAttribute('data-default-text');
            
            // Only reset if it has the manual-edit class
            if (defaultText) {
                // Special handling for Agent Name
                if (defaultText === '[Agent Name]' && agentName) {
                    element.textContent = agentName;
                } else {
                    element.textContent = defaultText;
                }
                
                // Remove any editing classes that might be present
                element.classList.remove('editing');
                
                // Trigger change event for synchronization with other components
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
            }
        });
        
        // Also trigger sync-inputs.js to update its state if StateManager exists
        if (window.stateManager) {
            document.querySelectorAll('.manual-edit').forEach(field => {
                const defaultText = field.getAttribute('data-default-text');
                const content = field.textContent;
                window.stateManager.updateGroup(defaultText, content, null);
            });
        }
        
        console.log('All manual-edit elements have been reset to default values');
    }
};

const SearchManager = {
    isSearchActive: false, // Track if search is currently active

    // Reset all modules to inactive state
    resetModules() {
        DOM.scriptCanvas.querySelectorAll('.script-module').forEach(module => {
            module.classList.remove('active');
            module.querySelectorAll('.script-title-chat, .script-title-voice').forEach(title => {
                title.classList.remove('active');
            });
            module.querySelectorAll('.script-card-sub').forEach(card => {
                card.classList.remove('active');
            });
        });
    },

    // Restore default state
    restoreDefaultState() {
        this.isSearchActive = false;
        this.resetModules();
        DOM.searchInput.value = ''; // Clear search input
        this.updateClearButtonVisibility(); // Hide clear button
        ScriptManager.updateScriptModule(); // Restore default module state
        
        // Restore channel-based visibility
        const currentChannel = DOM.channelSelect.value;
        ScriptManager.updateTitles(currentChannel);
    },

    // Update clear button visibility based on search input
    updateClearButtonVisibility() {
        if (searchClearButton) {
            searchClearButton.style.display = DOM.searchInput.value ? 'block' : 'none';
        }
    },

    // Activate matching modules and their components
    activateModule(title) {
        const scriptModule = title.closest('.script-module');
        if (scriptModule) {
            scriptModule.classList.add('active');
            
            // Get corresponding card-sub for this title
            const cardSub = title.nextElementSibling;
            if (cardSub && cardSub.classList.contains('script-card-sub')) {
                cardSub.classList.add('active');
            }
            
            title.classList.add('active');
        }
    },

    // Extract text content from title element (including h4 and p)
    getTitleContent(titleElement) {
        const heading = titleElement.querySelector('h4');
        const paragraph = titleElement.querySelector('p');
        
        const headingText = heading ? heading.textContent.trim() : '';
        const paragraphText = paragraph ? paragraph.textContent.trim() : '';
        
        return {
            heading: headingText,
            paragraph: paragraphText,
            combined: `${headingText} ${paragraphText}`.trim()
        };
    },

    // Check if search terms match content (handles mixed up words)
    isMatch(content, searchTerms) {
        if (!content || !searchTerms.length) return false;
        
        // Convert content to lowercase and split into words
        const contentWords = content.toLowerCase().split(/\s+/);
        
        // Count how many search terms are found in the content
        const matchedTerms = searchTerms.filter(term => {
            return contentWords.some(word => word.includes(term));
        });
        
        // Return true if all search terms are found
        return matchedTerms.length === searchTerms.length;
    },

    // Search implementation
    performSearch(searchTerm) {
        searchTerm = searchTerm.trim();
        if (!searchTerm) {
            this.restoreDefaultState();
            return;
        }

        this.isSearchActive = true;
        this.resetModules();
        this.updateClearButtonVisibility();
        
        // Split search into individual terms and filter out empty strings
        const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        let hasResults = false;

        // Search within script-canvas only
        DOM.scriptCanvas.querySelectorAll('.script-title-chat, .script-title-voice').forEach(title => {
            const content = this.getTitleContent(title);
            
            // Check if any of our search terms match the title or paragraph
            if (
                this.isMatch(content.heading, searchTerms) || 
                this.isMatch(content.paragraph, searchTerms) || 
                this.isMatch(content.combined, searchTerms)
            ) {
                this.activateModule(title);
                hasResults = true;
            }
        });

        if (!hasResults) {
            console.log('No matching scripts found');
        }
    },

    // Initialize search events
    init() {
        // Search button click handler
        DOM.searchButton.addEventListener('click', () => {
            this.performSearch(DOM.searchInput.value);
        });

        // Search input enter key handler
        DOM.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(DOM.searchInput.value);
            }
        });

        // Optional: Real-time search as user types (with debounce)
        let debounceTimer;
        DOM.searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            this.updateClearButtonVisibility();
            debounceTimer = setTimeout(() => {
                this.performSearch(DOM.searchInput.value);
            }, 300);
        });

        // Clear button functionality
        if (searchClearButton) {
            searchClearButton.addEventListener('click', () => {
                DOM.searchInput.value = '';
                this.updateClearButtonVisibility();
                this.restoreDefaultState();
                DOM.searchInput.focus(); // Return focus to search input
            });
        }

        // Add state restoration to navigation events
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', () => {
                if (this.isSearchActive) {
                    this.restoreDefaultState();
                }
            });
        });

        // Add state restoration to channel selection
        DOM.channelSelect.addEventListener('change', () => {
            if (this.isSearchActive) {
                this.restoreDefaultState();
            }
        });

        // Add state restoration to side navigation
        DOM.navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (this.isSearchActive) {
                    this.restoreDefaultState();
                }
            });
        });
    }
};

// Script title management
const ScriptManager = {
    updateTitles(channel) {
        const elements = {
            chat: document.querySelectorAll('.script-title-chat'),
            voice: document.querySelectorAll('.script-title-voice')
        };

        // Helper function to toggle elements
        const toggleElements = (elements, isActive) => {
            elements.forEach(title => {
                title.classList.toggle('active', isActive);
                const cardSub = title.nextElementSibling;
                if (cardSub?.classList.contains('script-card-sub')) {
                    cardSub.classList.toggle('active', isActive);
                }
            });
        };

        // Reset all elements first
        toggleElements(elements.chat, false);
        toggleElements(elements.voice, false);

        // Activate based on channel selection
        if (channel === 'all' || channel === 'chat') {
            toggleElements(elements.chat, true);
        }
        if (channel === 'all' || channel === 'voice') {
            toggleElements(elements.voice, true);
        }

        state.currentChannel = channel;
    },

    updateScriptModule() {
        // Reset all script modules
        DOM.scriptModules.forEach(module => module.classList.remove('active'));
        
        // Find active script nav button
        const activeButton = DOM.scriptNavContainer.querySelector('.nav-btn.active');
        if (activeButton) {
            const moduleId = activeButton.id.replace('-nav', '');
            const targetModule = document.getElementById(moduleId);
            if (targetModule) targetModule.classList.add('active');
        }
    },

    updateChecklistModule() {
        // Reset all checklist modules
        document.querySelectorAll('.checklist-module').forEach(module => 
            module.classList.remove('active')
        );
        
        // Find active checklist nav button
        const activeButton = DOM.checklistNavContainer.querySelector('.nav-btn.active');
        if (activeButton) {
            const moduleId = activeButton.id.replace('-nav', '');
            const targetModule = document.getElementById(moduleId);
            if (targetModule) targetModule.classList.add('active');
        }
    }
};

// Navigation management - separated for script and checklist
const NavigationManager = {
    setActiveScriptButton(button) {
        // Only affect script nav buttons
        DOM.scriptNavContainer.querySelectorAll('.nav-btn').forEach(btn => 
            btn.classList.remove('active')
        );
        button.classList.add('active');
        state.activeScriptNavButton = button;
        ScriptManager.updateScriptModule();
    },

    setActiveChecklistButton(button) {
        // Only affect checklist nav buttons
        DOM.checklistNavContainer.querySelectorAll('.nav-btn').forEach(btn => 
            btn.classList.remove('active')
        );
        button.classList.add('active');
        state.activeChecklistNavButton = button;
        ScriptManager.updateChecklistModule();
    },

    toggleActivePage(event) {
        const navItem = event.currentTarget;
        const targetId = navItem.querySelector('button').id.replace('-page-action', '-page');

        DOM.navItems.forEach(item => item.classList.remove('active'));
        DOM.subPages.forEach(page => page.classList.remove('active'));

        navItem.classList.add('active');
        const targetPage = document.getElementById(targetId);
        if (targetPage) targetPage.classList.add('active');
    }
};

// Tooltip handler with debouncing
const TooltipManager = {
    activeTooltip: null,
    timeout: null,
    
    init() {
        this.setupTooltips();
        this.setupGlobalEvents();
    },

    setupTooltips() {
        DOM.navItems.forEach(item => {
            const tooltip = item.querySelector('.nav-tooltip');
            
            item.addEventListener('mouseenter', () => this.showTooltip(item, tooltip));
            item.addEventListener('mouseleave', () => this.hideTooltip(tooltip));
            item.addEventListener('mousemove', (e) => this.updateTooltipPosition(item, tooltip, e));
        });
    },

    setupGlobalEvents() {
        // Hide tooltip when scrolling for better performance
        window.addEventListener('scroll', () => {
            if (this.activeTooltip) {
                this.hideTooltip(this.activeTooltip);
            }
        }, { passive: true });
    },

    showTooltip(item, tooltip) {
        clearTimeout(this.timeout);
        
        // Hide any existing tooltip
        if (this.activeTooltip && this.activeTooltip !== tooltip) {
            this.hideTooltip(this.activeTooltip);
        }

        this.activeTooltip = tooltip;
        
        this.timeout = setTimeout(() => {
            const itemRect = item.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Position tooltip
            tooltip.style.left = `${itemRect.right + 15}px`;
            
            // Check if tooltip would go off-screen vertically
            const tooltipHeight = tooltip.offsetHeight;
            let topPosition = itemRect.top + (itemRect.height / 2) - (tooltipHeight / 2);
            
            // Adjust if too close to top or bottom of viewport
            if (topPosition < 10) {
                topPosition = 10;
            } else if (topPosition + tooltipHeight > viewportHeight - 10) {
                topPosition = viewportHeight - tooltipHeight - 10;
            }
            
            tooltip.style.top = `${topPosition}px`;
            
            // Add visible class for animation
            requestAnimationFrame(() => {
                tooltip.classList.add('visible');
            });
        }, 50);
    },

    hideTooltip(tooltip) {
        clearTimeout(this.timeout);
        
        if (tooltip) {
            tooltip.classList.remove('visible');
            this.timeout = setTimeout(() => {
                if (!tooltip.classList.contains('visible')) {
                    tooltip.style.left = '-9999px';
                }
            }, 100); // Match the CSS transition duration
        }
        
        if (this.activeTooltip === tooltip) {
            this.activeTooltip = null;
        }
    },

    updateTooltipPosition(item, tooltip, event) {
        if (tooltip.classList.contains('visible')) {
            const itemRect = item.getBoundingClientRect();
            const tooltipHeight = tooltip.offsetHeight;
            const mouseY = event.clientY;
            
            // Smooth follow for vertical mouse movement
            let topPosition = mouseY - (tooltipHeight / 2);
            
            // Keep tooltip within bounds of the item
            topPosition = Math.max(
                itemRect.top,
                Math.min(topPosition, itemRect.bottom - tooltipHeight)
            );
            
            tooltip.style.top = `${topPosition}px`;
        }
    },
    
    handleTooltip(item, tooltip, isEnter) {
        if (isEnter) {
            this.showTooltip(item, tooltip);
        } else {
            this.hideTooltip(tooltip);
        }
    }
};

// Event listeners
function initializeEventListeners() {
    // Channel selection
    DOM.channelSelect.addEventListener('change', (e) => 
        ScriptManager.updateTitles(e.target.value)
    );

    // Script Navigation buttons
    DOM.scriptNavContainer.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => 
            NavigationManager.setActiveScriptButton(button)
        );
    });

    // Checklist Navigation buttons
    DOM.checklistNavContainer.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => 
            NavigationManager.setActiveChecklistButton(button)
        );
    });

    // Nav items and tooltips
    DOM.navItems.forEach(item => {
        const tooltip = item.querySelector('.nav-tooltip');
        
        item.addEventListener('click', NavigationManager.toggleActivePage);
        item.addEventListener('mousemove', () => 
            TooltipManager.handleTooltip(item, tooltip, true)
        );
        item.addEventListener('mouseleave', () => 
            TooltipManager.handleTooltip(item, tooltip, false)
        );
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    ScriptManager.updateTitles('all');
    
    // Initialize both module types independently
    ScriptManager.updateScriptModule();
    ScriptManager.updateChecklistModule();
    
    TooltipManager.init();
    SearchManager.init();
    ResetManager.init();
});
