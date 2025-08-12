const io = require('socket.io-client');
require('dotenv').config();

console.log('🧪 Testing Web AI Voice Assistant...');
console.log(`🔧 AI Provider: ${process.env.AI_PROVIDER}`);
console.log(`🔧 OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);

// Connect to the server
const socket = io('http://localhost:3001', {
    timeout: 10000,
    forceNew: true
});

let responseReceived = false;

socket.on('connect', () => {
    console.log('✅ Connected to server successfully');
    
    // Test AI question immediately
    console.log('📤 Sending test question to AI...');
    socket.emit('text_question', {
        text: 'Hello AI, can you hear me? Please respond with a simple yes.',
        timestamp: Date.now()
    });
});

socket.on('transcription', (data) => {
    console.log('📝 Transcription received:', data.text);
});

socket.on('ai_response', (data) => {
    console.log('🤖 AI Response received:', data.text);
    responseReceived = true;
    
    // Test another question
    setTimeout(() => {
        console.log('📤 Sending second question...');
        socket.emit('text_question', {
            text: 'What is 2 plus 2?',
            timestamp: Date.now()
        });
    }, 2000);
});

socket.on('tts_complete', () => {
    console.log('🔊 TTS complete signal received');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
});

// Check results after 15 seconds
setTimeout(() => {
    console.log('\n📊 Test Results:');
    console.log(`Connection: ${socket.connected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`AI Response: ${responseReceived ? '✅ Working' : '❌ Not working'}`);
    
    if (!responseReceived) {
        console.log('\n🔍 Debugging Info:');
        console.log(`- Socket ID: ${socket.id}`);
        console.log(`- Server URL: http://localhost:3001`);
        console.log('- Make sure server is running with AI provider configured');
    }
    
    console.log('\n🔚 Test completed');
    socket.disconnect();
    process.exit(responseReceived ? 0 : 1);
}, 15000);
