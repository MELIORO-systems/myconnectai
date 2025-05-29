/**
 * Tabidoo CRM Connector - My Connect AI v2.0
 * Implementation of CRM connector for Tabidoo
 */

import { CRMBaseConnector } from './crm-base-connector.js';

export default class TabidooConnector extends CRMBaseConnector {
    constructor() {
        super('tabidoo');
        this.appId = null;
    }

    /**
     * Get required credentials for Tabidoo
     * @returns {Array<string>}
     */
    getRequiredCredentials() {
        return ['apiToken', 'appId'];
    }

    /**
     * Connect to Tabidoo service
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.connected) return;
        
        const credentials = await this.getAllCredentials();
        
        if (!credentials.apiToken || !credentials.appId) {
            throw new Error('Tabidoo API token and App ID are required');
        }
        
        this.appId = credentials.appId;
        
        // Test connection
        try {
            const response = await fetch(
                `${this.config.apiBaseUrl}/apps/${this.appId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                throw this.handleAPIError(
                    new Error('Failed to connect to Tabidoo'),
                    response
                );
            }
            
            const appData = await response.json();
            this.connected = true;
            
            this.debug('Connected to Tabidoo', {
                appId: this.appId,
                appName: appData.name
            });
            
        } catch (error) {
            this.connected = false;
            throw error;
        }
    }

    /**
     * Load data from Tabidoo
     * @param {Object} options - Load options
     * @returns {Promise<Object>} Loaded data
     */
    async loadData(options = {}) {
        // Check cache first
        const cached = this.getCachedData();
        if (cached && !options.forceRefresh) {
            this.debug('Returning cached data');
            return cached;
        }
        
        if (!this.connected) {
            await this.connect();
        }
        
        const credentials = await this.getAllCredentials();
        const tables = this.getAllTables();
        const loadedData = {};
        
        this.debug(`Loading data from ${tables.length} tables`);
        
        for (const table of tables) {
            try {
                this.debug(`Loading table: ${table.name} (${table.id})`);
                
                const url = `${this.config.apiBaseUrl}/apps/${this.appId}/tables/${table.id}/data`;
                const params = new URLSearchParams({
                    limit: options.limit || this.config.recordsLimit || 100
                });
                
                const response = await fetch(`${url}?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${credentials.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.warn(`Failed to load table ${table.name}: ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                const recordCount = this.getRecordCount(data);
                
                loadedData[table.id] = {
                    name: table.name,
                    type: table.type,
                    data: data,
                    recordCount: recordCount
                };
                
                this.debug(`Loaded ${recordCount} records from ${table.name}`);
                
            } catch (error) {
                console.error(`Error loading table ${table.name}:`, error);
            }
        }
        
        // Cache the loaded data
        this.setCachedData(loadedData);
        
        const stats = this.getDataStats();
        this.debug('Data loading complete', stats);
        
        return loadedData;
    }

    /**
     * Save data to Tabidoo (not implemented yet)
     * @param {Object} data - Data to save
     * @returns {Promise<Object>} Save result
     */
    async saveData(data) {
        throw new Error('Save functionality not implemented yet');
    }

    /**
     * Test connection to Tabidoo
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        try {
            const credentials = await this.getAllCredentials();
            
            if (!credentials.apiToken || !credentials.appId) {
                return {
                    success: false,
                    message: 'Missing required credentials'
                };
            }
            
            this.debug('Testing Tabidoo connection');
            
            const response = await fetch(
                `${this.config.apiBaseUrl}/apps/${credentials.appId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    message: `API error: ${response.status} - ${errorText}`
                };
            }
            
            const appData = await response.json();
            
            return {
                success: true,
                message: 'Connection successful',
                appName: appData.name,
                appId: credentials.appId
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get specific table data
     * @param {string} tableId - Table ID
     * @returns {Object|null} Table data
     */
    getTableData(tableId) {
        if (!this.cachedData) {
            return null;
        }
        
        return this.cachedData[tableId] || null;
    }

    /**
     * Get records by entity type
     * @param {string} entityType - Entity type (company, contact, etc.)
     * @returns {Array} Records
     */
    getRecordsByType(entityType) {
        if (!this.cachedData) {
            return [];
        }
        
        // Find table by type
        const table = this.findTableByType(entityType);
        if (!table) {
            return [];
        }
        
        const tableData = this.cachedData[table.id];
        if (!tableData) {
            return [];
        }
        
        return this.extractRecords(tableData.data);
    }

    /**
     * Search records across all tables
     * @param {string} query - Search query
     * @returns {Array} Search results
     */
    searchRecords(query) {
        if (!this.cachedData) {
            return [];
        }
        
        const results = [];
        const searchLower = query.toLowerCase();
        
        for (const [tableId, tableData] of Object.entries(this.cachedData)) {
            const records = this.extractRecords(tableData.data);
            const tableConfig = this.getTableConfig(tableId);
            
            for (const record of records) {
                const fields = record.fields || record;
                let matchFound = false;
                
                // Search in all string fields
                for (const [field, value] of Object.entries(fields)) {
                    if (typeof value === 'string' && value.toLowerCase().includes(searchLower)) {
                        matchFound = true;
                        break;
                    }
                }
                
                if (matchFound) {
                    results.push({
                        record: record,
                        table: tableConfig?.name || tableId,
                        type: tableConfig?.type || 'unknown'
                    });
                }
            }
        }
        
        return results;
    }

    /**
     * Get field value with proper formatting
     * @param {*} value - Field value
     * @param {string} fieldName - Field name
     * @returns {*} Formatted value
     */
    getFieldValue(value, fieldName) {
        if (!value) return '';
        
        // Handle Tabidoo reference fields
        if (typeof value === 'object' && value.fields) {
            // This is a reference to another record
            if (value.fields.name) return value.fields.name;
            if (value.fields.nazev) return value.fields.nazev;
            if (value.fields.title) return value.fields.title;
            
            // Try to find any name-like field
            const nameFields = ['jmeno', 'prijmeni', 'company', 'email'];
            for (const field of nameFields) {
                if (value.fields[field]) {
                    return value.fields[field];
                }
            }
            
            return 'Reference';
        }
        
        // Handle email fields
        if (typeof value === 'object' && value.href && value.isMailto) {
            return value.href.replace('mailto:', '');
        }
        
        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(item => this.getFieldValue(item, fieldName)).join(', ');
        }
        
        return String(value);
    }

    /**
     * Validate Tabidoo API token format
     * @param {string} token - API token
     * @returns {boolean}
     */
    validateApiToken(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        
        // Tabidoo tokens are JWT tokens
        return token.startsWith('eyJ') && token.split('.').length === 3;
    }

    /**
     * Get table schema (if needed for future features)
     * @param {string} tableId - Table ID
     * @returns {Promise<Object>} Table schema
     */
    async getTableSchema(tableId) {
        if (!this.connected) {
            await this.connect();
        }
        
        const credentials = await this.getAllCredentials();
        
        try {
            const response = await fetch(
                `${this.config.apiBaseUrl}/apps/${this.appId}/tables/${tableId}/schema`,
                {
                    headers: {
                        'Authorization': `Bearer ${credentials.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Failed to get schema: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`Error getting schema for table ${tableId}:`, error);
            return null;
        }
    }

    /**
     * Get record by ID
     * @param {string} tableId - Table ID
     * @param {string} recordId - Record ID
     * @returns {Object|null} Record
     */
    getRecordById(tableId, recordId) {
        const tableData = this.getTableData(tableId);
        if (!tableData) {
            return null;
        }
        
        const records = this.extractRecords(tableData.data);
        return records.find(record => record.id === recordId) || null;
    }
}
