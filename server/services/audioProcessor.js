const fs = require('fs');
const path = require('path');
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

// State management for audio processing
let processingState = {
    isProcessing: false,
    audioBuffer: [],
    speechStarted: false,
    silenceTimer: null,
    conversationHistory: [],
    isPlayingResponse: false,
    lastSpeechTime: 0,
    speakerProfile: null
};

// Voice Activity Detection using energy levels
function detectVoiceActivity(buffer) {
    let sum = 0;
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    
    for (let i = 0; i < samples.length; i++) {
        sum += Math.abs(samples[i]);
    }
    
    const average = sum / samples.length;
    const threshold = 1000; // Adjust based on your needs
    
    return average > threshold;
}

// Create WAV header for audio files
function createWavHeader(dataLength) {
    const buffer = Buffer.alloc(44);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(16000, 24); // Sample rate
    buffer.writeUInt32LE(32000, 28); // Byte rate
    buffer.writeUInt16LE(2, 32); // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    
    return buffer;
}

// Save audio buffer as WAV file
async function saveBufferAsWav(buffer) {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filename = `temp_${Date.now()}.wav`;
    const filepath = path.join(tempDir, filename);
    
    // Create WAV header
    const wavHeader = createWavHeader(buffer.length);
    const wavFile = Buffer.concat([wavHeader, buffer]);
    
    fs.writeFileSync(filepath, wavFile);
    return filepath;
}

// Speech to Text using configured provider
async function speechToText(audioFilePath) {
    try {
        switch (process.env.STT_PROVIDER) {
            case 'openai':
                return await speechToTextOpenAI(audioFilePath);
            case 'web_speech':
                // For web speech, we'll handle this in the client-side
                throw new Error('Web Speech API should be handled client-side');
            case 'google':
                return await speechToTextGoogle(audioFilePath);
            default:
                // Fallback to OpenAI if available, otherwise throw error
                if (openai) {
                    return await speechToTextOpenAI(audioFilePath);
                }
                throw new Error('No STT provider configured');
        }
    } catch (error) {
        console.error('STT Error:', error);
        throw new Error('Speech to text failed');
    }
}

// OpenAI Whisper STT
async function speechToTextOpenAI(audioFilePath) {
    if (!openai) {
        throw new Error('OpenAI client not initialized');
    }
    
    const audioFile = fs.createReadStream(audioFilePath);
    const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en"
    });
    
    return transcription.text;
}

// Google Speech-to-Text (requires Google Cloud setup)
async function speechToTextGoogle(audioFilePath) {
    // This would require Google Cloud Speech-to-Text setup
    // For now, fallback to OpenAI if available
    if (openai) {
        return await speechToTextOpenAI(audioFilePath);
    }
    throw new Error('Google STT not implemented yet');
}

// Check if speech is addressing the user
async function isAddressingUser(transcription) {
    // Simple heuristics to determine if speech is addressing the user
    const text = transcription.toLowerCase();
    
    // Direct questions or commands
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'who', 'can you', 'could you', 'would you', 'will you'];
    const hasQuestion = questionWords.some(word => text.includes(word));
    
    // Addressing terms
    const addressingTerms = ['hey', 'hello', 'excuse me', 'assistant'];
    const isAddressing = addressingTerms.some(term => text.includes(term));
    
    // Commands or requests
    const commandWords = ['tell me', 'show me', 'help me', 'please', 'i need', 'i want'];
    const isCommand = commandWords.some(cmd => text.includes(cmd));
    
    // If recent conversation (within last 30 seconds), more likely to be continuation
    const timeSinceLastSpeech = Date.now() - processingState.lastSpeechTime;
    const isConversationContinuation = timeSinceLastSpeech < 30000;
    
    processingState.lastSpeechTime = Date.now();
    
    return hasQuestion || isAddressing || isCommand || isConversationContinuation;
}

// Generate AI response using configured provider
async function generateAIResponse(text) {
    try {
        // Add to conversation history
        processingState.conversationHistory.push({ role: 'user', content: text });
        
        // Keep only last 20 messages
        if (processingState.conversationHistory.length > 20) {
            processingState.conversationHistory = processingState.conversationHistory.slice(-20);
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
        processingState.conversationHistory.push({ role: 'assistant', content: response });
        
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
            ...processingState.conversationHistory
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
            ...processingState.conversationHistory
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
    
    // Convert conversation history to Gemini format
    const geminiMessages = processingState.conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
    
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${systemMessage}\n\n${processingState.conversationHistory[processingState.conversationHistory.length - 1].content}` }]
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

// Text to Speech using configured provider
async function textToSpeech(text) {
    try {
        switch (process.env.TTS_PROVIDER) {
            case 'openai':
                return await textToSpeechOpenAI(text);
            case 'web_speech':
                // For web speech, return null to use client-side TTS
                return null;
            case 'google':
                return await textToSpeechGoogle(text);
            default:
                // Fallback to OpenAI if available, otherwise return null for client-side TTS
                if (openai) {
                    return await textToSpeechOpenAI(text);
                }
                return null;
        }
    } catch (error) {
        console.error('TTS Error:', error);
        // Fallback to client-side TTS on error
        return null;
    }
}

// OpenAI TTS
async function textToSpeechOpenAI(text) {
    if (!openai) {
        throw new Error('OpenAI client not initialized');
    }
    
    const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        speed: 1.0
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer.toString('base64');
}

// Google Cloud TTS (requires setup)
async function textToSpeechGoogle(text) {
    // This would require Google Cloud Text-to-Speech setup
    // For now, fallback to OpenAI if available
    if (openai) {
        return await textToSpeechOpenAI(text);
    }
    // Return null to use client-side TTS
    return null;
}

// Process complete speech segment
async function processSpeech(socket) {
    if (!processingState.speechStarted || processingState.audioBuffer.length === 0) return;
    
    processingState.isProcessing = true;
    processingState.speechStarted = false;
    
    if (processingState.silenceTimer) {
        clearTimeout(processingState.silenceTimer);
        processingState.silenceTimer = null;
    }

    console.log('Processing speech...');
    socket.emit('processing-speech');

    try {
        // Combine audio buffers
        const combinedBuffer = Buffer.concat(processingState.audioBuffer);
        processingState.audioBuffer = [];

        // Save to temporary WAV file
        const tempFile = await saveBufferAsWav(combinedBuffer);
        
        // Speech to Text
        const transcription = await speechToText(tempFile);
        console.log('Transcription:', transcription);
        
        if (transcription && transcription.trim().length > 0) {
            socket.emit('transcription', { text: transcription });
            
            // Check if this is addressing the user
            if (await isAddressingUser(transcription)) {
                // Generate AI response
                const response = await generateAIResponse(transcription);
                console.log('AI Response:', response);
                
                // Text to Speech
                const audioResponse = await textToSpeech(response);
                
                socket.emit('ai-response', { 
                    text: response, 
                    audio: audioResponse,
                    timestamp: Date.now()
                });
            }
        }

        // Cleanup temp file
        fs.unlinkSync(tempFile);
        
    } catch (error) {
        console.error('Error in processSpeech:', error);
        socket.emit('error', { message: error.message });
    } finally {
        processingState.isProcessing = false;
    }
}

// Process individual audio chunk
async function processAudioChunk(audioData, socket) {
    if (processingState.isProcessing) return;

    // Convert base64 to buffer if needed
    const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData, 'base64');
    
    // Simple Voice Activity Detection
    const isVoiceDetected = detectVoiceActivity(buffer);
    
    if (isVoiceDetected && !processingState.speechStarted) {
        processingState.speechStarted = true;
        processingState.audioBuffer = [buffer];
        console.log('Speech detected, starting recording...');
        socket.emit('speech-started');
        
        // Clear any existing silence timer
        if (processingState.silenceTimer) {
            clearTimeout(processingState.silenceTimer);
            processingState.silenceTimer = null;
        }
    } else if (isVoiceDetected && processingState.speechStarted) {
        processingState.audioBuffer.push(buffer);
        
        // Reset silence timer
        if (processingState.silenceTimer) {
            clearTimeout(processingState.silenceTimer);
        }
    } else if (!isVoiceDetected && processingState.speechStarted) {
        // Start silence timer
        if (processingState.silenceTimer) {
            clearTimeout(processingState.silenceTimer);
        }
        
        processingState.silenceTimer = setTimeout(async () => {
            await processSpeech(socket);
        }, 1000); // 1 second of silence ends speech
    }

    // Prevent buffer from getting too large
    if (processingState.audioBuffer.length > 300) { // ~10 seconds at 30 chunks/sec
        await processSpeech(socket);
    }
}

// Start listening for audio
function startListening() {
    processingState.isPlayingResponse = false;
    console.log('Started listening');
}

// Stop listening for audio
function stopListening() {
    processingState.isPlayingResponse = true;
    if (processingState.silenceTimer) {
        clearTimeout(processingState.silenceTimer);
        processingState.silenceTimer = null;
    }
    processingState.speechStarted = false;
    processingState.audioBuffer = [];
    console.log('Stopped listening');
}

// Main handler function for audio streams
function handleAudioStream(socket) {
    socket.on('audio-chunk', async (audioData) => {
        if (processingState.isPlayingResponse) {
            // Ignore audio during TTS playback
            return;
        }

        try {
            await processAudioChunk(audioData, socket);
        } catch (error) {
            console.error('Error processing audio:', error);
            socket.emit('error', { message: 'Audio processing failed' });
        }
    });

    socket.on('stop-listening', () => {
        stopListening();
    });

    socket.on('start-listening', () => {
        startListening();
    });

    socket.on('tts-started', () => {
        processingState.isPlayingResponse = true;
        console.log('TTS playback started - muting microphone');
    });

    socket.on('tts-finished', () => {
        processingState.isPlayingResponse = false;
        console.log('TTS playback finished - unmuting microphone');
    });
}

// Process audio buffer from mobile app
async function processAudioBuffer(base64AudioData) {
    try {
        // Decode base64 to buffer
        const audioBuffer = Buffer.from(base64AudioData, 'base64');
        
        // Save to temporary file
        const tempFile = await saveBufferAsWav(audioBuffer);
        
        // Process with STT
        const transcription = await speechToText(tempFile);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        return transcription;
        
    } catch (error) {
        console.error('Error processing audio buffer:', error);
        throw error;
    }
}

module.exports = {
    handleAudioStream,
    textToSpeech,
    processAudioBuffer
};
