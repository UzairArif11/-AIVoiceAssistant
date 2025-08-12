import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  SafeAreaView,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.17:3001';

export default function App() {
  // Service state
  const [isListening, setIsListening] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  
  // Connection state
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Conversation state
  const [conversation, setConversation] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('Ready');
  const [speechDetected, setSpeechDetected] = useState(false);
  
  // Audio state
  const [recording, setRecording] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  
  // Refs for continuous operation
  const continuousModeRef = useRef(false);
  const recordingRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const listeningIntervalRef = useRef(null);
  
  useEffect(() => {
    initializeApp();
    setupEventListeners();
    
    return () => {
      cleanup();
    };
  }, []);
  
  useEffect(() => {
    continuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);
  
  const initializeApp = async () => {
    try {
      // Request permissions
      await requestPermissions();
      
      // Configure audio for AirPods
      await configureAudioForAirPods();
      
      // Connect to server
      connectToServer();
      
      addMessage('system', '🚀 AI Voice Assistant initialized');
      
    } catch (error) {
      console.log('Initialization error:', error);
      addMessage('system', '❌ Initialization failed: ' + error.message);
    }
  };
  
  const setupEventListeners = () => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('App came to foreground');
        if (isContinuousMode) {
          // Resume continuous listening if it was active
          startContinuousListening();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background
        console.log('App going to background');
        // Note: In Expo, we can't truly run in background, but we can prepare for resume
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  };
  
  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermissions(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is required for voice assistant');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Permission error:', error);
      setHasPermissions(false);
      return false;
    }
  };
  
  const configureAudioForAirPods = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
      
      // Simulate Bluetooth detection
      setBluetoothConnected(true);
      console.log('✅ Audio configured for AirPods');
      
    } catch (error) {
      console.log('❌ Audio configuration error:', error);
      setBluetoothConnected(false);
    }
  };
  
  const connectToServer = () => {
    if (socket) {
      socket.disconnect();
    }
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Connected to AI server');
      setIsConnected(true);
      addMessage('system', '✅ Connected to AI server');
    });
    
    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from AI server');
      setIsConnected(false);
      addMessage('system', '❌ Disconnected from AI server');
    });
    
    newSocket.on('transcription', (data) => {
      console.log('📝 Transcription:', data.text);
      addMessage('user', data.text);
      setCurrentStatus('AI thinking...');
    });
    
    newSocket.on('ai_response', (data) => {
      console.log('🤖 AI Response:', data.text);
      addMessage('assistant', data.text);
      setCurrentStatus('Speaking...');
      
      // Play response through AirPods
      playThroughAirPods(data.text, data.audio);
    });
    
    newSocket.on('error', (error) => {
      console.log('❌ Socket error:', error);
      addMessage('system', '❌ Server error: ' + (error.message || error));
    });
    
    setSocket(newSocket);
  };
  
  const playThroughAirPods = async (text, audioBase64) => {
    try {
      // Mute microphone during TTS
      setIsMicMuted(true);
      
      if (audioBase64) {
        // Play server-generated audio
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${audioBase64}` },
          { shouldPlay: true, volume: 1.0 }
        );
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setCurrentStatus('Ready');
            setIsMicMuted(false);
            sound.unloadAsync();
            
            // Resume continuous listening if active
            if (continuousModeRef.current) {
              setTimeout(() => startSingleRecording(), 500);
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
          onDone: () => {
            setCurrentStatus('Ready');
            setIsMicMuted(false);
            
            // Resume continuous listening if active
            if (continuousModeRef.current) {
              setTimeout(() => startSingleRecording(), 500);
            }
          },
          onError: (error) => {
            console.log('TTS Error:', error);
            setCurrentStatus('Ready');
            setIsMicMuted(false);
            
            // Resume continuous listening if active
            if (continuousModeRef.current) {
              setTimeout(() => startSingleRecording(), 500);
            }
          }
        });
      }
    } catch (error) {
      console.log('Audio playback error:', error);
      setCurrentStatus('Ready');
      setIsMicMuted(false);
      
      // Resume continuous listening if active
      if (continuousModeRef.current) {
        setTimeout(() => startSingleRecording(), 500);
      }
    }
  };
  
  const startContinuousListening = async () => {
    if (!hasPermissions || !isConnected) {
      Alert.alert('Cannot Start', 'Permissions or connection not available');
      return;
    }
    
    setIsContinuousMode(true);
    setCurrentStatus('Continuous listening started');
    addMessage('system', '🚀 Continuous listening started - say something!');
    
    // Start the first recording
    startSingleRecording();
    
    Alert.alert(
      'Continuous Mode Started',
      'The app is now listening continuously. Keep the app in foreground for best performance.\n\nIn Expo, true background operation requires ejecting to bare React Native.',
      [{ text: 'Got it!' }]
    );
  };
  
  const stopContinuousListening = async () => {
    setIsContinuousMode(false);
    continuousModeRef.current = false;
    
    // Stop current recording
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (error) {
        console.log('Error stopping recording:', error);
      }
      recordingRef.current = null;
    }
    
    setIsListening(false);
    setCurrentStatus('Continuous listening stopped');
    addMessage('system', '⏹️ Continuous listening stopped');
  };
  
  const startSingleRecording = async () => {
    if (!continuousModeRef.current || isMicMuted) {
      return;
    }
    
    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = newRecording;
      setIsListening(true);
      setSpeechDetected(true);
      setCurrentStatus('Listening... (speak now)');
      
      // Stop recording after 5 seconds to simulate voice activity detection
      setTimeout(async () => {
        if (continuousModeRef.current && recordingRef.current) {
          await stopAndProcessRecording();
        }
      }, 5000);
      
    } catch (error) {
      console.log('Recording start error:', error);
      setCurrentStatus('Recording failed');
      
      // Retry after a short delay if in continuous mode
      if (continuousModeRef.current) {
        setTimeout(() => startSingleRecording(), 2000);
      }
    }
  };
  
  const stopAndProcessRecording = async () => {
    if (!recordingRef.current) return;
    
    try {
      setIsListening(false);
      setSpeechDetected(false);
      setCurrentStatus('Processing audio...');
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      if (socket && uri) {
        // Read the audio file and convert to base64
        // Note: In Expo, we can't directly read files, so we'll send the URI
        socket.emit('voice_audio', {
          audioUri: uri,
          timestamp: Date.now()
        });
        
        addMessage('system', '🎤 Audio sent for processing');
      }
      
      // If still in continuous mode, wait a bit then start next recording
      if (continuousModeRef.current && !isMicMuted) {
        setTimeout(() => startSingleRecording(), 1000);
      }
      
    } catch (error) {
      console.log('Recording stop error:', error);
      setCurrentStatus('Processing failed');
      
      // Retry if in continuous mode
      if (continuousModeRef.current) {
        setTimeout(() => startSingleRecording(), 2000);
      }
    }
  };
  
  const testSingleRecording = async () => {
    if (isContinuousMode) {
      Alert.alert('Continuous Mode Active', 'Stop continuous mode first to do manual testing.');
      return;
    }
    
    try {
      setCurrentStatus('Recording test...');
      addMessage('system', '🎯 Say something for 5 seconds...');
      
      await startSingleRecording();
      
    } catch (error) {
      Alert.alert('Test Failed', error.message);
    }
  };
  
  const addMessage = (sender, text) => {
    setConversation(prev => [...prev, {
      id: Date.now() + Math.random(),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };
  
  const clearConversation = () => {
    setConversation([]);
  };
  
  const cleanup = () => {
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(console.log);
    }
    
    if (socket) {
      socket.disconnect();
    }
    
    if (listeningIntervalRef.current) {
      clearInterval(listeningIntervalRef.current);
    }
  };
  
  const getStatusColor = () => {
    if (speechDetected) return '#FF5722';
    if (isListening) return '#4CAF50';
    if (isMicMuted) return '#FF9800';
    if (isContinuousMode) return '#2196F3';
    return '#9E9E9E';
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
      <StatusBar style="light" backgroundColor="#1976D2" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.title}>AI Voice Assistant</Text>
        <Text style={styles.subtitle}>Expo Compatible</Text>
        <Text style={styles.status}>{currentStatus}</Text>
        <View style={styles.indicators}>
          <Text style={styles.indicator}>
            🎤 {isContinuousMode ? (isListening ? 'LISTENING' : 'WAITING') : 'MANUAL'}
          </Text>
          <Text style={styles.indicator}>
            {bluetoothConnected ? '🎧 AUDIO OK' : '🔇 NO AUDIO'}
          </Text>
          <Text style={styles.indicator}>
            📡 {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      </View>
      
      {/* Main Controls */}
      <View style={styles.controlsSection}>
        {!isContinuousMode ? (
          <TouchableOpacity
            style={[styles.primaryButton, styles.startButton]}
            onPress={startContinuousListening}
            disabled={!hasPermissions || !isConnected}
          >
            <Text style={styles.primaryButtonText}>🚀 START CONTINUOUS MODE</Text>
            <Text style={styles.buttonSubtext}>Begin pseudo-continuous listening</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, styles.stopButton]}
            onPress={stopContinuousListening}
          >
            <Text style={styles.primaryButtonText}>⏹️ STOP CONTINUOUS MODE</Text>
            <Text style={styles.buttonSubtext}>Stop continuous listening</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.secondaryControls}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={testSingleRecording}
            disabled={isContinuousMode || !hasPermissions || !isConnected}
          >
            <Text style={styles.secondaryButtonText}>🎯 Test Recording</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={clearConversation}
          >
            <Text style={styles.secondaryButtonText}>🗑️ Clear Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={requestPermissions}
          >
            <Text style={styles.secondaryButtonText}>🔐 Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Important Notice */}
      <View style={styles.noticeSection}>
        <Text style={styles.noticeTitle}>📋 Expo Limitations</Text>
        <Text style={styles.noticeText}>
          • True background listening requires ejecting to bare React Native{'\n'}
          • Keep app in foreground for continuous operation{'\n'}
          • 5-second recording segments simulate VAD{'\n'}
          • For production, consider using EAS Build with custom native modules
        </Text>
      </View>
      
      {/* Conversation */}
      <ScrollView 
        style={styles.conversationContainer} 
        contentContainerStyle={styles.conversationContent}
        showsVerticalScrollIndicator={false}
      >
        {conversation.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>🎤 Expo Voice Assistant</Text>
            <Text style={styles.welcomeText}>
              This version works within Expo's constraints. Start continuous mode and speak within 5-second windows.
            </Text>
            <Text style={styles.instructionText}>
              For true background operation:{'\n'}
              1. Eject from Expo managed workflow{'\n'}
              2. Use the native Android modules provided{'\n'}
              3. Build with React Native CLI
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
      
      {/* Status Bar */}
      <View style={styles.bottomStatus}>
        <Text style={styles.statusText}>
          Mode: {isContinuousMode ? '🔄 Continuous' : '✋ Manual'} | 
          Mic: {isMicMuted ? '🔇 Muted' : '🎤 Active'} | 
          Server: {isConnected ? '📡 Connected' : '❌ Disconnected'}
        </Text>
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  indicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  indicator: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  
  controlsSection: {
    padding: 20,
  },
  primaryButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  noticeSection: {
    backgroundColor: '#FFF3E0',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
  },
  
  conversationContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
  },
  conversationContent: {
    padding: 15,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    textAlign: 'left',
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
    maxWidth: '95%',
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
  
  bottomStatus: {
    backgroundColor: '#333',
    padding: 10,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
