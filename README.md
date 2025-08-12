# AI Voice Assistant - Wake-Word-Free Voice Commands

A React Native (Expo) Android app that connects to AirPods and acts as an intelligent voice assistant with continuous listening, voice activity detection, and AI-powered responses.

## Features

- **Continuous Audio Monitoring**: Background service continuously listens for voice input
- **Voice Activity Detection (VAD)**: Detects when you're speaking to minimize false triggers
- **AirPods Integration**: Optimized for Bluetooth audio devices, especially AirPods
- **AI-Powered Responses**: Uses OpenAI GPT models for intelligent conversation
- **Speech-to-Text**: OpenAI Whisper for accurate transcription
- **Text-to-Speech**: OpenAI TTS for natural-sounding responses
- **Smart Context Detection**: Recognizes when you're addressing the assistant vs. talking to others
- **Echo Prevention**: Mutes microphone during TTS playback to prevent feedback loops
- **Background Processing**: Works while app is in background

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Audio Pipeline Flow                      │
└─────────────────────────────────────────────────────────────────┘

AirPods Microphone
       ↓
Android AudioRecord (Native Service)
       ↓
Voice Activity Detection (VAD)
       ↓
Audio Chunking & Streaming
       ↓
Socket.IO → Express Server
       ↓
OpenAI Whisper (Speech-to-Text)
       ↓
Context Analysis (Is user addressing assistant?)
       ↓
OpenAI GPT (Generate Response)
       ↓
OpenAI TTS (Text-to-Speech)
       ↓
Socket.IO → React Native Client
       ↓
Audio Playback through AirPods
       ↓
Microphone Muting during playback
```

## Project Structure

```
AIVoiceAssistant/
├── server/                    # Express.js AI processing server
│   ├── services/
│   │   └── audioProcessor.js  # Audio processing and AI pipeline
│   ├── server.js             # Main server file
│   ├── package.json
│   └── .env                  # API keys and configuration
├── client/                   # Expo React Native app
│   ├── components/
│   │   ├── VoiceAssistant.js      # Main voice assistant component
│   │   ├── PermissionsManager.js  # Android permissions handling
│   │   └── BluetoothManager.js    # Bluetooth/AirPods management
│   ├── App.js               # Main app component
│   ├── app.json             # Expo configuration
│   └── package.json
└── android/                 # Native Android modules (for production)
    └── app/src/main/java/com/aivoiceassistant/
        ├── AudioRecordModule.java     # Native audio recording
        ├── BluetoothModule.java       # Bluetooth management
        └── ForegroundService.java     # Background service
```

## Setup Instructions

### Prerequisites

- Node.js 16+
- Android Studio
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- OpenAI API key
- Android device with AirPods

### 1. Server Setup

```bash
cd server
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys:
# OPENAI_API_KEY=your_openai_api_key_here
```

**Environment Variables (.env):**

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Voice Activity Detection Settings
VAD_AGGRESSIVE_MODE=3
MIN_SPEECH_DURATION=500
MAX_SPEECH_DURATION=30000

# AI Assistant Configuration
ASSISTANT_NAME=Assistant
MAX_RESPONSE_LENGTH=200
CONVERSATION_CONTEXT_LENGTH=10
```

**Start the server:**

```bash
npm run dev
```

### 2. Client Setup

```bash
cd client
npm install

# For development builds (required for native modules)
npx expo install --fix
```

**Update server URL in VoiceAssistant.js:**

```javascript
const SERVER_URL = 'http://YOUR_COMPUTER_IP:3001'; // Replace with your actual IP
```

### 3. Expo Development Build

Since this app requires native modules for advanced audio processing and Bluetooth handling, you'll need to create a development build:

```bash
# Initialize Expo development build
npx expo install expo-dev-client

# Create development build
eas build --profile development --platform android

# Or run locally (requires Android Studio)
npx expo run:android
```

### 4. Android Permissions

The app requests these permissions automatically:

- `RECORD_AUDIO` - For microphone access
- `BLUETOOTH` & `BLUETOOTH_ADMIN` - For Bluetooth connectivity
- `BLUETOOTH_CONNECT` - For Android 12+ Bluetooth access
- `MODIFY_AUDIO_SETTINGS` - For audio routing control
- `FOREGROUND_SERVICE` - For background voice processing
- `WAKE_LOCK` - To keep the service running

## How It Works

### Voice Activity Detection

The system uses energy-level analysis to detect when someone is speaking:

```javascript
function detectVoiceActivity(buffer) {
    let sum = 0;
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    
    for (let i = 0; i < samples.length; i++) {
        sum += Math.abs(samples[i]);
    }
    
    const average = sum / samples.length;
    const threshold = 1000; // Adjustable threshold
    
    return average > threshold;
}
```

### Context Detection

The assistant determines if speech is directed at it using heuristics:

```javascript
async function isAddressingUser(transcription) {
    const text = transcription.toLowerCase();
    
    // Check for questions, commands, or addressing terms
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'who'];
    const addressingTerms = ['hey', 'hello', 'assistant'];
    const commandWords = ['tell me', 'show me', 'help me', 'please'];
    
    const hasQuestion = questionWords.some(word => text.includes(word));
    const isAddressing = addressingTerms.some(term => text.includes(term));
    const isCommand = commandWords.some(cmd => text.includes(cmd));
    
    // Consider conversation continuity
    const timeSinceLastSpeech = Date.now() - lastSpeechTime;
    const isConversationContinuation = timeSinceLastSpeech < 30000;
    
    return hasQuestion || isAddressing || isCommand || isConversationContinuation;
}
```

### Echo Prevention

During TTS playback, the microphone is muted to prevent the assistant from hearing its own voice:

```javascript
socket.on('tts-started', () => {
    processingState.isPlayingResponse = true;
    console.log('TTS playback started - muting microphone');
});

socket.on('tts-finished', () => {
    processingState.isPlayingResponse = false;
    console.log('TTS playback finished - unmuting microphone');
});
```

## Advanced Features

### Custom Wake Word (Future Enhancement)

For production use, you can implement a custom wake word detector:

```javascript
// Example using TensorFlow.js for wake word detection
import * as tf from '@tensorflow/tfjs';

async function detectWakeWord(audioBuffer) {
    const model = await tf.loadLayersModel('/path/to/wake-word-model.json');
    const prediction = model.predict(audioBuffer);
    return prediction.dataSync()[0] > 0.8; // Confidence threshold
}
```

### Speaker Recognition (Future Enhancement)

Distinguish between different speakers to improve context detection:

```javascript
// Example speaker recognition integration
async function identifySpeaker(audioBuffer) {
    const speakerEmbedding = await extractSpeakerEmbedding(audioBuffer);
    const similarity = cosineSimilarity(speakerEmbedding, userProfile.voiceEmbedding);
    return similarity > 0.85; // Speaker match threshold
}
```

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Ensure both device and server are on the same network
   - Check firewall settings on your computer
   - Verify the SERVER_URL in VoiceAssistant.js

2. **Audio Problems**
   - Make sure AirPods are properly connected
   - Check Bluetooth permissions are granted
   - Verify audio route is set to Bluetooth

3. **Permission Errors**
   - Grant all required permissions in Android settings
   - For Android 12+, ensure Bluetooth permissions are granted
   - Check microphone permissions are not blocked

4. **Background Processing**
   - Disable battery optimization for the app
   - Ensure foreground service permission is granted
   - Keep the app screen on during initial testing

### Performance Optimization

1. **Adjust VAD Sensitivity**
   ```javascript
   const threshold = 1000; // Lower = more sensitive, Higher = less sensitive
   ```

2. **Optimize Audio Chunking**
   ```javascript
   const CHUNK_INTERVAL = 100; // Milliseconds between audio chunks
   ```

3. **Tune AI Response Length**
   ```env
   MAX_RESPONSE_LENGTH=150  # Shorter responses = faster processing
   ```

## Production Deployment

### Server Deployment

Deploy the Express server to a cloud provider:

```bash
# Example with PM2
npm install -g pm2
pm2 start server.js --name ai-voice-assistant
pm2 startup
pm2 save
```

### App Distribution

Build and distribute the Android app:

```bash
# Production build
eas build --profile production --platform android

# Generate AAB for Play Store
eas build --profile production --platform android --output=aab
```

## API Keys and Security

### Required API Keys

1. **OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Create API key in dashboard
   - Add to server/.env file

### Security Considerations

- Never expose API keys in client-side code
- Use HTTPS in production
- Implement rate limiting on the server
- Consider user authentication for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on Android device
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the Expo documentation for development builds
- Test with different Android devices and AirPods models
- Monitor server logs for debugging information

## Roadmap

- [ ] iOS support
- [ ] Custom wake word training
- [ ] Speaker recognition
- [ ] Multiple language support
- [ ] Voice commands for app control
- [ ] Integration with phone functions
- [ ] Offline speech processing option
# -AIVoiceAssistant
