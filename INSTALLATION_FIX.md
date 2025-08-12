# Installation Fix Guide

The package installation failed due to version conflicts. Here's how to fix it step by step:

## Quick Fix Steps

### 1. Server Setup (Working)

```bash
cd server
npm install
```

The server should install successfully now with the corrected `package.json`.

### 2. Client Setup - Option A: Minimal (Recommended for testing)

```bash
cd client

# Use the minimal package.json for basic testing
copy package-minimal.json package.json

# Use the minimal App.js 
copy App-minimal.js App.js

# Install packages
npm install

# Initialize Expo project
npx expo init --template blank --name "ai-voice-assistant-client" .
```

### 3. Client Setup - Option B: Full Features (After basic testing works)

If the minimal version works, you can upgrade step by step:

```bash
# Add audio packages one by one
npm install expo-speech@~11.3.0
npm install expo-av@~13.4.1
npm install expo-keep-awake@~12.3.0
```

## Step-by-Step Testing

### Step 1: Test Server

```bash
cd server

# Copy the example .env file
copy .env.example .env

# Edit .env with your API keys (see API_SETUP_GUIDE.md)

# Start server
npm run dev
```

You should see: `Server listening on port 3001`

### Step 2: Test Client Connection

```bash
cd client

# Use minimal setup first
copy package-minimal.json package.json
copy App-minimal.js App.js

# Install
npm install

# Start Expo
npx expo start
```

### Step 3: Find Your Computer's IP Address

You need to update the SERVER_URL in the client code:

**On Windows:**
```bash
ipconfig
```
Look for your WiFi adapter's IPv4 address (something like 192.168.1.xxx)

**Update the code:**
In `client/App.js` (or `App-minimal.js`), change:
```javascript
const SERVER_URL = 'http://192.168.1.100:3001'; // Replace with your actual IP
```

### Step 4: Test on Android Device

1. Install Expo Go app on your Android phone
2. Connect phone to same WiFi as your computer
3. Scan QR code from Expo
4. Test the connection

## Alternative: Create New Expo Project

If you still have issues, create a fresh Expo project:

```bash
# Create new project
npx create-expo-app ai-voice-assistant --template blank

cd ai-voice-assistant

# Install only what we need
npm install socket.io-client

# Copy our server files
mkdir server
# Copy all files from D:\work\AIVoiceAssistant\server to this server folder

# Use our minimal App.js
# Copy App-minimal.js content to App.js
```

## Common Issues and Solutions

### Issue: "expo-audio not found"
**Solution:** Remove expo-audio from package.json, use expo-av instead

### Issue: "Module not found"
**Solution:** Use the minimal package.json first, then add features gradually

### Issue: "Network error"
**Solution:** 
1. Make sure server is running
2. Update IP address in client code
3. Check firewall settings
4. Use same WiFi network

### Issue: "Permission errors"
**Solution:** The minimal app has a "Request Permissions" button to test this

## Testing Checklist

- [ ] Server starts without errors
- [ ] Client builds and runs
- [ ] Socket connection shows "Connected"
- [ ] Permissions can be requested
- [ ] Test message works

## Next Steps After Basic Setup Works

Once you have the basic connection working:

1. **Add Audio Features**: Install expo-speech, expo-av
2. **Add Voice Recognition**: Implement Web Speech API client-side
3. **Add TTS**: Use expo-speech for text-to-speech
4. **Add Background Processing**: Use expo-task-manager
5. **Add Bluetooth Support**: Add native modules as needed

## Get API Keys

Follow the `API_SETUP_GUIDE.md` to get free API keys from:
- OpenRouter (completely free models)
- Google Gemini (60 requests/min free)
- Or use your existing OpenAI credits

## Need Help?

If you're still having issues:

1. Try the minimal setup first
2. Check that both server and client are on the same network
3. Make sure the IP address is correct
4. Check the server console for error messages
5. Check the Expo console for client errors

The key is to start minimal and add features gradually once the basic connection works!
