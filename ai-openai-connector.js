/**
 * OpenAI Connector - My Connect AI v2.0
 * Implementation of AI connector for OpenAI (ChatGPT)
 */

import { AIBaseConnector } from './ai-base-connector.js';

export default class OpenAIConnector extends AIBaseConnector {
    constructor() {
        super('openai');
    }

    /**
     * Format message using OpenAI API
     * @param {string} query - User query
     * @param {Object} context - Context from local search
     * @returns {Promise<string>} Formatted response
     */
    async formatMessage(query, context) {
        const apiKey = await this.getApiKey();
        
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        
        try {
            const systemPrompt = this.getSystemPrompt();
            const userPrompt = this.buildPrompt(query, context, this.config.prompts);
            
            this.debug('Formatting message with OpenAI', {
                model: this.config.model,
                contextType: context.type
            });
            
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.debug('OpenAI API error', errorData);
                throw this.handleAPIError(new Error(errorData.error?.message || 'API request failed'), response);
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from OpenAI');
            }
            
            this.debug('Response received', {
                usage: data.usage,
                finishReason: data.choices[0].finish_reason
            });
            
            return data.choices[0].message.content;
            
        } catch (error) {
            console.error('OpenAI formatting error:', error);
            throw error;
        }
    }

    /**
     * Test connection to OpenAI API
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        try {
            const apiKey = await this.getApiKey();
            
            if (!apiKey) {
                return {
                    success: false,
                    message: 'API key not configured'
                };
            }
            
            this.debug('Testing OpenAI connection');
            
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a test assistant.'
                        },
                        {
                            role: 'user',
                            content: 'Respond with "OK" if you can read this.'
                        }
                    ],
                    max_tokens: 10,
                    temperature: 0
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: errorData.error?.message || `API error: ${response.status}`
                };
            }
            
            const data = await response.json();
            
            return {
                success: true,
                message: 'Connection successful',
                model: this.config.model,
                response: data.choices[0]?.message?.content || 'OK'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get usage statistics from OpenAI
     * @returns {Promise<Object>}
     */
    async getUsageStats() {
        // OpenAI doesn't provide a direct usage API in the same request
        // This would need to be implemented with a separate billing API call
        // For now, return unsupported
        return {
            supported: false,
            message: 'Usage statistics require separate billing API access'
        };
    }

    /**
     * Get supported models
     * @returns {Array} List of supported models
     */
    getSupportedModels() {
        return [
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', default: true },
            { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K' },
            { id: 'gpt-4', name: 'GPT-4' },
            { id: 'gpt-4-32k', name: 'GPT-4 32K' },
            { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' }
        ];
    }

    /**
     * Validate specific OpenAI API key format
     * @param {string} apiKey - API key to validate
     * @returns {boolean}
     */
    validateApiKey(apiKey) {
        if (!super.validateApiKey(apiKey)) {
            return false;
        }
        
        // OpenAI keys should be at least 40 characters
        if (apiKey.length < 40) {
            return false;
        }
        
        // Additional OpenAI-specific validation
        const openAIPattern = /^sk-[a-zA-Z0-9]{48,}$/;
        return openAIPattern.test(apiKey);
    }

    /**
     * Get model-specific parameters
     * @param {string} model - Model ID
     * @returns {Object} Model parameters
     */
    getModelParameters(model) {
        const parameters = {
            'gpt-3.5-turbo': { maxTokens: 4096, contextWindow: 4096 },
            'gpt-3.5-turbo-16k': { maxTokens: 16384, contextWindow: 16384 },
            'gpt-4': { maxTokens: 8192, contextWindow: 8192 },
            'gpt-4-32k': { maxTokens: 32768, contextWindow: 32768 },
            'gpt-4-turbo-preview': { maxTokens: 128000, contextWindow: 128000 }
        };
        
        return parameters[model] || parameters['gpt-3.5-turbo'];
    }

    /**
     * Calculate token estimate for text
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token for English
        // This is not exact but good enough for estimates
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if content fits within model context
     * @param {string} content - Content to check
     * @param {string} model - Model to check against
     * @returns {boolean}
     */
    fitsInContext(content, model = null) {
        const actualModel = model || this.config.model;
        const params = this.getModelParameters(actualModel);
        const estimatedTokens = this.estimateTokens(content);
        
        // Leave some room for response
        return estimatedTokens < (params.contextWindow * 0.8);
    }

    /**
     * Truncate content to fit model context
     * @param {string} content - Content to truncate
     * @param {string} model - Model to fit to
     * @returns {string} Truncated content
     */
    truncateToFit(content, model = null) {
        const actualModel = model || this.config.model;
        const params = this.getModelParameters(actualModel);
        
        // Reserve tokens for system prompt and response
        const maxContentTokens = params.contextWindow * 0.7;
        const maxChars = maxContentTokens * 4; // Rough conversion
        
        if (content.length <= maxChars) {
            return content;
        }
        
        return content.substring(0, maxChars) + '\n\n[Content truncated due to length...]';
    }
}
