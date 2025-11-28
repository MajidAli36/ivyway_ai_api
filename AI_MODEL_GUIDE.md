# AI Model Configuration Guide

## ✅ Your API Key is Already Set Up!

Your Google AI Studio API key is already configured in the `env` file:
```
GEMINI_API_KEY=AIzaSyA9woUOIf8jQs70cJYyVcCjxq-1O5Q4AP4
```

## 🎯 How Model Selection Works

### Current Configuration

Your system is set to use **Gemini** as the provider (configured in `env` file):
- `LLM_PROVIDER=gemini`

### Default Models

Based on your `env` file, these are the default models for each feature:

| Feature | Model Name | Environment Variable |
|---------|-----------|---------------------|
| **AI Tutor** | `gemini-pro` | `TUTOR_MODEL_GEMINI` |
| **Lesson Generator** | `gemini-pro` | `LESSON_MODEL` |
| **Quiz Generator** | `gemini-pro` | `QUIZ_MODEL` |

### Smart Model Selection Logic

The system has **intelligent fallback logic** that:

1. **First**, tries to discover available models from Google AI Studio
2. **Then**, tries models in this priority order:
   - Free-tier models from available list (gemini-1.5-flash, gemini-1.5-pro, gemini-pro)
   - Falls back to: `gemini-1.5-flash` → `gemini-1.5-pro` → `gemini-pro`
   - Finally tries the model specified in your config

3. **Automatically handles**:
   - Model not found errors (tries next model)
   - Quota exceeded errors (retries with delay)
   - Rate limiting issues

## 📋 Available Google AI Studio Models

Common models available with Google AI Studio API:

### Free Tier Models (Recommended)
- **`gemini-1.5-flash`** - Fast, efficient, free tier
- **`gemini-1.5-pro`** - More capable, free tier
- **`gemini-pro`** - Original Gemini Pro model

### Paid/Preview Models
- `gemini-1.5-flash-latest`
- `gemini-1.5-pro-latest`
- Various experimental/preview models

## 🔧 How to Change the Model

### Option 1: Change Default Models in `env` File

Edit `ivyway_ai_api/env` and update these lines:

```env
# For AI Tutor conversations
TUTOR_MODEL_GEMINI=gemini-1.5-flash

# For Lesson Generation
LESSON_MODEL=gemini-1.5-pro

# For Quiz Generation
QUIZ_MODEL=gemini-1.5-flash
```

### Option 2: Check Which Model Was Actually Used

The API response includes the model that was actually used:

```json
{
  "text": "Response text...",
  "model": "gemini-1.5-flash",  // ← This shows which model was used
  "provider": "gemini",
  "latencyMs": 1234
}
```

## 🧪 Testing Your Configuration

### 1. Check Available Models

The system automatically discovers available models when making API calls. You can see this in the logs.

### 2. Test with a Simple Request

Make an API call to any AI feature (tutor, lesson, quiz) and check the response to see which model was used.

### 3. Monitor Logs

When the API runs, it will:
- List available models (if discovery succeeds)
- Show which model variant is being tried
- Display the final model used in the response

## 📝 Model Selection Priority

When a request is made, the system tries models in this order:

1. **Free-tier models from discovery** (if available)
   - gemini-1.5-flash
   - gemini-1.5-pro
   - gemini-pro

2. **Fallback list** (if discovery fails)
   - gemini-1.5-flash
   - gemini-1.5-pro
   - gemini-pro

3. **Your configured model** (from env file)
   - TUTOR_MODEL_GEMINI
   - LESSON_MODEL
   - QUIZ_MODEL

## ⚠️ Important Notes

1. **Model Availability**: Not all models may be available with your API key tier. The system will automatically try alternatives.

2. **Quota Limits**: Free tier has rate limits. The system handles quota errors automatically with retry delays.

3. **Model Names**: Use exact model names (e.g., `gemini-1.5-flash`, not `gemini-1.5-flash-latest` unless you specifically want the latest version).

4. **Restart Required**: After changing `env` file, restart your API server for changes to take effect.

## 🚀 Recommended Settings

For best performance and cost efficiency:

```env
# Fast and free - good for most tasks
TUTOR_MODEL_GEMINI=gemini-1.5-flash
LESSON_MODEL=gemini-1.5-flash
QUIZ_MODEL=gemini-1.5-flash

# Or for higher quality (slightly slower)
TUTOR_MODEL_GEMINI=gemini-1.5-pro
LESSON_MODEL=gemini-1.5-pro
QUIZ_MODEL=gemini-1.5-pro
```

## 🔍 How to Identify Which Model is Being Used

1. **Check API Response**: The `model` field in the response shows the actual model used
2. **Check Server Logs**: Console logs show model selection attempts
3. **Check Database**: If responses are stored, the model name may be saved

## 📚 Related Files

- `src/ai/providers.ts` - Model selection and API calling logic
- `src/config/env.ts` - Environment configuration
- `env` - Your environment variables file

