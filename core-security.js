// Core Security Manager - My Connect AI v2.0
// Vylepšené zabezpečení pro modulární architekturu

class CoreSecurityManager {
    constructor() {
        this.deviceKey = this.getOrCreateDeviceKey();
        this.sessionKey = this.generateSessionKey();
        this.encryptionCache = new Map();
        
        // Namespace pro různé typy dat
        this.namespaces = {
            AI_KEYS: 'ai_keys',
            CRM_KEYS: 'crm_keys',
            USER_SETTINGS: 'user_settings',
            PROVIDER_CONFIG: 'provider_config',
            CACHE_DATA: 'cache_data'
        };
        
        console.log('🔐 Core Security Manager v2.0 initialized');
    }
    
    // === DEVICE KEY MANAGEMENT ===
    
    getOrCreateDeviceKey() {
        let key = localStorage.getItem('core_device_key');
        if (!key) {
            key = this.generateSecureKey(64);
            localStorage.setItem('core_device_key', key);
            console.log('🔑 New device key generated');
        }
        return key;
    }
    
    generateSecureKey(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    generateSessionKey() {
        return this.generateSecureKey(32);
    }
    
    // === ENHANCED ENCRYPTION ===
    
    encrypt(text, namespace = 'default', useSessionKey = false) {
        if (!text) return '';
        
        try {
            const key = useSessionKey ? this.sessionKey : this.deviceKey;
            const keyWithNamespace = this.deriveNamespaceKey(key, namespace);
            
            // XOR šifrování s vylepšením
            let result = '';
            const salt = this.generateSecureKey(8);
            
            for (let i = 0; i < text.length; i++) {
                const keyChar = keyWithNamespace.charCodeAt((i + salt.length) % keyWithNamespace.length);
                const saltChar = salt.charCodeAt(i % salt.length);
                result += String.fromCharCode(
                    text.charCodeAt(i) ^ keyChar ^ saltChar
                );
            }
            
            // Přidat salt na začátek
            const encrypted = salt + result;
            const encoded = btoa(encrypted);
            
            // Cache pro performance
            this.encryptionCache.set(this.hashString(text + namespace), encoded);
            
            return encoded;
        } catch (error) {
            console.error('Encryption error:', error);
            return '';
        }
    }
    
    decrypt(encoded, namespace = 'default', useSessionKey = false) {
        if (!encoded) return '';
        
        try {
            const key = useSessionKey ? this.sessionKey : this.deviceKey;
            const keyWithNamespace = this.deriveNamespaceKey(key, namespace);
            
            const encrypted = atob(encoded);
            
            if (encrypted.length < 8) return '';
            
            const salt = encrypted.substring(0, 8);
            const ciphertext = encrypted.substring(8);
            
            let result = '';
            for (let i = 0; i < ciphertext.length; i++) {
                const keyChar = keyWithNamespace.charCodeAt((i + salt.length) % keyWithNamespace.length);
                const saltChar = salt.charCodeAt(i % salt.length);
                result += String
