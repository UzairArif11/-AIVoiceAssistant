const io = require('socket.io-client');
require('dotenv').config();

console.log('Testing AI Voice Assistant Server...');
console.log(`AI Provider: ${process.env.AI_PROVIDER}`);

// Connect to the server
const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test 1: Simple test message
    console.log('\n📤 Sending test message...');
    socket.emit('test_message', {
        text: 'Test voice message from test script',
        timestamp: Date.now()
    });
    
    // Test 2: Text question for AI
    setTimeout(() => {
        console.log('📤 Sending text question to AI...');
        socket.emit('text_question', {
            text: 'Hello, can you hear me?',
            timestamp: Date.now()
        });
    }, 2000);
    
    // Test 3: Another question
    setTimeout(() => {
        console.log('📤 Asking AI a question...');
        socket.emit('text_question', {
            text: 'What is the weather like today?',
            timestamp: Date.now()
        });
    }, 5000);
});

socket.on('ai_response', (data) => {
    console.log('✅ AI Response received:', data.text);
});

socket.on('transcription', (data) => {
    console.log('✅ Transcription received:', data.text);
});

socket.on('tts_complete', () => {
    console.log('✅ TTS complete signal received');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

// Exit after 10 seconds
setTimeout(() => {
    console.log('\n🔚 Test completed');
    socket.disconnect();
    process.exit(0);
}, 10000);
