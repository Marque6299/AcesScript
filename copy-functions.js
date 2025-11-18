// Enhanced card-module-functions.js

const CONFIG = {
    tooltipDuration: 1500,
    animationDuration: 100,
    minEditableLength: 1,
    tooltipMessages: {
        success: '✓ Copied to clipboard',
        empty: '⚠️ Please fill in all fields',
        error: '✗ Failed to copy',
        editing: '✎ Now editing...'
    },
    classes: {
        tooltip: 'copy-tooltip',
        card: 'card-module',
        editableField: 'manual-edit',
        editing: 'editing',
        resetButton: 'module-reset-button',
        contentContainer: 'card-content', // Add reference to content container
        timestampBanner: 'timestamp-banner' // Add reference to timestamp banner
    }
};

// Global tooltip instance
let globalTooltip;

// Global state manager for synchronized editing
class EditStateManager {
    constructor() {
        this.editableGroups = new Map(); // Maps default-text to array of elements
        this.initializeGroups();
    }

    initializeGroups() {
        document.querySelectorAll(`.${CONFIG.classes.editableField}`).forEach(field => {
            const defaultText = field.getAttribute('data-default-text');
            if (!this.editableGroups.has(defaultText)) {
                this.editableGroups.set(defaultText, []);
            }
            this.editableGroups.get(defaultText).push(field);
        });
    }

    updateGroup(defaultText, newValue, excludeElement = null) {
        const group = this.editableGroups.get(defaultText);
        if (group) {
            group.forEach(element => {
                if (element !== excludeElement) {
                    element.textContent = newValue;
                }
            });
        }
    }

    findFirstUnedited(card) {
        const editableFields = Array.from(card.querySelectorAll(`.${CONFIG.classes.editableField}`));
        return editableFields.find(field => 
            field.textContent === field.getAttribute('data-default-text')
        );
    }
}

// Revised EnhancedTooltip to fix vertical scroll issue

class EnhancedTooltip {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = CONFIG.classes.tooltip;
        document.body.appendChild(this.element);
        this.timeout = null;
        this.currentCard = null;

        window.addEventListener('scroll', () => this.reposition(), { passive: true });
        window.addEventListener('resize', () => this.reposition(), { passive: true });
    }

    show(message, type = 'success', targetElement) {
        this.currentCard = targetElement;
        this.element.className = `${CONFIG.classes.tooltip} ${type} show`;
        this.element.textContent = message;
        this.position(targetElement);

        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.hide(), CONFIG.tooltipDuration);
    }

    hide() {
        this.element.classList.remove('show');
        this.currentCard = null;
    }

    position(targetElement) {
        const { left, top, width, height } = targetElement.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
        const tooltipWidth = this.element.offsetWidth;
        const tooltipHeight = this.element.offsetHeight;

        const posX = Math.max(10, Math.min(left + scrollLeft + width / 2 - tooltipWidth / 2, window.innerWidth + scrollLeft - tooltipWidth - 10));
        const posY = Math.max(10, top + scrollTop - tooltipHeight - 10);

        this.element.style.left = `${posX}px`;
        this.element.style.top = `${posY}px`;
    }

    reposition() {
        if (this.currentCard) this.position(this.currentCard);
    }
}


class EditableField {
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.defaultText = element.getAttribute('data-default-text');
        this.previousValue = this.element.textContent;
        this.setupField();
    }

    setupField() {
        this.element.setAttribute('data-default-text', this.defaultText);
        this.element.setAttribute('role', 'textbox');
        this.element.setAttribute('aria-label', 'Editable text field');
        this.initializeEventListeners();
    }

    enableEditing() {
        const card = this.element.closest(`.${CONFIG.classes.card}`);
        if (card.classList.contains('copying')) return;

        this.previousValue = this.element.textContent;
        if (this.element.textContent === this.defaultText) {
            this.element.textContent = '';
        }
        
        this.element.classList.add(CONFIG.classes.editing);
        this.element.contentEditable = true;
        this.element.focus();
    }

    disableEditing() {
        this.element.classList.remove(CONFIG.classes.editing);
        this.element.contentEditable = false;
        
        const content = this.element.textContent.trim();
        if (content.length === 0 && this.previousValue === this.defaultText) {
            this.element.textContent = this.defaultText;
        } else if (content.length > 0) {
            this.stateManager.updateGroup(this.defaultText, content, this.element);
        }
    }

    handleInput() {
        const content = this.element.textContent.trim();
        if (content.length > 0) {
            this.stateManager.updateGroup(this.defaultText, content, this.element);
        }
    }

    initializeEventListeners() {
        this.element.addEventListener('click', () => this.enableEditing());
        this.element.addEventListener('blur', () => this.disableEditing());
        this.element.addEventListener('input', () => this.handleInput());
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                this.element.blur();
            }
        });
    }
}

class CardModule {
    constructor(card, stateManager) {
        this.card = card;
        this.stateManager = stateManager;
        // Ensure tooltip is initialized
        if (!globalTooltip) {
            globalTooltip = new EnhancedTooltip();
        }
        this.setupCard();
    }

    setupCard() {
        this.addResetButton();
        this.initializeEditableFields();
        this.initializeEventListeners();
        this.checkAndAddResetButton();

    }
    
    checkAndAddResetButton() {
        const hasEditableFields = this.card.querySelector(`.${CONFIG.classes.editableField}`);
        const existingButton = this.card.querySelector(`.${CONFIG.classes.resetButton}`);
        if (hasEditableFields && !existingButton) {
            this.addResetButton();
        } else if (!hasEditableFields && existingButton) {
            existingButton.remove();
        }
    }

    addResetButton() {
        const resetButton = document.createElement('button');
        resetButton.className = CONFIG.classes.resetButton;
        resetButton.innerHTML = '<i class="fa-solid fa-rotate-left"></i>';
        resetButton.setAttribute('aria-label', 'Reset all fields to default');
        this.card.appendChild(resetButton);
    }

    initializeEditableFields() {
        this.card.querySelectorAll(`.${CONFIG.classes.editableField}`).forEach(field => {
            new EditableField(field, this.stateManager);
        });
    }

    resetFields() {
        this.card.querySelectorAll(`.${CONFIG.classes.editableField}`).forEach(field => {
            const defaultText = field.getAttribute('data-default-text');
            if (defaultText !== '[Agent Name]') {  // Exclude [Agent Name] fields
                field.textContent = defaultText;
                this.stateManager.updateGroup(defaultText, defaultText);
            }
        });
    }

    showTooltip(message, type) {
        globalTooltip.show(message, type, this.card);
    }

    handleCardClick(e) {
        // Ignore if clicking reset button or editable field
        if (e.target.classList.contains(CONFIG.classes.resetButton) ||
            e.target.classList.contains(CONFIG.classes.editableField) ||
            e.target.closest(`.${CONFIG.classes.editableField}`)) {
            return;
        }

        // Find and focus first unedited field
        const firstUnedited = this.stateManager.findFirstUnedited(this.card);
        if (firstUnedited) {
            firstUnedited.click();
            return;
        }

        // If all fields are edited, proceed with copy
        this.copyContent();
    }

    async copyContent() {
        try {
            const textToCopy = this.processTextForCopy();
            await navigator.clipboard.writeText(textToCopy);
            this.showTooltip(CONFIG.tooltipMessages.success, 'success');
            
            // Add a temporary class to prevent clicking during animation
            this.card.classList.add('copying');
            setTimeout(() => {
                this.card.classList.remove('copying');
            }, CONFIG.tooltipDuration);
            
        } catch (err) {
            console.error('Copy failed:', err);
            this.showTooltip(CONFIG.tooltipMessages.error, 'error');
        }
    }

    processTextForCopy() {
        // Instead of cloning the entire card, just clone the content container
        // This ensures we don't copy the timestamp banners
        const contentContainer = this.card.querySelector(`.${CONFIG.classes.contentContainer}`);
        if (!contentContainer) {
            // Fallback to old method if content container not found
            return this.legacyProcessTextForCopy();
        }
        
        const tempElement = contentContainer.cloneNode(true);
        
        // Remove utility elements if present
        tempElement.querySelectorAll(`.${CONFIG.classes.resetButton}`).forEach(el => el.remove());

        // Preserve <br> tags as new lines
        let copiedText = tempElement.innerHTML.replace(/<br\s*\/?>/gi, '\n');

        // Strip all other HTML tags (optional)
        copiedText = copiedText.replace(/<\/?[^>]+(>|$)/g, "");
        
        // Validate editable fields
        const emptyFields = [...tempElement.querySelectorAll(`.${CONFIG.classes.editableField}`)]
            .some(field => {
                const text = field.textContent.trim();
                const defaultText = field.getAttribute('data-default-text');
                return !text || text === defaultText;
            });

        if (emptyFields) {
            throw new Error(CONFIG.tooltipMessages.empty);
        }

        return copiedText.trim();
    }
    
    // Fallback legacy method for backward compatibility
    legacyProcessTextForCopy() {
        const tempElement = this.card.cloneNode(true);
        
        // Remove timestamp banners and utility elements
        tempElement.querySelectorAll(`.${CONFIG.classes.timestampBanner}`).forEach(el => el.remove());
        tempElement.querySelectorAll(`.${CONFIG.classes.resetButton}`).forEach(el => el.remove());
        
        // Validate editable fields
        const emptyFields = [...tempElement.querySelectorAll(`.${CONFIG.classes.editableField}`)]
            .some(field => {
                const text = field.textContent.trim();
                const defaultText = field.getAttribute('data-default-text');
                return !text || text === defaultText;
            });

        if (emptyFields) {
            throw new Error(CONFIG.tooltipMessages.empty);
        }

        return tempElement.innerText.trim().replace(/\s+/g, ' ');
    }

    initializeEventListeners() {
        this.card.addEventListener('click', (e) => this.handleCardClick(e));
        this.card.querySelector(`.${CONFIG.classes.resetButton}`).addEventListener('click', () => this.resetFields());
    }
}

// Add enhanced styles
const addEnhancedStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .${CONFIG.classes.tooltip} {
            position: absolute;
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 500;
            pointer-events: none;
            opacity: 0;
            transform: translateY(10px);
            transition: all ${CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid rgba(255,255,255,0.2);
            white-space: nowrap;
            display: none;
        }

        .${CONFIG.classes.tooltip}.error {
            background: linear-gradient(135deg, #c0392b, #e74c3c);
        }

        .${CONFIG.classes.tooltip}.show {
            opacity: 1;
            transform: translateY(0);
            display: block;
        }

        .${CONFIG.classes.card} {
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 8px;
            border-radius: 0 20px 20px 0;
        }

        .${CONFIG.classes.card}:hover {
            transform: translateX(5px);
            background: rgb(255, 255, 255);
        }

        .${CONFIG.classes.card}.copying {
            pointer-events: none;
            opacity: 0.7;
        }

        .${CONFIG.classes.editableField} {
            position: relative;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(52, 152, 219, 0.1);
            transition: all 0.2s ease;
            cursor: text;
            min-width: 60px;
            display: inline-block;
        }

        .${CONFIG.classes.editableField}:hover {
            background: rgba(52, 152, 219, 0.2);
        }

        .${CONFIG.classes.editableField}.${CONFIG.classes.editing} {
            background: white;
            outline: 2px solid #3498db;
            box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
        }

        .${CONFIG.classes.resetButton} {
            position: absolute;
            top: 8px;
            right: 10px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 4px 4px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            opacity: 0.8;
        }

        .${CONFIG.classes.resetButton}:hover {
            background: #c0392b;
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
};

// Initialize enhanced functionality
const initializeEnhancedCardModules = () => {
    addEnhancedStyles();
    const stateManager = new EditStateManager();

    // Initialize card modules
    document.querySelectorAll(`.${CONFIG.classes.card}`).forEach(card => {
        new CardModule(card, stateManager);
    });
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEnhancedCardModules);