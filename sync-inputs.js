document.addEventListener('DOMContentLoaded', () => {
    const scriptCanvas = document.querySelector('.script-canvas');
    const scriptNavContainer = document.querySelector('.script-nav-container');
    const jsonFilePath = 'https://altaces.netlify.app/scripts-list.json';
    const customerInput = document.getElementById('customer');
    const agentInput = document.getElementById('user');
    let stateManager;

    // Configure timestamp settings - easily adjustable
    const timestampConfig = {
        timeframe: {
            days: 7,  // Changed from 24 hours to 7 days
            getMilliseconds: function() {
                return this.days * 24 * 60 * 60 * 1000;
            }
        },
        labels: {
            new: 'New',
            updated: 'Updated'
        },
        styles: {
            newColor: '#2ecc71',
            updatedColor: '#3498db'
        }
    };

    // Color configuration for different script modules
    const moduleColorMap = {
        'ETG Chat Scripts': '#d0a8e6',
        'ETG Voice Scripts': '#79fcd9',
        'B.COM Chat Scripts': '#cdf2ac',
    };

    // Default color for modules not specified in the map
    const defaultColor = '#f9f9f9';

    fetch(jsonFilePath)
        .then(response => response.json())
        .then(data => {
            generateNavButtons(data);
            generateMergedScriptModules(data);
            initializeAllFunctionality();
            initializeNavigation();
            updateNavBadges(); // Add badges to nav buttons based on new/updated cards
            applyCardBackgroundColors(); // Apply background colors to cards
            addCardHoverEffects(); // Add hover effects to cards
        })
        .catch(error => console.error('Failed to load scripts:', error));

    function generateNavButtons(scripts) {
        // Clear existing nav buttons
        scriptNavContainer.innerHTML = '';
        
        // Get unique IDs and their first occurrence data
        const uniqueScripts = scripts.reduce((unique, script) => {
            if (!unique.has(script.id)) {
                unique.set(script.id, script);
            }
            return unique;
        }, new Map());

        // Create nav buttons for unique IDs
        uniqueScripts.forEach((script, id) => {
            const button = document.createElement('button');
            button.id = `${id}-nav`;
            button.className = 'nav-btn';
            if (id === 'Opening') {
                button.classList.add('active');
            }
            
            // Convert ID to title case for button text
            const buttonText = id
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Create a wrapper span for the button text to allow badge positioning
            const textSpan = document.createElement('span');
            textSpan.textContent = buttonText;
            button.appendChild(textSpan);
            
            scriptNavContainer.appendChild(button);
        });
    }

    function initializeAllFunctionality() {
        if (typeof initializeEnhancedCardModules === 'function') {
            initializeEnhancedCardModules();
            stateManager = new EditStateManager();
        }
        initializeSyncInputs();
    }

    function initializeNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                
                const moduleId = button.id.replace('-nav', '');
                updateActiveModule(moduleId);
            });
        });
    }

    function updateActiveModule(moduleId) {
        const scriptModules = document.querySelectorAll('.script-module');
        scriptModules.forEach(module => {
            module.classList.toggle('active', module.id === moduleId);
            
            const titles = module.querySelectorAll('.script-title-chat, .script-title-voice');
            const cardSubs = module.querySelectorAll('.script-card-sub');
            
            titles.forEach(title => {
                title.classList.toggle('active', module.id === moduleId);
            });
            
            cardSubs.forEach(cardSub => {
                cardSub.classList.toggle('active', module.id === moduleId);
            });
        });
    }

    function generateMergedScriptModules(scripts) {
        const scriptGroups = scripts.reduce((groups, script) => {
            if (!groups[script.id]) groups[script.id] = [];
            groups[script.id].push(script);
            return groups;
        }, {});

        Object.entries(scriptGroups).forEach(([scriptId, scriptsGroup]) => {
            const isActive = scriptId === 'Opening';
            const moduleDiv = document.createElement('div');
            moduleDiv.classList.add('script-module');
            if (isActive) moduleDiv.classList.add('active');
            moduleDiv.id = scriptId;

            scriptsGroup.forEach(script => {
                const titleDiv = document.createElement('div');
                titleDiv.classList.add(`script-title-${script.category}`);
                if (isActive) titleDiv.classList.add('active');
                titleDiv.innerHTML = `<h4>${script.title}</h4>`;

                // Conditionally add description if not empty
                if (script.description.trim() !== '') {
                    const descPara = document.createElement('p');
                    descPara.textContent = script.description;
                    titleDiv.appendChild(descPara);
                }

                moduleDiv.appendChild(titleDiv);

                let cardSubDiv = titleDiv.nextElementSibling;
                if (!cardSubDiv || !cardSubDiv.classList.contains('script-card-sub')) {
                    cardSubDiv = document.createElement('div');
                    cardSubDiv.classList.add('script-card-sub');
                    if (isActive) cardSubDiv.classList.add('active');
                    moduleDiv.appendChild(cardSubDiv);
                }

                script.cards.forEach(card => {
                    const cardDiv = document.createElement('div');
                    cardDiv.classList.add('card-module');
                    
                    // Add timestamp metadata as data attributes
                    if (card.created) {
                        cardDiv.setAttribute('data-created', card.created);
                    }
                    
                    if (card.updated) {
                        cardDiv.setAttribute('data-updated', card.updated);
                    }
                    
                    // Create a content container to separate content from banners
                    const contentContainer = document.createElement('div');
                    contentContainer.classList.add('card-content');
                    contentContainer.innerHTML = convertToEditable(card.content);
                    cardDiv.appendChild(contentContainer);
                    
                    // Check if card is new or updated using the timestamp configuration
                    addTimestampBanner(cardDiv);
                    
                    if (typeof CardModule !== 'undefined' && stateManager) {
                        new CardModule(cardDiv, stateManager);
                    }
                    cardSubDiv.appendChild(cardDiv);
                });
            });

            scriptCanvas.appendChild(moduleDiv);
        });
    }
    
    function addTimestampBanner(cardDiv) {
        const createdTimestamp = cardDiv.getAttribute('data-created');
        const updatedTimestamp = cardDiv.getAttribute('data-updated');
        
        if (!createdTimestamp && !updatedTimestamp) return;
        
        const now = new Date();
        const isNew = createdTimestamp && isWithinTimeframe(createdTimestamp, now);
        const isUpdated = updatedTimestamp && isWithinTimeframe(updatedTimestamp, now);
        
        if (isNew || isUpdated) {
            const bannerDiv = document.createElement('div');
            bannerDiv.classList.add('timestamp-banner');
            
            // Priority to "New" if both conditions are true
            if (isNew) {
                bannerDiv.classList.add('new-banner');
                bannerDiv.textContent = timestampConfig.labels.new;
            } else {
                bannerDiv.classList.add('updated-banner');
                bannerDiv.textContent = timestampConfig.labels.updated;
            }
            
            // Insert banner as first child of card
            cardDiv.insertBefore(bannerDiv, cardDiv.firstChild);
            
            // Add styles to the document if they don't exist yet
            addBannerStyles();
        }
    }
    
    function updateNavBadges() {
        // Check each script module for New/Updated banners
        document.querySelectorAll('.script-module').forEach(module => {
            const moduleId = module.id;
            const navButton = document.getElementById(`${moduleId}-nav`);
            if (!navButton) return;
            
            // Check if this module has any cards with New/Updated banners
            const hasNewOrUpdated = module.querySelector('.timestamp-banner') !== null;
            
            // Add or remove badge accordingly
            if (hasNewOrUpdated) {
                if (!navButton.querySelector('.nav-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'nav-badge';
                    badge.textContent = '!';
                    navButton.appendChild(badge);
                }
            } else {
                const existingBadge = navButton.querySelector('.nav-badge');
                if (existingBadge) {
                    existingBadge.remove();
                }
            }
        });
    }
    
    // Updated function to use the configurable timeframe
    function isWithinTimeframe(timestamp, currentTime) {
        // Parse the timestamp (expected format: ISO string or similar date format)
        const date = new Date(timestamp);
        
        // Calculate the difference in milliseconds
        const diffMs = currentTime - date;
        
        // Compare with the configured timeframe in milliseconds
        return diffMs < timestampConfig.timeframe.getMilliseconds();
    }
    
    function addBannerStyles() {
        // Add styles only once
        if (!document.getElementById('timestamp-banner-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'timestamp-banner-styles';
            styleEl.textContent = `
                .timestamp-banner {
                    position: absolute;
                    top: 0;
                    left: 0;
                    padding: 2px 5px;
                    font-size: 8px;
                    font-weight: bold;
                    color: white;
                    border-radius: 3px 0 3px 0;
                    box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
                    animation: blink-animation 1s infinite alternate;
                    z-index: 10;
                }
                
                .new-banner {
                    background-color: ${timestampConfig.styles.newColor};
                }
                
                .updated-banner {
                    background-color: ${timestampConfig.styles.updatedColor};
                }
                
                .card-module {
                    position: relative;
                }
                
                .card-content {
                    position: relative;
                    width: 100%;
                }
                
                .nav-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background-color:rgb(139, 255, 139);
                    color: white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    font-size: 10px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse-animation 1.5s infinite;
                }
                
                .nav-btn {
                    position: relative;
                }
                
                @keyframes blink-animation {
                    from { opacity: 1; }
                    to { opacity: 0.6; }
                }
                
                @keyframes pulse-animation {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(styleEl);
        }
    }

    function convertToEditable(content) {
        return content.replace(/\[(.+?)\]/g, (match, p1) => {
            return `<span class="manual-edit" data-default-text="${match}">${match}</span>`;
        });
    }

    function initializeSyncInputs() {
        updateEditableFromInput(customerInput, '[Cx Name]');
        updateEditableFromInput(agentInput, '[Agent Name]');

        customerInput.addEventListener('input', () => syncFromInput(customerInput, '[Cx Name]'));
        agentInput.addEventListener('input', () => syncFromInput(agentInput, '[Agent Name]'));

        observeResets();
    }

    function syncFromInput(input, defaultText) {
        const value = input.value.trim();
        const fields = document.querySelectorAll(`.manual-edit[data-default-text="${defaultText}"]`);
        
        fields.forEach(field => {
            if (!field.classList.contains('editing')) {
                field.textContent = value || defaultText;
                if (stateManager) {
                    stateManager.updateGroup(defaultText, field.textContent, null);
                }
            }
        });
    }

    function updateEditableFromInput(input, defaultText) {
        const value = input.value.trim();
        const fields = document.querySelectorAll(`.manual-edit[data-default-text="${defaultText}"]`);
        
        fields.forEach(field => {
            if (!field.classList.contains('editing')) {
                field.textContent = value || defaultText;
                if (stateManager) {
                    stateManager.updateGroup(defaultText, field.textContent, null);
                }

                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'characterData' || mutation.type === 'childList') {
                            const newValue = field.textContent.trim();
                            if (newValue !== defaultText) {
                                input.value = newValue;
                            } else {
                                input.value = '';
                            }
                        }
                    });
                });

                observer.observe(field, {
                    characterData: true,
                    childList: true,
                    subtree: true
                });
            }
        });
    }

    function observeResets() {
        const resetObserver = new MutationObserver(() => {
            document.querySelectorAll('.manual-edit').forEach(field => {
                const defaultText = field.getAttribute('data-default-text');
                if (field.textContent.trim() === defaultText) {
                    if (defaultText === '[Cx Name]') customerInput.value = '';
                    if (defaultText === '[Agent Name]') agentInput.value = '';
                }
            });
        });

        document.querySelectorAll('.manual-edit').forEach(field => {
            resetObserver.observe(field, { childList: true, subtree: true });
        });
    }

    // Function to apply background colors to cards based on their parent script-module id
    function applyCardBackgroundColors() {
        document.querySelectorAll('.script-module').forEach(module => {
            const moduleId = module.id;
            const backgroundColor = moduleColorMap[moduleId] || defaultColor;
            
            // Apply colors to all card modules in this script module
            module.querySelectorAll('.card-module').forEach(card => {
                card.style.backgroundColor = backgroundColor;
            });
        });
    }

    // Function to add hover effects to cards
    function addCardHoverEffects() {
        // Add CSS styles only once
        if (!document.getElementById('card-hover-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'card-hover-styles';
            styleEl.textContent = `
                .card-module {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .card-module:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }
            `;
            document.head.appendChild(styleEl);
        }
    }
});
