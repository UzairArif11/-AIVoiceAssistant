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
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.17:3001';
const { VoiceService } = NativeModules;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [conversation, setConversation] = useState([]);
  const [inputText, setInputText] = useState('');
  const [assistantStatus, setAssistantStatus] = useState('Ready');
  const [audioConfigured, setAudioConfigured] = useState(false);
  
  // Voice service state
  const [voiceServiceActive, setVoiceServiceActive] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);

  useEffect(() => {
    configureAudioForAirPods();
    connectToServer();
    requestPermissions();
    
    // Set up voice service event listeners
    setupVoiceServiceListeners();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
      
      // Clean up voice service
      if (voiceServiceActive) {
        stopVoiceService();
      }
      
      // Remove event listeners
      cleanupEventListeners();
    };
  }, []);

  const configureAudioForAirPods = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Changed to true for background operation
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
      setAudioConfigured(true);
      console.log('✅ Audio configured for AirPods/Bluetooth devices');
    } catch (error) {
      console.log('❌ Audio configuration error:', error);
      setAudioConfigured(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        ];
        
        // Add newer Bluetooth permissions for Android 12+
        if (Platform.Version >= 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
          );
        }
        
        // Add notification permissions for Android 13+
        if (Platform.Version >= 33) {
          permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        
        const results = await PermissionsAndroid.requestMultiple(permissions);
        
        // Check if all critical permissions are granted
        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );
        
        setPermissionsGranted(allGranted);
        
        if (allGranted) {
          console.log('✅ All permissions granted');
          checkVoiceServicePermissions();
        } else {
          console.log('❌ Some permissions denied');
          Alert.alert(
            'Permissions Required',
            'Microphone and Bluetooth permissions are required for the voice assistant to work properly.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.log('❌ Error requesting permissions:', error);
      }
    } else {
      // iOS permission handling
      setPermissionsGranted(true);
    }
  };

  const checkVoiceServicePermissions = async () => {
    try {
      const result = await VoiceService.checkPermissions();
      console.log('Permission check result:', result);
      setPermissionsGranted(result.allGranted);
    } catch (error) {
      console.log('❌ Error checking voice service permissions:', error);
    }
  };

  const setupVoiceServiceListeners = () => {
    // Setup event listeners for the voice service
    DeviceEventEmitter.addListener('onListeningStarted', () => {
      console.log('🎤 Listening started');
      setIsListening(true);
      addMessage('system', 'Listening for voice commands...');
    });
    
    DeviceEventEmitter.addListener('onListeningStopped', () => {
      console.log('🎤 Listening stopped');
      setIsListening(false);
      addMessage('system', 'Voice listening stopped');
    });
    
    DeviceEventEmitter.addListener('onSpeechStarted', () => {
      console.log('🗣️ Speech detected, listening...');
      setIsProcessingSpeech(true);
    });
    
    DeviceEventEmitter.addListener('onSpeechDetected', event => {
      console.log('🗣️ Speech captured, processing...');
      addMessage('system', 'Processing your speech...');
      processSpeechData(event.audioData, event.duration);
    });
    
    DeviceEventEmitter.addListener('onBluetoothConnected', () => {
      console.log('🎧 Bluetooth headset connected');
      setBluetoothConnected(true);
      addMessage('system', 'Bluetooth headset connected');
    });
    
    DeviceEventEmitter.addListener('onBluetoothDisconnected', () => {
      console.log('🎧 Bluetooth headset disconnected');
      setBluetoothConnected(false);
      addMessage('system', 'Bluetooth headset disconnected');
    });
    
    DeviceEventEmitter.addListener('onMicMuteChanged', event => {
      console.log('🎤 Mic mute changed:', event.muted);
      setMicMuted(event.muted);
    });
    
    DeviceEventEmitter.addListener('onError', event => {
      console.log('❌ Voice service error:', event.message);
      Alert.alert('Voice Service Error', event.message);
    });
  };
  
  const cleanupEventListeners = () => {
    DeviceEventEmitter.removeAllListeners('onListeningStarted');
    DeviceEventEmitter.removeAllListeners('onListeningStopped');
    DeviceEventEmitter.removeAllListeners('onSpeechStarted');
    DeviceEventEmitter.removeAllListeners('onSpeechDetected');
    DeviceEventEmitter.removeAllListeners('onBluetoothConnected');
    DeviceEventEmitter.removeAllListeners('onBluetoothDisconnected');
    DeviceEventEmitter.removeAllListeners('onMicMuteChanged');
    DeviceEventEmitter.removeAllListeners('onError');
  };

  const startVoiceService = async () => {
    if (!permissionsGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant all required permissions first.',
        [
          { text: 'Cancel' },
          { text: 'Grant Permissions', onPress: requestPermissions }
        ]
      );
      return;
    }
    
    try {
      const result = await VoiceService.startVoiceService();
      console.log('Voice service started:', result);
      setVoiceServiceActive(true);
      addMessage('system', '🎤 Voice assistant activated! Listening for your commands...');
    } catch (error) {
      console.log('❌ Error starting voice service:', error);
      Alert.alert('Service Error', `Failed to start voice service: ${error.message}`);
    }
  };
  
  const stopVoiceService = async () => {
    try {
      const result = await VoiceService.stopVoiceService();
      console.log('Voice service stopped:', result);
      setVoiceServiceActive(false);
      setIsListening(false);
      addMessage('system', '🎤 Voice assistant deactivated');
    } catch (error) {
      console.log('❌ Error stopping voice service:', error);
      Alert.alert('Service Error', `Failed to stop voice service: ${error.message}`);
    }
  };
  
  const muteMicrophone = async () => {
    try {
      await VoiceService.muteMicrophone();
      console.log('Microphone muted');
    } catch (error) {
      console.log('❌ Error muting microphone:', error);
    }
  };
  
  const unmuteMicrophone = async () => {
    try {
      await VoiceService.unmuteMicrophone();
      console.log('Microphone unmuted');
    } catch (error) {
      console.log('❌ Error unmuting microphone:', error);
    }
  };

  const processSpeechData = async (base64Audio, duration) => {
    if (!isConnected) {
      addMessage('system', '❌ Not connected to AI server. Cannot process speech.');
      setIsProcessingSpeech(false);
      return;
    }
    
    setAssistantStatus('Processing speech...');
    
    try {
      // First, send the audio to the server for transcription
      socket.emit('speech_audio', {
        audio: base64Audio,
        timestamp: Date.now(),
        format: 'wav'
      });
      
      // Set a timeout in case server doesn't respond
      setTimeout(() => {
        if (isProcessingSpeech) {
          setIsProcessingSpeech(false);
          setAssistantStatus('Ready');
          addMessage('system', '❌ Speech processing timed out');
        }
      }, 15000); // 15 second timeout
    } catch (error) {
      console.log('❌ Error processing speech data:', error);
      setIsProcessingSpeech(false);
      setAssistantStatus('Ready');
      addMessage('system', '❌ Error processing speech: ' + error.message);
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
      
      // AI is thinking now
      setAssistantStatus('Thinking...');
    });

    newSocket.on('ai_response', (data) => {
      console.log('🤖 AI Response:', data.text);
      addMessage('assistant', data.text);
      setAssistantStatus('Speaking...');
      setIsProcessingSpeech(false);
      
      // Mute mic during TTS playback to avoid hearing own response
      muteMicrophone();
      
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
            // Unmute mic after TTS is complete
            unmuteMicrophone();
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
            // Unmute mic after TTS is complete
            unmuteMicrophone();
          },
          onError: (error) => {
            console.log('TTS Error:', error);
            setAssistantStatus('Ready');
            unmuteMicrophone();
          }
        });
      }
    } catch (error) {
      console.log('Audio playback error:', error);
      setAssistantStatus('Ready');
      unmuteMicrophone();
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

  const toggleVoiceService = () => {
    if (voiceServiceActive) {
      stopVoiceService();
    } else {
      startVoiceService();
    }
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
          {bluetoothConnected ? '🔵' : ''}
        </Text>
        <Text style={styles.assistantStatus}>
          Status: {isListening ? '🎤 Listening...' : assistantStatus} 
          {micMuted ? ' (Muted)' : ''}
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
              Start chatting with the AI assistant using your voice or text.
              Tap the microphone button to activate voice commands.
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

      {/* Voice Button */}
      <View style={styles.voiceButtonContainer}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            voiceServiceActive ? styles.voiceButtonActive : styles.voiceButtonInactive
          ]}
          onPress={toggleVoiceService}
          disabled={!permissionsGranted || isProcessingSpeech}
        >
          <Text style={styles.voiceButtonIcon}>
            {voiceServiceActive ? '🎤' : '🔈'}
          </Text>
          <Text style={styles.voiceButtonText}>
            {voiceServiceActive ? 'Stop Listening' : 'Start Voice Assistant'}
          </Text>
        </TouchableOpacity>
      </View>

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
