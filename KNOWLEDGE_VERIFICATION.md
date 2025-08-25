# Knowledge Verification System

## Overview

The Multi-Agent MCP Ensemble includes an advanced **Knowledge Verification System** designed to prevent AI hallucinations by automatically detecting when agents encounter uncertain or potentially outdated information and triggering web searches to verify facts.

## How It Works

### 🔍 Automatic Detection

The system automatically identifies topics that are high-risk for hallucinations:

#### Always Verify Categories
- **Current Events**: Topics containing '2024', '2025', 'latest', 'recent', 'current', 'new', 'updated'
- **Rapidly Changing Technology**: 'api', 'framework', 'library', 'version', 'release', 'update'
- **Financial Data**: 'price', 'market', 'stock', 'crypto', 'exchange rate', 'inflation' 
- **Statistics & Research**: 'statistics', 'data', 'report', 'study', 'research', 'survey'
- **Company Information**: 'company', 'startup', 'acquisition', 'merger', 'ipo', 'funding'

#### Agent-Specific Verification Rates
- **Research Agents**: 90% verification rate
- **Analyst Agents**: 80% verification rate  
- **Specialist Agents**: 70% verification rate
- **Coordinator Agents**: 50% verification rate
- **General Agents**: 40% verification rate

### 🌐 Web Search Verification

When verification is triggered, the system:

1. **Generates Multiple Search Queries**:
   - Base queries with current year
   - Agent-specific specialized queries
   - Fact-checking focused searches

2. **Performs Web Searches**:
   - Uses Playwright MCP server for web browsing
   - Searches multiple sources for current information
   - Includes date ranges when available

3. **Stores Results in Memory**:
   - Caches verification results for future use
   - Prevents redundant searches
   - Builds knowledge base over time

### 💬 Enhanced Agent Responses

Verified agents receive:
- **Current Web Search Results**: Latest information from the internet
- **Explicit Instructions**: Clear guidance to use verified info over potentially outdated knowledge
- **Context Awareness**: Understanding that verification was performed
- **Source Attribution**: Links and dates from verified sources

## Usage Examples

### Automatic Verification Triggers

```javascript
// These prompts will automatically trigger verification:

"Latest AI model releases in 2024"
// ✅ Triggers: Contains '2024' and 'latest'

"Current Bitcoin price and market trends" 
// ✅ Triggers: Contains 'current' and 'price'

"New JavaScript framework updates and versions"
// ✅ Triggers: Contains 'new', 'framework', 'updates', 'versions'

"Recent startup acquisitions and IPOs"
// ✅ Triggers: Contains 'recent' and financial terms
```

### Stable Knowledge (No Verification)

```javascript
// These prompts typically won't trigger verification:

"Basic programming concepts and algorithms"
"Mathematical formulas and principles" 
"Historical events before 2020"
"Well-established scientific theories"
```

## Testing the System

Run the knowledge verification test suite:

```bash
npm run test:verification
```

This will test:
- Detection accuracy for high-risk topics
- Web search functionality
- Integration with the autonomous conversation engine
- Real-world conversation scenarios

## System Benefits

### 🎯 Prevents Hallucinations
- Automatically detects uncertain knowledge
- Provides current, verified information
- Reduces false or outdated information

### 🔄 Improves Over Time
- Learns from verification patterns
- Builds knowledge base in memory
- Adapts to conversation context

### 🌐 Real-Time Information
- Access to current web information
- Multiple source verification
- Date-aware fact checking

### 🤖 Seamless Integration
- Works automatically without user intervention
- Transparent to normal conversation flow
- Enhanced agent capabilities

## Configuration

### Environment Variables

Set these in your `.env` file to enable web search:

```env
# Required for web search verification
PLAYWRIGHT_MCP_ENABLED=true

# Optional: Customize verification rates
VERIFICATION_RATE_RESEARCH=0.9
VERIFICATION_RATE_ANALYST=0.8
VERIFICATION_RATE_SPECIALIST=0.7
```

### Customizing Verification Patterns

Edit `src/core/autonomous-conversation-engine.js`:

```javascript
// Add custom verification triggers
const alwaysVerifyPatterns = [
  // Add your custom patterns here
  'your-industry-terms',
  'company-specific-info'
];
```

## Technical Implementation

### Key Components

1. **Knowledge Verification Checker** (`checkKnowledgeVerification`)
   - Pattern matching for high-risk topics
   - Agent-specific probability rules
   - Randomized verification for edge cases

2. **Web Search Verifier** (`verifyKnowledgeWithWebSearch`)
   - Multi-query search strategy
   - Result aggregation and formatting
   - Memory storage for caching

3. **Enhanced Response Generation** (`generateAgentResponse`)
   - Automatic verification integration
   - Explicit prompting for verified information
   - Transparent logging and tracking

### Data Flow

```
Topic Input → Risk Assessment → [High Risk?] → Web Search → 
Verified Results → Enhanced Prompt → AI Response → [Verified Badge]
```

## Performance Considerations

- **Efficient Search Limiting**: Maximum 2 searches per verification
- **Memory Caching**: Stores results to prevent duplicate searches  
- **Async Processing**: Non-blocking verification operations
- **Error Handling**: Graceful fallbacks when verification fails

## Monitoring and Logging

The system provides comprehensive logging:

```
🔍 Verifying knowledge for: Latest AI model releases in 2024
  ✅ Knowledge verified with 2 searches
  🔧 Agent used MCP tools for enhanced response  
  ✅ Knowledge verified with web search to prevent hallucinations
```

Track verification events in conversation logs with:
- Verification trigger reasons
- Number of searches performed
- Success/failure rates
- Response enhancement metrics

## Best Practices

### For Developers
1. **Monitor Verification Rates**: Check logs for verification frequency
2. **Customize Patterns**: Add domain-specific verification triggers
3. **Test Edge Cases**: Use the test suite to validate detection
4. **Review Results**: Monitor agent response quality improvements

### For Users
1. **Current Information Queries**: Ask about recent events, knowing verification will occur
2. **Technical Updates**: Request latest technology information with confidence
3. **Market Data**: Query financial/market information knowing it will be verified
4. **Research Topics**: Ask for research knowing agents will fact-check

The Knowledge Verification System represents a significant advancement in AI reliability, ensuring that the multi-agent ensemble provides accurate, current, and well-sourced information while preventing the spread of AI hallucinations.