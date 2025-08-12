# API Key Setup Guide

This guide will help you get API keys for different AI providers, including **FREE** options!

## Free Options (Recommended to Start)

### 1. OpenRouter (FREE Models Available) 🆓

**Why Choose OpenRouter:**
- Has completely FREE models (Gemma 2 9B, Llama 3.1 8B)
- No credit card required for free models
- Easy to get started
- Compatible with OpenAI API format

**Steps:**
1. Go to https://openrouter.ai
2. Click "Sign Up" (can use Google/GitHub)
3. Go to "Keys" section: https://openrouter.ai/keys
4. Click "Create Key"
5. Copy the key (starts with `sk-or-v1-...`)
6. In your `.env` file:
```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=google/gemma-2-9b-it:free
```

**Free Models Available:**
- `google/gemma-2-9b-it:free` - Good quality, completely free
- `meta-llama/llama-3.1-8b-instruct:free` - Also free, good for conversations
- `microsoft/phi-3-mini-128k-instruct:free` - Smaller but fast

### 2. Google Gemini API (FREE Tier) 🆓

**Why Choose Gemini:**
- 60 requests per minute FREE
- No credit card required initially
- Very fast responses
- Good quality

**Steps:**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)
5. In your `.env` file:
```env
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSy-your-key-here
GEMINI_MODEL=gemini-1.5-flash
```

## Paid Options (If You Want Premium)

### 3. OpenAI (Your Current Account)

**You already have this!** Your dashboard shows $0/$5, meaning you have $5 in free credits.

**Steps:**
1. Go to https://platform.openai.com/account/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-...`)
4. In your `.env` file:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

## Speech Services (Optional)

For Speech-to-Text and Text-to-Speech, you can use:

### Free Client-Side Options (Recommended)
```env
STT_PROVIDER=web_speech  # Uses browser's speech recognition
TTS_PROVIDER=web_speech  # Uses browser's text-to-speech
```

### Paid Server-Side Options
- Use OpenAI for both STT and TTS (costs extra)
- Set `STT_PROVIDER=openai` and `TTS_PROVIDER=openai`

## Complete .env Setup Examples

### Option 1: Completely Free (OpenRouter)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Provider Configuration
AI_PROVIDER=openrouter

# OpenRouter Configuration (FREE models available)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=google/gemma-2-9b-it:free

# Speech Services (Free)
STT_PROVIDER=web_speech
TTS_PROVIDER=web_speech

# Assistant Configuration
MAX_RESPONSE_LENGTH=200
CONVERSATION_CONTEXT_LENGTH=10
```

### Option 2: Free Tier (Google Gemini)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Provider Configuration
AI_PROVIDER=gemini

# Google Gemini Configuration (FREE tier: 60 requests/min)
GOOGLE_API_KEY=AIzaSy-your-key-here
GEMINI_MODEL=gemini-1.5-flash

# Speech Services (Free)
STT_PROVIDER=web_speech
TTS_PROVIDER=web_speech

# Assistant Configuration
MAX_RESPONSE_LENGTH=200
CONVERSATION_CONTEXT_LENGTH=10
```

### Option 3: OpenAI (Your Existing Credits)
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Provider Configuration
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini

# Speech Services
STT_PROVIDER=openai
TTS_PROVIDER=openai

# Assistant Configuration
MAX_RESPONSE_LENGTH=200
CONVERSATION_CONTEXT_LENGTH=10
```

## Quick Setup Steps

1. **Choose your option** (I recommend OpenRouter for completely free)
2. **Copy the `.env.example`** to `.env`:
   ```bash
   cp server/.env.example server/.env
   ```
3. **Edit `server/.env`** with your chosen configuration
4. **Test the setup** by starting the server:
   ```bash
   cd server
   npm run dev
   ```

## Cost Comparison

| Provider | Cost | Free Tier | Quality |
|----------|------|-----------|---------|
| OpenRouter (Free models) | $0 | Unlimited | Good |
| Google Gemini | $0 | 60 req/min | Very Good |
| OpenAI (your account) | ~$0.001/request | $5 credits | Excellent |

## Troubleshooting

### OpenRouter Not Working?
- Make sure your API key starts with `sk-or-v1-`
- Verify you're using a free model (ends with `:free`)
- Check the OpenRouter status page

### Gemini Not Working?
- Ensure your API key starts with `AIza`
- Check you haven't exceeded 60 requests/minute
- Verify the model name is correct

### OpenAI Not Working?
- Make sure your API key starts with `sk-proj-`
- Check you have credits remaining in your account
- Verify the model name is supported

## Next Steps

Once you've set up your API keys:
1. Start the server: `cd server && npm run dev`
2. Test with a simple curl request or start the React Native client
3. If it works, proceed with the full mobile app setup!

## Need Help?

If you have issues:
1. Check the server console logs for error messages
2. Verify your API keys are correct
3. Make sure you've selected the right AI_PROVIDER
4. Try the free options first (OpenRouter or Gemini)
