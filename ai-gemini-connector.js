/**
 * Google Gemini Connector - My Connect AI v2.0
 * Implementation of AI connector for Google Gemini
 */

import { AIBaseConnector } from './ai-base-connector.js';

export default class GeminiConnector extends AIBaseConnector {
    constructor() {
        super('gemini');
    }

    /**
     * Format message using Gemini API
     * @param {string} query - User query
     * @param {Object} context - Context from local search
     * @returns {Promise<string>} Formatted response
     */
    async formatMessage(query, context) {
        const apiKey = await this.getApiKey();
        
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }
        
        try {
            const systemPrompt = this.getSystemPrompt();
            const userPrompt = this.buildPrompt(query, context, this.config.prompts);
            
            this.debug('Formatting message with Gemini', {
                model: this.config.model,
                contextType: context.type
            });
            
            // Gemini uses a different request format
            const requestUrl = `${this.config.apiUrl}?key=${apiKey}`;
            
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\n${userPrompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: this.config.temperature,
                        topK: this.config.topK || 40,
                        topP: this.config.topP || 0.95,
                        maxOutputTokens: this.config.maxTokens,
                        stopSequences: []
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                            threshold: "BLOCK_NONE"
                        },
                        {
                            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                            threshold: "BLOCK_NONE"
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.debug('Gemini API error', errorData);
                throw this.handleAPIError(new Error(errorData.error?.message || 'API request failed'), response);
            }
            
            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response format from Gemini');
            }
            
            this.debug('Response received', {
                promptTokenCount: data.candidates[0].tokenCount,
                finishReason: data.candidates[0].finishReason
            });
            
            // Extract text from response
            const text = data.candidates[0].content.parts
                .map(part => part.text)
                .join('');
            
            return text;
            
        } catch (error) {
            console.error('Gemini formatting error:', error);
            throw error;
        }
    }

    /**
     * Test connection to Gemini API
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
            
            this.debug('Testing Gemini connection');
            
            const requestUrl = `${this.config.apiUrl}?key=${apiKey}`;
            
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Test message. Reply with "OK".'
                        }]
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 10
                    }
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
                response: data.candidates[0]?.content?.parts[0]?.text || 'OK'
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Validate Gemini API key format
     * @param {string} apiKey - API key to validate
     * @returns {boolean}
     */
    validateApiKey(apiKey) {
        if (!super.validateApiKey(apiKey)) {
            return false;
        }
        
        // Gemini keys should be at least 39 characters
        if (apiKey.length < 39) {
            return false;
        }
        
        // Additional Gemini-specific validation
        const geminiPattern = /^AIza[a-zA-Z0-9_-]{35}$/;
        return geminiPattern.test(apiKey);
    }

    /**
     * Get supported models for Gemini
     * @returns {Array} List of supported models
     */
    getSupportedModels() {
        return [
            { id: 'gemini-pro', name: 'Gemini Pro', default: true },
            { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' }
        ];
    }

    /**
     * Handle Gemini-specific errors
     * @param {Error} error - Original error
     * @param {Response} response - Fetch response
     * @returns {Error} Formatted error
     */
    handleAPIError(error, response = null) {
        if (response) {
            const status = response.status;
            
            if (status === 400) {
                return new Error('Invalid request. Check your API key and request format.');
            } else if (status === 403) {
                return new Error('API key is invalid or doesn\'t have required permissions.');
            } else if (status === 429) {
                return new Error('Quota exceeded. Check your Google Cloud quotas.');
            }
        }
        
        return super.handleAPIError(error, response);
    }
}
