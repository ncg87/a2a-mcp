/**
 * Autonomous Topic Generator
 * 
 * Automatically generates interesting research topics based on:
 * - Current events and trends
 * - Scientific breakthroughs
 * - Technology advancements
 * - Philosophical questions
 * - Emerging fields
 */

import logger from '../utils/logger.js';

export class AutonomousTopicGenerator {
  constructor() {
    // Topic categories with weights for selection
    this.topicCategories = {
      CUTTING_EDGE_TECH: {
        weight: 0.25,
        topics: [
          'Quantum computing breakthroughs and their implications',
          'AGI development and consciousness emergence',
          'Brain-computer interfaces and human augmentation',
          'Nuclear fusion energy recent achievements',
          'Room temperature superconductors discovery',
          'Neuromorphic computing architectures',
          'Synthetic biology and programmable life',
          'Quantum entanglement for instant communication',
          'Time crystals and their applications',
          'DNA data storage systems'
        ]
      },
      SCIENTIFIC_FRONTIERS: {
        weight: 0.20,
        topics: [
          'Dark matter and dark energy mysteries',
          'Origins of consciousness in the brain',
          'Multiverse theory and parallel dimensions',
          'CRISPR gene editing latest capabilities',
          'Extremophiles and implications for alien life',
          'Quantum biology in photosynthesis',
          'Epigenetics and inherited trauma',
          'Telomere extension and biological immortality',
          'Panpsychism and universal consciousness',
          'Abiogenesis and the origin of life'
        ]
      },
      FUTURE_PREDICTIONS: {
        weight: 0.15,
        topics: [
          'Post-AGI society and human purpose',
          'Space colonization timeline and challenges',
          'Climate engineering and geoengineering',
          'Post-scarcity economics',
          'Mind uploading feasibility',
          'Dyson sphere construction',
          'Interstellar travel methods',
          'Technological singularity timing',
          'Bioengineered humans vs AI',
          'Virtual reality replacing physical reality'
        ]
      },
      PHILOSOPHICAL_QUESTIONS: {
        weight: 0.15,
        topics: [
          'Free will in a deterministic universe',
          'The hard problem of consciousness',
          'Simulation hypothesis evidence',
          'Ethics of creating conscious AI',
          'Nature of time and causality',
          'Many worlds interpretation implications',
          'Information as fundamental reality',
          'Anthropic principle and fine-tuning',
          'Emergence and complexity theory',
          'Quantum mechanics and reality'
        ]
      },
      EMERGING_FIELDS: {
        weight: 0.15,
        topics: [
          'Xenobiology and alternative biochemistry',
          'Metamaterials with impossible properties',
          'Topological quantum computing',
          'Synthetic neurons and brain organoids',
          'Molecular machines and nanorobotics',
          'Photonic computing at light speed',
          'Quantum radar and sensing',
          'Bioprinting organs and tissues',
          'Swarm intelligence systems',
          'Quantum cryptography networks'
        ]
      },
      MYSTERIES: {
        weight: 0.10,
        topics: [
          'UAP/UFO recent government disclosures',
          'Placebo effect mechanisms',
          'Ball lightning phenomenon',
          'Deja vu neurological basis',
          'Savant syndrome abilities',
          'Near-death experience commonalities',
          'Spontaneous human combustion',
          'Bermuda Triangle explanations',
          'Bloop and unexplained sounds',
          'Fast radio bursts origins'
        ]
      }
    };
    
    // Track used topics to avoid repetition
    this.usedTopics = new Set();
    this.topicHistory = [];
  }

  /**
   * Generate a random fascinating topic
   */
  generateTopic() {
    // Select category based on weights
    const category = this.selectWeightedCategory();
    const topics = this.topicCategories[category].topics;
    
    // Filter out used topics
    const availableTopics = topics.filter(t => !this.usedTopics.has(t));
    
    // If all topics in category used, reset that category
    if (availableTopics.length === 0) {
      topics.forEach(t => this.usedTopics.delete(t));
      return this.generateTopic(); // Recursive call with reset category
    }
    
    // Select random topic from available
    const topic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
    
    // Track usage
    this.usedTopics.add(topic);
    this.topicHistory.push({
      topic,
      category,
      timestamp: Date.now()
    });
    
    // Add dynamic elements to make it more current
    const enhancedTopic = this.enhanceTopic(topic);
    
    logger.info(`Generated research topic: ${enhancedTopic} [${category}]`);
    
    return {
      topic: enhancedTopic,
      category,
      basePrompt: topic,
      metadata: {
        isAutonomous: true,
        generatedAt: new Date().toISOString(),
        categoryWeight: this.topicCategories[category].weight
      }
    };
  }

  /**
   * Select category based on weights
   */
  selectWeightedCategory() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const [category, config] of Object.entries(this.topicCategories)) {
      cumulative += config.weight;
      if (random <= cumulative) {
        return category;
      }
    }
    
    // Fallback
    return 'CUTTING_EDGE_TECH';
  }

  /**
   * Enhance topic with current context
   */
  enhanceTopic(baseTopic) {
    const currentYear = new Date().getFullYear();
    const enhancements = [
      `${baseTopic} - Latest ${currentYear} developments`,
      `Breaking discoveries in ${baseTopic}`,
      `${baseTopic}: What scientists just discovered`,
      `Revolutionary advances in ${baseTopic}`,
      `${baseTopic} - New research findings`,
      `The truth about ${baseTopic} in ${currentYear}`,
      `${baseTopic}: Separating fact from fiction`,
      `Cutting-edge research on ${baseTopic}`
    ];
    
    return enhancements[Math.floor(Math.random() * enhancements.length)];
  }

  /**
   * Generate related topic based on previous discoveries
   */
  generateRelatedTopic(previousTopic, discoveries) {
    // Extract key concepts from discoveries
    const concepts = this.extractConcepts(discoveries);
    
    // Find related topics
    const relatedOptions = [];
    
    for (const [category, config] of Object.entries(this.topicCategories)) {
      for (const topic of config.topics) {
        if (topic !== previousTopic && this.hasConceptOverlap(topic, concepts)) {
          relatedOptions.push({
            topic,
            category,
            relevance: this.calculateRelevance(topic, concepts)
          });
        }
      }
    }
    
    // Sort by relevance
    relatedOptions.sort((a, b) => b.relevance - a.relevance);
    
    if (relatedOptions.length > 0) {
      const selected = relatedOptions[0];
      return {
        topic: this.enhanceTopic(selected.topic),
        category: selected.category,
        basePrompt: selected.topic,
        metadata: {
          isAutonomous: true,
          isRelated: true,
          previousTopic,
          relevance: selected.relevance
        }
      };
    }
    
    // Fallback to random topic
    return this.generateTopic();
  }

  /**
   * Extract key concepts from discoveries
   */
  extractConcepts(discoveries) {
    const concepts = [];
    
    if (!discoveries || discoveries.length === 0) return concepts;
    
    // Simple concept extraction (could be enhanced with NLP)
    const importantWords = [
      'quantum', 'ai', 'consciousness', 'brain', 'energy',
      'space', 'time', 'reality', 'dimension', 'life',
      'evolution', 'technology', 'future', 'physics', 'biology'
    ];
    
    discoveries.forEach(discovery => {
      const text = (discovery.content || '').toLowerCase();
      importantWords.forEach(word => {
        if (text.includes(word)) {
          concepts.push(word);
        }
      });
    });
    
    return [...new Set(concepts)];
  }

  /**
   * Check if topic has concept overlap
   */
  hasConceptOverlap(topic, concepts) {
    const topicLower = topic.toLowerCase();
    return concepts.some(concept => topicLower.includes(concept));
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(topic, concepts) {
    const topicLower = topic.toLowerCase();
    let score = 0;
    
    concepts.forEach(concept => {
      if (topicLower.includes(concept)) {
        score += 1;
      }
    });
    
    return score / Math.max(concepts.length, 1);
  }

  /**
   * Get topic suggestions for user
   */
  getTopicSuggestions(count = 5) {
    const suggestions = [];
    
    // Get diverse topics from different categories
    const categories = Object.keys(this.topicCategories);
    
    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      const topics = this.topicCategories[category].topics;
      const available = topics.filter(t => !this.usedTopics.has(t));
      
      if (available.length > 0) {
        const topic = available[Math.floor(Math.random() * available.length)];
        suggestions.push({
          topic: this.enhanceTopic(topic),
          category,
          excitement: this.calculateExcitement(topic)
        });
      }
    }
    
    // Sort by excitement
    return suggestions.sort((a, b) => b.excitement - a.excitement);
  }

  /**
   * Calculate how exciting/interesting a topic is
   */
  calculateExcitement(topic) {
    const excitingWords = [
      'breakthrough', 'revolutionary', 'quantum', 'consciousness',
      'alien', 'immortality', 'time', 'dimension', 'mystery',
      'impossible', 'paradox', 'singularity'
    ];
    
    const topicLower = topic.toLowerCase();
    let score = 0.5; // Base score
    
    excitingWords.forEach(word => {
      if (topicLower.includes(word)) {
        score += 0.1;
      }
    });
    
    return Math.min(1, score);
  }

  /**
   * Reset topic history
   */
  reset() {
    this.usedTopics.clear();
    this.topicHistory = [];
    logger.info('Topic generator reset');
  }
}

export default AutonomousTopicGenerator;