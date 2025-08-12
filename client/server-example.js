const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Mock AI response function
function processWithAI(text) {
  // Simulate AI processing
  const responses = [
    "That's an interesting question! Let me think about that...",
    "I understand what you're saying. Here's my thoughts on that:",
    "Great point! I'd say that...",
    "Let me help you with that. Based on what you said:",
    "That's a good question. From my perspective..."
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  return `${randomResponse} You said: "${text}"`;
}

// Mock transcription function (you'd replace this with real STT)
function transcribeAudio(audioBuffer) {
  // This is a mock - in real implementation you'd use:
  // - OpenAI Whisper API
  // - Google Speech-to-Text
  // - Azure Speech Services
  // - AWS Transcribe
  
  const mockTranscriptions = [
    "What is the weather like today?",
    "Tell me a joke",
    "How are you doing?",
    "What can you help me with?",
    "Hello, can you hear me?"
  ];
  
  return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
}

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Handle text messages (this works)
  socket.on('text_question', async (data) => {
    console.log('📝 Text message:', data.text);
    
    try {
      // Process with AI
      const aiResponse = await processWithAI(data.text);
      
      // Send response back
      socket.emit('ai_response', { 
        text: aiResponse,
        audio: null // You can add TTS audio here if needed
      });
      
    } catch (error) {
      console.error('Error processing text:', error);
      socket.emit('ai_response', { 
        text: 'Sorry, I had trouble processing your message.',
        audio: null 
      });
    }
  });

  // Handle voice messages (ADD THIS TO YOUR SERVER!)
  socket.on('speech_audio', async (data) => {
    console.log('🎤 Speech audio received, size:', data.audio.length, 'characters');
    
    try {
      // 1. Convert base64 to audio buffer
      const audioBuffer = Buffer.from(data.audio, 'base64');
      console.log('Audio buffer size:', audioBuffer.length, 'bytes');
      
      // 2. Save audio file for debugging (optional)
      const filename = `audio_${Date.now()}.wav`;
      fs.writeFileSync(filename, audioBuffer);
      console.log('Saved audio file:', filename);
      
      // 3. Transcribe audio (mock implementation)
      const transcription = transcribeAudio(audioBuffer);
      console.log('🔤 Transcribed:', transcription);
      
      // 4. Send transcription back
      socket.emit('transcription', { text: transcription });
      
      // 5. Process with AI
      const aiResponse = await processWithAI(transcription);
      console.log('🤖 AI Response:', aiResponse);
      
      // 6. Send AI response back
      socket.emit('ai_response', { 
        text: aiResponse,
        audio: null // You can add TTS audio here if needed
      });
      
    } catch (error) {
      console.error('❌ Speech processing error:', error);
      socket.emit('ai_response', { 
        text: 'Sorry, I had trouble processing your voice message.',
        audio: null 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Make sure your client connects to this address`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Server shutting down...');
  process.exit(0);
});
