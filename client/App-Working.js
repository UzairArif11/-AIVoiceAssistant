import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
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
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [status, setStatus] = useState('Ready');

  useEffect(() => {
    initializeApp();
    return () => {
      if (socket) socket.disconnect();
      if (recording) recording.stopAndUnloadAsync();
    };
  }, []);

  const initializeApp = async () => {
    // Request permissions
    const { status } = await Audio.requestPermissionsAsync();
    setHasPermissions(status === 'granted');

    // Configure audio for better AirPods support
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    // Connect to server
    connectToServer();

    addMessage('system', '🚀 Simple Voice Assistant ready!');
  };

  const connectToServer = () => {
    const newSocket = io(SERVER_URL);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setStatus('Connected');
      addMessage('system', '✅ Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setStatus('Disconnected');
      addMessage('system', '❌ Disconnected from server');
    });

    newSocket.on('ai_response', (data) => {
      addMessage('assistant', data.text);
      setStatus('Speaking...');
      
      // Play through AirPods using Expo Speech
      Speech.speak(data.text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
        onDone: () => setStatus('Ready'),
        onError: () => setStatus('Ready')
      });
    });

    setSocket(newSocket);
  };

  const startRecording = async () => {
    if (!hasPermissions) {
      Alert.alert('Permission needed', 'Please grant microphone permission');
      return;
    }

    try {
      setIsRecording(true);
      setStatus('Recording...');

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

    } catch (error) {
      console.log('Recording error:', error);
      Alert.alert('Recording failed', error.message);
      setIsRecording(false);
      setStatus('Ready');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setStatus('Processing...');

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Send a test message for now (since Expo can't easily read the audio file)
      if (socket && isConnected) {
        // Instead of sending audio, send a text message to test the flow
        socket.emit('text_question', {
          text: 'Hello, this is a test message from the voice assistant',
          timestamp: Date.now()
        });
        addMessage('user', 'Test voice message sent');
      }

      setRecording(null);

    } catch (error) {
      console.log('Stop recording error:', error);
      setStatus('Ready');
    }
  };

  const sendTextMessage = (text) => {
    if (socket && isConnected) {
      socket.emit('text_question', { text, timestamp: Date.now() });
      addMessage('user', text);
      setStatus('AI thinking...');
    }
  };

  const addMessage = (sender, text) => {
    setConversation(prev => [...prev, {
      id: Date.now(),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearChat = () => setConversation([]);

  const getMessageStyle = (sender) => {
    const base = [styles.message];
    if (sender === 'user') base.push(styles.userMessage);
    else if (sender === 'assistant') base.push(styles.assistantMessage);
    else base.push(styles.systemMessage);
    return base;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Simple Voice Assistant</Text>
        <Text style={styles.status}>Status: {status}</Text>
        <Text style={styles.connection}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isRecording ? styles.recordingButton : styles.recordButton]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={!hasPermissions || !isConnected}
        >
          <Text style={styles.buttonText}>
            {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
          </Text>
        </TouchableOpacity>

        <View style={styles.quickButtons}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendTextMessage('What is artificial intelligence?')}
            disabled={!isConnected}
          >
            <Text style={styles.quickButtonText}>❓ What is AI?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => sendTextMessage('Tell me a joke')}
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

      {/* Chat */}
      <ScrollView style={styles.chat} contentContainerStyle={styles.chatContent}>
        {conversation.length === 0 ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeTitle}>👋 Welcome!</Text>
            <Text style={styles.welcomeText}>
              This is a simple voice assistant. You can:
              {'\n'}• Record voice messages (button recording)
              {'\n'}• Use quick text buttons
              {'\n'}• Hear responses through AirPods/speakers
            </Text>
          </View>
        ) : (
          conversation.map((msg) => (
            <View key={msg.id} style={getMessageStyle(msg.sender)}>
              <Text style={styles.messageHeader}>
                {msg.sender === 'user' ? '👤' : msg.sender === 'assistant' ? '🤖' : '⚙️'} 
                {msg.sender} • {msg.timestamp}
              </Text>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Permissions: {hasPermissions ? '✅' : '❌'} | 
          Server: {isConnected ? '🟢' : '🔴'} | 
          AirPods: Works with Expo Speech
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
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  connection: {
    fontSize: 14,
    color: '#fff',
  },
  
  controls: {
    padding: 20,
  },
  button: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  recordButton: {
    backgroundColor: '#4CAF50',
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  chat: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 10,
  },
  chatContent: {
    padding: 15,
  },
  welcome: {
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#666',
  },
  
  message: {
    padding: 12,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: '#E8F5E8',
    alignSelf: 'flex-start',
  },
  systemMessage: {
    backgroundColor: '#FFF3E0',
    alignSelf: 'center',
  },
  messageHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  
  footer: {
    backgroundColor: '#333',
    padding: 10,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
  },
});
