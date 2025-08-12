import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.17:3001';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [socket, setSocket] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState('Ready');

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      setHasPermissions(granted);
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is required for voice assistant');
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  const connectSocket = () => {
    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(SERVER_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionStatus('Connected ✅');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setConnectionStatus('Disconnected ❌');
    });

    newSocket.on('transcription', (data) => {
      console.log('Transcription:', data.text);
      addToConversation('user', data.text);
      setAssistantStatus('Thinking...');
    });

    newSocket.on('ai_response', (data) => {
      console.log('AI Response:', data.text);
      addToConversation('assistant', data.text);
      setAssistantStatus('Speaking...');
    });

    newSocket.on('tts_complete', () => {
      console.log('TTS complete');
      setAssistantStatus('Ready');
    });

    newSocket.on('error', (error) => {
      console.log('Socket error:', error);
      Alert.alert('Connection Error', error.message || 'Socket connection failed');
    });

    setSocket(newSocket);
  };

  const addToConversation = (speaker, text) => {
    setConversation(prev => [...prev, { speaker, text, timestamp: new Date().toLocaleTimeString() }]);
  };

  const startRecording = async () => {
    if (!hasPermissions) {
      Alert.alert('Permission Required', 'Please grant microphone permissions first');
      return;
    }

    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to server first');
      return;
    }

    try {
      setAssistantStatus('Listening...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
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
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.log('Recording error:', error);
      Alert.alert('Recording Error', error.message);
      setAssistantStatus('Ready');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setAssistantStatus('Processing...');
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Send test message to server
      if (socket && uri) {
        socket.emit('test_message', { 
          text: 'Test voice message from mobile app', 
          timestamp: Date.now(),
          audioUri: uri
        });
        addToConversation('user', 'Voice test sent to server');
      }
      
      setRecording(null);
      setAssistantStatus('Ready');
    } catch (error) {
      console.log('Stop recording error:', error);
      Alert.alert('Recording Error', error.message);
      setAssistantStatus('Ready');
    }
  };

  const testServer = async () => {
    try {
      setConnectionStatus('Connecting...');
      
      const response = await fetch(SERVER_URL, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('Connected ✅');
        Alert.alert('Success!', `Server is running: ${data.message}`);
      } else {
        setConnectionStatus('Server Error ❌');
        Alert.alert('Server Error', 'Server responded but with an error');
      }
    } catch (error) {
      setConnectionStatus('Connection Failed ❌');
      Alert.alert(
        'Connection Failed', 
        'Make sure server is running and IP is correct\n\nError: ' + error.message
      );
    }
  };

  const clearConversation = () => {
    setConversation([]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <Text style={styles.title}>AI Voice Assistant</Text>
      <Text style={styles.subtitle}>Voice Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={styles.statusText}>{connectionStatus}</Text>
        
        <Text style={styles.statusLabel}>Assistant:</Text>
        <Text style={styles.statusText}>{assistantStatus}</Text>
        
        <Text style={styles.statusLabel}>Permissions:</Text>
        <Text style={styles.statusText}>{hasPermissions ? 'Granted ✅' : 'Not Granted ❌'}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {!hasPermissions && (
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>🎤 Grant Microphone Permission</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={testServer}>
          <Text style={styles.buttonText}>🔌 Test Server</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isConnected ? styles.buttonDisconnect : null]} 
          onPress={isConnected ? () => socket?.disconnect() : connectSocket}
        >
          <Text style={styles.buttonText}>
            {isConnected ? '🔌 Disconnect' : '🔌 Connect to Server'}
          </Text>
        </TouchableOpacity>

        {hasPermissions && isConnected && (
          <TouchableOpacity 
            style={[styles.button, isRecording ? styles.buttonRecording : styles.buttonRecord]} 
            onPress={isRecording ? stopRecording : startRecording}
            disabled={assistantStatus === 'Processing...'}
          >
            <Text style={styles.buttonText}>
              {isRecording ? '⏹️ Stop Recording' : '🎤 Start Voice Test'}
            </Text>
          </TouchableOpacity>
        )}

        {conversation.length > 0 && (
          <TouchableOpacity style={styles.buttonClear} onPress={clearConversation}>
            <Text style={styles.buttonText}>🗑️ Clear Conversation</Text>
          </TouchableOpacity>
        )}
      </View>

      {conversation.length > 0 && (
        <ScrollView style={styles.conversationContainer}>
          <Text style={styles.conversationTitle}>Conversation:</Text>
          {conversation.map((item, index) => (
            <View key={index} style={[
              styles.messageContainer,
              item.speaker === 'user' ? styles.userMessage : styles.assistantMessage
            ]}>
              <Text style={styles.messageHeader}>
                {item.speaker === 'user' ? '👤 You' : '🤖 Assistant'} - {item.timestamp}
              </Text>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Instructions:</Text>
        <Text style={styles.infoText}>1. Grant microphone permissions</Text>
        <Text style={styles.infoText}>2. Test server connection</Text>
        <Text style={styles.infoText}>3. Connect to server via Socket.IO</Text>
        <Text style={styles.infoText}>4. Try voice recording test</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginTop: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonRecord: {
    backgroundColor: '#4CAF50',
  },
  buttonRecording: {
    backgroundColor: '#F44336',
  },
  buttonDisconnect: {
    backgroundColor: '#FF9800',
  },
  buttonClear: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  conversationContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    maxHeight: 200,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  messageContainer: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  userMessage: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#F1F8E9',
    alignSelf: 'flex-start',
  },
  messageHeader: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});
