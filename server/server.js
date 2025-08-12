const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const { handleAudioStream } = require('./services/audioProcessor');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'AI Voice Assistant Server is running',
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ 
        status: 'healthy', 
        server: 'AI Voice Assistant',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Error handling
server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle test messages
    socket.on('test_message', (data) => {
        console.log('Received test message:', data);
        
        // Echo back a test response
        socket.emit('ai_response', {
            text: `Server received your test message: "${data.text}". Voice assistant is working!`,
            timestamp: Date.now()
        });
        
        // Simulate TTS completion
        setTimeout(() => {
            socket.emit('tts_complete');
        }, 2000);
    });
    
    // Handle TTS test requests
    socket.on('test_tts', async (data) => {
        console.log('🎧 Received TTS test request:', data.text);
        
        try {
            const { textToSpeech } = require('./services/audioProcessor');
            
            // Generate audio for the test text
            const audioBase64 = await textToSpeech(data.text);
            
            socket.emit('ai_response', {
                text: data.text,
                audio: audioBase64,
                timestamp: Date.now()
            });
            
            // Simulate TTS completion
            setTimeout(() => {
                socket.emit('tts_complete');
            }, 3000);
            
        } catch (error) {
            console.error('❌ TTS test error:', error);
            // Fallback to text-only response
            socket.emit('ai_response', {
                text: data.text,
                timestamp: Date.now()
            });
        }
    });
    
    // Handle text questions for AI processing
    socket.on('text_question', async (data) => {
        console.log('🎯 Received text question:', data.text);
        
        try {
            console.log('📝 Loading AI processing functions...');
            // Import the AI processing functions
            const { generateAIResponse } = require('./services/textProcessor');
            
            console.log('📡 Sending transcription to client...');
            socket.emit('transcription', { text: data.text });
            
            console.log('🤖 Generating AI response...');
            // Generate AI response
            const response = await generateAIResponse(data.text);
            console.log('✅ AI Response generated:', response);
            
            console.log('📤 Sending AI response to client...');
            socket.emit('ai_response', {
                text: response,
                timestamp: Date.now()
            });
            
            // Simulate TTS completion
            setTimeout(() => {
                console.log('🔊 TTS completion signal sent');
                socket.emit('tts_complete');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error processing text question:', error);
            console.error('❌ Error stack:', error.stack);
            socket.emit('ai_response', {
                text: "I'm sorry, I couldn't process that question right now. Please try again.",
                timestamp: Date.now()
            });
        }
    });
    
    // Handle continuous voice audio from mobile app
    socket.on('voice_audio', async (data) => {
        console.log('🎤 Received voice audio from mobile client');
        
        try {
            let transcription;
            
            if (data.audioData) {
                // Handle base64 audio data (native Android)
                const { processAudioBuffer } = require('./services/audioProcessor');
                transcription = await processAudioBuffer(data.audioData);
            } else if (data.audioUri) {
                // Handle Expo audio URI - simulate transcription for now
                console.log('📱 Expo audio URI received:', data.audioUri);
                // In a real implementation, you'd need to fetch the file from the URI
                // For now, simulate with a test response
                transcription = 'Hello, this is a test transcription from Expo audio';
            } else {
                throw new Error('No audio data or URI provided');
            }
            
            if (transcription && transcription.trim()) {
                console.log('📝 Transcription:', transcription);
                socket.emit('transcription', { text: transcription });
                
                // Generate AI response
                const { generateAIResponse } = require('./services/textProcessor');
                const response = await generateAIResponse(transcription);
                
                console.log('🤖 AI Response:', response);
                
                // Generate TTS audio
                const { textToSpeech } = require('./services/audioProcessor');
                const audioResponse = await textToSpeech(response);
                
                socket.emit('ai_response', {
                    text: response,
                    audio: audioResponse,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('❌ Error processing voice audio:', error);
            socket.emit('error', { message: 'Failed to process voice audio: ' + error.message });
        }
    });
    
    // Handle audio stream (for other clients)
    handleAudioStream(socket);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

