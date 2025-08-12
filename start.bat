@echo off
echo ================================
echo AI Voice Assistant Quick Start
echo ================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)
echo Node.js is installed ✓

echo.
echo [2/4] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)
echo Server dependencies installed ✓

echo.
echo [3/4] Installing client dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install client dependencies
    pause
    exit /b 1
)
echo Client dependencies installed ✓

echo.
echo [4/4] Setup complete!
echo.
echo ================================
echo Next Steps:
echo ================================
echo 1. Edit server/.env file with your OpenAI API key
echo 2. Start the server: cd server && npm run dev
echo 3. In another terminal: cd client && npx expo start
echo 4. Update SERVER_URL in client/components/VoiceAssistant.js with your IP
echo 5. Build development build: npx expo run:android
echo.
echo For detailed instructions, see README.md
echo ================================

pause
