/**
 * Core Security Manager - My Connect AI v2.0
 * Handles encryption, decryption, and secure storage of sensitive data
 */

export class SecurityManager {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.saltLength = 16;
        this.ivLength = 12;
        this.tagLength = 128;
        this.iterations = 100000;
        this._initialized = false;
    }

    /**
     * Initialize the security manager
     */
    async init() {
        if (this._initialized) return;
        
        try {
            // Test if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error('Web Crypto API not available');
            }
            
            // Initialize or verify master key
            await this._getOrCreateMasterKey();
            this._initialized = true;
            
            console.log('✅ Security Manager initialized');
        } catch (error) {
            console.error('❌ Security Manager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get or create the master encryption key
     * @private
     */
    async _getOrCreateMasterKey() {
        const storedKey = localStorage.getItem('myconnectai_mk');
        
        if (storedKey) {
            // Verify stored key is valid
            try {
                await this._importKey(storedKey);
                return;
            } catch (error) {
                console.warn('Stored master key invalid, creating new one');
                localStorage.removeItem('myconnectai_mk');
            }
        }
        
        // Generate new master key
        const key = await crypto.subtle.generateKey(
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
        
        const exportedKey = await crypto.subtle.exportKey('jwk', key);
        localStorage.setItem('myconnectai_mk', JSON.stringify(exportedKey));
    }

    /**
     * Import a key from JWK format
     * @private
     */
    async _importKey(keyData) {
        const jwk = typeof keyData === 'string' ? JSON.parse(keyData) : keyData;
        
        return await crypto.subtle.importKey(
            'jwk',
            jwk,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt sensitive data
     * @param {string} data - Data to encrypt
     * @returns {Promise<string>} Encrypted data as base64 string
     */
    async encrypt(data) {
        if (!this._initialized) await this.init();
        
        try {
            const key = await this._importKey(localStorage.getItem('myconnectai_mk'));
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const encodedData = new TextEncoder().encode(data);
            
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    tagLength: this.tagLength
                },
                key,
                encodedData
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);
            
            // Convert to base64 for storage
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data
     * @param {string} encryptedData - Base64 encrypted data
     * @returns {Promise<string>} Decrypted data
     */
    async decrypt(encryptedData) {
        if (!this._initialized) await this.init();
        
        try {
            const key = await this._importKey(localStorage.getItem('myconnectai_mk'));
            
            // Convert from base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, this.ivLength);
            const data = combined.slice(this.ivLength);
            
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv,
                    tagLength: this.tagLength
                },
                key,
                data
            );
            
            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Save encrypted data to localStorage
     * @param {string} key - Storage key
     * @param {string} value - Value to encrypt and store
     */
    async saveSecure(key, value) {
        if (!value) {
            localStorage.removeItem(`secure_${key}`);
            return;
        }
        
        const encrypted = await this.encrypt(value);
        localStorage.setItem(`secure_${key}`, encrypted);
    }

    /**
     * Load and decrypt data from localStorage
     * @param {string} key - Storage key
     * @returns {Promise<string|null>} Decrypted value or null
     */
    async loadSecure(key) {
        const encrypted = localStorage.getItem(`secure_${key}`);
        if (!encrypted) return null;
        
        try {
            return await this.decrypt(encrypted);
        } catch (error) {
            console.warn(`Failed to decrypt ${key}, removing corrupted data`);
            localStorage.removeItem(`secure_${key}`);
            return null;
        }
    }

    /**
     * Check if secure key exists
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    hasSecureKey(key) {
        return localStorage.getItem(`secure_${key}`) !== null;
    }

    /**
     * Remove secure data
     * @param {string} key - Storage key
     */
    removeSecure(key) {
        localStorage.removeItem(`secure_${key}`);
    }

    /**
     * Clear all secure data
     * @param {boolean} includeMasterKey - Also remove master key
     */
    clearAllSecure(includeMasterKey = false) {
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith('secure_')) {
                localStorage.removeItem(key);
            }
        });
        
        if (includeMasterKey) {
            localStorage.removeItem('myconnectai_mk');
            this._initialized = false;
        }
        
        console.log('🗑️ All secure data cleared');
    }

    /**
     * Export all secure keys (for backup)
     * @returns {Promise<Object>} Encrypted backup data
     */
    async exportSecureData() {
        const backup = {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            data: {}
        };
        
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
            if (key.startsWith('secure_')) {
                backup.data[key] = localStorage.getItem(key);
            }
        }
        
        return backup;
    }

    /**
     * Import secure data from backup
     * @param {Object} backup - Backup data
     */
    async importSecureData(backup) {
        if (backup.version !== '2.0.0') {
            throw new Error('Incompatible backup version');
        }
        
        for (const [key, value] of Object.entries(backup.data)) {
            localStorage.setItem(key, value);
        }
        
        console.log('✅ Secure data imported successfully');
    }

    /**
     * Generate a random password
     * @param {number} length - Password length
     * @returns {string} Random password
     */
    generateRandomPassword(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const randomValues = crypto.getRandomValues(new Uint8Array(length));
        
        return Array.from(randomValues)
            .map(byte => charset[byte % charset.length])
            .join('');
    }

    /**
     * Hash a value (for non-reversible storage)
     * @param {string} value - Value to hash
     * @returns {Promise<string>} Hashed value
     */
    async hash(value) {
        const encoder = new TextEncoder();
        const data = encoder.encode(value);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Create and export singleton instance
export const securityManager = new SecurityManager();

// For backward compatibility
window.security = {
    saveSecure: (key, value) => securityManager.saveSecure(key, value),
    loadSecure: (key) => securityManager.loadSecure(key),
    clearSecure: () => securityManager.clearAllSecure()
};
