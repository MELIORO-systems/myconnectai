My Connect AI v2.0 - System Architecture
🎯 Přehled systému
My Connect AI je hybridní systém kombinující lokální zpracování dat s AI asistencí. Umožňuje připojení k různým CRM systémům (aktuálně Tabidoo) a využívá různé AI modely (OpenAI, Gemini, Claude) pro inteligentní odpovědi.
Klíčové vlastnosti:

Modulární architektura - snadné přidávání nových AI a CRM providerů
Lokální zpracování - rychlé vyhledávání bez čekání na API
Flexibilní konfigurace - vše důležité v JSON souborech
Bezpečné - API klíče šifrované lokálně v prohlížeči

📁 Struktura souborů
Dokumentace

SYSTEM-ARCHITECTURE.md - tento soubor, hlavní dokumentace
CHANGELOG.md - historie změn a verzí

Core systém

core-main.js - hlavní orchestrátor, inicializace aplikace
core-config.js - správa konfigurace, načítání JSON souborů
core-security.js - šifrování API klíčů, bezpečnostní funkce
core-query-processor.js - analýza a zpracování uživatelských dotazů
core-search-engine.js - lokální vyhledávání v načtených datech
core-display.js - formátování a zobrazování výsledků

Konfigurace

config-app.json - obecné nastavení aplikace (název, verze, UI)
config-example-queries.json - příklady dotazů pro úvodní obrazovku
config-providers-ai.json - konfigurace AI providerů včetně promptů
config-providers-crm.json - konfigurace CRM systémů včetně mapování

AI Providers

ai-base-connector.js - abstraktní třída definující AI rozhraní
ai-openai-connector.js - implementace pro OpenAI (ChatGPT)
ai-gemini-connector.js - implementace pro Google Gemini
ai-claude-connector.js - implementace pro Anthropic Claude

CRM Providers

crm-base-connector.js - abstraktní třída definující CRM rozhraní
crm-tabidoo-connector.js - implementace pro Tabidoo
crm-hubspot-connector.js - připraveno pro HubSpot
crm-salesforce-connector.js - připraveno pro Salesforce

UI a témata

ui-manager.js - správa UI, event handling, zobrazení zpráv
theme-base.css - základní styly a CSS proměnné
theme-claude.css - Claude téma (výchozí)
theme-google.css - Google Material téma
theme-replit.css - tmavé vývojářské téma

Ostatní

provider-registry.js - centrální registr všech providerů
wizard-setup.js - průvodce prvním nastavením
wizard-setup.css - styly pro průvodce

🏗️ Architektonické principy
1. Provider Pattern
Každý AI a CRM provider implementuje společné rozhraní definované v base třídě:
javascript// AI Provider musí implementovat:
class MyAIProvider extends AIBaseConnector {
    async formatMessage(query, context) { }
    async testConnection() { }
}

// CRM Provider musí implementovat:
class MyCRMProvider extends CRMBaseConnector {
    async connect() { }
    async loadData() { }
    async saveData(data) { }
    async testConnection() { }
}
2. Registry Pattern
Všichni providers se registrují centrálně:
javascript// V provider-registry.js
ProviderRegistry.register('ai', 'openai', OpenAIConnector);
ProviderRegistry.register('crm', 'tabidoo', TabidooConnector);
3. Configuration-Driven
Veškerá konfigurace je v JSON souborech, ne v kódu:

Prompty pro AI
Mapování polí pro CRM
UI texty a nastavení

4. Event-Driven Communication
Moduly komunikují přes events, ne přímými voláními:
javascript// Publikovat event
EventBus.emit('data-loaded', { provider: 'tabidoo', records: 150 });

// Poslouchat event
EventBus.on('data-loaded', (data) => {
    console.log(`Loaded ${data.records} records from ${data.provider}`);
});
🔧 Přidání nového provideru
Nový AI Provider

Vytvořit soubor ai-mynewai-connector.js:

javascriptimport { AIBaseConnector } from './ai-base-connector.js';

export class MyNewAIConnector extends AIBaseConnector {
    constructor() {
        super('mynewai');
    }
    
    async formatMessage(query, context) {
        const config = await this.getConfig();
        const apiKey = this.getApiKey();
        
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                prompt: this.buildPrompt(query, context, config.prompts),
                max_tokens: config.maxTokens,
                temperature: config.temperature
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return this.extractResponse(data);
    }
    
    async testConnection() {
        try {
            const response = await this.formatMessage('Test', { type: 'test' });
            return { success: true, message: 'Connected successfully' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    extractResponse(data) {
        // Specifická logika pro extrakci odpovědi
        return data.response || data.text || '';
    }
}

Přidat konfiguraci do config-providers-ai.json:

json{
    "mynewai": {
        "name": "My New AI",
        "enabled": true,
        "apiUrl": "https://api.mynewai.com/v1/complete",
        "model": "mynewai-turbo",
        "maxTokens": 1000,
        "temperature": 0.3,
        "apiKeyPrefix": "key-",
        "getApiKeyUrl": "https://mynewai.com/api-keys",
        "prompts": {
            "system": "You are a helpful assistant for My Connect AI CRM system. Answer in Czech.",
            "templates": {
                "detailFormat": "User asked: \"{query}\"\n\nFound data:\n{data}",
                "relatedFormat": "Main record: {mainRecord}\n\nRelated data: {relatedData}",
                "searchFormat": "Relevant records:\n{results}"
            }
        }
    }
}

Registrovat v provider-registry.js:

javascriptimport { MyNewAIConnector } from './ai-mynewai-connector.js';
ProviderRegistry.register('ai', 'mynewai', MyNewAIConnector);
Nový CRM Provider

Vytvořit soubor crm-mynewcrm-connector.js:

javascriptimport { CRMBaseConnector } from './crm-base-connector.js';

export class MyNewCRMConnector extends CRMBaseConnector {
    constructor() {
        super('mynewcrm');
    }
    
    async connect() {
        const config = await this.getConfig();
        this.apiUrl = config.apiBaseUrl;
        this.connected = true;
    }
    
    async loadData() {
        if (!this.connected) await this.connect();
        
        const config = await this.getConfig();
        const apiKey = this.getApiKey();
        const data = {};
        
        // Načíst data pro každý typ entity
        for (const entity of config.entities) {
            const response = await fetch(`${this.apiUrl}/${entity.endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (response.ok) {
                const records = await response.json();
                data[entity.type] = {
                    name: entity.name,
                    records: this.normalizeRecords(records, entity)
                };
            }
        }
        
        return data;
    }
    
    normalizeRecords(records, entityConfig) {
        // Normalizace dat podle mapování
        return records.map(record => ({
            id: record[entityConfig.idField],
            fields: this.mapFields(record, entityConfig.fieldMapping)
        }));
    }
}

Přidat konfiguraci do config-providers-crm.json:

json{
    "mynewcrm": {
        "name": "My New CRM",
        "enabled": true,
        "apiBaseUrl": "https://api.mynewcrm.com/v2",
        "recordsLimit": 100,
        "entities": [
            {
                "type": "company",
                "name": "Companies",
                "endpoint": "companies",
                "idField": "id",
                "fieldMapping": {
                    "name": "company_name",
                    "email": "primary_email",
                    "phone": "primary_phone"
                }
            }
        ]
    }
}
🚀 Inicializace aplikace
1. index.html načte core-main.js
2. core-main.js:
   - Načte konfiguraci přes core-config.js
   - Inicializuje security manager
   - Registruje všechny providery
   - Načte uložené API klíče
   - Spustí UI manager
3. Pokud nejsou API klíče → spustí wizard-setup.js
4. Jinak → zobrazí úvodní obrazovku s příklady
Inicializační flow v kódu:
javascript// core-main.js
async function init() {
    try {
        // 1. Načíst konfiguraci
        await ConfigManager.loadAll();
        
        // 2. Inicializovat security
        SecurityManager.init();
        
        // 3. Registrovat providery
        await ProviderRegistry.loadAll();
        
        // 4. Kontrola API klíčů
        const hasRequiredKeys = await checkApiKeys();
        
        if (!hasRequiredKeys) {
            // 5a. Spustit wizard
            WizardSetup.start();
        } else {
            // 5b. Načíst data a spustit UI
            await loadCRMData();
            UIManager.showWelcomeScreen();
        }
    } catch (error) {
        UIManager.showError('Initialization failed', error);
    }
}
🔒 Bezpečnost
Principy

API klíče NIKDY v kódu nebo commitech
Vše se šifruje lokálně přes core-security.js
Použití Web Crypto API pro šifrování
Klíče uloženy pouze v localStorage

Implementace
javascript// core-security.js
class SecurityManager {
    async encrypt(text) {
        const key = await this.getOrCreateKey();
        const encoded = new TextEncoder().encode(text);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoded
        );
        
        return {
            data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }
    
    async decrypt(encrypted) {
        const key = await this.getOrCreateKey();
        const data = Uint8Array.from(atob(encrypted.data), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );
        
        return new TextDecoder().decode(decrypted);
    }
}
📝 Konvence kódování
Názvy souborů

Lowercase s pomlčkami: my-new-file.js
Prefix podle typu: ai-, crm-, core-, config-, theme-

JavaScript
javascript// ✅ Správně
export class MyClass {
    constructor() {
        this._privateVar = 'private';
        this.publicVar = 'public';
    }
    
    async publicMethod() {
        return await this._privateMethod();
    }
    
    _privateMethod() {
        return this._privateVar;
    }
}

// ❌ Špatně
function MyClass() {
    var privateVar = 'private';
    this.publicMethod = function(callback) {
        callback(privateVar);
    };
}
CSS
css/* ✅ Správně - BEM metodika */
.chat-container {
    display: flex;
}

.chat-container__header {
    background: var(--surface-color);
}

.chat-container__header--active {
    background: var(--primary-color);
}

/* ❌ Špatně */
.chat-container .header.active {
    background: #c96442;
}
Dokumentace
javascript/**
 * Formats AI response based on query and context
 * @param {string} query - User's original query
 * @param {Object} context - Context data from local search
 * @param {string} context.type - Type of query (search, detail, etc.)
 * @param {Object} context.data - Actual data found
 * @returns {Promise<string>} Formatted response
 * @throws {Error} If API call fails
 */
async formatMessage(query, context) {
    // Implementation
}
🐛 Debugging
Debug mode
javascript// Zapnout debug mode
localStorage.setItem('DEBUG_MODE', 'true');

// V kódu
if (localStorage.getItem('DEBUG_MODE') === 'true') {
    console.log('[DEBUG]', 'Loading data...', data);
}
Užitečné debug funkce
javascript// Zobrazit všechny registry
window.debugRegistry = () => ProviderRegistry.listAll();

// Zobrazit konfiguraci
window.debugConfig = () => ConfigManager.getAll();

// Test konkrétního provideru
window.debugProvider = async (type, name) => {
    const provider = ProviderRegistry.get(type, name);
    return await provider.testConnection();
};
🔄 Migrace z v1
Automatická migrace při prvním spuštění

Detekce staré konfigurace v localStorage
Mapování starých klíčů na nové
Zachování funkčnosti OpenAI a Tabidoo

Mapování konfigurace
javascriptconst migrationMap = {
    'openai_key': 'secure_ai_openai_key',
    'tabidoo_token': 'secure_crm_tabidoo_token',
    'tabidoo_app_id': 'secure_crm_tabidoo_appid',
    'selected_ai_model': 'config_selected_ai_provider',
    'selectedAppTheme': 'config_selected_theme'
};
📊 Datové struktury
Formát dat z CRM
javascript{
    "companies": {
        "name": "Firmy",
        "records": [
            {
                "id": "rec123",
                "fields": {
                    "name": "Alza.cz",
                    "email": "info@alza.cz",
                    "phone": "+420123456789",
                    "address": "Praha 7"
                }
            }
        ]
    },
    "contacts": {
        "name": "Kontakty",
        "records": [...]
    }
}
Formát query result
javascript{
    "type": "search|count|detail|list",
    "query": "Najdi firmu Alza",
    "results": [...],
    "count": 1,
    "response": "Našel jsem 1 firmu odpovídající 'Alza'",
    "useAI": true,
    "context": {
        "provider": "tabidoo",
        "searchTime": 15
    }
}
🌐 Podpora pro více jazyků (budoucí rozšíření)
Struktura pro lokalizaci:
config-lang-cs.json    # Čeština (výchozí)
config-lang-en.json    # Angličtina
config-lang-sk.json    # Slovenština
📚 Další zdroje

GitHub: [link na repozitář]
Dokumentace API: Odkazy na dokumentaci jednotlivých služeb

Tento dokument je živý a bude aktualizován s každou významnou změnou v architektuře.
