/**
 * Provider Registry - My Connect AI v2.0
 * Central registry for all AI and CRM providers
 */

export class ProviderRegistry {
    constructor() {
        this.providers = {
            ai: new Map(),
            crm: new Map()
        };
        this.instances = {
            ai: new Map(),
            crm: new Map()
        };
        this._initialized = false;
    }

    /**
     * Initialize the registry and load all providers
     */
    async init() {
        if (this._initialized) return;
        
        try {
            console.log('📦 Initializing Provider Registry...');
            
            // Import and register all providers
            await this._loadProviders();
            
            this._initialized = true;
            console.log('✅ Provider Registry initialized');
            
        } catch (error) {
            console.error('❌ Provider Registry initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load all provider modules
     * @private
     */
    async _loadProviders() {
        // AI Providers
        const aiProviders = [
            { name: 'openai', module: './ai-openai-connector.js' },
            { name: 'gemini', module: './ai-gemini-connector.js' },
            { name: 'claude', module: './ai-claude-connector.js' }
        ];
        
        // CRM Providers
        const crmProviders = [
            { name: 'tabidoo', module: './crm-tabidoo-connector.js' },
            { name: 'hubspot', module: './crm-hubspot-connector.js' },
            { name: 'salesforce', module: './crm-salesforce-connector.js' }
        ];
        
        // Load AI providers
        for (const provider of aiProviders) {
            try {
                const module = await import(provider.module);
                const ProviderClass = module.default || module[Object.keys(module)[0]];
                this.register('ai', provider.name, ProviderClass);
            } catch (error) {
                console.warn(`Failed to load AI provider ${provider.name}:`, error);
            }
        }
        
        // Load CRM providers
        for (const provider of crmProviders) {
            try {
                const module = await import(provider.module);
                const ProviderClass = module.default || module[Object.keys(module)[0]];
                this.register('crm', provider.name, ProviderClass);
            } catch (error) {
                console.warn(`Failed to load CRM provider ${provider.name}:`, error);
            }
        }
    }

    /**
     * Register a provider
     * @param {string} type - Provider type (ai/crm)
     * @param {string} name - Provider name
     * @param {Class} ProviderClass - Provider class
     */
    register(type, name, ProviderClass) {
        if (!this.providers[type]) {
            throw new Error(`Invalid provider type: ${type}`);
        }
        
        this.providers[type].set(name, ProviderClass);
        console.log(`✅ Registered ${type} provider: ${name}`);
    }

    /**
     * Get provider instance
     * @param {string} type - Provider type (ai/crm)
     * @param {string} name - Provider name
     * @returns {Object} Provider instance
     */
    async getInstance(type, name) {
        if (!this.providers[type]?.has(name)) {
            throw new Error(`Provider not found: ${type}/${name}`);
        }
        
        // Check if instance already exists
        if (this.instances[type].has(name)) {
            return this.instances[type].get(name);
        }
        
        // Create new instance
        const ProviderClass = this.providers[type].get(name);
        const instance = new ProviderClass();
        
        // Initialize if needed
        if (typeof instance.init === 'function') {
            await instance.init();
        }
        
        // Cache instance
        this.instances[type].set(name, instance);
        
        return instance;
    }

    /**
     * Get all registered providers of a type
     * @param {string} type - Provider type (ai/crm)
     * @returns {Array} Provider names
     */
    getProviders(type) {
        if (!this.providers[type]) {
            return [];
        }
        
        return Array.from(this.providers[type].keys());
    }

    /**
     * Check if provider is registered
     * @param {string} type - Provider type
     * @param {string} name - Provider name
     * @returns {boolean}
     */
    hasProvider(type, name) {
        return this.providers[type]?.has(name) || false;
    }

    /**
     * Get active AI provider based on configuration
     * @returns {Promise<Object>} Active AI provider instance
     */
    async getActiveAIProvider() {
        const selectedProvider = localStorage.getItem('selected_ai_provider') || 'openai';
        
        try {
            return await this.getInstance('ai', selectedProvider);
        } catch (error) {
            console.warn(`Failed to get ${selectedProvider}, falling back to OpenAI`);
            return await this.getInstance('ai', 'openai');
        }
    }

    /**
     * Get active CRM provider(s) based on configuration
     * @returns {Promise<Array>} Active CRM provider instances
     */
    async getActiveCRMProviders() {
        const activeCRM = [];
        
        // For now, just Tabidoo is active
        // In future, this will check configuration for multiple active CRMs
        try {
            const tabidoo = await this.getInstance('crm', 'tabidoo');
            if (await tabidoo.isConfigured()) {
                activeCRM.push(tabidoo);
            }
        } catch (error) {
            console.warn('Failed to get Tabidoo provider:', error);
        }
        
        return activeCRM;
    }

    /**
     * Test connection for a provider
     * @param {string} type - Provider type
     * @param {string} name - Provider name
     * @returns {Promise<Object>} Test result
     */
    async testProvider(type, name) {
        try {
            const provider = await this.getInstance(type, name);
            
            if (typeof provider.testConnection !== 'function') {
                return {
                    success: false,
                    message: 'Provider does not support connection testing'
                };
            }
            
            return await provider.testConnection();
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get provider info
     * @param {string} type - Provider type
     * @param {string} name - Provider name
     * @returns {Object} Provider information
     */
    async getProviderInfo(type, name) {
        try {
            const provider = await this.getInstance(type, name);
            
            return {
                name: provider.name || name,
                type: type,
                configured: await provider.isConfigured(),
                enabled: provider.enabled !== false,
                metadata: provider.getMetadata ? provider.getMetadata() : {}
            };
        } catch (error) {
            return {
                name: name,
                type: type,
                configured: false,
                enabled: false,
                error: error.message
            };
        }
    }

    /**
     * List all providers with their status
     * @returns {Promise<Object>} All providers with status
     */
    async listAll() {
        const result = {
            ai: [],
            crm: []
        };
        
        // List AI providers
        for (const name of this.getProviders('ai')) {
            result.ai.push(await this.getProviderInfo('ai', name));
        }
        
        // List CRM providers
        for (const name of this.getProviders('crm')) {
            result.crm.push(await this.getProviderInfo('crm', name));
        }
        
        return result;
    }

    /**
     * Clear provider instances (for reload)
     */
    clearInstances() {
        this.instances.ai.clear();
        this.instances.crm.clear();
        console.log('🗑️ Provider instances cleared');
    }

    /**
     * Reload providers
     */
    async reload() {
        this.clearInstances();
        this.providers.ai.clear();
        this.providers.crm.clear();
        this._initialized = false;
        await this.init();
    }
}

// Create and export singleton instance
export const providerRegistry = new ProviderRegistry();

// Export for global access
window.ProviderRegistry = providerRegistry;
