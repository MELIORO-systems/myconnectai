/**
 * Core Main - My Connect AI v2.0
 * Main application orchestrator
 */

import { configManager } from './core-config.js';
import { securityManager } from './core-security.js';
import { providerRegistry } from './provider-registry.js';
import { UIManager } from './ui-manager.js';
import { QueryProcessor } from './core-query-processor.js';
import { SetupWizard } from './wizard-setup.js';

class Application {
    constructor() {
        this.uiManager = null;
        this.queryProcessor = null;
        this.setupWizard = null;
        this.crmData = null;
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🚀 My Connect AI v2.0 starting...');
            
            // Show loading indicator
            this.showLoadingScreen();
            
            // Initialize core systems
            await this.initializeCoreSystems();
            
            // Check for existing configuration
            const hasConfig = await this.checkConfiguration();
            
            if (!hasConfig) {
                // First time setup
                await this.startSetupWizard();
            } else {
                // Normal startup
                await this.startApplication();
            }
            
            this.initialized = true;
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showErrorScreen(error);
        }
    }

    /**
     * Initialize core systems
     */
    async initializeCoreSystems() {
        // 1. Load configurations
        await configManager.loadAll();
        
        // 2. Initialize security
        await securityManager.init();
        
        // 3. Initialize provider registry
        await providerRegistry.init();
        
        // 4. Initialize UI manager
        this.uiManager = new UIManager();
        await this.uiManager.init();
        
        // 5. Check for v1 data migration
        await this.migrateV1Data();
    }

    /**
     * Check if application is configured
     * @returns {Promise<boolean>}
     */
    async checkConfiguration() {
        // Check for at least one AI provider
        const aiProviders = providerRegistry.getProviders('ai');
        let hasAIConfig = false;
        
        for (const provider of aiProviders) {
            const instance = await providerRegistry.getInstance('ai', provider);
            if (await instance.isConfigured()) {
                hasAIConfig = true;
                break;
            }
        }
        
        // Check for at least one CRM provider
        const crmProviders = providerRegistry.getProviders('crm');
        let hasCRMConfig = false;
        
        for (const provider of crmProviders) {
            const instance = await providerRegistry.getInstance('crm', provider);
            if (await instance.isConfigured()) {
                hasCRMConfig = true;
                break;
            }
        }
        
        return hasAIConfig && hasCRMConfig;
    }

    /**
     * Start setup wizard
     */
    async startSetupWizard() {
        console.log('🧙 Starting setup wizard...');
        
        this.setupWizard = new SetupWizard();
        await this.setupWizard.start();
        
        // Listen for wizard completion
        this.setupWizard.on('complete', async () => {
            await this.startApplication();
        });
    }

    /**
     * Start main application
     */
    async startApplication() {
        console.log('🎯 Starting main application...');
        
        // Load CRM data
        await this.loadCRMData();
        
        // Initialize query processor
        this.queryProcessor = new QueryProcessor(this.crmData);
        await this.queryProcessor.init();
        
        // Setup message handling
        this.setupMessageHandling();
        
        // Show welcome screen
        this.uiManager.showWelcomeScreen();
    }

    /**
     * Load data from all active CRM providers
     */
    async loadCRMData() {
        this.uiManager.showLoadingMessage('Načítám data z CRM systémů...');
        
        const activeCRMs = await providerRegistry.getActiveCRMProviders();
        this.crmData = {};
        
        for (const crm of activeCRMs) {
            try {
                const data = await crm.loadData();
                
                // Merge data from multiple CRMs
                for (const [key, value] of Object.entries(data)) {
                    if (!this.crmData[key]) {
                        this.crmData[key] = value;
                    } else {
                        // Handle merging if multiple CRMs have same table types
                        console.warn(`Duplicate table ${key} from multiple CRMs`);
                    }
                }
                
                console.log(`✅ Loaded data from ${crm.providerName}`);
            } catch (error) {
                console.error(`Failed to load data from ${crm.providerName}:`, error);
                this.uiManager.showError(`Nelze načíst data z ${crm.providerName}`);
            }
        }
        
        const stats = this.getDataStatistics();
        console.log('📊 Data loaded:', stats);
    }

    /**
     * Setup message handling
     */
    setupMessageHandling() {
        // Handle send button click
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.handleSendMessage());
        }
        
        // Handle enter key in input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.handleSendMessage();
                }
            });
        }
    }

    /**
     * Handle sending a message
     */
    async handleSendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Clear input and show user message
        chatInput.value = '';
        this.uiManager.addMessage('user', message);
        
        try {
            // Process query locally
            const result = await this.queryProcessor.processQuery(message);
            
            // Check if AI formatting is needed and available
            if (result.useAI) {
                const aiProvider = await providerRegistry.getActiveAIProvider();
                
                if (await aiProvider.isConfigured()) {
                    // Format with AI
                    const formattedResponse = await aiProvider.formatMessage(message, result);
                    this.uiManager.addMessage('assistant', formattedResponse);
                } else {
                    // No AI configured, use local response
                    this.uiManager.addMessage('assistant', result.response);
                }
            } else {
                // Use local response
                this.uiManager.addMessage('assistant', result.response);
            }
            
        } catch (error) {
            console.error('Error processing message:', error);
            this.uiManager.addMessage('error', 'Omlouvám se, nastala chyba při zpracování dotazu.');
        }
    }

    /**
     * Get data statistics
     * @returns {Object}
     */
    getDataStatistics() {
        const stats = {
            total: 0,
            byType: {},
            byTable: {}
        };
        
        for (const [tableId, tableData] of Object.entries(this.crmData)) {
            const count = tableData.recordCount || 0;
            stats.total += count;
            stats.byTable[tableData.name || tableId] = count;
            
            if (tableData.type) {
                stats.byType[tableData.type] = (stats.byType[tableData.type] || 0) + count;
            }
        }
        
        return stats;
    }

    /**
     * Migrate data from v1 if present
     */
    async migrateV1Data() {
        const migrationMap = {
            'openai_key': { type: 'ai', provider: 'openai', key: 'apiKey' },
            'gemini_key': { type: 'ai', provider: 'gemini', key: 'apiKey' },
            'claude_key': { type: 'ai', provider: 'claude', key: 'apiKey' },
            'tabidoo_token': { type: 'crm', provider: 'tabidoo', key: 'apiToken' },
            'tabidoo_app_id': { type: 'crm', provider: 'tabidoo', key: 'appId' }
        };
        
        let migrated = false;
        
        for (const [oldKey, mapping] of Object.entries(migrationMap)) {
            const oldValue = localStorage.getItem(`secure_${oldKey}`);
            
            if (oldValue) {
                // Migrate to new format
                const newKey = `${mapping.type}_${mapping.provider}_${mapping.key}`;
                
                if (!localStorage.getItem(`secure_${newKey}`)) {
                    localStorage.setItem(`secure_${newKey}`, oldValue);
                    console.log(`✅ Migrated ${oldKey} to new format`);
                    migrated = true;
                }
            }
        }
        
        // Migrate selected AI model
        const oldSelectedModel = localStorage.getItem('selected_ai_model');
        if (oldSelectedModel && !localStorage.getItem('selected_ai_provider')) {
            localStorage.setItem('selected_ai_provider', oldSelectedModel);
            migrated = true;
        }
        
        if (migrated) {
            console.log('✅ V1 data migration completed');
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Inicializuji My Connect AI...</div>
                </div>
            `;
        }
    }

    /**
     * Show error screen
     * @param {Error} error - Error to display
     */
    showErrorScreen(error) {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">❌</div>
                    <div class="error-title">Chyba při spuštění</div>
                    <div class="error-message">${error.message}</div>
                    <button class="retry-button" onclick="location.reload()">
                        Zkusit znovu
                    </button>
                </div>
            `;
        }
    }

    /**
     * Reload application
     */
    async reload() {
        this.initialized = false;
        this.crmData = null;
        
        // Clear provider instances
        providerRegistry.clearInstances();
        
        // Reload configurations
        await configManager.reload();
        
        // Reinitialize
        await this.init();
    }

    /**
     * Export application state
     * @returns {Object}
     */
    exportState() {
        return {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            providers: {
                ai: providerRegistry.getProviders('ai'),
                crm: providerRegistry.getProviders('crm')
            },
            dataStats: this.getDataStatistics(),
            theme: this.uiManager?.getCurrentTheme()
        };
    }
}

// Create global application instance
const app = new Application();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    // DOM already loaded
    app.init();
}

// Export for global access
window.MyConnectAI = {
    app: app,
    version: '2.0.0',
    reload: () => app.reload(),
    getStats: () => app.getDataStatistics(),
    exportState: () => app.exportState(),
    
    // For debugging
    debug: {
        getProviders: () => providerRegistry.listAll(),
        getConfig: () => configManager.getAll(),
        testProvider: (type, name) => providerRegistry.testProvider(type, name)
    }
};
