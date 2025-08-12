# AI Voice Assistant Setup Script
# Run this script to set up the complete voice assistant

Write-Host "🚀 Setting up AI Voice Assistant with Continuous Listening..." -ForegroundColor Green
Write-Host ""

# Step 1: Backup current App.js
if (Test-Path "client/App.js") {
    Write-Host "📦 Backing up current App.js..." -ForegroundColor Yellow
    Copy-Item "client/App.js" "client/App-Backup.js" -Force
    Write-Host "✅ Backed up to App-Backup.js" -ForegroundColor Green
}

# Step 2: Move Voice Assistant app to main App.js
if (Test-Path "client/App-VoiceAssistant.js") {
    Write-Host "🔄 Setting up Voice Assistant app..." -ForegroundColor Yellow
    Copy-Item "client/App-VoiceAssistant.js" "client/App.js" -Force
    Write-Host "✅ Voice Assistant app is now active" -ForegroundColor Green
} else {
    Write-Host "❌ App-VoiceAssistant.js not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Set-Location "client"
npm install expo-speech
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Set-Location ".."

# Step 4: Check server setup
if (Test-Path "server/.env") {
    Write-Host "✅ Server environment file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Server .env file not found. Make sure to configure AI and TTS providers." -ForegroundColor Yellow
}

# Step 5: Display setup instructions
Write-Host ""
Write-Host "🎯 SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update MainApplication.java to register VoiceServicePackage"
Write-Host "2. Make sure your server is running with proper AI/TTS configuration"
Write-Host "3. Build and run the Android app:"
Write-Host "   cd client"
Write-Host "   npx react-native run-android"
Write-Host ""
Write-Host "Features included:" -ForegroundColor Cyan
Write-Host "✅ Continuous background listening (Android Foreground Service)"
Write-Host "✅ Voice Activity Detection (VAD)"
Write-Host "✅ Speech-to-Text integration"
Write-Host "✅ AI processing with your configured model"
Write-Host "✅ Text-to-Speech through AirPods"
Write-Host "✅ Microphone muting during TTS"
Write-Host "✅ Bluetooth/AirPods mic support"
Write-Host ""
Write-Host "📋 See VOICE_ASSISTANT_SETUP.md for detailed instructions" -ForegroundColor Yellow
