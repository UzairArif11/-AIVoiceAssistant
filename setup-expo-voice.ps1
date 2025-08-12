# Expo Voice Assistant Setup Script
Write-Host "🎤 Setting up Expo Voice Assistant..." -ForegroundColor Green

# Check if we're in the right directory
if (!(Test-Path "client/package.json")) {
    Write-Host "❌ Please run this script from the root AIVoiceAssistant directory" -ForegroundColor Red
    exit 1
}

# Step 1: Backup current App.js
if (Test-Path "client/App.js") {
    Write-Host "📦 Backing up current App.js..." -ForegroundColor Yellow
    Copy-Item "client/App.js" "client/App-Backup.js" -Force
    Write-Host "✅ Backed up to App-Backup.js" -ForegroundColor Green
}

# Step 2: Use Expo-compatible Voice Assistant
if (Test-Path "client/App-ExpoVoice.js") {
    Write-Host "🔄 Setting up Expo Voice Assistant..." -ForegroundColor Yellow
    Copy-Item "client/App-ExpoVoice.js" "client/App.js" -Force
    Write-Host "✅ Expo Voice Assistant is now active" -ForegroundColor Green
} else {
    Write-Host "❌ App-ExpoVoice.js not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Install dependencies
Write-Host "📦 Installing/updating dependencies..." -ForegroundColor Yellow
Set-Location "client"
try {
    # Check if expo-speech is already installed
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.dependencies."expo-speech") {
        Write-Host "✅ expo-speech already installed" -ForegroundColor Green
    } else {
        npm install expo-speech
        Write-Host "✅ expo-speech installed" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Yellow
}
Set-Location ".."

# Step 4: Start the server if not running
Write-Host "🚀 Starting server..." -ForegroundColor Yellow
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd server; node server.js"
Start-Sleep 2

# Step 5: Display instructions
Write-Host ""
Write-Host "🎯 EXPO SETUP COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting the Expo app..." -ForegroundColor Cyan
Set-Location "client"
expo start

Write-Host ""
Write-Host "📋 How to use:" -ForegroundColor Cyan
Write-Host "1. Scan QR code with Expo Go app on your phone"
Write-Host "2. Grant microphone permissions when prompted"
Write-Host "3. Tap 'START CONTINUOUS MODE' to begin"
Write-Host "4. Speak during the 5-second listening windows"
Write-Host "5. AI responses will play through your device speakers/AirPods"
Write-Host ""
Write-Host "⚠️  Limitations in Expo:" -ForegroundColor Yellow
Write-Host "• No true background operation"
Write-Host "• 5-second recording segments instead of true VAD"
Write-Host "• Must keep app in foreground"
Write-Host "• For production: eject to bare React Native"
