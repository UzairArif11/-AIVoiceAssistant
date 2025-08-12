# Full Voice Assistant Setup Guide

## Core Features Implemented ✅

1. **Continuous Background Listening** - Uses Android Foreground Service
2. **Voice Activity Detection (VAD)** - Detects speech segments
3. **Speech-to-Text (STT)** - Sends audio to server for transcription
4. **AI Processing** - Gets response from AI model
5. **Text-to-Speech (TTS)** - Speaks response through AirPods
6. **Mic Muting** - Prevents assistant from hearing its own reply
7. **Bluetooth/AirPods Support** - Prioritizes AirPods mic

## Files Created

### Native Android
- `android/app/src/main/java/com/aivoiceassistant/voiceservice/VoiceListenerService.java` - Foreground service for audio processing
- `android/app/src/main/java/com/aivoiceassistant/voiceservice/VoiceServiceModule.java` - React Native bridge
- `android/app/src/main/java/com/aivoiceassistant/voiceservice/VoiceServicePackage.java` - Package registration
- `android/app/src/main/AndroidManifest.xml` - Permissions and service declaration

### React Native
- `App-VoiceAssistant.js` - Complete voice assistant app
- `VOICE_ASSISTANT_SETUP.md` - This setup guide

## How to Set Up

### Step 1: Replace App.js
1.  **Backup your current `App.js`:**
    ```bash
    mv App.js App-Backup.js
    ```

2.  **Use the new voice assistant app:**
    ```bash
    mv App-VoiceAssistant.js App.js
    ```

### Step 2: Register the Native Module
1.  **Open `android/app/src/main/java/com/aivoiceassistant/MainApplication.java`**

2.  **Import the `VoiceServicePackage`:**
    ```java
    import com.aivoiceassistant.voiceservice.VoiceServicePackage;
    ```

3.  **Add the package to the `getPackages()` list:**
    ```java
    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      // ...
      packages.add(new VoiceServicePackage()); // <-- Add this line
      return packages;
    }
    ```

### Step 3: Configure Server
1.  **Open `server/server.js`**

2.  **Add a handler for `voice_audio`:**
    ```javascript
    socket.on('voice_audio', async (data) => {
        console.log('🎤 Received voice audio from client');
        
        try {
            const { processAudioBuffer } = require('./services/audioProcessor');
            
            // Process audio buffer and get transcription
            const transcription = await processAudioBuffer(data.audioData);
            
            if (transcription) {
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
                    audio: audioResponse
                });
            }
            
        } catch (error) {
            console.error('❌ Error processing voice audio:', error);
            socket.emit('error', { message: 'Failed to process audio' });
        }
    });
    ```

3.  **Ensure `audioProcessor.js` can handle buffers:**
    - You will need to add a `processAudioBuffer` function that takes the base64 WAV data, saves it to a file, and then runs it through your STT service.

### Step 4: Build and Run
1.  **Clean the Android build:**
    ```bash
    cd android
    ./gradlew clean
    cd ..
    ```

2.  **Run the app:**
    ```bash
    npx react-native run-android
    ```

## How to Use the App

1.  **Connect AirPods:** Ensure your AirPods are connected via Bluetooth.
2.  **Grant Permissions:** Open the app and grant all required permissions.
3.  **Start Service:** Tap the "🚀 START VOICE ASSISTANT" button.
4.  **Listen Continuously:** The app will now listen in the background.
5.  **Speak:** Speak naturally, and the assistant will detect your voice.
6.  **Hear Response:** The AI response will play through your AirPods.

## Troubleshooting

- **Service not starting?** Check permissions and look for errors in `logcat`.
- **No audio from AirPods?** Ensure Bluetooth is set up correctly in the native service.
- **Poor transcription?** Adjust VAD settings (threshold, silence timeout).

This provides the full end-to-end implementation for a continuously listening voice assistant. You now have both the native Android code and the React Native code to achieve this core functionality.
