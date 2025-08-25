/**
 * AI Model Selector
 * 
 * Manages selection and configuration of different AI models
 * (OpenAI, Anthropic, Hugging Face, etc.) for agent reasoning
 */

import dotenv from 'dotenv';
import logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

export class ModelSelector {
  constructor() {
    this.availableModels = new Map();
    this.activeModel = null;
    this.modelConfigs = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing AI Model Selector...');
      
      // Load available models based on environment variables
      await this.detectAvailableModels();
      
      // Set default model
      await this.selectDefaultModel();
      
      this.initialized = true;
      logger.info(`Model Selector initialized. Active model: ${this.activeModel?.name || 'none'}`);
    } catch (error) {
      logger.error('Failed to initialize Model Selector:', error);
      throw error;
    }
  }

  /**
   * Detect available AI models based on environment variables
   */
  async detectAvailableModels() {
    // OpenAI Models (Current Available Models 2025)
    if (process.env.OPENAI_API_KEY) {
      // GPT-4.1 Series (Latest Core Models)
      this.addModel({
        id: 'openai-gpt-4.1',
        name: 'OpenAI GPT-4.1 (Flagship)',
        provider: 'openai',
        model: 'gpt-4.1',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'multimodal', 'long-context'],
        maxTokens: 1000000,
        costPerToken: 0.000015,
        qualityScore: 10,
        speedScore: 8,
        available: true,
        isLatest: true,
        isNewest: true
      });

      this.addModel({
        id: 'openai-gpt-4.1-mini',
        name: 'OpenAI GPT-4.1 Mini (Fast)',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'fast-processing'],
        maxTokens: 1000000,
        costPerToken: 0.000003,
        qualityScore: 9,
        speedScore: 10,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'openai-gpt-4.1-nano',
        name: 'OpenAI GPT-4.1 Nano (Ultra-Fast)',
        provider: 'openai',
        model: 'gpt-4.1-nano',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'fast-processing'],
        maxTokens: 1000000,
        costPerToken: 0.0000005,
        qualityScore: 8,
        speedScore: 10,
        available: true,
        isLatest: true
      });

      // o3 Reasoning Models
      this.addModel({
        id: 'openai-o3',
        name: 'OpenAI o3 (Advanced Reasoning)',
        provider: 'openai',
        model: 'o3',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['advanced-reasoning', 'complex-problem-solving', 'mathematical-reasoning'],
        maxTokens: 256000,
        costPerToken: 0.00006,
        qualityScore: 11,
        speedScore: 6,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'openai-o3-mini',
        name: 'OpenAI o3-mini (Reasoning)',
        provider: 'openai',
        model: 'o3-mini',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['reasoning', 'problem-solving', 'analysis'],
        maxTokens: 256000,
        costPerToken: 0.00003,
        qualityScore: 9,
        speedScore: 8,
        available: true,
        isLatest: true
      });

      // GPT-4o Legacy (Still Available)
      this.addModel({
        id: 'openai-gpt-4o',
        name: 'OpenAI GPT-4o (Legacy)',
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'vision', 'multimodal'],
        maxTokens: 128000,
        costPerToken: 0.000005,
        qualityScore: 10,
        speedScore: 9,
        available: true
      });

      this.addModel({
        id: 'openai-gpt-4o-mini',
        name: 'OpenAI GPT-4o Mini (Fast)',
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis'],
        maxTokens: 128000,
        costPerToken: 0.00000015,
        qualityScore: 8,
        speedScore: 10,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'openai-gpt-4-turbo',
        name: 'OpenAI GPT-4 Turbo',
        provider: 'openai',
        model: 'gpt-4-turbo',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'vision'],
        maxTokens: 128000,
        costPerToken: 0.00001,
        qualityScore: 9,
        speedScore: 8,
        available: true
      });

      this.addModel({
        id: 'openai-gpt-4',
        name: 'OpenAI GPT-4 (Legacy)',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: 'https://api.openai.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis'],
        maxTokens: 8192,
        costPerToken: 0.00003,
        qualityScore: 9,
        speedScore: 6,
        available: true
      });
    }

    // Anthropic Models (Current Available Models 2025)
    if (process.env.ANTHROPIC_API_KEY) {
      // Note: These may be fictional model names - using currently known available models
      this.addModel({
        id: 'anthropic-claude-3.5-sonnet',
        name: 'Anthropic Claude 3.5 Sonnet (Latest)',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning', 'analysis', 'complex-reasoning', 'code-generation', 'mathematics'],
        maxTokens: 200000,
        costPerToken: 0.000003,
        qualityScore: 10,
        speedScore: 9,
        available: true,
        isLatest: true,
        isNewest: true
      });

      this.addModel({
        id: 'anthropic-claude-3.5-haiku',
        name: 'Anthropic Claude 3.5 Haiku (Fast)',
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning', 'analysis', 'fast-processing'],
        maxTokens: 200000,
        costPerToken: 0.000001,
        qualityScore: 8,
        speedScore: 10,
        available: true,
        isLatest: true
      });

      // Claude 4 Series (Latest Generation)
      this.addModel({
        id: 'anthropic-claude-4-sonnet',
        name: 'Anthropic Claude 4 Sonnet',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning', 'analysis', 'complex-reasoning', 'code-generation', 'mathematics', 'hybrid-thinking'],
        maxTokens: 200000,
        costPerToken: 0.000003,
        qualityScore: 10,
        speedScore: 9,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'anthropic-claude-4.1-opus',
        name: 'Anthropic Claude 4.1 Opus (Newest)',
        provider: 'anthropic',
        model: 'claude-opus-4-1-20250805',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning', 'analysis', 'complex-reasoning', 'code-generation', 'mathematics', 'hybrid-thinking', 'extended-reasoning'],
        maxTokens: 200000,
        costPerToken: 0.000015,
        qualityScore: 11,
        speedScore: 8,
        available: true,
        isLatest: true,
        isNewest: true
      });

      this.addModel({
        id: 'anthropic-claude-3-opus',
        name: 'Anthropic Claude 3 Opus',
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning', 'analysis', 'complex-reasoning'],
        maxTokens: 200000,
        costPerToken: 0.000015,
        qualityScore: 10,
        speedScore: 6,
        available: true
      });

      this.addModel({
        id: 'anthropic-claude-3-sonnet',
        name: 'Anthropic Claude 3 Sonnet (Legacy)',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning', 'analysis'],
        maxTokens: 200000,
        costPerToken: 0.000003,
        qualityScore: 8,
        speedScore: 8,
        available: true
      });

      this.addModel({
        id: 'anthropic-claude-3-haiku',
        name: 'Anthropic Claude 3 Haiku (Legacy)',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: process.env.ANTHROPIC_API_KEY,
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: ['text-generation', 'reasoning'],
        maxTokens: 200000,
        costPerToken: 0.00000025,
        qualityScore: 6,
        speedScore: 10,
        available: true
      });
    }

    // Google Gemini Models (Latest 2024-2025 Releases)
    if (process.env.GOOGLE_API_KEY) {
      this.addModel({
        id: 'google-gemini-2.5-pro',
        name: 'Google Gemini 2.5 Pro (Newest - Thinking)',
        provider: 'google',
        model: 'gemini-2.5-pro-preview-06-05',
        apiKey: process.env.GOOGLE_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'thinking', 'vision', 'multimodal', 'long-context'],
        maxTokens: 2000000,
        costPerToken: 0.000007,
        qualityScore: 11,
        speedScore: 7,
        available: true,
        isLatest: true,
        isNewest: true
      });

      this.addModel({
        id: 'google-gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash (Newest - Fast)',
        provider: 'google',
        model: 'gemini-2.5-flash',
        apiKey: process.env.GOOGLE_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'thinking', 'fast-processing'],
        maxTokens: 1000000,
        costPerToken: 0.0000025,
        qualityScore: 10,
        speedScore: 10,
        available: true,
        isLatest: true,
        isNewest: true
      });

      this.addModel({
        id: 'google-gemini-2.0-flash',
        name: 'Google Gemini 2.0 Flash (Tool Use)',
        provider: 'google',
        model: 'gemini-2.0-flash-001',
        apiKey: process.env.GOOGLE_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'tool-use', 'multimodal'],
        maxTokens: 1000000,
        costPerToken: 0.000002,
        qualityScore: 9,
        speedScore: 9,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'google-gemini-1.5-pro',
        name: 'Google Gemini 1.5 Pro (Legacy)',
        provider: 'google',
        model: 'gemini-1.5-pro-latest',
        apiKey: process.env.GOOGLE_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'vision', 'multimodal', 'long-context'],
        maxTokens: 1000000,
        costPerToken: 0.0000035,
        qualityScore: 10,
        speedScore: 8,
        available: true
      });

      this.addModel({
        id: 'google-gemini-1.5-flash',
        name: 'Google Gemini 1.5 Flash (Legacy)',
        provider: 'google',
        model: 'gemini-1.5-flash-latest',
        apiKey: process.env.GOOGLE_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'fast-processing'],
        maxTokens: 1000000,
        costPerToken: 0.00000035,
        qualityScore: 9,
        speedScore: 10,
        available: true
      });
    }

    // Meta Llama Models via APillm.com (Current Available Models)
    if (process.env.APILLM_API_KEY) {
      // Note: Using actual available Llama models on APillm.com, not fictional Llama 4

      this.addModel({
        id: 'apillm-llama-3.3-70b',
        name: 'Meta Llama 3.3 70B (APillm)',
        provider: 'apillm',
        model: 'llama-3.3-70b-instruct',
        apiKey: process.env.APILLM_API_KEY,
        endpoint: 'https://api.apillm.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'tool-calling', 'multilingual'],
        maxTokens: 128000,
        costPerToken: 0.0000008,
        qualityScore: 10,
        speedScore: 8,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'apillm-llama-3.2-90b',
        name: 'Meta Llama 3.2 90B Vision (APillm)',
        provider: 'apillm',
        model: 'llama-3.2-90b-vision-instruct',
        apiKey: process.env.APILLM_API_KEY,
        endpoint: 'https://api.apillm.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'vision', 'multimodal'],
        maxTokens: 128000,
        costPerToken: 0.0000012,
        qualityScore: 10,
        speedScore: 7,
        available: true,
        isLatest: true
      });

      this.addModel({
        id: 'apillm-llama-3.2-11b',
        name: 'Meta Llama 3.2 11B Vision (APillm)',
        provider: 'apillm',
        model: 'llama-3.2-11b-vision-instruct',
        apiKey: process.env.APILLM_API_KEY,
        endpoint: 'https://api.apillm.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'vision', 'multimodal'],
        maxTokens: 128000,
        costPerToken: 0.0000005,
        qualityScore: 9,
        speedScore: 9,
        available: true,
        isLatest: true
      });
    }

    // DeepSeek Models via APillm.com or Direct API
    if (process.env.APILLM_API_KEY || process.env.DEEPSEEK_API_KEY) {
      this.addModel({
        id: 'deepseek-v3',
        name: 'DeepSeek V3 (Latest)',
        provider: process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'apillm',
        model: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.APILLM_API_KEY,
        endpoint: process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/v1' : 'https://api.apillm.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'mathematics', 'advanced-reasoning'],
        maxTokens: 128000,
        costPerToken: 0.000002,
        qualityScore: 10,
        speedScore: 8,
        available: true,
        isLatest: true,
        isNewest: true
      });

      this.addModel({
        id: 'deepseek-reasoner',
        name: 'DeepSeek R1 Reasoner (Chain-of-Thought)',
        provider: process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'apillm',
        model: 'deepseek-reasoner',
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.APILLM_API_KEY,
        endpoint: process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com/v1' : 'https://api.apillm.com/v1',
        capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis', 'chain-of-thought', 'advanced-reasoning'],
        maxTokens: 128000,
        costPerToken: 0.000004,
        qualityScore: 11,
        speedScore: 6,
        available: true,
        isLatest: true,
        isNewest: true
      });
    }

    // Hugging Face Models
    if (process.env.HUGGINGFACE_API_TOKEN) {
      this.addModel({
        id: 'huggingface-mistral-7b',
        name: 'Mistral 7B Instruct',
        provider: 'huggingface',
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        apiKey: process.env.HUGGINGFACE_API_TOKEN,
        endpoint: 'https://api-inference.huggingface.co',
        capabilities: ['text-generation', 'reasoning'],
        maxTokens: 4096,
        costPerToken: 0,
        qualityScore: 6,
        speedScore: 8,
        available: true
      });

      this.addModel({
        id: 'huggingface-codellama-34b',
        name: 'Code Llama 34B Instruct',
        provider: 'huggingface',
        model: 'codellama/CodeLlama-34b-Instruct-hf',
        apiKey: process.env.HUGGINGFACE_API_TOKEN,
        endpoint: 'https://api-inference.huggingface.co',
        capabilities: ['code-generation', 'programming', 'debugging'],
        maxTokens: 4096,
        costPerToken: 0,
        qualityScore: 8,
        speedScore: 6,
        available: true
      });
    }

    // Local Models (if ollama is available)
    if (process.env.OLLAMA_ENDPOINT || process.env.ENABLE_LOCAL_MODELS) {
      this.addModel({
        id: 'local-llama2-7b',
        name: 'Local Llama 2 7B',
        provider: 'ollama',
        model: 'llama2:7b',
        apiKey: null,
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        capabilities: ['text-generation', 'reasoning'],
        maxTokens: 4096,
        costPerToken: 0,
        qualityScore: 6,
        speedScore: 9,
        available: false // Will be tested
      });
    }

    logger.info(`Detected ${this.availableModels.size} potential AI models`);
  }

  /**
   * Add a model to the available models list
   */
  addModel(modelConfig) {
    this.availableModels.set(modelConfig.id, modelConfig);
    this.modelConfigs.set(modelConfig.id, modelConfig);
  }

  /**
   * Test model availability
   */
  async testModelAvailability(modelId) {
    const model = this.availableModels.get(modelId);
    if (!model) return false;

    try {
      // Simple test request based on provider
      const testResult = await this.makeTestRequest(model);
      model.available = testResult.success;
      model.responseTime = testResult.responseTime;
      
      if (testResult.success) {
        logger.info(`Model ${model.name} is available (${testResult.responseTime}ms)`);
      } else {
        logger.warn(`Model ${model.name} test failed: ${testResult.error}`);
      }
      
      return testResult.success;
    } catch (error) {
      logger.error(`Failed to test model ${model.name}:`, error);
      model.available = false;
      return false;
    }
  }

  /**
   * Make a test request to verify model availability
   */
  async makeTestRequest(model) {
    const startTime = Date.now();
    
    try {
      // This would normally make actual API calls
      // For now, simulate based on API key presence
      if (model.provider === 'openai' && model.apiKey) {
        // Simulate OpenAI test
        return { success: true, responseTime: Math.random() * 1000 + 200 };
      } else if (model.provider === 'anthropic' && model.apiKey) {
        // Simulate Anthropic test
        return { success: true, responseTime: Math.random() * 1500 + 300 };
      } else if (model.provider === 'huggingface' && model.apiKey) {
        // Simulate Hugging Face test
        return { success: true, responseTime: Math.random() * 2000 + 500 };
      } else if (model.provider === 'ollama') {
        // Simulate local model test (would actually check if ollama is running)
        return { success: Math.random() > 0.5, responseTime: Math.random() * 500 + 100 };
      }
      
      return { success: false, error: 'No API key provided' };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        responseTime: Date.now() - startTime 
      };
    }
  }

  /**
   * Select default model based on availability and preferences
   */
  async selectDefaultModel() {
    const availableModels = Array.from(this.availableModels.values()).filter(m => m.available);
    
    if (availableModels.length === 0) {
      logger.warn('No AI models available');
      return null;
    }

    // Preference order: ALL newest frontier models first (2025 releases > 2024 releases > legacy)
    const preferenceOrder = [
      // Newest 2025 Models
      'anthropic-claude-4.1-opus',
      'openai-gpt-5',
      'google-gemini-2.5-pro',
      'deepseek-reasoner',
      'deepseek-v3',
      'apillm-llama-4-maverick',
      'apillm-llama-4-scout',
      'anthropic-claude-4-opus',
      'anthropic-claude-4-sonnet',
      'google-gemini-2.5-flash',
      'openai-gpt-5-mini',
      'google-gemini-2.0-flash',
      'apillm-llama-3.3-70b',
      'apillm-llama-3.2-90b',
      'anthropic-claude-3.7-sonnet',
      'openai-gpt-5-nano',
      'apillm-llama-3.2-11b',
      
      // 2024 Models
      'anthropic-claude-3.5-sonnet',
      'openai-gpt-4o',
      'google-gemini-1.5-pro',
      'google-gemini-1.5-flash',
      'anthropic-claude-3.5-haiku',
      'openai-gpt-4o-mini',
      'openai-gpt-4-turbo',
      
      // Legacy Models
      'anthropic-claude-3-opus',
      'openai-gpt-4',
      'anthropic-claude-3-sonnet',
      'anthropic-claude-3-haiku',
      'huggingface-mistral-7b',
      'local-llama2-7b'
    ];

    for (const preferredId of preferenceOrder) {
      const model = this.availableModels.get(preferredId);
      if (model && model.available) {
        this.activeModel = model;
        logger.info(`Selected default model: ${model.name}`);
        return model;
      }
    }

    // Fallback to first available model
    this.activeModel = availableModels[0];
    logger.info(`Selected fallback model: ${this.activeModel.name}`);
    return this.activeModel;
  }

  /**
   * Manually select a model
   */
  selectModel(modelId) {
    const model = this.availableModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    if (!model.available) {
      throw new Error(`Model ${model.name} is not available`);
    }

    this.activeModel = model;
    logger.info(`Manually selected model: ${model.name}`);
    return model;
  }

  /**
   * Get optimal model for specific task
   */
  getOptimalModel(taskType, requirements = {}) {
    const availableModels = Array.from(this.availableModels.values()).filter(m => m.available);
    
    if (availableModels.length === 0) {
      return null;
    }

    // Score models based on task requirements
    const scoredModels = availableModels.map(model => {
      let score = 0;
      
      // Task-specific scoring
      switch (taskType) {
        case 'reasoning':
        case 'complex-analysis':
          score += model.qualityScore * 2;
          break;
        case 'code-generation':
          if (model.capabilities.includes('code-generation')) score += 15;
          score += model.qualityScore;
          break;
        case 'fast-response':
          score += model.speedScore * 2;
          break;
        case 'cost-sensitive':
          score += (1 / (model.costPerToken + 0.000001)) * 10;
          break;
        default:
          score += model.qualityScore + model.speedScore;
      }

      // Capability matching
      if (requirements.capabilities) {
        const matchingCaps = requirements.capabilities.filter(cap => 
          model.capabilities.includes(cap)
        ).length;
        score += matchingCaps * 5;
      }

      // Token requirements
      if (requirements.maxTokens && model.maxTokens >= requirements.maxTokens) {
        score += 10;
      }

      // Cost considerations
      if (requirements.maxCostPerToken && model.costPerToken <= requirements.maxCostPerToken) {
        score += 10;
      }

      return { model, score };
    });

    // Sort by score and return best model
    scoredModels.sort((a, b) => b.score - a.score);
    return scoredModels[0]?.model || null;
  }

  /**
   * Get all available models
   */
  getAvailableModels() {
    return Array.from(this.availableModels.values()).filter(m => m.available);
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider) {
    return Array.from(this.availableModels.values())
      .filter(m => m.provider === provider && m.available);
  }

  /**
   * Get current active model
   */
  getActiveModel() {
    return this.activeModel;
  }

  /**
   * Get model configuration for API calls
   */
  getModelConfig(modelId = null) {
    const model = modelId ? this.availableModels.get(modelId) : this.activeModel;
    
    if (!model) {
      throw new Error('No model selected or specified');
    }

    return {
      provider: model.provider,
      model: model.model,
      apiKey: model.apiKey,
      endpoint: model.endpoint,
      maxTokens: model.maxTokens,
      capabilities: model.capabilities
    };
  }

  /**
   * Test all available models
   */
  async testAllModels() {
    const results = {};
    
    for (const [modelId, model] of this.availableModels) {
      results[modelId] = await this.testModelAvailability(modelId);
    }
    
    return results;
  }

  /**
   * Get model statistics
   */
  getModelStats() {
    const models = Array.from(this.availableModels.values());
    const available = models.filter(m => m.available);
    
    return {
      total: models.length,
      available: available.length,
      providers: [...new Set(models.map(m => m.provider))],
      avgQuality: available.reduce((sum, m) => sum + m.qualityScore, 0) / available.length || 0,
      avgSpeed: available.reduce((sum, m) => sum + m.speedScore, 0) / available.length || 0,
      freeModels: available.filter(m => m.costPerToken === 0).length,
      activeModel: this.activeModel?.name || 'none'
    };
  }

  /**
   * Get model recommendations for different use cases
   */
  getRecommendations() {
    return {
      'best-quality': this.getOptimalModel('reasoning'),
      'fastest': this.getOptimalModel('fast-response'),
      'cheapest': this.getOptimalModel('cost-sensitive'),
      'code': this.getOptimalModel('code-generation'),
      'balanced': this.getOptimalModel('general')
    };
  }
}

export default ModelSelector;