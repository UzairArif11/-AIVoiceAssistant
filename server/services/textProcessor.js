const axios = require('axios');
const { OpenAI } = require('openai');

// Initialize AI clients based on provider
let openai = null;
let geminiClient = null;
let openrouterClient = null;

// Initialize OpenAI client if needed
if (process.env.AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

// Initialize OpenRouter client if needed
if (process.env.AI_PROVIDER === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    openrouterClient = axios.create({
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'AI Voice Assistant'
        }
    });
}

// Simple conversation state for this session
let conversationHistory = [];

// Generate AI response using configured provider
async function generateAIResponse(text) {
    try {
        // Add to conversation history
        conversationHistory.push({ role: 'user', content: text });
        
        // Keep only last 10 messages to avoid token limits
        if (conversationHistory.length > 20) {
            conversationHistory = conversationHistory.slice(-20);
        }

        const systemMessage = "You are a helpful AI voice assistant. Provide concise, conversational responses. Keep responses under 2-3 sentences unless more detail is specifically requested. You're speaking through earphones, so be natural and friendly.";
        
        let response;
        
        switch (process.env.AI_PROVIDER) {
            case 'openai':
                response = await generateOpenAIResponse(systemMessage);
                break;
            case 'openrouter':
                response = await generateOpenRouterResponse(systemMessage);
                break;
            case 'gemini':
                response = await generateGeminiResponse(systemMessage);
                break;
            default:
                throw new Error(`Unknown AI provider: ${process.env.AI_PROVIDER}`);
        }
        
        // Add to conversation history
        conversationHistory.push({ role: 'assistant', content: response });
        
        return response;
    } catch (error) {
        console.error('AI Response Error:', error);
        return "I'm sorry, I couldn't process that request right now.";
    }
}

// OpenAI response generation
async function generateOpenAIResponse(systemMessage) {
    if (!openai) {
        throw new Error('OpenAI client not initialized');
    }
    
    const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
            { role: "system", content: systemMessage },
            ...conversationHistory
        ],
        max_tokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 150,
        temperature: 0.7
    });

    return completion.choices[0].message.content;
}

// OpenRouter response generation (FREE models available)
async function generateOpenRouterResponse(systemMessage) {
    if (!openrouterClient) {
        throw new Error('OpenRouter client not initialized');
    }
    
    const response = await openrouterClient.post('/chat/completions', {
        model: process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free',
        messages: [
            { role: 'system', content: systemMessage },
            ...conversationHistory
        ],
        max_tokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 150,
        temperature: 0.7
    });

    return response.data.choices[0].message.content;
}

// Google Gemini response generation (FREE tier)
async function generateGeminiResponse(systemMessage) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error('Google API key not configured');
    }
    
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${systemMessage}\n\n${conversationHistory[conversationHistory.length - 1].content}` }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: parseInt(process.env.MAX_RESPONSE_LENGTH) || 150
            }
        }
    );

    return response.data.candidates[0].content.parts[0].text;
}

module.exports = {
    generateAIResponse
};
