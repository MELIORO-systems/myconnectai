// Core Configuration - My Connect AI v2.0
// Pouze základní konfigurace bez vendor specifik

const CORE_CONFIG = {
    // Verze systému
    VERSION: '2.0.0',
    ARCHITECTURE: 'modular',
    
    // Základní nastavení aplikace
    APP: {
        NAME: 'My Connect AI',
        DESCRIPTION: 'Hybridní AI Connect systém s modulární architekturou',
        AUTHOR: 'MELIORO Systems',
        WEBSITE: 'myconnectai.online'
    },
    
    // UI konfigurace
    UI: {
        DEFAULT_THEME: 'claude',
        AVAILABLE_THEMES: ['claude', 'google', 'replit'],
        MAX_MESSAGE_LENGTH: 2000,
        AUTO_SAVE_DELAY: 1000,
        ANIMATION_DURATION: 300
    },
    
    // Zobrazení a limity
    DISPLAY: {
        MAX_RECORDS_TO_SHOW: 20,
        PREVIEW_FIELDS_COUNT: 5,
        MAX_SEARCH_RESULTS: 50,
        PAGINATION_SIZE: 10
    },
    
    // Cache nastavení
    CACHE: {
        DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hodin
        MAX_CACHE_SIZE: 50 * 1024 * 1024,  // 50 MB
        CLEANUP_INTERVAL: 60 * 60 * 1000,   // 1 hodina
        KEYS: {
            PROVIDERS: 'core_providers_cache',
            SETTINGS: 'core_settings_cache',
            THEME: 'core_theme_cache'
        }
    },
    
    // Bezpečnost
    SECURITY: {
        ENCRYPTION_ALGORITHM: 'AES-GCM',
        KEY_DERIVATION: 'PBKDF2',
        SALT_LENGTH: 32,
        IV_LENGTH: 12,
        TAG_LENGTH: 16,
        ITERATIONS: 100000
    },
    
    // Validace
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        URL_REGEX: /^https?:\/\/.+/,
        API_KEY_MIN_LENGTH: 20,
        APP_ID_MIN_LENGTH: 3
    },
    
    // Zprávy a texty
    MESSAGES: {
        LOADING: 'Načítám systém...',
        ERROR_GENERIC: 'Nastala neočekávaná chyba. Zkuste to prosím znovu.',
        ERROR_NETWORK: 'Problém se síťovým připojením. Zkontrolujte internetové připojení.',
        ERROR_CONFIG: 'Chyba v konfiguraci. Zkontrolujte nastavení.',
        SUCCESS_SAVE: 'Nastavení bylo úspěšně uloženo.',
        CONFIRM_DELETE: 'Opravdu chcete vymazat tato data?',
        CONFIRM_REFRESH: 'Opravdu chcete obnovit data?'
    },
    
    // Provider typy a kategorie
    PROVIDERS: {
        TYPES: {
            AI: 'ai',
            CRM: 'crm',
            STORAGE: 'storage',
            ANALYTICS: 'analytics'
        },
        
        STATUS: {
            DISCONNECTED: 'disconnected',
            CONNECTING: 'connecting',
            CONNECTED: 'connected',
            ERROR: 'error',
            DISABLED: 'disabled'
        },
        
        PRIORITY: {
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3
        }
    },
    
    // Query processing
    QUERY: {
        TYPES: {
            COUNT: 'count',
            LIST_ALL: 'list_all',
            SEARCH_SPECIFIC: 'search_specific',
            GET_DETAILS: 'get_details',
            FIND_RELATED: 'find_related',
            SYSTEM: 'system',
            GENERAL: 'general'
        },
        
        ENTITIES: {
            COMPANY: 'company',
            CONTACT: 'contact',
            ACTIVITY: 'activity',
            DEAL: 'deal',
            PROJECT: 'project',
            TASK: 'task'
        },
        
        MIN_SEARCH_LENGTH: 2,
        MAX_RESULTS_PER_TYPE: 10
    },
    
    // Lokalizace
    LOCALIZATION: {
        DEFAULT_LANGUAGE: 'cs',
        SUPPORTED_LANGUAGES: ['cs', 'en'],
        DATE_FORMAT: 'dd.mm.yyyy',
        TIME_FORMAT: 'HH:mm',
        CURRENCY: 'CZK'
    },
    
    // Debug a monitoring
    DEBUG: {
        ENABLED: true,
        LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
        LOG_PERFORMANCE: true,
        LOG_API_CALLS: true,
        LOG_USER_ACTIONS: false
    },
    
    // Feature flags
    FEATURES: {
        EXPERIMENTAL_UI: false,
        ADVANCED_SEARCH: true,
        OFFLINE_MODE: false,
        ANALYTICS: false,
        A_B_TESTING: false
    },
    
    // Performance nastavení
    PERFORMANCE: {
        DEBOUNCE_SEARCH: 300,
        THROTTLE_SCROLL: 100,
        LAZY_LOAD_THRESHOLD: 200,
        MAX_CONCURRENT_REQUESTS: 5
    }
};

// Utility funkce pro práci s konfigurací
class CoreConfigManager {
    constructor() {
        this.config = CORE_CONFIG;
        this.callbacks = new Map();
    }
    
    // Získat hodnotu konfigurace
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let current = this.config;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }
    
    // Nastavit hodnotu konfigurace
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.config;
        
        for (const key of keys) {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // Spustit callbacks
        this.notifyChange(path, value, oldValue);
        
        return true;
    }
    
    // Registrovat callback pro změny
    onChange(path, callback) {
        if (!this.callbacks.has(path)) {
            this.callbacks.set(path, []);
        }
        this.callbacks.get(path).push(callback);
    }
    
    // Notifikovat o změně
    notifyChange(path, newValue, oldValue) {
        const callbacks = this.callbacks.get(path) || [];
        for (const callback of callbacks) {
            try {
                callback(newValue, oldValue, path);
            } catch (error) {
                console.error('Config callback error:', error);
            }
        }
    }
    
    // Validovat konfiguraci
    validate() {
        const errors = [];
        
        // Kontrola povinných hodnot
        const required = [
            'APP.NAME',
            'UI.DEFAULT_THEME',
            'SECURITY.ENCRYPTION_ALGORITHM'
        ];
        
        for (const path of required) {
            if (!this.get(path)) {
                errors.push(`Missing required config: ${path}`);
            }
        }
        
        // Kontrola validních hodnot
        const theme = this.get('UI.DEFAULT_THEME');
        const availableThemes = this.get('UI.AVAILABLE_THEMES', []);
        if (theme && !availableThemes.includes(theme)) {
            errors.push(`Invalid default theme: ${theme}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // Export konfigurace
    export() {
        return JSON.stringify(this.config, null, 2);
    }
    
    // Import konfigurace
    import(configJson) {
        try {
            const importedConfig = JSON.parse(configJson);
            
            // Merge s existující konfigurací
            this.config = this.deepMerge(this.config, importedConfig);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: `Invalid config format: ${error.message}` 
            };
        }
    }
    
    // Deep merge objektů
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    // Reset na výchozí hodnoty
    reset() {
        this.config = JSON.parse(JSON.stringify(CORE_CONFIG));
        console.log('🔄 Configuration reset to defaults');
    }
    
    // Debug info
    debug() {
        return {
            version: this.get('VERSION'),
            architecture: this.get('ARCHITECTURE'),
            features: this.get('FEATURES'),
            providers: this.get('PROVIDERS.TYPES'),
            valid: this.validate().valid
        };
    }
}

// Globální instance
const coreConfig = new CoreConfigManager();

// Export pro ostatní moduly
if (typeof window !== 'undefined') {
    window.CORE_CONFIG = CORE_CONFIG;
    window.coreConfig = coreConfig;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CORE_CONFIG, CoreConfigManager, coreConfig };
}

console.log('⚙️ Core Config v2.0 loaded - Modular architecture ready');
