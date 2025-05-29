/**
 * Anthropic Claude Connector - My Connect AI v2.0
 * Implementation of AI connector for Anthropic Claude
 */

import { AIBaseConnector } from './ai-base-connector.js';

export default class ClaudeConnector extends AIBaseConnector {
    constructor() {
        super('claude');
    }

    /**
     * Format message using Claude API
     * @param {string} query - User query
     * @param {Object} context - Context from local search
     * @returns {Promise<string>} Formatted response
     */
    async formatMessage(query, context) {
        const apiKey = await this.getApiKey();
        
        if (!apiKey) {
            throw new Error('Claude API key not configured');
        }
        
        try {
            const systemPrompt = this.getSystemPrompt();
            const userPrompt = this.buildPrompt(query, context, this.config.prompts);
            
            this.debug('Formatting message with Claude', {
                model: this.config.model,
                contextType: context.type
            });
            
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': this.config.anthropicVersion || '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [{
                        role: 'user',
                        content: userPrompt
                    }],
                    system: systemPrompt,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    top_p: 1,
                    stop_sequences: []
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.debug('Claude API error', errorData);
                throw this.handleAPIError(new Error(errorData.error?.message || 'API request failed'), response);
            }
            
            const data = await response.json();
            
            if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
                throw new Error('Invalid response format from Claude');
            }
            
            this.debug('Response received', {
                usage: data.usage,
                stopReason: data.stop_reason
            });
            
            // Extract text from content blocks
            const text = data.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n');
            
            return text;
            
        } catch (error) {
            console.error('Claude formatting error:', error);
            throw error;
        }
    }

    /**
     * Test connection to Claude API
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
            
            this.debug('Testing Claude connection');
            
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': this.config.anthropicVersion || '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [{
                        role: 'user',
                        content: 'Test message. Reply with "OK".'
                    }],
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
                response: data.content[0]?.text || 'OK'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Validate Claude API key format
     * @param {string} apiKey - API key to validate
     * @returns {boolean}
     */
    validateApiKey(apiKey) {
        if (!super.validateApiKey(apiKey)) {
            return false;
        }
        
        // Claude keys should be at least 40 characters
        if (apiKey.length < 40) {
            return false;
        }
        
        // Additional Claude-specific validation
        const claudePattern = /^sk-ant-[a-zA-Z0-9-_]{40,}$/;
        return claudePattern.test(apiKey);
    }

    /**
     * Get supported models for Claude
     * @returns {Array} List of supported models
     */
    getSupportedModels() {
        return [
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', default: true },
            { id: 'claude-2.1', name: 'Claude 2.1' },
            { id: 'claude-2.0', name: 'Claude 2.0' }
        ];
    }

    /**
     * Handle Claude-specific errors
     * @param {Error} error - Original error
     * @param {Response} response - Fetch response
     * @returns {Error} Formatted error
     */
    handleAPIError(error, response = null) {
        if (response) {
            const status = response.status;
            
            if (status === 400) {
                return new Error('Invalid request format or parameters.');
            } else if (status === 401) {
                return new Error('Invalid API key. Check your Claude API key.');
            } else if (status === 403) {
                return new Error('Access forbidden. Check your API key permissions.');
            } else if (status === 404) {
                return new Error('Model not found. Check the model name.');
            } else if (status === 429) {
                return new Error('Rate limit exceeded. Please try again later.');
            } else if (status === 500) {
                return new Error('Claude API error. Please try again.');
            } else if (status === 529) {
                return new Error('Claude is temporarily overloaded. Please try again later.');
            }
        }
        
        return super.handleAPIError(error, response);
    }

    /**
     * Calculate approximate token count for Claude
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        // Claude uses a similar tokenization to GPT models
        // Rough estimation: ~3.5 characters per token for English
        return Math.ceil(text.length / 3.5);
    }

    /**
     * Get model-specific parameters
     * @param {string} model - Model ID
     * @returns {Object} Model parameters
     */
    getModelParameters(model) {
        const parameters = {
            'claude-3-opus-20240229': { maxTokens: 4096, contextWindow: 200000 },
            'claude-3-sonnet-20240229': { maxTokens: 4096, contextWindow: 200000 },
            'claude-3-haiku-20240307': { maxTokens: 4096, contextWindow: 200000 },
            'claude-2.1': { maxTokens: 4096, contextWindow: 200000 },
            'claude-2.0': { maxTokens: 4096, contextWindow: 100000 }
        };
        
        return parameters[model] || parameters['claude-3-haiku-20240307'];
    }
}
