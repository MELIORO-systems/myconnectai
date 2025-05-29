/**
 * Salesforce CRM Connector - My Connect AI v2.0
 * Implementation of CRM connector for Salesforce (Coming Soon)
 */

import { CRMBaseConnector } from './crm-base-connector.js';

export default class SalesforceConnector extends CRMBaseConnector {
    constructor() {
        super('salesforce');
        console.log('⏳ Salesforce connector initialized (Coming Soon)');
    }

    /**
     * Connect to Salesforce service
     * @returns {Promise<void>}
     */
    async connect() {
        throw new Error('Salesforce integration is coming soon');
    }

    /**
     * Load data from Salesforce
     * @param {Object} options - Load options
     * @returns {Promise<Object>} Loaded data
     */
    async loadData(options = {}) {
        throw new Error('Salesforce integration is coming soon');
    }

    /**
     * Save data to Salesforce
     * @param {Object} data - Data to save
     * @returns {Promise<Object>} Save result
     */
    async saveData(data) {
        throw new Error('Salesforce integration is coming soon');
    }

    /**
     * Test connection to Salesforce
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        return {
            success: false,
            message: 'Salesforce integration is coming soon. Stay tuned!'
        };
    }

    /**
     * Get required credentials for Salesforce
     * @returns {Array<string>}
     */
    getRequiredCredentials() {
        return ['clientId', 'clientSecret', 'refreshToken', 'instanceUrl'];
    }
}
