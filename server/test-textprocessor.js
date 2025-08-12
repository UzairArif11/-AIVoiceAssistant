require('dotenv').config();
const { generateAIResponse } = require('./services/textProcessor');

async function testTextProcessor() {
    console.log('🧪 Testing TextProcessor service...');
    
    try {
        console.log('📤 Sending test question...');
        const response = await generateAIResponse('Hello, can you hear me? Please respond with yes.');
        console.log('✅ TextProcessor Response:', response);
        console.log('✅ TextProcessor is working correctly!');
        
        // Test another question
        console.log('\n📤 Testing second question...');
        const response2 = await generateAIResponse('What is 2 plus 2?');
        console.log('✅ Second Response:', response2);
        
    } catch (error) {
        console.error('❌ TextProcessor Error:', error.message);
        console.error('❌ Stack:', error.stack);
    }
}

testTextProcessor();
