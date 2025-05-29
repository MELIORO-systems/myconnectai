/**
 * AI Base Connector - My Connect AI v2.0
 * Abstract base class for all AI providers
 */

import { configManager } from './core-config.js';
import { securityManager } from './core-security.js';

export class AIBaseConnector {
    constructor(providerName) {
        if (new.target === AIBaseConnector) {
            throw new Error('AIBaseConnector is abstract and cannot be instantiated directly');
        }
        
        this.providerName = providerName;
        this.config = null;
        this._initialized = false;
    }

    /**
     * Initialize the provider
     */
    async init() {
        if (this._initialized) return;
        
        try {
            // Load configuration
            this.config = configManager.getProviderConfig('ai', this.providerName);
            
            if (!this.config || !this.config.enabled) {
                throw new Error(`Provider ${this.providerName} is not enabled`);
            }
            
            this._initialized = true;
            console.log(`✅ ${this.providerName} AI provider initialized`);
            
        } catch (error) {
            console.error(`❌ ${this.providerName} initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Format message using AI - MUST BE IMPLEMENTED BY SUBCLASS
     * @param {string} query - User query
     * @param {Object} context - Context from local search
     * @returns {Promise<string>} Formatted response
     */
    async formatMessage(query, context) {
        throw new Error('formatMessage must be implemented by subclass');
    }

    /**
     * Test connection to AI service - MUST BE IMPLEMENTED BY SUBCLASS
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        throw new Error('testConnection must be implemented by subclass');
    }

    /**
     * Get API key for this provider
     * @returns {Promise<string|null>} API key
     */
    async getApiKey() {
        return await securityManager.loadSecure(`ai_${this.providerName}_key`);
    }

    /**
     * Save API key for this provider
     * @param {string} apiKey - API key to save
     */
    async saveApiKey(apiKey) {
        if (!this.validateApiKey(apiKey)) {
            throw new Error('Invalid API key format');
        }
        
        await securityManager.saveSecure(`ai_${this.providerName}_key`, apiKey);
    }

    /**
     * Validate API key format
     * @param {string} apiKey - API key to validate
     * @returns {boolean}
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        
        const prefix = this.config?.apiKeyPrefix;
        if (prefix && !apiKey.startsWith(prefix)) {
            return false;
        }
        
        return true;
    }

    /**
     * Check if provider is configured
     * @returns {Promise<boolean>}
     */
    async isConfigured() {
        const apiKey = await this.getApiKey();
        return !!apiKey && this.validateApiKey(apiKey);
    }

    /**
     * Build prompt from template
     * @param {string} query - User query
     * @param {Object} context - Context data
     * @param {Object} prompts - Prompt configuration
     * @returns {string} Built prompt
     */
    buildPrompt(query, context, prompts) {
        let template = '';
        
        // Select appropriate template based on context type
        switch (context.type) {
            case 'detail':
            case 'get_details':
                template = prompts.templates?.detailFormat || prompts.templates?.default;
                break;
            case 'related':
            case 'find_related':
                template = prompts.templates?.relatedFormat || prompts.templates?.default;
                break;
            case 'search':
            case 'search_specific':
                template = prompts.templates?.searchFormat || prompts.templates?.default;
                break;
            default:
                template = prompts.templates?.default || 'User query: {query}\n\nContext: {context}';
        }
        
        // Replace placeholders
        let prompt = template
            .replace('{query}', query)
            .replace('{data}', JSON.stringify(context.data || context.record || context.results, null, 2))
            .replace('{mainRecord}', JSON.stringify(context.mainRecord, null, 2))
            .replace('{relatedData}', JSON.stringify(context.relatedData, null, 2))
            .replace('{results}', JSON.stringify(context.results || context.searchResults, null, 2))
            .replace('{context}', JSON.stringify(context, null, 2));
        
        return prompt;
    }

    /**
     * Get provider metadata
     * @returns {Object}
     */
    getMetadata() {
        return {
            name: this.config?.name || this.providerName,
            model: this.config?.model,
            maxTokens: this.config?.maxTokens,
            temperature: this.config?.temperature,
            apiUrl: this.config?.apiUrl,
            getApiKeyUrl: this.config?.getApiKeyUrl
        };
    }

    /**
     * Get system prompt
     * @returns {string}
     */
    getSystemPrompt() {
        return this.config?.prompts?.system || 'You are a helpful AI assistant.';
    }

    /**
     * Handle API errors
     * @param {Error} error - API error
     * @param {Response} response - Fetch response
     * @returns {Error} Formatted error
     */
    handleAPIError(error, response = null) {
        if (response) {
            const status = response.status;
            
            if (status === 401) {
                return new Error('Invalid API key. Please check your configuration.');
            } else if (status === 429) {
                return new Error('Rate limit exceeded. Please try again later.');
            } else if (status === 500) {
                return new Error('AI service error. Please try again.');
            } else {
                return new Error(`API error: ${status} ${response.statusText}`);
            }
        }
        
        if (error.message.includes('fetch')) {
            return new Error('Network error. Please check your connection.');
        }
        
        return error;
    }

    /**
     * Log debug information
     * @param {string} message - Debug message
     * @param {*} data - Additional data
     */
    debug(message, data = null) {
        if (configManager.isDebugMode()) {
            console.log(`[${this.providerName}]`, message, data || '');
        }
    }

    /**
     * Measure API call performance
     * @param {Function} apiCall - API call function
     * @returns {Promise<Object>} Result with timing
     */
    async measurePerformance(apiCall) {
        const startTime = performance.now();
        
        try {
            const result = await apiCall();
            const duration = performance.now() - startTime;
            
            this.debug(`API call completed in ${duration.toFixed(2)}ms`);
            
            return {
                success: true,
                result,
                duration
            };
        } catch (error) {
            const duration = performance.now() - startTime;
            
            this.debug(`API call failed after ${duration.toFixed(2)}ms`, error);
            
            return {
                success: false,
                error,
                duration
            };
        }
    }

    /**
     * Get usage statistics (if supported)
     * @returns {Promise<Object>}
     */
    async getUsageStats() {
        // Override in subclass if provider supports usage tracking
        return {
            supported: false,
            message: 'Usage statistics not supported by this provider'
        };
    }

    /**
     * Clear provider cache
     */
    clearCache() {
        // Override in subclass if provider uses caching
        this.debug('Cache cleared');
    }
}
