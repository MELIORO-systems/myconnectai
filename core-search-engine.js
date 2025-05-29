/**
 * Core Search Engine - My Connect AI v2.0
 * Fast local search and indexing engine
 */

import { configManager } from './core-config.js';

export class SearchEngine {
    constructor(crmData) {
        this.crmData = crmData;
        this.index = {
            byType: {},
            byId: new Map(),
            fullText: new Map(),
            relationships: new Map()
        };
        this.statistics = {
            total: 0,
            byType: {},
            byTable: {},
            indexingTime: 0
        };
    }

    /**
     * Build search index from CRM data
     */
    async buildIndex() {
        console.log('🔍 Building search index...');
        const startTime = performance.now();
        
        try {
            // Clear existing index
            this.clearIndex();
            
            // Process each table
            for (const [tableId, tableData] of Object.entries(this.crmData)) {
                await this.indexTable(tableId, tableData);
            }
            
            // Build relationship index
            this.buildRelationshipIndex();
            
            const indexingTime = performance.now() - startTime;
            this.statistics.indexingTime = indexingTime;
            
            console.log(`✅ Search index built in ${indexingTime.toFixed(2)}ms`);
            console.log('📊 Index statistics:', this.statistics);
            
        } catch (error) {
            console.error('❌ Index building failed:', error);
            throw error;
        }
    }

    /**
     * Index a single table
     * @param {string} tableId - Table ID
     * @param {Object} tableData - Table data
     */
    async indexTable(tableId, tableData) {
        const records = this.extractRecords(tableData.data);
        const entityType = tableData.type || this.detectEntityType(tableId);
        
        if (!this.index.byType[entityType]) {
            this.index.byType[entityType] = [];
        }
        
        for (const record of records) {
            const indexedRecord = {
                id: record.id || this.generateId(),
                type: entityType,
                tableId: tableId,
                record: record,
                searchText: this.buildSearchText(record, entityType),
                tokens: new Set()
            };
            
            // Add to type index
            this.index.byType[entityType].push(indexedRecord);
            
            // Add to ID index
            this.index.byId.set(indexedRecord.id, indexedRecord);
            
            // Add to full-text index
            this.indexFullText(indexedRecord);
            
            // Update statistics
            this.statistics.total++;
            this.statistics.byType[entityType] = (this.statistics.byType[entityType] || 0) + 1;
        }
        
        this.statistics.byTable[tableData.name || tableId] = records.length;
    }

    /**
     * Build search text from record
     * @param {Object} record - Record to index
     * @param {string} entityType - Entity type
     * @returns {string} Searchable text
     */
    buildSearchText(record, entityType) {
        const fields = record.fields || record;
        const textParts = [];
        
        // Get searchable fields from config
        const tableConfig = this.getTableConfigByType(entityType);
        const searchFields = tableConfig?.searchFields || ['name', 'email', 'title', 'description'];
        
        // Add field values
        for (const field of searchFields) {
            const value = this.getFieldValue(fields[field]);
            if (value) {
                textParts.push(value.toLowerCase());
            }
        }
        
        // Add all string values as fallback
        for (const [key, value] of Object.entries(fields)) {
            if (typeof value === 'string' && !key.startsWith('_')) {
                textParts.push(value.toLowerCase());
            }
        }
        
        return textParts.join(' ');
    }

    /**
     * Index record for full-text search
     * @param {Object} indexedRecord - Indexed record
     */
    indexFullText(indexedRecord) {
        const tokens = this.tokenize(indexedRecord.searchText);
        
        for (const token of tokens) {
            indexedRecord.tokens.add(token);
            
            if (!this.index.fullText.has(token)) {
                this.index.fullText.set(token, new Set());
            }
            this.index.fullText.get(token).add(indexedRecord.id);
        }
    }

    /**
     * Build relationship index
     */
    buildRelationshipIndex() {
        for (const [type, records] of Object.entries(this.index.byType)) {
            for (const indexedRecord of records) {
                const fields = indexedRecord.record.fields || indexedRecord.record;
                
                // Look for reference fields
                for (const [fieldName, fieldValue] of Object.entries(fields)) {
                    if (this.isReferenceField(fieldValue)) {
                        const referencedId = this.extractReferenceId(fieldValue);
                        if (referencedId) {
                            this.addRelationship(indexedRecord.id, referencedId, fieldName);
                        }
                    }
                }
            }
        }
    }

    /**
     * Search records
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results
     */
    search(query, options = {}) {
        const {
            type = null,
            fuzzy = true,
            limit = 10,
            minScore = 0.3
        } = options;
        
        console.log(`🔎 Searching for: "${query}" with options:`, options);
        
        const tokens = this.tokenize(query.toLowerCase());
        const results = new Map();
        
        // Score each record
        const records = type ? (this.index.byType[type] || []) : this.getAllRecords();
        
        for (const indexedRecord of records) {
            const score = this.calculateScore(indexedRecord, tokens, { fuzzy });
            
            if (score >= minScore) {
                results.set(indexedRecord.id, {
                    record: indexedRecord.record,
                    type: indexedRecord.type,
                    score: score,
                    matches: this.getMatches(indexedRecord, tokens)
                });
            }
        }
        
        // Sort by score and limit
        const sortedResults = Array.from(results.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        
        console.log(`✅ Found ${sortedResults.length} results`);
        return sortedResults;
    }

    /**
     * Calculate search score
     * @param {Object} indexedRecord - Indexed record
     * @param {Array} queryTokens - Query tokens
     * @param {Object} options - Scoring options
     * @returns {number} Score between 0 and 1
     */
    calculateScore(indexedRecord, queryTokens, options) {
        let score = 0;
        let matchedTokens = 0;
        
        for (const queryToken of queryTokens) {
            let tokenScore = 0;
            
            // Exact match
            if (indexedRecord.tokens.has(queryToken)) {
                tokenScore = 1;
                matchedTokens++;
            }
            // Fuzzy match
            else if (options.fuzzy) {
                for (const recordToken of indexedRecord.tokens) {
                    const similarity = this.calculateSimilarity(queryToken, recordToken);
                    if (similarity > 0.7) {
                        tokenScore = Math.max(tokenScore, similarity * 0.8);
                    }
                }
                if (tokenScore > 0) matchedTokens++;
            }
            
            score += tokenScore;
        }
        
        // Normalize score
        if (queryTokens.length > 0) {
            score = score / queryTokens.length;
            
            // Boost for matching all tokens
            if (matchedTokens === queryTokens.length) {
                score *= 1.2;
            }
        }
        
        return Math.min(score, 1);
    }

    /**
     * Get all records
     * @param {string} type - Optional entity type filter
     * @returns {Array} All records
     */
    getAllRecords(type = null) {
        if (type && this.index.byType[type]) {
            return this.index.byType[type].map(item => item.record);
        }
        
        const allRecords = [];
        for (const records of Object.values(this.index.byType)) {
            allRecords.push(...records.map(item => item.record));
        }
        
        return allRecords;
    }

    /**
     * Find related records
     * @param {Object} record - Main record
     * @param {string} recordType - Type of main record
     * @param {string} relatedType - Type of related records to find
     * @returns {Array} Related records
     */
    findRelated(record, recordType, relatedType = null) {
        const recordId = record.id || this.findRecordId(record);
        if (!recordId) return [];
        
        const relatedIds = new Set();
        
        // Find relationships from this record
        const relationships = this.index.relationships.get(recordId);
        if (relationships) {
            for (const rel of relationships) {
                if (!relatedType || this.getRecordType(rel.targetId) === relatedType) {
                    relatedIds.add(rel.targetId);
                }
            }
        }
        
        // Find relationships to this record
        for (const [sourceId, rels] of this.index.relationships) {
            for (const rel of rels) {
                if (rel.targetId === recordId) {
                    if (!relatedType || this.getRecordType(sourceId) === relatedType) {
                        relatedIds.add(sourceId);
                    }
                }
            }
        }
        
        // Get full records
        const relatedRecords = [];
        for (const relatedId of relatedIds) {
            const indexedRecord = this.index.byId.get(relatedId);
            if (indexedRecord) {
                relatedRecords.push(indexedRecord.record);
            }
        }
        
        return relatedRecords;
    }

    /**
     * Get statistics
     * @returns {Object} Search engine statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Clear search index
     */
    clearIndex() {
        this.index = {
            byType: {},
            byId: new Map(),
            fullText: new Map(),
            relationships: new Map()
        };
        this.statistics = {
            total: 0,
            byType: {},
            byTable: {},
            indexingTime: 0
        };
    }

    // === Helper Methods ===

    /**
     * Extract records from table data
     * @param {*} data - Table data
     * @returns {Array} Records
     */
    extractRecords(data) {
        if (Array.isArray(data)) {
            return data;
        } else if (data && typeof data === 'object') {
            if (data.items) return data.items;
            if (data.data) return data.data;
            if (data.records) return data.records;
        }
        return [];
    }

    /**
     * Detect entity type from table ID
     * @param {string} tableId - Table ID
     * @returns {string} Entity type
     */
    detectEntityType(tableId) {
        const crmConfig = configManager.getCRMProvidersConfig();
        const tables = crmConfig.providers?.tabidoo?.tables || [];
        const table = tables.find(t => t.id === tableId);
        return table?.type || 'unknown';
    }

    /**
     * Get table config by type
     * @param {string} entityType - Entity type
     * @returns {Object|null} Table config
     */
    getTableConfigByType(entityType) {
        const crmConfig = configManager.getCRMProvidersConfig();
        const tables = crmConfig.providers?.tabidoo?.tables || [];
        return tables.find(t => t.type === entityType);
    }

    /**
     * Get field value as string
     * @param {*} value - Field value
     * @returns {string} String value
     */
    getFieldValue(value) {
        if (!value) return '';
        
        if (typeof value === 'object') {
            if (value.fields) {
                // Reference to another record
                return this.getFieldValue(value.fields.name || value.fields.nazev || value.fields.title);
            }
            if (value.href && value.isMailto) {
                return value.href.replace('mailto:', '');
            }
        }
        
        return String(value);
    }

    /**
     * Tokenize text
     * @param {string} text - Text to tokenize
     * @returns {Array} Tokens
     */
    tokenize(text) {
        // Remove punctuation and split
        const tokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 1);
        
        return [...new Set(tokens)];
    }

    /**
     * Calculate string similarity (Levenshtein)
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Check if field is a reference
     * @param {*} value - Field value
     * @returns {boolean}
     */
    isReferenceField(value) {
        return value && typeof value === 'object' && (value.id || value.fields);
    }

    /**
     * Extract reference ID
     * @param {Object} reference - Reference object
     * @returns {string|null} Referenced ID
     */
    extractReferenceId(reference) {
        if (reference.id) return reference.id;
        if (reference._id) return reference._id;
        return null;
    }

    /**
     * Add relationship
     * @param {string} sourceId - Source record ID
     * @param {string} targetId - Target record ID
     * @param {string} fieldName - Field name
     */
    addRelationship(sourceId, targetId, fieldName) {
        if (!this.index.relationships.has(sourceId)) {
            this.index.relationships.set(sourceId, []);
        }
        
        this.index.relationships.get(sourceId).push({
            targetId: targetId,
            field: fieldName
        });
    }

    /**
     * Get record type by ID
     * @param {string} recordId - Record ID
     * @returns {string|null} Record type
     */
    getRecordType(recordId) {
        const indexedRecord = this.index.byId.get(recordId);
        return indexedRecord?.type || null;
    }

    /**
     * Find record ID
     * @param {Object} record - Record object
     * @returns {string|null} Record ID
     */
    findRecordId(record) {
        // Try to find this record in index
        for (const [id, indexedRecord] of this.index.byId) {
            if (indexedRecord.record === record) {
                return id;
            }
        }
        return record.id || record._id || null;
    }

    /**
     * Get matches for highlighting
     * @param {Object} indexedRecord - Indexed record
     * @param {Array} queryTokens - Query tokens
     * @returns {Array} Matches
     */
    getMatches(indexedRecord, queryTokens) {
        const matches = [];
        const fields = indexedRecord.record.fields || indexedRecord.record;
        
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
            const value = this.getFieldValue(fieldValue).toLowerCase();
            
            for (const token of queryTokens) {
                if (value.includes(token)) {
                    matches.push({
                        field: fieldName,
                        value: fieldValue,
                        match: token
                    });
                }
            }
        }
        
        return matches;
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
