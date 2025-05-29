/**
 * UI Manager - My Connect AI v2.0
 * Manages all UI interactions and display
 */

import { configManager } from './core-config.js';
import { EventEmitter } from './core-events.js';

export class UIManager extends EventEmitter {
    constructor() {
        super();
        this.currentTheme = 'claude';
        this.messageContainer = null;
        this.inputElement = null;
        this.sendButton = null;
        this._initialized = false;
    }

    /**
     * Initialize UI Manager
     */
    async init() {
        if (this._initialized) return;
        
        try {
            // Get DOM elements
            this.messageContainer = document.getElementById('chat-messages');
            this.inputElement = document.getElementById('chat-input');
            this.sendButton = document.getElementById('send-button');
            
            // Load theme
            this.loadTheme();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Setup auto-resize for textarea
            this.setupAutoResize();
            
            this._initialized = true;
            console.log('✅ UI Manager initialized');
            
        } catch (error) {
            console.error('❌ UI Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Show welcome screen
     */
    showWelcomeScreen() {
        if (!this.messageContainer) return;
        
        const examples = configManager.getExampleQueries();
        const localization = examples.localization || {};
        
        // Select random queries
        const allQueries = [];
        for (const category of Object.values(examples.categories || {})) {
            if (!examples.settings?.excludeAdvanced || !category.advanced) {
                allQueries.push(...(category.queries || []));
            }
        }
        
        // Shuffle and select
        const shuffled = this.shuffleArray(allQueries);
        const selected = shuffled.slice(0, examples.settings?.maxQueriesToShow || 6);
        
        const html = `
            <div class="welcome-container">
                <div class="welcome-header">
                    <h2>${localization.welcomeTitle || 'Co vás zajímá?'}</h2>
                    <p>${localization.welcomeSubtitle || 'Zkuste některý z těchto příkladů:'}</p>
                </div>
                <div class="example-queries" id="example-queries">
                    ${selected.map(query => `
                        <div class="example-query" data-query="${this.escapeHtml(query.text)}">
                            ${query.icon ? `<span class="example-icon">${query.icon}</span>` : ''}
                            <span class="example-text">${this.escapeHtml(query.text)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="welcome-footer">
                    <p>${localization.orTypeYourOwn || 'Nebo napište vlastní dotaz...'}</p>
                </div>
            </div>
        `;
        
        this.messageContainer.innerHTML = html;
        
        // Add click handlers to examples
        document.querySelectorAll('.example-query').forEach(element => {
            element.addEventListener('click', () => {
                const query = element.dataset.query;
                this.setInputValue(query);
                this.focusInput();
            });
        });
    }

    /**
     * Show loading screen
     * @param {string} message - Loading message
     */
    showLoadingScreen(message = 'Načítám...') {
        if (!this.messageContainer) return;
        
        this.messageContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">${this.escapeHtml(message)}</div>
            </div>
        `;
    }

    /**
     * Show loading message (non-blocking)
     * @param {string} message - Loading message
     */
    showLoadingMessage(message) {
        this.addMessage('system', message, { loading: true });
    }

    /**
     * Add message to chat
     * @param {string} role - Message role (user/assistant/system/error)
     * @param {string} content - Message content
     * @param {Object} options - Additional options
     */
    addMessage(role, content, options = {}) {
        if (!this.messageContainer) return;
        
        // Hide welcome screen on first real message
        const welcomeContainer = this.messageContainer.querySelector('.welcome-container');
        if (welcomeContainer && (role === 'user' || role === 'assistant')) {
            welcomeContainer.style.display = 'none';
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}-message`;
        
        if (options.loading) {
            messageElement.classList.add('loading');
        }
        
        // Process content
        let processedContent = content;
        
        // Convert markdown bold to HTML
        if (role === 'assistant' && content.includes('**')) {
            processedContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
        
        // Handle HTML content
        if (options.html || processedContent !== content) {
            messageElement.innerHTML = processedContent;
        } else {
            messageElement.textContent = content;
        }
        
        // Add timestamp
        if (options.timestamp !== false) {
            const timestamp = document.createElement('span');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit'
            });
            messageElement.appendChild(timestamp);
        }
        
        this.messageContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Remove loading class after animation
        if (options.loading) {
            setTimeout(() => {
                messageElement.classList.remove('loading');
            }, 300);
        }
        
        return messageElement;
    }

    /**
     * Update last message
     * @param {string} content - New content
     */
    updateLastMessage(content) {
        const messages = this.messageContainer.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
            if (content.includes('**')) {
                content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                lastMessage.innerHTML = content;
            } else {
                lastMessage.textContent = content;
            }
        }
    }

    /**
     * Remove last message
     */
    removeLastMessage() {
        const messages = this.messageContainer.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
            lastMessage.remove();
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    showError(message, error = null) {
        console.error(message, error);
        
        let errorMessage = message;
        if (error && configManager.isDebugMode()) {
            errorMessage += `\n\nTechnické detaily: ${error.message}`;
        }
        
        this.addMessage('error', errorMessage);
    }

    /**
     * Set input value
     * @param {string} value - Input value
     */
    setInputValue(value) {
        if (this.inputElement) {
            this.inputElement.value = value;
            this.autoResize();
        }
    }

    /**
     * Get input value
     * @returns {string} Input value
     */
    getInputValue() {
        return this.inputElement?.value || '';
    }

    /**
     * Clear input
     */
    clearInput() {
        if (this.inputElement) {
            this.inputElement.value = '';
            this.autoResize();
        }
    }

    /**
     * Focus input
     */
    focusInput() {
        if (this.inputElement) {
            this.inputElement.focus();
        }
    }

    /**
     * Enable/disable input
     * @param {boolean} enabled - Enable state
     */
    setInputEnabled(enabled) {
        if (this.inputElement) {
            this.inputElement.disabled = !enabled;
        }
        if (this.sendButton) {
            this.sendButton.disabled = !enabled;
        }
    }

    /**
     * Set send button text
     * @param {string} text - Button text
     */
    setSendButtonText(text) {
        if (this.sendButton) {
            this.sendButton.textContent = text;
        }
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        if (this.messageContainer) {
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        }
    }

    /**
     * Load and apply theme
     */
    loadTheme() {
        // Get saved theme or default
        const savedTheme = localStorage.getItem('selectedAppTheme');
        const defaultTheme = configManager.get('app.ui.defaultTheme') || 'claude';
        this.currentTheme = savedTheme || defaultTheme;
        
        this.applyTheme(this.currentTheme);
    }

    /**
     * Apply theme
     * @param {string} themeName - Theme name
     */
    applyTheme(themeName) {
        const availableThemes = configManager.get('app.ui.availableThemes') || ['claude', 'google', 'replit'];
        
        if (!availableThemes.includes(themeName)) {
            console.warn(`Theme ${themeName} not available, using default`);
            themeName = availableThemes[0];
        }
        
        // Remove all theme classes
        document.body.classList.forEach(className => {
            if (className.startsWith('theme-')) {
                document.body.classList.remove(className);
            }
        });
        
        // Add new theme class (claude is default, no class needed)
        if (themeName !== 'claude') {
            document.body.classList.add(`theme-${themeName}`);
        }
        
        // Save preference
        localStorage.setItem('selectedAppTheme', themeName);
        this.currentTheme = themeName;
        
        // Update theme selector if exists
        this.updateThemeSelector();
        
        console.log(`🎨 Theme applied: ${themeName}`);
    }

    /**
     * Get current theme
     * @returns {string} Current theme name
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Update theme selector UI
     */
    updateThemeSelector() {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const activeOption = document.querySelector(`.theme-${this.currentTheme}`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Theme selector clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.theme-option')) {
                const theme = e.target.className.match(/theme-(\w+)/)?.[1];
                if (theme) {
                    this.applyTheme(theme);
                }
            }
        });
        
        // Enter key in input
        if (this.inputElement) {
            this.inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.emit('send');
                }
            });
        }
        
        // Send button click
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                this.emit('send');
            });
        }
    }

    /**
     * Setup auto-resize for textarea
     */
    setupAutoResize() {
        if (!this.inputElement) return;
        
        this.inputElement.addEventListener('input', () => this.autoResize());
        
        // Initial resize
        this.autoResize();
    }

    /**
     * Auto-resize textarea
     */
    autoResize() {
        if (!this.inputElement) return;
        
        this.inputElement.style.height = 'auto';
        const newHeight = Math.min(this.inputElement.scrollHeight, 120);
        this.inputElement.style.height = newHeight + 'px';
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (info/success/warning/error)
     * @param {number} duration - Duration in ms (0 = permanent)
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-hide if duration > 0
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        return notification;
    }

    /**
     * Hide notification
     * @param {Element} notification - Notification element
     */
    hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    /**
     * Show modal dialog
     * @param {string} title - Modal title
     * @param {string} content - Modal content (HTML)
     * @param {Object} options - Modal options
     * @returns {Element} Modal element
     */
    showModal(title, content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-content">
                    ${content}
                </div>
                ${options.buttons ? `
                    <div class="modal-footer">
                        ${options.buttons.map(btn => `
                            <button class="modal-button ${btn.class || ''}" data-action="${btn.action}">
                                ${this.escapeHtml(btn.text)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.hideModal(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
            }
            
            if (e.target.matches('.modal-button')) {
                const action = e.target.dataset.action;
                if (options.onButton) {
                    options.onButton(action);
                }
                this.hideModal(modal);
            }
        });
        
        // Animate in
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        return modal;
    }

    /**
     * Hide modal
     * @param {Element} modal - Modal element
     */
    hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} User choice
     */
    async confirm(message, options = {}) {
        return new Promise((resolve) => {
            this.showModal(
                options.title || 'Potvrzení',
                `<p>${this.escapeHtml(message)}</p>`,
                {
                    buttons: [
                        {
                            text: options.cancelText || 'Zrušit',
                            action: 'cancel',
                            class: 'secondary'
                        },
                        {
                            text: options.confirmText || 'OK',
                            action: 'confirm',
                            class: 'primary'
                        }
                    ],
                    onButton: (action) => {
                        resolve(action === 'confirm');
                    }
                }
            );
        });
    }

    /**
     * Toggle dropdown menu
     * @param {string} menuId - Menu element ID
     */
    toggleDropdown(menuId) {
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }

    /**
     * Escape HTML
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Shuffle array
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format date
     * @param {Date|string} date - Date to format
     * @param {boolean} includeTime - Include time
     * @returns {string} Formatted date
     */
    formatDate(date, includeTime = false) {
        const d = date instanceof Date ? date : new Date(date);
        const dateFormat = configManager.get('app.ui.display.dateFormat') || 'DD.MM.YYYY';
        const timeFormat = configManager.get('app.ui.display.timeFormat') || 'HH:mm';
        
        // Simple formatting (can be enhanced)
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        
        let formatted = `${day}.${month}.${year}`;
        if (includeTime) {
            formatted += ` ${hours}:${minutes}`;
        }
        
        return formatted;
    }

    /**
     * Show progress bar
     * @param {string} id - Progress bar ID
     * @param {string} label - Progress label
     * @returns {Object} Progress bar controller
     */
    showProgress(id, label) {
        const container = document.createElement('div');
        container.id = id;
        container.className = 'progress-container';
        container.innerHTML = `
            <div class="progress-label">${this.escapeHtml(label)}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-text">0%</div>
        `;
        
        this.messageContainer.appendChild(container);
        
        return {
            update: (percent, newLabel) => {
                const fill = container.querySelector('.progress-fill');
                const text = container.querySelector('.progress-text');
                const label = container.querySelector('.progress-label');
                
                if (fill) fill.style.width = `${percent}%`;
                if (text) text.textContent = `${Math.round(percent)}%`;
                if (newLabel && label) label.textContent = newLabel;
            },
            remove: () => {
                if (container.parentNode) {
                    container.remove();
                }
            }
        };
    }

    /**
     * Initialize help system
     */
    initializeHelp() {
        // Add help button handler
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-help]')) {
                const helpKey = e.target.dataset.help;
                this.showHelp(helpKey);
            }
        });
        
        // F1 key for general help
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp('general');
            }
        });
    }

    /**
     * Show help
     * @param {string} helpKey - Help topic key
     */
    showHelp(helpKey) {
        const helpTopics = {
            general: {
                title: 'Jak používat My Connect AI',
                content: `
                    <h4>Základní použití</h4>
                    <p>My Connect AI vám pomáhá rychle vyhledávat a analyzovat data z vašeho CRM systému.</p>
                    
                    <h4>Typy dotazů</h4>
                    <ul>
                        <li><strong>Počítání:</strong> "Kolik firem máme?"</li>
                        <li><strong>Výpisy:</strong> "Vypiš všechny kontakty"</li>
                        <li><strong>Vyhledávání:</strong> "Najdi firmu Alza"</li>
                        <li><strong>Analýzy:</strong> "Jaké aktivity proběhly tento týden?"</li>
                    </ul>
                    
                    <h4>Klávesové zkratky</h4>
                    <ul>
                        <li><kbd>Enter</kbd> - Odeslat dotaz</li>
                        <li><kbd>Shift + Enter</kbd> - Nový řádek</li>
                        <li><kbd>Esc</kbd> - Zavřít dialogové okno</li>
                        <li><kbd>F1</kbd> - Zobrazit nápovědu</li>
                    </ul>
                `
            },
            search: {
                title: 'Tipy pro vyhledávání',
                content: `
                    <h4>Efektivní vyhledávání</h4>
                    <ul>
                        <li>Používejte <strong>uvozovky</strong> pro přesné fráze: "Jan Novák"</li>
                        <li>Velká písmena nejsou důležitá</li>
                        <li>Systém automaticky hledá podobné výrazy</li>
                    </ul>
                    
                    <h4>Příklady</h4>
                    <ul>
                        <li>"Alza" - najde přesně Alza</li>
                        <li>alza - najde Alza, alza.cz, atd.</li>
                        <li>Jan Novák - najde různé kombinace</li>
                    </ul>
                `
            }
        };
        
        const topic = helpTopics[helpKey] || helpTopics.general;
        
        this.showModal(topic.title, topic.content, {
            buttons: [{
                text: 'Zavřít',
                action: 'close',
                class: 'primary'
            }]
        });
    }

    /**
     * Show onboarding for new users
     */
    showOnboarding() {
        const steps = [
            {
                title: 'Vítejte v My Connect AI!',
                content: 'Rychlý průvodce vám ukáže základní funkce.',
                target: null
            },
            {
                title: 'Příklady dotazů',
                content: 'Klikněte na kterýkoliv příklad pro rychlé vyzkoušení.',
                target: '.example-queries'
            },
            {
                title: 'Zadávání dotazů',
                content: 'Sem napište svůj dotaz a stiskněte Enter.',
                target: '#chat-input'
            },
            {
                title: 'Nastavení',
                content: 'Zde můžete změnit AI model, téma a další nastavení.',
                target: '.menu-button'
            }
        ];
        
        let currentStep = 0;
        
        const showStep = (index) => {
            const step = steps[index];
            
            // Remove previous highlights
            document.querySelectorAll('.onboarding-highlight').forEach(el => {
                el.classList.remove('onboarding-highlight');
            });
            
            // Highlight target
            if (step.target) {
                const target = document.querySelector(step.target);
                if (target) {
                    target.classList.add('onboarding-highlight');
                }
            }
            
            // Show tooltip
            this.showModal(step.title, `
                <p>${step.content}</p>
                <div class="onboarding-progress">
                    Krok ${index + 1} z ${steps.length}
                </div>
            `, {
                buttons: [
                    {
                        text: 'Přeskočit',
                        action: 'skip',
                        class: 'secondary'
                    },
                    {
                        text: index < steps.length - 1 ? 'Další' : 'Dokončit',
                        action: 'next',
                        class: 'primary'
                    }
                ],
                onButton: (action) => {
                    if (action === 'next' && index < steps.length - 1) {
                        showStep(index + 1);
                    } else {
                        // Cleanup
                        document.querySelectorAll('.onboarding-highlight').forEach(el => {
                            el.classList.remove('onboarding-highlight');
                        });
                        localStorage.setItem('onboardingCompleted', 'true');
                    }
                }
            });
        };
        
        // Start onboarding if not completed
        if (!localStorage.getItem('onboardingCompleted')) {
            showStep(0);
        }
    }

    /**
     * Update UI state
     * @param {string} state - UI state (ready/loading/error)
     */
    updateState(state) {
        document.body.dataset.uiState = state;
        
        switch (state) {
            case 'loading':
                this.setInputEnabled(false);
                this.setSendButtonText('Zpracovávám...');
                break;
            case 'ready':
                this.setInputEnabled(true);
                this.setSendButtonText(configManager.get('app.ui.buttons.send') || 'Odeslat');
                break;
            case 'error':
                this.setInputEnabled(true);
                this.setSendButtonText(configManager.get('app.ui.buttons.send') || 'Odeslat');
                break;
        }
    }
}
