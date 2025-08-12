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
  DeviceEventEmitter,
  PermissionsAndroid,
  BackHandler,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import io from 'socket.io-client';
import { NativeModules } from 'react-native';

const { VoiceService } = NativeModules;
const SERVER_URL = 'http://192.168.1.17:3001';

export default function App() {
  // Service state
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  
  // Connection state
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Conversation state
  const [conversation, setConversation] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('Ready');
  const [speechDetected, setSpeechDetected] = useState(false);
  
  // Permissions
  const [permissions, setPermissions] = useState({});
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  const appStateRef = useRef(AppState.currentState);
  
  useEffect(() => {
    initializeApp();
    setupEventListeners();
    
    return () => {
      cleanup();
    };
  }, []);
  
  useEffect(() => {
    // Handle app state changes
    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        console.log('App came to foreground');
        if (socket && !isConnected) {
          connectToServer();
        }
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [socket, isConnected]);
  
  const initializeApp = async () => {
    try {
      // Check permissions first
      await checkAllPermissions();
      
      // Configure audio
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
    // Voice service events
    DeviceEventEmitter.addListener('onListeningStarted', () => {
      setIsListening(true);
      setCurrentStatus('Listening...');
    });
    
    DeviceEventEmitter.addListener('onListeningStopped', () => {
      setIsListening(false);
      setCurrentStatus('Ready');
    });
    
    DeviceEventEmitter.addListener('onSpeechStarted', () => {
      setSpeechDetected(true);
      setCurrentStatus('Speech detected...');
      addMessage('system', '🎤 Speech detected');
    });
    
    DeviceEventEmitter.addListener('onSpeechDetected', (data) => {
      setSpeechDetected(false);
      setCurrentStatus('Processing...');
      
      // Send audio to server for STT
      if (socket && isConnected) {
        socket.emit('voice_audio', {
          audioData: data.audioData,
          duration: data.duration,
          timestamp: Date.now()
        });
      }
    });
    
    DeviceEventEmitter.addListener('onBluetoothConnected', () => {
      setBluetoothConnected(true);
      addMessage('system', '🎧 AirPods connected');
    });
    
    DeviceEventEmitter.addListener('onBluetoothDisconnected', () => {
      setBluetoothConnected(false);
      addMessage('system', '🔇 AirPods disconnected');
    });
    
    DeviceEventEmitter.addListener('onMicMuteChanged', (data) => {
      setIsMicMuted(data.muted);
      setCurrentStatus(data.muted ? 'Microphone muted' : 'Listening...');
    });
    
    DeviceEventEmitter.addListener('onError', (data) => {
      console.log('Voice service error:', data.message);
      addMessage('system', '❌ Error: ' + data.message);
      Alert.alert('Voice Service Error', data.message);
    });
    
    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Exit Voice Assistant',
        'Are you sure you want to exit? The voice service will continue running in the background.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Stop Service & Exit', 
            onPress: () => {
              stopVoiceService();
              BackHandler.exitApp();
            }
          },
          { text: 'Keep Running & Exit', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    });
    
    return () => {
      backHandler.remove();
    };
  };
  
  const checkAllPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Request permissions
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ]);
        
        // Check permissions via native module
        const permissionStatus = await VoiceService.checkPermissions();
        setPermissions(permissionStatus);
        setPermissionsGranted(permissionStatus.allGranted);
        
        if (!permissionStatus.allGranted) {
          Alert.alert(
            'Permissions Required',
            'This app requires microphone and Bluetooth permissions to function properly.',
            [{ text: 'OK' }]
          );
        }
        
      } else {
        // iOS permissions
        const { granted } = await Audio.requestPermissionsAsync();
        setPermissionsGranted(granted);
      }
    } catch (error) {
      console.log('Permission check error:', error);
      setPermissionsGranted(false);
    }
  };
  
  const configureAudioForAirPods = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
      console.log('✅ Audio configured for AirPods');
    } catch (error) {
      console.log('❌ Audio configuration error:', error);
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
      
      // Mute microphone during TTS
      muteMicrophone();
      
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
      if (audioBase64) {
        // Play server-generated audio
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/mp3;base64,${audioBase64}` },
          { shouldPlay: true, volume: 1.0 }
        );
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setCurrentStatus('Ready');
            unmuteMicrophone();
            sound.unloadAsync();
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
            unmuteMicrophone();
          },
          onError: (error) => {
            console.log('TTS Error:', error);
            setCurrentStatus('Ready');
            unmuteMicrophone();
          }
        });
      }
    } catch (error) {
      console.log('Audio playback error:', error);
      setCurrentStatus('Ready');
      unmuteMicrophone();
    }
  };
  
  const startVoiceService = async () => {
    try {
      if (!permissionsGranted) {
        Alert.alert('Permissions Required', 'Please grant all required permissions first.');
        return;
      }
      
      const result = await VoiceService.startVoiceService();
      setIsServiceRunning(true);
      addMessage('system', '🚀 Voice service started - listening continuously');
      
      Alert.alert(
        'Voice Service Started', 
        'The AI assistant is now listening continuously in the background. You can minimize the app and it will keep working.'
      );
      
    } catch (error) {
      console.log('Start service error:', error);
      Alert.alert('Service Error', 'Failed to start voice service: ' + error.message);
    }
  };
  
  const stopVoiceService = async () => {
    try {
      const result = await VoiceService.stopVoiceService();
      setIsServiceRunning(false);
      setIsListening(false);
      setSpeechDetected(false);
      setCurrentStatus('Service stopped');
      addMessage('system', '⏹️ Voice service stopped');
      
    } catch (error) {
      console.log('Stop service error:', error);
      Alert.alert('Service Error', 'Failed to stop voice service: ' + error.message);
    }
  };
  
  const muteMicrophone = async () => {
    try {
      await VoiceService.muteMicrophone();
    } catch (error) {
      console.log('Mute error:', error);
    }
  };
  
  const unmuteMicrophone = async () => {
    try {
      await VoiceService.unmuteMicrophone();
    } catch (error) {
      console.log('Unmute error:', error);
    }
  };
  
  const testVoiceDetection = () => {
    addMessage('system', '🎯 Say something now to test voice detection...');
    setCurrentStatus('Listening for test...');
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
    // Clean up listeners
    DeviceEventEmitter.removeAllListeners('onListeningStarted');
    DeviceEventEmitter.removeAllListeners('onListeningStopped');
    DeviceEventEmitter.removeAllListeners('onSpeechStarted');
    DeviceEventEmitter.removeAllListeners('onSpeechDetected');
    DeviceEventEmitter.removeAllListeners('onBluetoothConnected');
    DeviceEventEmitter.removeAllListeners('onBluetoothDisconnected');
    DeviceEventEmitter.removeAllListeners('onMicMuteChanged');
    DeviceEventEmitter.removeAllListeners('onError');
    
    if (socket) {
      socket.disconnect();
    }
  };
  
  const getStatusColor = () => {
    if (speechDetected) return '#FF5722';
    if (isListening) return '#4CAF50';
    if (isMicMuted) return '#FF9800';
    if (isServiceRunning) return '#2196F3';
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
        <Text style={styles.subtitle}>Continuous Listening</Text>
        <Text style={styles.status}>{currentStatus}</Text>
        <View style={styles.indicators}>
          <Text style={styles.indicator}>
            🎤 {isServiceRunning ? (isListening ? 'LISTENING' : 'READY') : 'STOPPED'}
          </Text>
          <Text style={styles.indicator}>
            {bluetoothConnected ? '🎧 AIRPODS' : '🔇 NO AIRPODS'}
          </Text>
          <Text style={styles.indicator}>
            📡 {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
        </View>
      </View>
      
      {/* Main Controls */}
      <View style={styles.controlsSection}>
        {!isServiceRunning ? (
          <TouchableOpacity
            style={[styles.primaryButton, styles.startButton]}
            onPress={startVoiceService}
            disabled={!permissionsGranted || !isConnected}
          >
            <Text style={styles.primaryButtonText}>🚀 START VOICE ASSISTANT</Text>
            <Text style={styles.buttonSubtext}>Begin continuous listening</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, styles.stopButton]}
            onPress={stopVoiceService}
          >
            <Text style={styles.primaryButtonText}>⏹️ STOP VOICE ASSISTANT</Text>
            <Text style={styles.buttonSubtext}>Stop continuous listening</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.secondaryControls}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={testVoiceDetection}
            disabled={!isServiceRunning}
          >
            <Text style={styles.secondaryButtonText}>🎯 Test Voice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={clearConversation}
          >
            <Text style={styles.secondaryButtonText}>🗑️ Clear Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={checkAllPermissions}
          >
            <Text style={styles.secondaryButtonText}>🔐 Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Conversation */}
      <ScrollView 
        style={styles.conversationContainer} 
        contentContainerStyle={styles.conversationContent}
        showsVerticalScrollIndicator={false}
      >
        {conversation.length === 0 ? (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>🎤 Voice Assistant Ready</Text>
            <Text style={styles.welcomeText}>
              Start the voice assistant to begin continuous listening. 
              The app will detect when you speak and respond through your AirPods.
            </Text>
            <Text style={styles.instructionText}>
              Instructions:{'\n'}
              1. Connect your AirPods{'\n'}
              2. Grant all permissions{'\n'}
              3. Start the voice assistant{'\n'}
              4. Speak naturally - no wake word needed!
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
          Service: {isServiceRunning ? '🟢 Running' : '🔴 Stopped'} | 
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
