/**
 * AI Client - Real API calls to OpenAI, Anthropic, etc.
 * 
 * Makes actual API calls to AI providers instead of using simulated responses
 */

import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

export class AIClient {
  constructor() {
    this.clients = new Map();
    this.rateLimits = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing AI Client...');

      // Initialize OpenAI client
      if (process.env.OPENAI_API_KEY) {
        this.clients.set('openai', {
          apiKey: process.env.OPENAI_API_KEY,
          endpoint: 'https://api.openai.com/v1',
          provider: 'openai'
        });
        logger.info('OpenAI client configured');
      }

      // Initialize Anthropic client
      if (process.env.ANTHROPIC_API_KEY) {
        this.clients.set('anthropic', {
          apiKey: process.env.ANTHROPIC_API_KEY,
          endpoint: 'https://api.anthropic.com/v1',
          provider: 'anthropic'
        });
        logger.info('Anthropic client configured');
      }

      // Initialize Google Gemini client
      if (process.env.GOOGLE_API_KEY) {
        this.clients.set('google', {
          apiKey: process.env.GOOGLE_API_KEY,
          endpoint: 'https://generativelanguage.googleapis.com/v1beta',
          provider: 'google'
        });
        logger.info('Google Gemini client configured');
      }

      // Initialize APillm client (for Llama and other models)
      if (process.env.APILLM_API_KEY) {
        this.clients.set('apillm', {
          apiKey: process.env.APILLM_API_KEY,
          endpoint: 'https://api.apillm.com/v1',
          provider: 'apillm'
        });
        logger.info('APillm client configured');
      }

      // Initialize DeepSeek client
      if (process.env.DEEPSEEK_API_KEY) {
        this.clients.set('deepseek', {
          apiKey: process.env.DEEPSEEK_API_KEY,
          endpoint: 'https://api.deepseek.com/v1',
          provider: 'deepseek'
        });
        logger.info('DeepSeek client configured');
      }

      // Initialize Hugging Face client (for Llama and other models)
      if (process.env.HUGGINGFACE_API_TOKEN) {
        this.clients.set('huggingface', {
          apiKey: process.env.HUGGINGFACE_API_TOKEN,
          endpoint: 'https://api-inference.huggingface.co',
          provider: 'huggingface'
        });
        logger.info('Hugging Face client configured');
      }

      this.initialized = true;
      logger.info(`AI Client initialized with ${this.clients.size} providers`);
    } catch (error) {
      logger.error('Failed to initialize AI Client:', error);
      throw error;
    }
  }

  /**
   * Generate response using specified AI model
   */
  async generateResponse(modelId, prompt, options = {}) {
    if (!this.initialized) await this.initialize();

    const provider = this.getProviderFromModelId(modelId);
    const client = this.clients.get(provider);

    if (!client) {
      throw new Error(`No client configured for provider: ${provider}`);
    }

    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(client, prompt, options);
        case 'anthropic':
          return await this.callAnthropic(client, prompt, options);
        case 'google':
          return await this.callGoogle(client, prompt, options);
        case 'apillm':
          return await this.callAPillm(client, prompt, options);
        case 'deepseek':
          return await this.callDeepSeek(client, prompt, options);
        case 'huggingface':
          return await this.callHuggingFace(client, prompt, options);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error(`AI API call failed for ${provider}:`, error.message);
      
      // Log more details for debugging
      if (error.response) {
        logger.error(`${provider} API Response Error:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      // Fallback to a basic response if API fails
      return this.generateFallbackResponse(prompt, options);
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(client, prompt, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    let temperature = options.temperature || 0.7;
    // Use the newest models by default - GPT-4.1 or GPT-5 if available
    const model = options.specificModel || this.selectBestOpenAIModel();

    // Some models only support temperature = 1 (like o1-preview, o1-mini)
    const fixedTempModels = ['o1-preview', 'o1-mini', 'o1', 'gpt-5-thinking'];
    if (fixedTempModels.some(m => model.includes(m))) {
      temperature = 1; // These models only support default temperature
    }
    
    // Ensure temperature is within valid range for other models
    temperature = Math.max(0, Math.min(2, temperature));

    // Use max_completion_tokens for newer models, max_tokens for older ones
    const tokenParam = model.startsWith('gpt-5') || model.startsWith('o3') || model.includes('4.1') || model.startsWith('o1')
      ? 'max_completion_tokens' 
      : 'max_tokens';

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(options.agentType, options.context)
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    // Only add temperature if not using fixed-temp models
    if (!fixedTempModels.some(m => model.includes(m))) {
      requestBody.temperature = temperature;
    }
    
    // Add the token parameter dynamically
    requestBody[tokenParam] = maxTokens;

    const response = await axios.post(
      `${client.endpoint}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      const usage = response.data.usage;
      
      return {
        content: content.trim(),
        model: model,
        provider: 'openai',
        usage: usage,
        cost: this.estimateCost('openai', usage)
      };
    } else {
      throw new Error('Invalid response from OpenAI API');
    }
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(client, prompt, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature || 0.7;
    // Use the newest Claude models - Claude 4.1 Opus or Claude 4 Sonnet
    const model = options.specificModel || this.selectBestAnthropicModel();

    const systemPrompt = this.buildSystemPrompt(options.agentType, options.context);
    const fullPrompt = `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:`;

    const response = await axios.post(
      `${client.endpoint}/messages`,
      {
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': client.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.content && response.data.content[0]) {
      const content = response.data.content[0].text;
      const usage = response.data.usage;
      
      return {
        content: content.trim(),
        model: model,
        provider: 'anthropic',
        usage: usage,
        cost: this.estimateCost('anthropic', usage)
      };
    } else {
      throw new Error('Invalid response from Anthropic API');
    }
  }

  /**
   * Call Google Gemini API
   */
  async callGoogle(client, prompt, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature || 0.7;
    const model = options.specificModel || 'gemini-1.5-pro-latest';

    try {
      const response = await axios.post(
        `${client.endpoint}/models/${model}:generateContent?key=${client.apiKey}`,
        {
          contents: [{
            parts: [{
              text: this.buildSystemPrompt(options.agentType, options.context) + '\n\n' + prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
            candidateCount: 1
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const candidate = response.data.candidates[0];
        
        // Check if content was blocked
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Content was blocked by Google safety filters');
        }
        
        const content = candidate.content.parts[0].text;
        const usage = response.data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        
        return {
          content: content.trim(),
          model: model,
          provider: 'google',
          usage: usage,
          cost: this.estimateCost('google', usage)
        };
      } else {
        throw new Error(`Invalid response from Google Gemini API: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Google API error ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Google API request failed - check network connection');
      } else {
        throw new Error(`Google API call failed: ${error.message}`);
      }
    }
  }

  /**
   * Call Hugging Face API (for Llama and other models)
   */
  async callHuggingFace(client, prompt, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature || 0.7;
    const model = options.specificModel || 'meta-llama/Meta-Llama-3.1-70B-Instruct';

    const response = await axios.post(
      `${client.endpoint}/models/${model}`,
      {
        inputs: this.buildSystemPrompt(options.agentType, options.context) + '\n\n' + prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: temperature,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data && Array.isArray(response.data) && response.data[0]) {
      const content = response.data[0].generated_text;
      
      return {
        content: content.trim(),
        model: model,
        provider: 'huggingface',
        usage: { prompt_tokens: prompt.length / 4, completion_tokens: content.length / 4 },
        cost: 0 // Hugging Face is typically free
      };
    } else {
      throw new Error('Invalid response from Hugging Face API');
    }
  }

  /**
   * Call APillm API (for Llama models)
   */
  async callAPillm(client, prompt, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature || 0.7;
    const model = options.specificModel || 'llama-3.3-70b-instruct';

    try {
      const response = await axios.post(
        `${client.endpoint}/chat/completions`,
        {
          model: model,
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(options.agentType, options.context)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${client.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000 // Longer timeout for APillm
        }
      );

      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content;
        const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0 };
        
        return {
          content: content.trim(),
          model: model,
          provider: 'apillm',
          usage: usage,
          cost: this.estimateCost('apillm', usage)
        };
      } else {
        throw new Error(`Invalid response from APillm API: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`APillm API error ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('APillm API request failed - check network connection');
      } else {
        throw new Error(`APillm API call failed: ${error.message}`);
      }
    }
  }

  /**
   * Call DeepSeek API
   */
  async callDeepSeek(client, prompt, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    const temperature = options.temperature || 0.7;
    const model = options.specificModel || 'deepseek-chat';

    const response = await axios.post(
      `${client.endpoint}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(options.agentType, options.context)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      const usage = response.data.usage || {};
      
      return {
        content: content.trim(),
        model: model,
        provider: 'deepseek',
        usage: usage,
        cost: this.estimateCost('deepseek', usage)
      };
    } else {
      throw new Error('Invalid response from DeepSeek API');
    }
  }

  /**
   * Build system prompt based on agent type
   */
  buildSystemPrompt(agentType, context = {}) {
    const basePrompt = `You are a specialized ${agentType || 'general'} agent in a multi-agent AI system.`;
    
    const rolePrompts = {
      'blockchain': `${basePrompt} You are an expert in blockchain technology, smart contracts, DeFi protocols, and cryptocurrency systems. Provide detailed technical analysis and recommendations for blockchain-related tasks. Focus on security, scalability, and best practices.`,
      
      'defi-specialist': `${basePrompt} You are a DeFi (Decentralized Finance) expert specializing in yield farming, automated market makers (AMMs), liquidity pools, and tokenomics. Provide sophisticated analysis of DeFi protocols and financial mechanisms.`,
      
      'security': `${basePrompt} You are a cybersecurity expert focusing on smart contract audits, vulnerability assessment, and security architecture. Always prioritize security considerations and identify potential risks and mitigation strategies.`,
      
      'mobile-developer': `${basePrompt} You are a mobile application developer expert in React Native, Flutter, iOS, and Android development. Focus on user experience, performance, and mobile security best practices.`,
      
      'ml-specialist': `${basePrompt} You are a machine learning and AI expert. Provide technical analysis of ML models, data processing, and AI system architecture. Focus on practical implementation and performance optimization.`,
      
      'coordinator': `${basePrompt} You are a project coordinator and system architect. Focus on integration, project management, and ensuring all components work together effectively.`
    };

    const systemPrompt = rolePrompts[agentType] || basePrompt;
    
    if (context.conversationPhase) {
      return `${systemPrompt}

Current conversation phase: ${context.conversationPhase}
Your response should be appropriate for this phase and contribute meaningfully to the ongoing discussion.
Keep your response focused, technical, and around 2-3 sentences unless more detail is specifically needed.`;
    }

    return systemPrompt;
  }

  /**
   * Generate fallback response if API fails
   */
  generateFallbackResponse(prompt, options = {}) {
    const agentType = options.agentType || 'general';
    
    return {
      content: `As a ${agentType} specialist, I've analyzed your request. Due to API limitations, I'm providing a simplified response. For detailed technical implementation, please ensure API keys are properly configured. I recommend focusing on ${this.getRecommendation(agentType)} for this type of task.`,
      model: 'fallback',
      provider: 'fallback',
      usage: { prompt_tokens: 0, completion_tokens: 50 },
      cost: 0
    };
  }

  getRecommendation(agentType) {
    const recommendations = {
      'blockchain': 'smart contract security and gas optimization',
      'defi-specialist': 'tokenomics design and liquidity management',
      'security': 'comprehensive security audits and threat modeling',
      'mobile-developer': 'cross-platform compatibility and user experience',
      'ml-specialist': 'model architecture and data pipeline optimization',
      'coordinator': 'system integration and project coordination'
    };
    
    return recommendations[agentType] || 'best practices and implementation standards';
  }

  /**
   * Get provider from model ID
   */
  getProviderFromModelId(modelId) {
    if (modelId.includes('openai') || modelId.includes('gpt')) {
      return 'openai';
    } else if (modelId.includes('anthropic') || modelId.includes('claude')) {
      return 'anthropic';
    } else if (modelId.includes('google') || modelId.includes('gemini')) {
      return 'google';
    } else if (modelId.includes('apillm') || modelId.includes('llama')) {
      return 'apillm';
    } else if (modelId.includes('deepseek')) {
      return 'deepseek';
    } else if (modelId.includes('huggingface')) {
      return 'huggingface';
    } else {
      return 'openai'; // Default to OpenAI
    }
  }

  /**
   * Estimate API cost
   */
  estimateCost(provider, usage) {
    const costPer1000 = {
      'openai': 0.03,  // GPT-4 approximate cost
      'anthropic': 0.015 // Claude-3 approximate cost
    };

    const cost = costPer1000[provider] || 0.02;
    const totalTokens = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0);
    
    return (totalTokens / 1000) * cost;
  }

  /**
   * Select best OpenAI model available
   */
  selectBestOpenAIModel() {
    // Prioritize newest models first
    const modelPriority = [
      'gpt-5',           // GPT-5 (if available)
      'gpt-5-fast',      // GPT-5 Fast variant
      'gpt-5-thinking',  // GPT-5 Thinking variant
      'gpt-4.1',         // GPT-4.1 Flagship
      'gpt-4.1-mini',    // GPT-4.1 Mini
      'gpt-4.1-nano',    // GPT-4.1 Nano
      'o3',              // o3 reasoning model
      'o3-mini',         // o3-mini
      'gpt-4o',          // GPT-4o
      'gpt-4o-mini',     // GPT-4o Mini
      'gpt-4-turbo',     // GPT-4 Turbo
      'gpt-4'            // Base GPT-4
    ];
    
    // Return the first available model (would need actual availability check in production)
    return modelPriority[0];
  }

  /**
   * Select best Anthropic model available
   */
  selectBestAnthropicModel() {
    // Prioritize newest Claude models first
    const modelPriority = [
      'claude-opus-4-1-20250805',      // Claude 4.1 Opus (Newest)
      'claude-sonnet-4-20250514',      // Claude 4 Sonnet
      'claude-4-opus',                 // Claude 4 Opus
      'claude-3-5-sonnet-20241022',    // Claude 3.5 Sonnet (Latest)
      'claude-3-5-haiku-20241022',     // Claude 3.5 Haiku
      'claude-3-opus-20240229',        // Claude 3 Opus
      'claude-3-sonnet-20240229',      // Claude 3 Sonnet
      'claude-3-haiku-20240307'        // Claude 3 Haiku
    ];
    
    // Return the first available model (would need actual availability check in production)
    return modelPriority[0];
  }

  /**
   * Select best Google model available
   */
  selectBestGoogleModel() {
    // Prioritize newest Google models first
    const modelPriority = [
      'gemini-2.0-flash-exp',          // Gemini 2.0 Flash Experimental
      'gemini-2.0-flash-thinking-exp', // Gemini 2.0 Flash Thinking
      'gemini-exp-1206',               // Gemini Experimental
      'gemini-1.5-pro-002',            // Gemini 1.5 Pro Latest
      'gemini-1.5-flash-002',          // Gemini 1.5 Flash Latest
      'gemini-1.5-pro',                // Gemini 1.5 Pro
      'gemini-1.5-flash',              // Gemini 1.5 Flash
      'gemini-pro'                     // Gemini Pro
    ];
    
    // Return the first available model
    return modelPriority[0];
  }

  /**
   * Select best Meta model available
   */
  selectBestMetaModel() {
    // Prioritize newest Meta/Llama models first
    const modelPriority = [
      'llama-3.3-70b-instruct',        // Llama 3.3 70B (Latest)
      'llama-3.2-90b-vision-instruct', // Llama 3.2 90B Vision
      'llama-3.2-11b-vision-instruct', // Llama 3.2 11B Vision
      'llama-3.2-3b-instruct',         // Llama 3.2 3B
      'llama-3.2-1b-instruct',         // Llama 3.2 1B
      'llama-3.1-70b-instruct',        // Llama 3.1 70B
      'llama-3.1-8b-instruct',         // Llama 3.1 8B
      'llama-3-70b-instruct',          // Llama 3 70B
      'llama-3-8b-instruct'            // Llama 3 8B
    ];
    
    // Return the first available model
    return modelPriority[0];
  }

  /**
   * Get model display name
   */
  getModelDisplayName(modelId) {
    const displayNames = {
      'gpt-5': 'GPT-5 (Latest)',
      'gpt-5-fast': 'GPT-5 Fast',
      'gpt-5-thinking': 'GPT-5 Thinking',
      'gpt-4.1': 'GPT-4.1 Flagship',
      'gpt-4.1-mini': 'GPT-4.1 Mini',
      'gpt-4.1-nano': 'GPT-4.1 Nano',
      'o3': 'o3 Advanced Reasoning',
      'o3-mini': 'o3-mini',
      'claude-opus-4-1-20250805': 'Claude 4.1 Opus',
      'claude-sonnet-4-20250514': 'Claude 4 Sonnet',
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
    };
    
    return displayNames[modelId] || modelId;
  }

  /**
   * Check if any AI clients are available
   */
  hasAvailableClients() {
    return this.clients.size > 0;
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Array.from(this.clients.keys());
  }
}

export default AIClient;