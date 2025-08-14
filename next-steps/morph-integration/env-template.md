# Morph LLM Environment Variables Template

Copy these variables to your `.env.local` file and fill in your values:

```env
# Required: Morph API Key
MORPH_API_KEY=your_morph_api_key_here

# API Configuration
MORPH_API_TIMEOUT=30000
MORPH_MAX_RETRIES=3
MORPH_API_BASE_URL=https://api.morphllm.com/v1

# Fast Apply Configuration
MORPH_FAST_APPLY_ENABLED=true
MORPH_CACHE_TTL=300000
MORPH_CACHE_MAX_SIZE=100
MORPH_BATCH_SIZE=5

# Priority Timeouts
MORPH_PRIORITY_TIMEOUT_HIGH=30000
MORPH_PRIORITY_TIMEOUT_MEDIUM=15000
MORPH_PRIORITY_TIMEOUT_LOW=10000

# Debug Configuration
MORPH_DEBUG=false
MORPH_DRY_RUN=false
MORPH_LOG_LEVEL=info
MORPH_LOG_FORMAT=json

# Performance Configuration
MORPH_ENABLE_METRICS=true
MORPH_ENABLE_CACHING=true
MORPH_ENABLE_BACKUP=true

# Validation Configuration
MORPH_MAX_FILE_SIZE=100000
MORPH_MAX_INSTRUCTION_LENGTH=1000
MORPH_REQUIRE_CODE_MARKERS=true

# Metrics Configuration
MORPH_METRICS_RETENTION=86400000
MORPH_METRICS_FLUSH_INTERVAL=60000
```

## Required Variables

### MORPH_API_KEY
- **Type**: String
- **Required**: Yes
- **Description**: Your Morph LLM API key
- **Format**: `morph_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Get it from**: [morphllm.com](https://morphllm.com)

## Optional Variables

### API Configuration
- `MORPH_API_TIMEOUT`: API request timeout in milliseconds (default: 30000)
- `MORPH_MAX_RETRIES`: Maximum number of retry attempts (default: 3)
- `MORPH_API_BASE_URL`: Custom API base URL (default: https://api.morphllm.com/v1)

### Fast Apply Configuration
- `MORPH_FAST_APPLY_ENABLED`: Enable Fast Apply functionality (default: true)
- `MORPH_CACHE_TTL`: Cache time-to-live in milliseconds (default: 300000 = 5 minutes)
- `MORPH_CACHE_MAX_SIZE`: Maximum number of cached files (default: 100)
- `MORPH_BATCH_SIZE`: Maximum batch size for parallel processing (default: 5)

### Priority Timeouts
- `MORPH_PRIORITY_TIMEOUT_HIGH`: Timeout for high priority requests (default: 30000ms)
- `MORPH_PRIORITY_TIMEOUT_MEDIUM`: Timeout for medium priority requests (default: 15000ms)
- `MORPH_PRIORITY_TIMEOUT_LOW`: Timeout for low priority requests (default: 10000ms)

### Debug Configuration
- `MORPH_DEBUG`: Enable debug logging (default: false)
- `MORPH_DRY_RUN`: Enable dry run mode (default: false)
- `MORPH_LOG_LEVEL`: Log level (info, warn, error, debug) (default: info)
- `MORPH_LOG_FORMAT`: Log format (json, text) (default: json)

### Performance Configuration
- `MORPH_ENABLE_METRICS`: Enable performance metrics collection (default: true)
- `MORPH_ENABLE_CACHING`: Enable file caching (default: true)
- `MORPH_ENABLE_BACKUP`: Enable automatic backups before edits (default: true)

### Validation Configuration
- `MORPH_MAX_FILE_SIZE`: Maximum file size in bytes (default: 100000 = 100KB)
- `MORPH_MAX_INSTRUCTION_LENGTH`: Maximum instruction length (default: 1000)
- `MORPH_REQUIRE_CODE_MARKERS`: Require code markers in edits (default: true)

### Metrics Configuration
- `MORPH_METRICS_RETENTION`: Metrics retention time in milliseconds (default: 86400000 = 24 hours)
- `MORPH_METRICS_FLUSH_INTERVAL`: Metrics flush interval in milliseconds (default: 60000 = 1 minute)

## Example Configuration

```env
# Production Configuration
MORPH_API_KEY=morph_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MORPH_FAST_APPLY_ENABLED=true
MORPH_CACHE_TTL=600000
MORPH_DEBUG=false
MORPH_ENABLE_METRICS=true

# Development Configuration
MORPH_API_KEY=morph_dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MORPH_FAST_APPLY_ENABLED=true
MORPH_CACHE_TTL=300000
MORPH_DEBUG=true
MORPH_DRY_RUN=true
MORPH_LOG_LEVEL=debug

# Testing Configuration
MORPH_API_KEY=morph_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MORPH_FAST_APPLY_ENABLED=false
MORPH_DEBUG=true
MORPH_DRY_RUN=true
MORPH_ENABLE_METRICS=false
```

## Security Notes

1. **Never commit your API key** to version control
2. **Use different API keys** for different environments
3. **Rotate API keys** regularly
4. **Monitor API usage** to prevent unexpected charges
5. **Use environment-specific configurations** for production vs development

## Troubleshooting

If you encounter issues:

1. **Check API key format**: Should start with `morph_`
2. **Verify API key validity**: Test with curl or Postman
3. **Check environment variables**: Ensure they're loaded correctly
4. **Enable debug mode**: Set `MORPH_DEBUG=true` for detailed logs
5. **Use dry run mode**: Set `MORPH_DRY_RUN=true` to test without making changes
