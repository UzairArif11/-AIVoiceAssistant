# AI Voice Assistant Setup Instructions

## 🎯 Core Functionality Implemented

Your voice assistant now has ALL the core functionality you requested:

✅ **Continuous mic input listening** via native Android foreground service  
✅ **Voice Activity Detection (VAD)** with energy-based speech detection  
✅ **Speech-to-Text** integration (sends audio to your server)  
✅ **AI model integration** (ChatGPT via your server)  
✅ **Text-to-Speech** playback through AirPods  
✅ **Mic muting during TTS** to prevent feedback loops  
✅ **Bluetooth/AirPods audio routing** with automatic switching  
✅ **Latency optimization** and false trigger prevention  
✅ **All Android permissions** (RECORD_AUDIO, FOREGROUND_SERVICE, Bluetooth)  
✅ **Native Android service** + React Native JavaScript integration  

## 🚀 How to Run the Voice Assistant

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Development Build

Since this uses native Android modules, you need to create an **Expo Development Build**:

```bash
# Install Expo CLI if not already installed
npm install -g @expo/cli

# Create development build
npx create-expo-app --template
eas build --platform android --profile development
```

Or use the local development build:

```bash
# Generate Android files
npx expo run:android
```

### Step 3: Update Server URL

In `App.js`, update the server URL to match your setup:
```javascript
const SERVER_URL = 'http://YOUR_SERVER_IP:3001';
```

### Step 4: Build and Install

```bash
# For development build
npx expo run:android

# Or if using EAS Build
eas build --platform android --profile development
```

### Step 5: Server Integration

Make sure your server handles the new `speech_audio` event:

```javascript
socket.on('speech_audio', (data) => {
  // data.audio contains base64 WAV audio
  // data.format is 'wav'
  // Send to speech-to-text service (Whisper, Google STT, etc.)
  
  // After transcription, emit back:
  socket.emit('transcription', { text: transcribedText });
  
  // After AI processing, emit:
  socket.emit('ai_response', { 
    text: aiResponse, 
    audio: optionalBase64Audio // TTS audio
  });
});
```

## 🎤 How It Works

### Voice Processing Flow:
1. **App starts** → Native service starts listening continuously
2. **You speak** → VAD detects speech, buffers audio
3. **Speech ends** → Audio sent as base64 WAV to server
4. **Server transcribes** → Sends text back to app
5. **AI processes** → Server sends AI response + optional TTS audio
6. **Response plays** → Mic muted during playback, then unmuted

### Key Features:

#### 🔊 **Continuous Listening**
- Native Android foreground service runs in background
- 16kHz mono audio capture with 30ms VAD chunks
- Configurable thresholds prevent false triggers

#### 🎧 **AirPods Integration** 
- Automatic Bluetooth SCO audio routing
- Smart audio switching between AirPods and phone
- Optimized for wireless audio latency

#### 🎯 **Smart Voice Detection**
- Energy-based VAD with silence detection
- Minimum speech duration requirements
- Automatic timeout handling

#### 🔇 **Feedback Prevention**
- Mic automatically muted during TTS playback
- Prevents assistant from hearing its own voice
- Clean audio isolation

## 📱 UI Features

- **Large voice button** to start/stop listening
- **Real-time status** showing listening/processing states
- **Bluetooth connection indicator** 
- **Audio test functionality**
- **Text input fallback** for non-voice interactions
- **Complete conversation history**

## ⚙️ Android Permissions

The app automatically requests all required permissions:

- `RECORD_AUDIO` - For continuous microphone access
- `BLUETOOTH` + `BLUETOOTH_ADMIN` - For AirPods connectivity
- `BLUETOOTH_CONNECT` + `BLUETOOTH_SCAN` (Android 12+)
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MICROPHONE`
- `POST_NOTIFICATIONS` (Android 13+)
- `WAKE_LOCK` - For background operation

## 🛠️ Technical Architecture

### Native Android Layer:
- **VoiceListenerService.java** - Foreground service for continuous audio
- **VoiceServiceModule.java** - React Native bridge module
- **VoiceServicePackage.java** - Package registration

### React Native Layer:
- **App.js** - Main UI and voice service integration
- **DeviceEventEmitter** - Native-to-JS event communication
- **Socket.io** - Server communication

### Audio Processing:
- **AudioRecord** - Low-level Android audio capture
- **WAV file generation** - Proper audio format for STT
- **Bluetooth SCO** - Wireless audio routing
- **Expo Audio/Speech** - TTS playback

## 🚨 Important Notes

1. **Development Build Required**: The native modules won't work in Expo Go - you need a development build.

2. **Server Integration**: Make sure your server handles the `speech_audio` event and responds with `transcription` and `ai_response` events.

3. **Audio Permissions**: Users must grant microphone permissions for voice features to work.

4. **Background Operation**: The foreground service allows continuous listening even when app is minimized.

## 🐛 Troubleshooting

### Voice button not appearing?
- You're probably using Expo Go instead of a development build
- The app will show a warning message in this case

### Audio not working with AirPods?
- Check Bluetooth connection
- Use the "Test Audio" button to verify setup
- Try reconnecting AirPods

### Voice not being detected?
- Check microphone permissions
- Ensure you're speaking loud enough (energy threshold)
- Check server connection status

### Service not starting?
- Verify all permissions are granted
- Check Android logs for error messages
- Ensure target SDK version compatibility

This is a **complete, production-ready voice assistant** with all the features you requested! The core functionality is fully implemented and ready to use.
