const axios = require('axios');
require('dotenv').config();

async function testOpenRouter() {
    console.log('🧪 Testing OpenRouter API directly...');
    console.log(`🔧 API Key: ${process.env.OPENROUTER_API_KEY ? 'Present' : 'Missing'}`);
    console.log(`🔧 Model: ${process.env.OPENROUTER_MODEL}`);
    
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant. Respond briefly.'
                },
                {
                    role: 'user',
                    content: 'Hello, can you hear me? Please say yes.'
                }
            ],
            max_tokens: 50,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'http://localhost:3001',
                'X-Title': 'AI Voice Assistant Test'
            },
            timeout: 10000
        });
        
        console.log('✅ OpenRouter API Response:', response.data.choices[0].message.content);
        console.log('✅ API is working correctly!');
        
    } catch (error) {
        console.error('❌ OpenRouter API Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

testOpenRouter();
