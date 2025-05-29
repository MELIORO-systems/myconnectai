/**
 * CRM Base Connector - My Connect AI v2.0
 * Abstract base class for all CRM providers
 */

import { configManager } from './core-config.js';
import { securityManager } from './core-security.js';

export class CRMBaseConnector {
    constructor(providerName) {
        if (new.target === CRMBaseConnector) {
            throw new Error('CRMBaseConnector is abstract and cannot be instantiated directly');
        }
        
        this.providerName = providerName;
        this.config = null;
        this.connected = false;
        this.cachedData = null;
        this.cacheTimestamp = null;
        this._initialized = false;
    }

    /**
     * Initialize the provider
     */
    async init() {
        if (this._initialized) return;
        
        try {
            // Load configuration
            this.config = configManager.getProviderConfig('crm', this.providerName);
            
            if (!this.config || !this.config.enabled) {
                throw new Error(`Provider ${this.providerName} is not enabled`);
            }
            
            this._initialized = true;
            console.log(`✅ ${this.providerName} CRM provider initialized`);
            
        } catch (error) {
            console.error(`❌ ${this.providerName} initialization failed:`, error);
            throw error;
        }
    }

    /**
     * Connect to CRM service - MUST BE IMPLEMENTED BY SUBCLASS
     * @returns {Promise<void>}
     */
    async connect() {
        throw new Error('connect must be implemented by subclass');
    }

    /**
     * Load data from CRM - MUST BE IMPLEMENTED BY SUBCLASS
     * @param {Object} options - Load options
     * @returns {Promise<Object>} Loaded data
     */
    async loadData(options = {}) {
        throw new Error('loadData must be implemented by subclass');
    }

    /**
     * Save data to CRM - MUST BE IMPLEMENTED BY SUBCLASS
     * @param {Object} data - Data to save
     * @returns {Promise<Object>} Save result
     */
    async saveData(data) {
        throw new Error('saveData must be implemented by subclass');
    }

    /**
     * Test connection to CRM service - MUST BE IMPLEMENTED BY SUBCLASS
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        throw new Error('testConnection must be implemented by subclass');
    }

    /**
     * Get all required credentials for this provider
     * @returns {Array<string>} Required credential keys
     */
    getRequiredCredentials() {
        // Override in subclass to specify required credentials
        return ['apiToken'];
    }

    /**
     * Get credential for this provider
     * @param {string} key - Credential key
     * @returns {Promise<string|null>} Credential value
     */
    async getCredential(key) {
        return await securityManager.loadSecure(`crm_${this.providerName}_${key}`);
    }

    /**
     * Save credential for this provider
     * @param {string} key - Credential key
     * @param {string} value - Credential value
     */
    async saveCredential(key, value) {
        await securityManager.saveSecure(`crm_${this.providerName}_${key}`, value);
    }

    /**
     * Get all credentials
     * @returns {Promise<Object>} All credentials
     */
    async getAllCredentials() {
        const credentials = {};
        const required = this.getRequiredCredentials();
        
        for (const key of required) {
            credentials[key] = await this.getCredential(key);
        }
        
        return credentials;
    }

    /**
     * Check if provider is configured
     * @returns {Promise<boolean>}
     */
    async isConfigured() {
        const required = this.getRequiredCredentials();
        
        for (const key of required) {
            const value = await this.getCredential(key);
            if (!value) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get cached data if available and not expired
     * @returns {Object|null} Cached data
     */
    getCachedData() {
        if (!this.cachedData || !this.cacheTimestamp) {
            return null;
        }
        
        const cacheAge = Date.now() - this.cacheTimestamp;
        const maxAge = (this.config?.cacheHours || 24) * 60 * 60 * 1000;
        
        if (cacheAge > maxAge) {
            this.clearCache();
            return null;
        }
        
        return this.cachedData;
    }

    /**
     * Set cached data
     * @param {Object} data - Data to cache
     */
    setCachedData(data) {
        this.cachedData = data;
        this.cacheTimestamp = Date.now();
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cachedData = null;
        this.cacheTimestamp = null;
        this.debug('Cache cleared');
    }

    /**
     * Get provider metadata
     * @returns {Object}
     */
    getMetadata() {
        return {
            name: this.config?.name || this.providerName,
            apiBaseUrl: this.config?.apiBaseUrl,
            recordsLimit: this.config?.recordsLimit,
            tables: this.config?.tables || [],
            fieldMappings: this.config?.fieldMappings || {}
        };
    }

    /**
     * Normalize record structure
     * @param {Object} record - Raw record from CRM
     * @param {Object} mapping - Field mapping configuration
     * @returns {Object} Normalized record
     */
    normalizeRecord(record, mapping = {}) {
        const normalized = {
            id: record.id || record._id || null,
            fields: {}
        };
        
        // Apply field mapping
        for (const [standardField, crmField] of Object.entries(mapping)) {
            if (record[crmField] !== undefined) {
                normalized.fields[standardField] = record[crmField];
            }
        }
        
        // Include unmapped fields
        for (const [field, value] of Object.entries(record)) {
            if (!Object.values(mapping).includes(field) && !field.startsWith('_')) {
                normalized.fields[field] = value;
            }
        }
        
        return normalized;
    }

    /**
     * Get record count from data structure
     * @param {*} data - Data structure from API
     * @returns {number} Record count
     */
    getRecordCount(data) {
        if (Array.isArray(data)) {
            return data.length;
        } else if (data && typeof data === 'object') {
            if (data.items && Array.isArray(data.items)) {
                return data.items.length;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data.length;
            } else if (data.records && Array.isArray(data.records)) {
                return data.records.length;
            } else if (data.results && Array.isArray(data.results)) {
                return data.results.length;
            }
        }
        return 0;
    }

    /**
     * Extract actual records from API response
     * @param {*} data - API response
     * @returns {Array} Records array
     */
    extractRecords(data) {
        if (Array.isArray(data)) {
            return data;
        } else if (data && typeof data === 'object') {
            if (data.items && Array.isArray(data.items)) {
                return data.items;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            } else if (data.records && Array.isArray(data.records)) {
                return data.records;
            } else if (data.results && Array.isArray(data.results)) {
                return data.results;
            }
        }
        return [];
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
                return new Error('Authentication failed. Please check your credentials.');
            } else if (status === 403) {
                return new Error('Access denied. Check your permissions.');
            } else if (status === 404) {
                return new Error('Resource not found.');
            } else if (status === 429) {
                return new Error('Rate limit exceeded. Please try again later.');
            } else if (status >= 500) {
                return new Error('CRM service error. Please try again.');
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
     * Get table configuration
     * @param {string} tableId - Table ID
     * @returns {Object|null} Table configuration
     */
    getTableConfig(tableId) {
        if (!this.config?.tables) {
            return null;
        }
        
        return this.config.tables.find(table => table.id === tableId) || null;
    }

    /**
     * Get all table configurations
     * @returns {Array} Table configurations
     */
    getAllTables() {
        return this.config?.tables || [];
    }

    /**
     * Find table by type
     * @param {string} type - Entity type (company, contact, etc.)
     * @returns {Object|null} Table configuration
     */
    findTableByType(type) {
        if (!this.config?.tables) {
            return null;
        }
        
        return this.config.tables.find(table => table.type === type) || null;
    }

    /**
     * Map field names based on configuration
     * @param {Object} data - Data with original field names
     * @param {string} direction - 'toStandard' or 'fromStandard'
     * @returns {Object} Data with mapped field names
     */
    mapFields(data, direction = 'toStandard') {
        const mappings = this.config?.fieldMappings || {};
        const mapped = {};
        
        if (direction === 'toStandard') {
            // Map from CRM fields to standard fields
            for (const [field, value] of Object.entries(data)) {
                const standardField = Object.keys(mappings).find(key => mappings[key] === field);
                mapped[standardField || field] = value;
            }
        } else {
            // Map from standard fields to CRM fields
            for (const [field, value] of Object.entries(data)) {
                const crmField = mappings[field];
                mapped[crmField || field] = value;
            }
        }
        
        return mapped;
    }

    /**
     * Get statistics about loaded data
     * @returns {Object} Statistics
     */
    getDataStats() {
        if (!this.cachedData) {
            return {
                total: 0,
                byType: {}
            };
        }
        
        const stats = {
            total: 0,
            byType: {}
        };
        
        for (const [key, tableData] of Object.entries(this.cachedData)) {
            const count = this.getRecordCount(tableData.data || tableData);
            stats.total += count;
            stats.byType[key] = count;
        }
        
        return stats;
    }
}
