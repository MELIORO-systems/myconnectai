/**
 * Core Query Processor - My Connect AI v2.0
 * Analyzes and processes user queries
 */

import { SearchEngine } from './core-search-engine.js';
import { configManager } from './core-config.js';

export class QueryProcessor {
    constructor(crmData) {
        this.crmData = crmData;
        this.searchEngine = null;
        this.queryPatterns = this.loadQueryPatterns();
        this._initialized = false;
    }

    /**
     * Initialize the query processor
     */
    async init() {
        if (this._initialized) return;
        
        try {
            // Initialize search engine
            this.searchEngine = new SearchEngine(this.crmData);
            await this.searchEngine.buildIndex();
            
            this._initialized = true;
            console.log('✅ Query Processor initialized');
            
        } catch (error) {
            console.error('❌ Query Processor initialization failed:', error);
            throw error;
        }
    }

    /**
     * Process user query
     * @param {string} query - User query
     * @returns {Promise<Object>} Processing result
     */
    async processQuery(query) {
        console.log('🧠 Processing query:', query);
        
        try {
            // Analyze query type and extract parameters
            const analysis = this.analyzeQuery(query);
            console.log('📊 Query analysis:', analysis);
            
            // Process based on query type
            let result;
            switch (analysis.type) {
                case 'count':
                    result = await this.handleCountQuery(analysis);
                    break;
                case 'list':
                    result = await this.handleListQuery(analysis);
                    break;
                case 'search':
                    result = await this.handleSearchQuery(analysis);
                    break;
                case 'detail':
                    result = await this.handleDetailQuery(analysis);
                    break;
                case 'related':
                    result = await this.handleRelatedQuery(analysis);
                    break;
                case 'analysis':
                    result = await this.handleAnalysisQuery(analysis);
                    break;
                case 'system':
                    result = await this.handleSystemQuery(analysis);
                    break;
                default:
                    result = await this.handleGeneralQuery(analysis);
            }
            
            console.log('✅ Query processed:', result.type);
            return result;
            
        } catch (error) {
            console.error('❌ Query processing error:', error);
            return {
                type: 'error',
                error: error.message,
                response: 'Omlouvám se, nastala chyba při zpracování dotazu.',
                useAI: false
            };
        }
    }

    /**
     * Analyze query to determine type and extract parameters
     * @param {string} query - User query
     * @returns {Object} Query analysis
     */
    analyzeQuery(query) {
        const lowerQuery = query.toLowerCase().trim();
        const analysis = {
            originalQuery: query,
            normalizedQuery: lowerQuery,
            type: 'general',
            entity: null,
            entityName: null,
            action: null,
            parameters: {},
            confidence: 0
        };
        
        // Extract entity type
        analysis.entity = this.extractEntityType(lowerQuery);
        
        // Check each pattern type
        for (const [type, patterns] of Object.entries(this.queryPatterns)) {
            for (const pattern of patterns) {
                const match = lowerQuery.match(pattern.regex);
                if (match) {
                    analysis.type = type;
                    analysis.confidence = pattern.confidence || 0.8;
                    
                    // Extract parameters from regex groups
                    if (pattern.extract) {
                        analysis.parameters = pattern.extract(match);
                    }
                    
                    // Extract entity name if needed
                    if (pattern.needsEntityName) {
                        analysis.entityName = this.extractEntityName(query, analysis.entity);
                    }
                    
                    return analysis;
                }
            }
        }
        
        // If no pattern matched but we have an entity name, it's probably a search
        analysis.entityName = this.extractEntityName(query, analysis.entity);
        if (analysis.entityName) {
            analysis.type = 'search';
            analysis.confidence = 0.6;
        }
        
        return analysis;
    }

    /**
     * Load query patterns
     * @returns {Object} Query patterns
     */
    loadQueryPatterns() {
        return {
            count: [
                {
                    regex: /kolik\s+(\w+)\s*(je|máme|existuje|je v systému)/i,
                    confidence: 0.9,
                    extract: (match) => ({ entity: match[1] })
                },
                {
                    regex: /počet\s+(\w+)/i,
                    confidence: 0.9,
                    extract: (match) => ({ entity: match[1] })
                },
                {
                    regex: /jaký je počet\s+(\w+)/i,
                    confidence: 0.9,
                    extract: (match) => ({ entity: match[1] })
                }
            ],
            list: [
                {
                    regex: /vypiš\s+(všechny\s+)?(\w+)/i,
                    confidence: 0.9,
                    extract: (match) => ({ all: true, entity: match[2] })
                },
                {
                    regex: /zobraz\s+(seznam\s+)?(\w+)/i,
                    confidence: 0.9,
                    extract: (match) => ({ entity: match[2] })
                },
                {
                    regex: /ukaž\s+(mi\s+)?(všechny\s+)?(\w+)/i,
                    confidence: 0.9,
                    extract: (match) => ({ entity: match[3] })
                },
                {
                    regex: /jaké\s+(\w+)\s+(to\s+)?jsou/i,
                    confidence: 0.8,
                    extract: (match) => ({ entity: match[1] })
                }
            ],
            search: [
                {
                    regex: /najdi\s+(\w+)\s+(.+)/i,
                    confidence: 0.9,
                    needsEntityName: true,
                    extract: (match) => ({ entity: match[1], query: match[2] })
                },
                {
                    regex: /vyhledej\s+(\w+)\s+(.+)/i,
                    confidence: 0.9,
                    needsEntityName: true,
                    extract: (match) => ({ entity: match[1], query: match[2] })
                },
                {
                    regex: /hledám\s+(\w+)\s+(.+)/i,
                    confidence: 0.8,
                    needsEntityName: true,
                    extract: (match) => ({ entity: match[1], query: match[2] })
                }
            ],
            detail: [
                {
                    regex: /(detaily?|informace|údaje)\s+o\s+(.+)/i,
                    confidence: 0.9,
                    needsEntityName: true,
                    extract: (match) => ({ query: match[2] })
                },
                {
                    regex: /co víš o\s+(.+)/i,
                    confidence: 0.8,
                    needsEntityName: true,
                    extract: (match) => ({ query: match[1] })
                }
            ],
            related: [
                {
                    regex: /jaké\s+(\w+)\s+má\s+(.+)/i,
                    confidence: 0.9,
                    needsEntityName: true,
                    extract: (match) => ({ relatedEntity: match[1], query: match[2] })
                },
                {
                    regex: /zobraz\s+(\w+)\s+(?:firmy|osoby|kontaktu)\s+(.+)/i,
                    confidence: 0.9,
                    needsEntityName: true,
                    extract: (match) => ({ relatedEntity: match[1], query: match[2] })
                }
            ],
            system: [
                {
                    regex: /jak\s+(systém\s+)?funguje/i,
                    confidence: 0.9,
                    extract: () => ({ action: 'help' })
                },
                {
                    regex: /jakou\s+verzi/i,
                    confidence: 0.9,
                    extract: () => ({ action: 'version' })
                },
                {
                    regex: /zobraz\s+statistiky/i,
                    confidence: 0.9,
                    extract: () => ({ action: 'stats' })
                }
            ]
        };
    }

    /**
     * Extract entity type from query
     * @param {string} query - Query text
     * @returns {string|null} Entity type
     */
    extractEntityType(query) {
        const crmConfig = configManager.getCRMProvidersConfig();
        const tables = crmConfig.providers?.tabidoo?.tables || [];
        
        for (const table of tables) {
            if (table.keywords) {
                for (const keyword of table.keywords) {
                    if (query.includes(keyword)) {
                        return table.type;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Extract entity name from query
     * @param {string} query - Original query
     * @param {string} entityType - Entity type
     * @returns {string|null} Entity name
     */
    extractEntityName(query, entityType) {
        // Remove common words and entity type keywords
        const crmConfig = configManager.getCRMProvidersConfig();
        const tables = crmConfig.providers?.tabidoo?.tables || [];
        const table = tables.find(t => t.type === entityType);
        
        let cleanQuery = query;
        
        // Remove entity keywords
        if (table && table.keywords) {
            for (const keyword of table.keywords) {
                cleanQuery = cleanQuery.replace(new RegExp(keyword, 'gi'), '');
            }
        }
        
        // Remove common action words
        const actionWords = ['najdi', 'vyhledej', 'zobraz', 'ukaž', 'vypiš', 'hledám', 'jaké', 'kolik', 'detail', 'informace'];
        for (const word of actionWords) {
            cleanQuery = cleanQuery.replace(new RegExp(word, 'gi'), '');
        }
        
        // Extract potential entity name (capitalized words or quoted text)
        const quotedMatch = cleanQuery.match(/"([^"]+)"/);
        if (quotedMatch) {
            return quotedMatch[1];
        }
        
        const capitalizedMatch = cleanQuery.match(/[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+(\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+)*/);
        if (capitalizedMatch) {
            return capitalizedMatch[0];
        }
        
        // If nothing found, return cleaned query
        cleanQuery = cleanQuery.trim();
        return cleanQuery.length > 1 ? cleanQuery : null;
    }

    /**
     * Handle count query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleCountQuery(analysis) {
        const stats = this.searchEngine.getStatistics();
        const entityType = analysis.entity;
        
        let count = 0;
        let entityLabel = 'záznamů';
        
        if (entityType && stats.byType[entityType] !== undefined) {
            count = stats.byType[entityType];
            entityLabel = this.getEntityLabel(entityType, count);
        } else {
            count = stats.total;
        }
        
        return {
            type: 'count',
            entity: entityType,
            count: count,
            response: `V databázi je celkem **${count} ${entityLabel}**.`,
            useAI: false,
            confidence: analysis.confidence
        };
    }

    /**
     * Handle list query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleListQuery(analysis) {
        const entityType = analysis.entity;
        const records = this.searchEngine.getAllRecords(entityType);
        
        const displayConfig = configManager.get('app.ui.display');
        const maxRecords = displayConfig?.maxRecordsToShow || 20;
        
        return {
            type: 'list',
            entity: entityType,
            records: records,
            totalCount: records.length,
            displayCount: Math.min(records.length, maxRecords),
            response: this.formatRecordsList(records, entityType, maxRecords),
            useAI: false,
            confidence: analysis.confidence
        };
    }

    /**
     * Handle search query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleSearchQuery(analysis) {
        const searchTerm = analysis.entityName || analysis.parameters.query;
        const entityType = analysis.entity;
        
        const results = this.searchEngine.search(searchTerm, {
            type: entityType,
            fuzzy: true,
            limit: 10
        });
        
        if (results.length === 0) {
            return {
                type: 'search',
                query: searchTerm,
                found: false,
                response: configManager.getText('noResults', { query: searchTerm }),
                useAI: false,
                confidence: analysis.confidence
            };
        }
        
        // If single result, return detail view
        if (results.length === 1) {
            return {
                type: 'detail',
                entity: entityType,
                record: results[0].record,
                response: this.formatDetailedRecord(results[0].record),
                useAI: true,
                confidence: analysis.confidence
            };
        }
        
        return {
            type: 'search',
            query: searchTerm,
            results: results,
            found: true,
            response: this.formatSearchResults(results, searchTerm),
            useAI: results.length > 3,
            confidence: analysis.confidence
        };
    }

    /**
     * Handle detail query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleDetailQuery(analysis) {
        const searchTerm = analysis.entityName;
        const results = this.searchEngine.search(searchTerm, {
            type: analysis.entity,
            limit: 1
        });
        
        if (results.length === 0) {
            return {
                type: 'detail',
                found: false,
                response: `Nenašel jsem žádné informace o "${searchTerm}".`,
                useAI: false,
                confidence: analysis.confidence
            };
        }
        
        const record = results[0].record;
        
        return {
            type: 'detail',
            entity: analysis.entity,
            record: record,
            response: this.formatDetailedRecord(record),
            useAI: true,
            confidence: analysis.confidence
        };
    }

    /**
     * Handle related query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleRelatedQuery(analysis) {
        const searchTerm = analysis.entityName;
        const mainResults = this.searchEngine.search(searchTerm, {
            type: analysis.entity,
            limit: 1
        });
        
        if (mainResults.length === 0) {
            return {
                type: 'related',
                found: false,
                response: `Nenašel jsem "${searchTerm}" pro zobrazení souvisejících dat.`,
                useAI: false,
                confidence: analysis.confidence
            };
        }
        
        const mainRecord = mainResults[0].record;
        const relatedType = analysis.parameters.relatedEntity;
        const relatedRecords = this.searchEngine.findRelated(mainRecord, analysis.entity, relatedType);
        
        return {
            type: 'related',
            mainRecord: mainRecord,
            relatedType: relatedType,
            relatedRecords: relatedRecords,
            response: this.formatRelatedRecords(mainRecord, relatedRecords, relatedType),
            useAI: true,
            confidence: analysis.confidence
        };
    }

    /**
     * Handle system query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleSystemQuery(analysis) {
        const action = analysis.parameters.action;
        
        switch (action) {
            case 'help':
                return {
                    type: 'system',
                    action: 'help',
                    response: this.getHelpText(),
                    useAI: false,
                    confidence: 1.0
                };
            case 'version':
                return {
                    type: 'system',
                    action: 'version',
                    response: `Používáte **${configManager.get('app.app.name')} v${configManager.get('app.app.version')}**`,
                    useAI: false,
                    confidence: 1.0
                };
            case 'stats':
                const stats = this.searchEngine.getStatistics();
                return {
                    type: 'system',
                    action: 'stats',
                    stats: stats,
                    response: this.formatStatistics(stats),
                    useAI: false,
                    confidence: 1.0
                };
            default:
                return this.handleGeneralQuery(analysis);
        }
    }

    /**
     * Handle general query
     * @param {Object} analysis - Query analysis
     * @returns {Promise<Object>} Result
     */
    async handleGeneralQuery(analysis) {
        // Try full-text search
        const results = this.searchEngine.search(analysis.originalQuery, {
            fuzzy: true,
            limit: 10
        });
        
        if (results.length > 0) {
            return {
                type: 'general',
                query: analysis.originalQuery,
                results: results,
                response: this.formatSearchResults(results, analysis.originalQuery),
                useAI: true,
                confidence: 0.5
            };
        }
        
        return {
            type: 'general',
            response: 'Nerozuměl jsem vašemu dotazu. Zkuste se zeptat konkrétněji nebo použijte příklady z úvodní obrazovky.',
            useAI: false,
            confidence: 0.1
        };
    }

    /**
     * Format records list
     * @param {Array} records - Records to format
     * @param {string} entityType - Entity type
     * @param {number} maxRecords - Maximum records to show
     * @returns {string} Formatted list
     */
    formatRecordsList(records, entityType, maxRecords) {
        if (!records || records.length === 0) {
            return 'Nenašel jsem žádné záznamy.';
        }
        
        const entityLabel = this.getEntityLabel(entityType, records.length);
        let output = `**Nalezeno ${records.length} ${entityLabel}:**\n\n`;
        
        const displayRecords = records.slice(0, maxRecords);
        
        displayRecords.forEach((record, index) => {
            const name = this.getRecordName(record);
            const preview = this.getRecordPreview(record);
            output += `${index + 1}. **${name}**`;
            if (preview) {
                output += ` - ${preview}`;
            }
            output += '\n';
        });
        
        if (records.length > maxRecords) {
            output += `\n... a dalších ${records.length - maxRecords} záznamů.`;
        }
        
        return output;
    }

    /**
     * Format search results
     * @param {Array} results - Search results
     * @param {string} query - Search query
     * @returns {string} Formatted results
     */
    formatSearchResults(results, query) {
        if (!results || results.length === 0) {
            return `Nenašel jsem žádné výsledky pro "${query}".`;
        }
        
        let output = `**Výsledky vyhledávání pro "${query}":**\n\n`;
        
        results.forEach((result, index) => {
            const name = this.getRecordName(result.record);
            const type = this.getEntityLabel(result.type, 1);
            const score = Math.round(result.score * 100);
            
            output += `${index + 1}. **${name}** (${type}, shoda: ${score}%)\n`;
        });
        
        return output;
    }

    /**
     * Format detailed record
     * @param {Object} record - Record to format
     * @returns {string} JSON representation for AI formatting
     */
    formatDetailedRecord(record) {
        // Return raw data for AI to format nicely
        return JSON.stringify(record.fields || record, null, 2);
    }

    /**
     * Format related records
     * @param {Object} mainRecord - Main record
     * @param {Array} relatedRecords - Related records
     * @param {string} relatedType - Type of related records
     * @returns {string} Formatted output
     */
    formatRelatedRecords(mainRecord, relatedRecords, relatedType) {
        const mainName = this.getRecordName(mainRecord);
        const relatedLabel = this.getEntityLabel(relatedType, relatedRecords.length);
        
        return {
            main: mainRecord,
            related: relatedRecords,
            summary: `${mainName} má ${relatedRecords.length} ${relatedLabel}.`
        };
    }

    /**
     * Format statistics
     * @param {Object} stats - Statistics object
     * @returns {string} Formatted statistics
     */
    formatStatistics(stats) {
        let output = '**Statistiky systému:**\n\n';
        
        output += `Celkem záznamů: **${stats.total}**\n\n`;
        
        output += 'Podle typu:\n';
        for (const [type, count] of Object.entries(stats.byType)) {
            const label = this.getEntityLabel(type, count);
            output += `- ${label}: **${count}**\n`;
        }
        
        return output;
    }

    /**
     * Get help text
     * @returns {string} Help text
     */
    getHelpText() {
        return `**Co umím:**

📊 **Počítání** - "Kolik firem je v systému?"
📋 **Výpisy** - "Vypiš všechny kontakty"
🔍 **Vyhledávání** - "Najdi firmu Alza"
🔗 **Související data** - "Jaké kontakty má firma Microsoft?"
📈 **Statistiky** - "Zobraz statistiky systému"

**Tipy:**
- Používejte jména s velkým počátečním písmenem
- Pro přesné vyhledávání dejte text do uvozovek
- Můžete kombinovat různé typy dotazů`;
    }

    /**
     * Get entity label in correct form
     * @param {string} type - Entity type
     * @param {number} count - Count for pluralization
     * @returns {string} Correct label
     */
    getEntityLabel(type, count) {
        const labels = {
            company: { 
                1: 'firma', 
                2: 'firmy', 
                5: 'firem' 
            },
            contact: { 
                1: 'kontakt', 
                2: 'kontakty', 
                5: 'kontaktů' 
            },
            activity: { 
                1: 'aktivita', 
                2: 'aktivity', 
                5: 'aktivit' 
            },
            deal: { 
                1: 'obchodní případ', 
                2: 'obchodní případy', 
                5: 'obchodních případů' 
            }
        };
        
        const typeLabels = labels[type] || { 1: 'záznam', 2: 'záznamy', 5: 'záznamů' };
        
        if (count === 1) return typeLabels[1];
        if (count >= 2 && count <= 4) return typeLabels[2];
        return typeLabels[5];
    }

    /**
     * Get record name
     * @param {Object} record - Record object
     * @returns {string} Record name
     */
    getRecordName(record) {
        const fields = record.fields || record;
        
        // Try common name fields
        const nameFields = ['name', 'nazev', 'title', 'jmeno'];
        for (const field of nameFields) {
            if (fields[field]) {
                return String(fields[field]);
            }
        }
        
        // For contacts, try to combine first and last name
        if (fields.jmeno && fields.prijmeni) {
            return `${fields.jmeno} ${fields.prijmeni}`;
        }
        
        return 'Bez názvu';
    }

    /**
     * Get record preview
     * @param {Object} record - Record object
     * @returns {string} Short preview
     */
    getRecordPreview(record) {
        const fields = record.fields || record;
        const previewFields = ['email', 'telefon', 'company', 'value', 'status'];
        const previews = [];
        
        for (const field of previewFields) {
            if (fields[field]) {
                previews.push(String(fields[field]));
                if (previews.length >= 2) break;
            }
        }
        
        return previews.join(', ');
    }
}
