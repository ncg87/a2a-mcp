# API Keys Reference

## Required Environment Variables

### AI/ML Services
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models  
- `HUGGINGFACE_API_TOKEN` - Hugging Face API token for model inference

### Development Tools
- `GITHUB_TOKEN` - GitHub personal access token
- `DOCKER_HUB_TOKEN` - Docker Hub access token

### Data & Analytics
- `KAGGLE_KEY` - Kaggle API key
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage financial data API key

### Communication
- `SLACK_BOT_TOKEN` - Slack bot token
- `DISCORD_BOT_TOKEN` - Discord bot token

### Cloud Services
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

### Productivity
- `NOTION_TOKEN` - Notion integration token
- `AIRTABLE_API_KEY` - Airtable API key

### Utilities
- `OPENWEATHER_API_KEY` - OpenWeather API key

## How to Get These Keys

### OpenAI
1. Go to https://platform.openai.com
2. Sign up/login
3. Navigate to API Keys section
4. Create new secret key

### Anthropic
1. Go to https://console.anthropic.com
2. Sign up/login
3. Navigate to API Keys
4. Generate new key

### GitHub
1. Go to https://github.com/settings/tokens
2. Generate new token (classic)
3. Select required scopes

### Kaggle
1. Go to https://www.kaggle.com/settings/account
2. Scroll to API section
3. Create new API token

### Alpha Vantage
1. Go to https://www.alphavantage.co/support/#api-key
2. Get free API key

### Others
Similar process - visit respective platforms and generate API keys from developer/settings sections.

## Setting Environment Variables

### Windows
```cmd
set OPENAI_API_KEY=your_key_here
set ANTHROPIC_API_KEY=your_key_here
```

### Linux/Mac
```bash
export OPENAI_API_KEY=your_key_here
export ANTHROPIC_API_KEY=your_key_here
```

### .env File
Create `.env` file in project root:
```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GITHUB_TOKEN=your_token_here
# ... etc
```