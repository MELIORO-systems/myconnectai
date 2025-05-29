/**
 * Core Configuration Manager - My Connect AI v2.0
 * Manages all configuration loading and access
 */

export class ConfigManager {
    constructor() {
        this.configs = {};
        this.configFiles = [
            'config-app.json',
            'config-providers-ai.json',
            'config-providers-crm.json',
            'config-example-queries.json'
        ];
        this._initialized = false;
    }

    /**
     * Load all configuration files
     */
    async loadAll() {
        if (this._initialized) return;
        
        try {
            console.log('📋 Loading configuration files...');
            
            for (const file of this.configFiles) {
                await this.loadConfig(file);
            }
            
            this._initialized = true;
            console.log('✅ All configurations loaded');
            
        } catch (error) {
            console.error('❌ Failed to load configurations:', error);
            throw error;
        }
    }

    /**
     * Load a single configuration file
     * @param {string} filename - Config file name
     */
    async loadConfig(filename) {
        try {
            const response = await fetch(filename);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const config = await response.json();
            const configName = filename.replace('config-', '').replace('.json', '');
            
            this.configs[configName] = config;
            console.log(`✅ Loaded ${filename}`);
            
        } catch (error) {
            console.error(`❌ Failed to load ${filename}:`, error);
            
            // Use defaults for critical configs
            if (filename === 'config-app.json') {
                this.configs.app = this.getDefaultAppConfig();
                console.warn('Using default app configuration');
            }
            
            throw error;
        }
    }

    /**
     * Get configuration value by path
     * @param {string} path - Dot notation path (e.g., 'app.name')
     * @returns {*} Configuration value
     */
    get(path) {
        const parts = path.split('.');
        let current = this.configs;
        
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        
        return current;
    }

    /**
     * Get entire configuration object
     * @param {string} configName - Configuration name
     * @returns {Object} Configuration object
     */
    getConfig(configName) {
        return this.configs[configName] || {};
    }

    /**
     * Get all configurations
     * @returns {Object} All configurations
     */
    getAll() {
        return { ...this.configs };
    }

    /**
     * Get app configuration
     * @returns {Object}
     */
    getAppConfig() {
        return this.configs.app || this.getDefaultAppConfig();
    }

    /**
     * Get AI providers configuration
     * @returns {Object}
     */
    getAIProvidersConfig() {
        return this.configs['providers-ai'] || {};
    }

    /**
     * Get CRM providers configuration
     * @returns {Object}
     */
    getCRMProvidersConfig() {
        return this.configs['providers-crm'] || {};
    }

    /**
     * Get example queries
     * @returns {Object}
     */
    getExampleQueries() {
        return this.configs['example-queries'] || this.getDefaultExampleQueries();
    }

    /**
     * Get default app configuration
     * @private
     */
    getDefaultAppConfig() {
        return {
            app: {
                name: 'My Connect AI',
                version: '2.0.0',
                company: 'MELIORO Systems',
                website: 'myconnectai.online',
                tagline: 'Hybridní AI Connect systém'
            },
            ui: {
                defaultTheme: 'claude',
                display: {
                    maxRecordsToShow: 20,
                    previewFieldsCount: 5
                }
            }
        };
    }

    /**
     * Get default example queries
     * @private
     */
    getDefaultExampleQueries() {
        return {
            categories: {
                counting: {
                    name: 'Počítání záznamů',
                    queries: [
                        { text: 'Kolik firem je v systému?', icon: '📊' },
                        { text: 'Kolik kontaktů máme?', icon: '👥' }
                    ]
                },
                listing: {
                    name: 'Výpisy',
                    queries: [
                        { text: 'Vypiš všechny firmy', icon: '📋' },
                        { text: 'Vypiš obchodní případy', icon: '💼' }
                    ]
                }
            }
        };
    }

    /**
     * Update configuration value (runtime only, not persisted)
     * @param {string} path - Dot notation path
     * @param {*} value - New value
     */
    set(path, value) {
        const parts = path.split('.');
        const lastPart = parts.pop();
        let current = this.configs;
        
        for (const part of parts) {
            if (!(part in current) || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        
        current[lastPart] = value;
    }

    /**
     * Check if debug mode is enabled
     * @returns {boolean}
     */
    isDebugMode() {
        return this.get('app.debug.enabled') || localStorage.getItem('DEBUG_MODE') === 'true';
    }

    /**
     * Get UI text by key
     * @param {string} key - Message key
     * @param {Object} params - Parameters for replacement
     * @returns {string}
     */
    getText(key, params = {}) {
        let text = this.get(`app.ui.messages.${key}`) || key;
        
        // Replace parameters
        Object.entries(params).forEach(([param, value]) => {
            text = text.replace(`{${param}}`, value);
        });
        
        return text;
    }

    /**
     * Get theme configuration
     * @param {string} themeName - Theme name
     * @returns {Object}
     */
    getThemeConfig(themeName) {
        const themes = this.get('app.ui.availableThemes') || ['claude', 'google', 'replit'];
        
        if (!themes.includes(themeName)) {
            themeName = this.get('app.ui.defaultTheme') || 'claude';
        }
        
        return {
            name: themeName,
            available: themes
        };
    }

    /**
     * Get provider configuration
     * @param {string} type - Provider type (ai/crm)
     * @param {string} name - Provider name
     * @returns {Object}
     */
    getProviderConfig(type, name) {
        const configKey = type === 'ai' ? 'providers-ai' : 'providers-crm';
        return this.get(`${configKey}.providers.${name}`) || {};
    }

    /**
     * Get all enabled providers
     * @param {string} type - Provider type (ai/crm)
     * @returns {Array}
     */
    getEnabledProviders(type) {
        const configKey = type === 'ai' ? 'providers-ai' : 'providers-crm';
        const providers = this.get(`${configKey}.providers`) || {};
        
        return Object.entries(providers)
            .filter(([name, config]) => config.enabled)
            .map(([name, config]) => ({ name, ...config }));
    }

    /**
     * Reload all configurations
     */
    async reload() {
        this.configs = {};
        this._initialized = false;
        await this.loadAll();
    }
}

// Create and export singleton instance
export const configManager = new ConfigManager();

// For backward compatibility with old CONFIG object
window.CONFIG = new Proxy({}, {
    get(target, prop) {
        console.warn(`Accessing CONFIG.${prop} is deprecated. Use configManager.get() instead.`);
        
        // Map old CONFIG properties to new config paths
        const mappings = {
            TABLES: () => configManager.getCRMProvidersConfig().providers?.tabidoo?.tables || [],
            EXAMPLE_QUERIES: () => {
                const queries = configManager.getExampleQueries();
                const allQueries = [];
                Object.values(queries.categories || {}).forEach(category => {
                    allQueries.push(...(category.queries || []));
                });
                return allQueries;
            },
            API: () => ({
                OPENAI: configManager.getProviderConfig('ai', 'openai'),
                TABIDOO: configManager.getProviderConfig('crm', 'tabidoo')
            }),
            DISPLAY: () => configManager.get('app.ui.display') || {},
            MESSAGES: () => configManager.get('app.ui.messages') || {}
        };
        
        if (prop in mappings) {
            return mappings[prop]();
        }
        
        return undefined;
    }
});
