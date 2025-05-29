/**
 * Setup Wizard - My Connect AI v2.0
 * First-time setup wizard for new users
 */

import { EventBus } from './core-events.js';
import { configManager } from './core-config.js';
import { securityManager } from './core-security.js';
import { providerRegistry } from './provider-registry.js';

export class SetupWizard {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            'welcome',
            'ai-selection',
            'ai-configuration',
            'crm-selection',
            'crm-configuration',
            'test-connection',
            'completion'
        ];
        this.configuration = {
            aiProvider: null,
            crmProvider: null,
            credentials: {}
        };
        this.container = null;
    }

    /**
     * Start the setup wizard
     */
    async start() {
        console.log('🧙 Starting Setup Wizard...');
        
        // Create wizard container
        this.createContainer();
        
        // Show first step
        this.showStep(0);
    }

    /**
     * Create wizard container
     */
    createContainer() {
        // Hide main UI elements
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input-area');
        
        if (chatMessages) {
            chatMessages.style.display = 'none';
        }
        if (chatInput) {
            chatInput.style.display = 'none';
        }
        
        // Create wizard container
        this.container = document.createElement('div');
        this.container.id = 'setup-wizard';
        this.container.className = 'wizard-container';
        
        document.querySelector('.chat-container').appendChild(this.container);
    }

    /**
     * Show specific step
     * @param {number} stepIndex - Step index
     */
    showStep(stepIndex) {
        this.currentStep = stepIndex;
        const stepName = this.steps[stepIndex];
        
        console.log(`📋 Showing step ${stepIndex + 1}/${this.steps.length}: ${stepName}`);
        
        switch (stepName) {
            case 'welcome':
                this.showWelcomeStep();
                break;
            case 'ai-selection':
                this.showAISelectionStep();
                break;
            case 'ai-configuration':
                this.showAIConfigurationStep();
                break;
            case 'crm-selection':
                this.showCRMSelectionStep();
                break;
            case 'crm-configuration':
                this.showCRMConfigurationStep();
                break;
            case 'test-connection':
                this.showTestConnectionStep();
                break;
            case 'completion':
                this.showCompletionStep();
                break;
        }
    }

    /**
     * Show welcome step
     */
    showWelcomeStep() {
        const appConfig = configManager.getAppConfig();
        
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <h1>Vítejte v ${appConfig.app.name}</h1>
                    <p class="wizard-subtitle">${appConfig.app.tagline}</p>
                </div>
                
                <div class="wizard-body">
                    <div class="welcome-message">
                        <p>Tento průvodce vám pomůže s prvním nastavením systému. Budete potřebovat:</p>
                        <ul class="requirements-list">
                            <li>
                                <span class="requirement-icon">🔑</span>
                                <div>
                                    <strong>API klíč pro AI službu</strong>
                                    <small>OpenAI, Google Gemini nebo Anthropic Claude</small>
                                </div>
                            </li>
                            <li>
                                <span class="requirement-icon">📊</span>
                                <div>
                                    <strong>Přístup k CRM systému</strong>
                                    <small>Aktuálně podporujeme Tabidoo</small>
                                </div>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="wizard-features">
                        <h3>Co systém umožňuje:</h3>
                        <div class="feature-grid">
                            <div class="feature-item">
                                <span class="feature-icon">🚀</span>
                                <span>Rychlé vyhledávání v datech</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🤖</span>
                                <span>Inteligentní AI odpovědi</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🔒</span>
                                <span>Bezpečné lokální šifrování</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">📈</span>
                                <span>Analýzy a statistiky</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button secondary" onclick="window.location.reload()">
                        Zrušit
                    </button>
                    <button class="wizard-button primary" onclick="setupWizard.nextStep()">
                        Začít nastavení
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show AI selection step
     */
    showAISelectionStep() {
        const aiProviders = providerRegistry.getProviders('ai');
        const aiConfig = configManager.getAIProvidersConfig();
        
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentStep / this.steps.length) * 100}%"></div>
                        </div>
                        <span class="progress-text">Krok ${this.currentStep} z ${this.steps.length - 1}</span>
                    </div>
                    <h2>Výběr AI služby</h2>
                    <p>Vyberte, kterou AI službu chcete používat pro inteligentní odpovědi</p>
                </div>
                
                <div class="wizard-body">
                    <div class="provider-selection">
                        ${aiProviders.map(provider => {
                            const config = aiConfig.providers[provider];
                            if (!config || !config.enabled) return '';
                            
                            return `
                                <label class="provider-option">
                                    <input type="radio" name="ai-provider" value="${provider}" 
                                           ${provider === 'openai' ? 'checked' : ''}>
                                    <div class="provider-card">
                                        <h3>${config.name}</h3>
                                        <p class="provider-model">Model: ${config.model}</p>
                                        <a href="${config.getApiKeyUrl}" target="_blank" class="provider-link">
                                            Získat API klíč →
                                        </a>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="wizard-info">
                        <p><strong>Tip:</strong> Pokud nemáte API klíč, klikněte na odkaz u vybrané služby.</p>
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button secondary" onclick="setupWizard.previousStep()">
                        Zpět
                    </button>
                    <button class="wizard-button primary" onclick="setupWizard.selectAIProvider()">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show AI configuration step
     */
    showAIConfigurationStep() {
        const provider = this.configuration.aiProvider;
        const aiConfig = configManager.getAIProvidersConfig();
        const providerConfig = aiConfig.providers[provider];
        
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentStep / this.steps.length) * 100}%"></div>
                        </div>
                        <span class="progress-text">Krok ${this.currentStep} z ${this.steps.length - 1}</span>
                    </div>
                    <h2>Nastavení ${providerConfig.name}</h2>
                    <p>Zadejte API klíč pro přístup k AI službě</p>
                </div>
                
                <div class="wizard-body">
                    <div class="form-group">
                        <label for="ai-api-key">API klíč</label>
                        <div class="input-with-toggle">
                            <input type="password" id="ai-api-key" 
                                   placeholder="${providerConfig.apiKeyPrefix}..." 
                                   class="wizard-input">
                            <button type="button" class="toggle-visibility" onclick="setupWizard.toggleVisibility('ai-api-key')">
                                👁️
                            </button>
                        </div>
                        <small>API klíč bude bezpečně zašifrován a uložen pouze ve vašem prohlížeči</small>
                    </div>
                    
                    <div class="wizard-help">
                        <h4>Kde najdu API klíč?</h4>
                        <ol>
                            <li>Přejděte na <a href="${providerConfig.getApiKeyUrl}" target="_blank">${providerConfig.getApiKeyUrl}</a></li>
                            <li>Přihlaste se nebo vytvořte účet</li>
                            <li>Vygenerujte nový API klíč</li>
                            <li>Zkopírujte klíč a vložte sem</li>
                        </ol>
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button secondary" onclick="setupWizard.previousStep()">
                        Zpět
                    </button>
                    <button class="wizard-button primary" onclick="setupWizard.saveAIConfiguration()">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show CRM selection step
     */
    showCRMSelectionStep() {
        const crmProviders = providerRegistry.getProviders('crm');
        const crmConfig = configManager.getCRMProvidersConfig();
        
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentStep / this.steps.length) * 100}%"></div>
                        </div>
                        <span class="progress-text">Krok ${this.currentStep} z ${this.steps.length - 1}</span>
                    </div>
                    <h2>Výběr CRM systému</h2>
                    <p>Vyberte CRM systém, ze kterého chcete načítat data</p>
                </div>
                
                <div class="wizard-body">
                    <div class="provider-selection">
                        ${crmProviders.map(provider => {
                            const config = crmConfig.providers[provider];
                            if (!config) return '';
                            
                            const isEnabled = config.enabled && !config.comingSoon;
                            
                            return `
                                <label class="provider-option ${!isEnabled ? 'disabled' : ''}">
                                    <input type="radio" name="crm-provider" value="${provider}" 
                                           ${provider === 'tabidoo' ? 'checked' : ''}
                                           ${!isEnabled ? 'disabled' : ''}>
                                    <div class="provider-card">
                                        <h3>${config.name}</h3>
                                        ${config.comingSoon ? 
                                            '<p class="provider-status coming-soon">Připravujeme</p>' :
                                            `<p class="provider-description">${config.description || 'CRM systém pro správu zákazníků'}</p>`
                                        }
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button secondary" onclick="setupWizard.previousStep()">
                        Zpět
                    </button>
                    <button class="wizard-button primary" onclick="setupWizard.selectCRMProvider()">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show CRM configuration step
     */
    showCRMConfigurationStep() {
        const provider = this.configuration.crmProvider;
        
        // Currently only Tabidoo is supported
        if (provider === 'tabidoo') {
            this.showTabidooConfiguration();
        }
    }

    /**
     * Show Tabidoo configuration
     */
    showTabidooConfiguration() {
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentStep / this.steps.length) * 100}%"></div>
                        </div>
                        <span class="progress-text">Krok ${this.currentStep} z ${this.steps.length - 1}</span>
                    </div>
                    <h2>Nastavení Tabidoo</h2>
                    <p>Zadejte přístupové údaje k vašemu Tabidoo účtu</p>
                </div>
                
                <div class="wizard-body">
                    <div class="form-group">
                        <label for="tabidoo-app-id">App ID (název aplikace)</label>
                        <input type="text" id="tabidoo-app-id" 
                               placeholder="např. CRM Start" 
                               class="wizard-input">
                        <small>Název vaší aplikace v Tabidoo</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="tabidoo-api-token">API Token</label>
                        <div class="input-with-toggle">
                            <input type="password" id="tabidoo-api-token" 
                                   placeholder="eyJ..." 
                                   class="wizard-input">
                            <button type="button" class="toggle-visibility" onclick="setupWizard.toggleVisibility('tabidoo-api-token')">
                                👁️
                            </button>
                        </div>
                        <small>API token bude bezpečně zašifrován</small>
                    </div>
                    
                    <div class="wizard-help">
                        <h4>Kde najdu tyto údaje?</h4>
                        <ol>
                            <li>Přihlaste se do Tabidoo</li>
                            <li>Přejděte do <strong>Nastavení → API</strong></li>
                            <li>Zkopírujte <strong>API Token</strong></li>
                            <li><strong>App ID</strong> je název vaší aplikace</li>
                        </ol>
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button secondary" onclick="setupWizard.previousStep()">
                        Zpět
                    </button>
                    <button class="wizard-button primary" onclick="setupWizard.saveCRMConfiguration()">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show test connection step
     */
    async showTestConnectionStep() {
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.currentStep / this.steps.length) * 100}%"></div>
                        </div>
                        <span class="progress-text">Krok ${this.currentStep} z ${this.steps.length - 1}</span>
                    </div>
                    <h2>Test připojení</h2>
                    <p>Ověřuji nastavení a připojení k službám...</p>
                </div>
                
                <div class="wizard-body">
                    <div class="test-results" id="test-results">
                        <div class="test-item" id="test-ai">
                            <div class="test-spinner"></div>
                            <span>Testuji AI službu...</span>
                        </div>
                        <div class="test-item" id="test-crm">
                            <div class="test-spinner"></div>
                            <span>Testuji CRM připojení...</span>
                        </div>
                        <div class="test-item" id="test-data">
                            <div class="test-spinner"></div>
                            <span>Načítám data...</span>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button secondary" onclick="setupWizard.previousStep()" style="display: none;" id="test-back">
                        Zpět
                    </button>
                    <button class="wizard-button primary" onclick="setupWizard.nextStep()" style="display: none;" id="test-continue">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
        
        // Run tests
        await this.runConnectionTests();
    }

    /**
     * Show completion step
     */
    showCompletionStep() {
        const appConfig = configManager.getAppConfig();
        
        this.container.innerHTML = `
            <div class="wizard-content">
                <div class="wizard-header">
                    <h2>🎉 Nastavení dokončeno!</h2>
                    <p>Váš ${appConfig.app.name} je připraven k použití</p>
                </div>
                
                <div class="wizard-body">
                    <div class="completion-summary">
                        <div class="summary-item">
                            <span class="summary-icon">🤖</span>
                            <div>
                                <strong>AI služba</strong>
                                <p>${this.getProviderName('ai', this.configuration.aiProvider)}</p>
                            </div>
                        </div>
                        <div class="summary-item">
                            <span class="summary-icon">📊</span>
                            <div>
                                <strong>CRM systém</strong>
                                <p>${this.getProviderName('crm', this.configuration.crmProvider)}</p>
                            </div>
                        </div>
                        ${this.configuration.dataStats ? `
                            <div class="summary-item">
                                <span class="summary-icon">📈</span>
                                <div>
                                    <strong>Načtená data</strong>
                                    <p>${this.configuration.dataStats.total} záznamů</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="wizard-tips">
                        <h3>Co dál?</h3>
                        <ul>
                            <li>Vyzkoušejte příklady dotazů na úvodní obrazovce</li>
                            <li>Prozkoumejte různé typy dotazů</li>
                            <li>Nastavení můžete kdykoliv změnit v menu</li>
                        </ul>
                    </div>
                </div>
                
                <div class="wizard-footer">
                    <button class="wizard-button primary large" onclick="setupWizard.complete()">
                        Začít používat ${appConfig.app.name}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Navigation methods
     */
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Selection methods
     */
    selectAIProvider() {
        const selected = document.querySelector('input[name="ai-provider"]:checked');
        if (!selected) {
            alert('Vyberte AI službu');
            return;
        }
        
        this.configuration.aiProvider = selected.value;
        this.nextStep();
    }

    selectCRMProvider() {
        const selected = document.querySelector('input[name="crm-provider"]:checked');
        if (!selected) {
            alert('Vyberte CRM systém');
            return;
        }
        
        this.configuration.crmProvider = selected.value;
        this.nextStep();
    }

    /**
     * Save AI configuration
     */
    async saveAIConfiguration() {
        const apiKey = document.getElementById('ai-api-key').value.trim();
        
        if (!apiKey) {
            alert('Zadejte API klíč');
            return;
        }
        
        try {
            // Get AI provider instance
            const provider = await providerRegistry.getInstance('ai', this.configuration.aiProvider);
            
            // Validate API key
            if (!provider.validateApiKey(apiKey)) {
                alert('Neplatný formát API klíče');
                return;
            }
            
            // Save API key
            await provider.saveApiKey(apiKey);
            
            this.configuration.credentials[`ai_${this.configuration.aiProvider}`] = true;
            this.nextStep();
            
        } catch (error) {
            alert('Chyba při ukládání: ' + error.message);
        }
    }

    /**
     * Save CRM configuration
     */
    async saveCRMConfiguration() {
        if (this.configuration.crmProvider === 'tabidoo') {
            const appId = document.getElementById('tabidoo-app-id').value.trim();
            const apiToken = document.getElementById('tabidoo-api-token').value.trim();
            
            if (!appId || !apiToken) {
                alert('Vyplňte všechna pole');
                return;
            }
            
            try {
                // Get CRM provider instance
                const provider = await providerRegistry.getInstance('crm', 'tabidoo');
                
                // Save credentials
                await provider.saveCredential('appId', appId);
                await provider.saveCredential('apiToken', apiToken);
                
                this.configuration.credentials.crm_tabidoo = true;
                this.nextStep();
                
            } catch (error) {
                alert('Chyba při ukládání: ' + error.message);
            }
        }
    }

    /**
     * Run connection tests
     */
    async runConnectionTests() {
        let allTestsPassed = true;
        
        // Test AI connection
        const aiResult = await this.testAIConnection();
        this.updateTestResult('test-ai', aiResult.success, 
            aiResult.success ? 'AI služba připojena' : `AI služba: ${aiResult.message}`);
        
        if (!aiResult.success) allTestsPassed = false;
        
        // Test CRM connection
        const crmResult = await this.testCRMConnection();
        this.updateTestResult('test-crm', crmResult.success,
            crmResult.success ? 'CRM systém připojen' : `CRM systém: ${crmResult.message}`);
        
        if (!crmResult.success) allTestsPassed = false;
        
        // Load data if connections successful
        if (aiResult.success && crmResult.success) {
            const dataResult = await this.loadInitialData();
            this.updateTestResult('test-data', dataResult.success,
                dataResult.success ? `Načteno ${dataResult.stats?.total || 0} záznamů` : 'Nepodařilo se načíst data');
            
            if (dataResult.success) {
                this.configuration.dataStats = dataResult.stats;
            }
        } else {
            this.updateTestResult('test-data', false, 'Přeskočeno kvůli chybě připojení');
        }
        
        // Show navigation buttons
        document.getElementById('test-back').style.display = 'block';
        document.getElementById('test-continue').style.display = allTestsPassed ? 'block' : 'none';
    }

    /**
     * Test AI connection
     */
    async testAIConnection() {
        try {
            const provider = await providerRegistry.getInstance('ai', this.configuration.aiProvider);
            return await provider.testConnection();
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Test CRM connection
     */
    async testCRMConnection() {
        try {
            const provider = await providerRegistry.getInstance('crm', this.configuration.crmProvider);
            return await provider.testConnection();
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            const provider = await providerRegistry.getInstance('crm', this.configuration.crmProvider);
            const data = await provider.loadData();
            
            // Calculate statistics
            let total = 0;
            const byType = {};
            
            for (const [tableId, tableData] of Object.entries(data)) {
                const count = tableData.recordCount || 0;
                total += count;
                if (tableData.type) {
                    byType[tableData.type] = (byType[tableData.type] || 0) + count;
                }
            }
            
            return {
                success: true,
                stats: { total, byType }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Update test result display
     */
    updateTestResult(elementId, success, message) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.className = `test-item ${success ? 'success' : 'error'}`;
        element.innerHTML = `
            <span class="test-icon">${success ? '✅' : '❌'}</span>
            <span>${message}</span>
        `;
    }

    /**
     * Complete wizard
     */
    complete() {
        // Mark wizard as completed
        localStorage.setItem('wizardCompleted', 'true');
        
        // Emit completion event
        EventBus.emit('wizard-complete', { wizard: this });
        
        // Remove wizard container
        if (this.container) {
            this.container.remove();
        }
        
        // Show main UI
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input-area');
        
        if (chatMessages) {
            chatMessages.style.display = '';
        }
        if (chatInput) {
            chatInput.style.display = '';
        }
    }

    /**
     * Toggle password visibility
     */
    toggleVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🔒';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }

    /**
     * Get provider name
     */
    getProviderName(type, providerKey) {
        const config = type === 'ai' ? 
            configManager.getAIProvidersConfig() : 
            configManager.getCRMProvidersConfig();
            
        return config.providers?.[providerKey]?.name || providerKey;
    }
}

// Export for global access
window.setupWizard = new SetupWizard();
