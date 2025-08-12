import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.17:3001';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [conversation, setConversation] = useState([]);
  const [inputText, setInputText] = useState('');
  const [assistantStatus, setAssistantStatus] = useState('Ready');
  const [audioConfigured, setAudioConfigured] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [autoListenEnabled, setAutoListenEnabled] = useState(false);
  const [isAutoListening, setIsAutoListening] = useState(false);
  const [listenTimer, setListenTimer] = useState(null);

  useEffect(() => {
    configureAudioForAirPods();
    connectToServer();
    requestPermissions();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (listenTimer) {
        clearTimeout(listenTimer);
      }
    };
  }, []);

  const configureAudioForAirPods = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // DoNotMix
        interruptionModeAndroid: 1, // DoNotMix
      });
      setAudioConfigured(true);
      console.log('✅ Audio configured for AirPods/Bluetooth devices');
    } catch (error) {
      console.log('❌ Audio configuration error:', error);
      setAudioConfigured(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionsGranted(granted);
      
      if (granted) {
        console.log('✅ Audio permissions granted');
      } else {
        Alert.alert(
          'Permissions Required',
          'Microphone permission is required for voice features.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.log('❌ Error requesting permissions:', error);
    }
  };

  const connectToServer = () => {
    const newSocket = io(SERVER_URL);
    
    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      setConnectionStatus('Connected');
      addMessage('system', 'Connected to AI server successfully!');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      addMessage('system', 'Disconnected from server');
    });

    // Handle transcription response
    newSocket.on('transcription', (data) => {
      console.log('🔤 Transcription received:', data.text);
      addMessage('user', data.text);
      setAssistantStatus('Thinking...');
      
      // Set a timeout for AI response - use a ref to check current status
      const currentStatus = assistantStatus;
      setTimeout(() => {
        // Check if we're still thinking (no response received)
        setAssistantStatus(prevStatus => {
          if (prevStatus === 'Thinking...') {
            console.log('⚠️ No AI response received within 10 seconds');
            addMessage('system', '⚠️ Server did not respond. Check your server setup.');
            setIsProcessingSpeech(false);
            
            // Resume auto-listening if enabled
            if (autoListenEnabled) {
              scheduleNextListen();
            }
            
            return 'Ready';
          }
          return prevStatus;
        });
      }, 10000);
    });

    newSocket.on('ai_response', (data) => {
      console.log('🤖 AI Response:', data.text);
      addMessage('assistant', data.text);
      setAssistantStatus('Speaking...');
      setIsProcessingSpeech(false);
      
      // Play response through AirPods
      playThroughAirPods(data.text, data.audio);
    });

    newSocket.on('error', (error) => {
      console.log('❌ Socket error:', error);
      Alert.alert('Connection Error', error.message || 'Socket connection failed');
      setIsProcessingSpeech(false);
    });

    setSocket(newSocket);
  };

  const addMessage = (sender, text) => {
    setConversation(prev => [...prev, {
      id: Date.now(),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const startRecording = async () => {
    if (!permissionsGranted) {
      console.log('❌ No permissions granted');
      if (!autoListenEnabled) {
        Alert.alert('Permissions Required', 'Please grant microphone permission first.');
      }
      return;
    }

    if (!isConnected) {
      console.log('❌ Not connected to server');
      if (!autoListenEnabled) {
        Alert.alert('Connection Error', 'Please connect to server first.');
      }
      return;
    }

    if (recording || isRecording) {
      console.log('❌ Recording already in progress');
      return;
    }

    try {
      console.log('🎤 Starting recording...');
      setIsRecording(true);
      setAssistantStatus('Listening...');
      
      // Only show message if not auto-listening to avoid spam
      if (!autoListenEnabled) {
        addMessage('system', '🎤 Listening for your voice...');
      }

      // Stop any existing recording first
      try {
        await Audio.Recording.stopAndUnloadAsync();
      } catch (e) {
        // Ignore errors for stopping non-existent recordings
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      setRecording(newRecording);
      console.log('✅ Recording started successfully');

    } catch (error) {
      console.log('❌ Failed to start recording:', error);
      setIsRecording(false);
      setAssistantStatus('Ready');
      
      if (!autoListenEnabled) {
        Alert.alert('Recording Error', 'Failed to start recording: ' + error.message);
      } else {
        // For auto-listening, try again after a delay
        setTimeout(() => {
          if (autoListenEnabled) {
            startListeningCycle();
          }
        }, 3000);
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('🛑 Stopping recording...');
      setIsRecording(false);
      setIsProcessingSpeech(true);
      setAssistantStatus('Processing speech...');
      addMessage('system', 'Processing your speech...');

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Read the audio file and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Check if audio file is too small (likely silence)
      const audioSize = blob.size;
      console.log('Audio file size:', audioSize);
      
      if (audioSize < 10000) { // Less than ~10KB suggests mostly silence
        console.log('Audio too small, likely silence - skipping processing');
        setIsProcessingSpeech(false);
        setAssistantStatus('Ready');
        
        // If auto-listening, schedule next cycle without server call
        if (autoListenEnabled) {
          const timer = setTimeout(() => {
            if (autoListenEnabled && !isProcessingSpeech) {
              startListeningCycle();
            }
          }, 1000); // Shorter wait for silence
          setListenTimer(timer);
        }
        
        setRecording(null);
        return;
      }
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = reader.result.split(',')[1]; // Remove data:audio/wav;base64, prefix
        
        // Send to server
        console.log('📤 Sending audio to server, size:', base64Audio.length, 'characters');
        socket.emit('speech_audio', {
          audio: base64Audio,
          timestamp: Date.now(),
          format: 'wav'
        });
        
        console.log('✨ Audio sent! Waiting for transcription...');
        
        // TEMPORARY WORKAROUND: If your server doesn't handle speech_audio,
        // we can add a fallback to simulate transcription
        setTimeout(() => {
          if (isProcessingSpeech && assistantStatus === 'Processing speech...') {
            console.log('📝 Server may not support speech_audio, trying text fallback...');
            // Simulate transcription by sending a generic text message
            socket.emit('text_question', {
              text: 'Hello, I sent you a voice message but your server might not support speech processing yet.',
              timestamp: Date.now()
            });
          }
        }, 5000);
        
        // Set timeout in case server doesn't respond
        setTimeout(() => {
          if (isProcessingSpeech) {
            setIsProcessingSpeech(false);
            setAssistantStatus('Ready');
            addMessage('system', '❌ Speech processing timed out');
            
            // If auto-listening, schedule next cycle after timeout
            if (autoListenEnabled) {
              scheduleNextListen();
            }
          }
        }, 15000);
      };
      reader.readAsDataURL(blob);
      
      setRecording(null);

    } catch (error) {
      console.log('❌ Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to process recording: ' + error.message);
      setIsRecording(false);
      setIsProcessingSpeech(false);
      setAssistantStatus('Ready');
      setRecording(null);
      
      // If auto-listening, schedule next cycle after error
      if (autoListenEnabled) {
        scheduleNextListen();
      }
    }
  };

  const playThroughAirPods = async (text, audioBase64) => {
    try {
      if (audioBase64) {
        // Play server-generated audio through AirPods
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${audioBase64}` },
          { 
            shouldPlay: true, 
            volume: 1.0,
            rate: 1.0,
            shouldCorrectPitch: true
          }
        );
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setAssistantStatus('Ready');
            sound.unloadAsync();
            // Schedule next listening cycle if auto-listen is enabled
            if (autoListenEnabled) {
              scheduleNextListen();
            }
          }
        });
      } else {
        // Use Expo Speech (works great with AirPods)
        await Speech.speak(text, {
          language: 'en-US',
          pitch: 1.0,
          rate: 0.85,
          volume: 1.0,
          voice: Platform.OS === 'ios' ? 'com.apple.ttsbundle.Samantha-compact' : undefined,
          onDone: () => {
            setAssistantStatus('Ready');
            // Schedule next listening cycle if auto-listen is enabled
            if (autoListenEnabled) {
              scheduleNextListen();
            }
          },
          onError: (error) => {
            console.log('TTS Error:', error);
            setAssistantStatus('Ready');
          }
        });
      }
    } catch (error) {
      console.log('Audio playback error:', error);
      setAssistantStatus('Ready');
      Alert.alert('Audio Error', 'Could not play audio through AirPods: ' + error.message);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !isConnected) return;
    
    const message = inputText.trim();
    setInputText('');
    setAssistantStatus('Thinking...');
    
    addMessage('user', message);
    
    socket.emit('text_question', {
      text: message,
      timestamp: Date.now()
    });
  };

  const testServerConnection = () => {
    if (!isConnected) {
      Alert.alert('Connection Error', 'Not connected to server');
      return;
    }
    
    console.log('📝 Testing server with text message');
    addMessage('system', 'Testing server connection...');
    setAssistantStatus('Testing server...');
    
    socket.emit('text_question', {
      text: 'Hello, can you hear me? This is a test message.',
      timestamp: Date.now()
    });
  };

  const testAudioOutput = async () => {
    const testMessage = "Hello! This is a test to check if audio is playing clearly through your AirPods. Can you hear this message?";
    
    setAssistantStatus('Testing Audio...');
    addMessage('assistant', 'Testing audio output...');
    
    try {
      await playThroughAirPods(testMessage, null);
      
      setTimeout(() => {
        Alert.alert(
          'Audio Test Complete',
          'Did you hear the test message clearly through your AirPods?',
          [
            { 
              text: 'Yes, perfect!', 
              onPress: () => {
                addMessage('system', '✅ Audio test successful - AirPods working correctly');
              }
            },
            { 
              text: 'No, issues', 
              onPress: () => {
                Alert.alert(
                  'Audio Troubleshooting',
                  '• Check AirPods connection\n• Ensure AirPods are selected as output\n• Try reconnecting AirPods\n• Check volume levels\n• Restart the app',
                  [{ text: 'Got it' }]
                );
              }
            }
          ]
        );
      }, 4000);
      
    } catch (error) {
      Alert.alert('Audio Test Failed', error.message);
    }
  };

  const clearChat = () => {
    setConversation([]);
  };

  const startAutoListening = () => {
    console.log('🔘 Start auto-listening clicked');
    console.log('Permissions:', permissionsGranted, 'Connected:', isConnected);
    
    if (!permissionsGranted || !isConnected) {
      console.log('❌ Cannot start auto-listen: permissions or connection missing');
      Alert.alert('Error', 'Please ensure permissions are granted and server is connected.');
      return;
    }
    
    console.log('✅ Starting auto-listening mode...');
    setAutoListenEnabled(true);
    addMessage('system', '🔄 Auto-listening enabled! I\'ll listen for your voice continuously.');
    
    // Start the first listening cycle immediately
    setTimeout(() => {
      console.log('🚀 Triggering first listening cycle...');
      console.log('Current autoListenEnabled state:', autoListenEnabled);
      
      // Force start the cycle even if state is stale
      if (permissionsGranted && isConnected) {
        startListeningCycleForced();
      }
    }, 500);
  };

  const stopAutoListening = () => {
    setAutoListenEnabled(false);
    setIsAutoListening(false);
    if (listenTimer) {
      clearTimeout(listenTimer);
    }
    if (recording && isRecording) {
      stopRecording();
    }
    addMessage('system', '🛑 Auto-listening disabled.');
  };

  const startListeningCycle = async () => {
    if (!autoListenEnabled || isProcessingSpeech || isRecording) {
      console.log('Skipping listen cycle:', { autoListenEnabled, isProcessingSpeech, isRecording });
      return;
    }
    
    await startListeningCycleForced();
  };

  const startListeningCycleForced = async () => {
    console.log('🔄 Starting new listening cycle (forced)...');
    setIsAutoListening(true);
    
    try {
      // Start recording for 3-4 seconds to capture speech
      await startRecording();
      
      // Auto-stop recording after 4 seconds
      const timer = setTimeout(() => {
        console.log('⏰ Auto-stopping recording after 4 seconds');
        if (isRecording && recording) {
          stopRecording();
        }
      }, 4000);
      
      setListenTimer(timer);
    } catch (error) {
      console.log('❌ Error in listening cycle:', error);
      setIsAutoListening(false);
      // Try again after a short delay
      setTimeout(() => {
        console.log('🔄 Retrying listening cycle after error...');
        startListeningCycleForced();
      }, 2000);
    }
  };

  const scheduleNextListen = () => {
    if (!autoListenEnabled) return;
    
    // Wait 2 seconds after TTS finishes, then start listening again
    const timer = setTimeout(() => {
      if (autoListenEnabled && !isProcessingSpeech) {
        startListeningCycle();
      }
    }, 2000);
    
    setListenTimer(timer);
  };

  const getMessageStyle = (sender) => {
    switch (sender) {
      case 'user':
        return [styles.message, styles.userMessage];
      case 'assistant':
        return [styles.message, styles.assistantMessage];
      case 'system':
        return [styles.message, styles.systemMessage];
      default:
        return styles.message;
    }
  };

  const getMessageIcon = (sender) => {
    switch (sender) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return '⚙️';
      default: return '💬';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Voice Assistant</Text>
        <Text style={[styles.status, isConnected ? styles.connected : styles.disconnected]}>
          {connectionStatus} {audioConfigured ? '🎧' : '🔇'}
        </Text>
        <Text style={styles.assistantStatus}>
          Status: {autoListenEnabled 
            ? (isAutoListening 
              ? (isRecording ? '🎤 Auto-Recording...' : '🔄 Auto-Listening...') 
              : '⏸️ Auto-Listen Ready')
            : (isRecording ? '🎤 Recording...' : assistantStatus)
          }
        </Text>
      </View>

      {/* Chat Messages */}
      <ScrollView 
        style={styles.chatContainer} 
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {conversation.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>👋 Welcome!</Text>
            <Text style={styles.welcomeText}>
              Choose your interaction mode:
              • Auto-Listen: Continuous voice conversation
              • Manual: Hold microphone button to record
              • Text: Type your messages
            </Text>
            <Text style={styles.infoText}>
              ✅ Auto-listening mode: Automatically listens and responds to your voice!
            </Text>
          </View>
        ) : (
          conversation.map((msg) => (
            <View key={msg.id} style={getMessageStyle(msg.sender)}>
              <Text style={styles.messageHeader}>
                {getMessageIcon(msg.sender)} {msg.sender} • {msg.timestamp}
              </Text>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Auto-Listen Toggle */}
      <View style={styles.autoListenContainer}>
        <TouchableOpacity
          style={[
            styles.autoListenButton,
            autoListenEnabled ? styles.autoListenActive : styles.autoListenInactive
          ]}
          onPress={autoListenEnabled ? stopAutoListening : startAutoListening}
          disabled={!permissionsGranted || !isConnected}
        >
          <Text style={styles.autoListenIcon}>
            {autoListenEnabled ? '🔄' : '⏸️'}
          </Text>
          <Text style={styles.autoListenText}>
            {autoListenEnabled 
              ? (isAutoListening ? 'Auto-Listening Active...' : 'Auto-Listen Enabled') 
              : 'Start Auto-Listen Mode'
            }
          </Text>
        </TouchableOpacity>
      </View>

      {/* Manual Voice Recording Button */}
      {!autoListenEnabled && (
        <View style={styles.voiceButtonContainer}>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording ? styles.voiceButtonActive : styles.voiceButtonInactive
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={!permissionsGranted || isProcessingSpeech || !isConnected}
          >
            <Text style={styles.voiceButtonIcon}>
              {isRecording ? '🔴' : '🎤'}
            </Text>
            <Text style={styles.voiceButtonText}>
              {isRecording ? 'Recording... (Release to send)' : 'Hold to Record Voice Message'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Section */}
      <View style={styles.inputSection}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message here..."
            placeholderTextColor="#999"
            multiline={true}
            maxLength={500}
            editable={isConnected}
          />
        </View>
        
        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.sendButton]}
            onPress={sendMessage}
            disabled={!isConnected || !inputText.trim() || assistantStatus === 'Thinking...'}
          >
            <Text style={styles.buttonText}>📤 Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testAudioOutput}
            disabled={assistantStatus === 'Speaking...' || assistantStatus === 'Testing Audio...'}
          >
            <Text style={styles.buttonText}>🎧 Test Audio</Text>
          </TouchableOpacity>
        </View>
        
        {/* Server Test Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.serverTestButton]}
            onPress={testServerConnection}
            disabled={!isConnected || assistantStatus === 'Testing server...'}
          >
            <Text style={styles.buttonText}>📝 Test Server</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => {
              setInputText('What is artificial intelligence?');
            }}
            disabled={!isConnected}
          >
            <Text style={styles.quickButtonText}>❓ What is AI?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => {
              setInputText('Tell me a joke');
            }}
            disabled={!isConnected}
          >
            <Text style={styles.quickButtonText}>😄 Tell a joke</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickButton}
            onPress={clearChat}
          >
            <Text style={styles.quickButtonText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#F44336',
  },
  assistantStatus: {
    fontSize: 14,
    color: '#666',
  },
  
  // Chat
  chatContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  chatContent: {
    padding: 15,
    paddingBottom: 40,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 40,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4CAF50',
    lineHeight: 20,
    fontWeight: '500',
  },
  message: {
    padding: 12,
    marginVertical: 5,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-start',
  },
  systemMessage: {
    backgroundColor: '#FF9800',
    alignSelf: 'center',
  },
  messageHeader: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
  },
  
  // Auto-Listen Button
  autoListenContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  autoListenButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  autoListenActive: {
    backgroundColor: '#FF9800',
  },
  autoListenInactive: {
    backgroundColor: '#9C27B0',
  },
  autoListenIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  autoListenText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  
  // Voice Button
  voiceButtonContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  voiceButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    minWidth: 280,
  },
  voiceButtonActive: {
    backgroundColor: '#F44336',
  },
  voiceButtonInactive: {
    backgroundColor: '#2196F3',
  },
  voiceButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  
  // Input Section
  inputSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  textInput: {
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#2196F3',
  },
  testButton: {
    backgroundColor: '#E91E63',
  },
  serverTestButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
});
