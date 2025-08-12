import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.17:3001'; // Replace with your computer's IP address

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const socketConnection = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });

    socketConnection.on('connect', () => {
      console.log('Connected to AI server');
      setIsConnected(true);
      setSocket(socketConnection);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    socketConnection.on('transcription', (data) => {
      setTranscription(data.text);
      console.log('Transcription:', data.text);
    });

    socketConnection.on('ai-response', (data) => {
      setAiResponse(data.text);
      console.log('AI Response:', data.text);
      
      // Use built-in Text-to-Speech if available
      if (data.text) {
        // You can implement TTS here using expo-speech when it's working
        Alert.alert('AI Response', data.text);
      }
    });

    socketConnection.on('error', (data) => {
      console.error('Server error:', data.message);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
        ]);
        
        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (allGranted) {
          Alert.alert('Success', 'All permissions granted!');
        } else {
          Alert.alert('Error', 'Some permissions were denied');
        }
      } catch (error) {
        console.error('Permission error:', error);
        Alert.alert('Error', 'Failed to request permissions');
      }
    }
  };

  const testConnection = () => {
    if (socket && socket.connected) {
      // Send a test message to the server
      socket.emit('test-message', { text: 'Hello from React Native!' });
      Alert.alert('Test', 'Test message sent to server');
    } else {
      Alert.alert('Error', 'Not connected to server');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <Text style={styles.title}>AI Voice Assistant</Text>
      <Text style={styles.subtitle}>Basic Connection Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Server Connection:</Text>
        <Text style={[
          styles.statusValue,
          isConnected ? styles.statusSuccess : styles.statusError
        ]}>
          {isConnected ? '✓ Connected' : '✗ Disconnected'}
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermissions}
        >
          <Text style={styles.buttonText}>Request Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !isConnected && styles.disabledButton]}
          onPress={testConnection}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      {transcription ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Last Transcription:</Text>
          <Text style={styles.messageText}>{transcription}</Text>
        </View>
      ) : null}

      {aiResponse ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>AI Response:</Text>
          <Text style={styles.messageText}>{aiResponse}</Text>
        </View>
      ) : null}

      <Text style={styles.instructionText}>
        Make sure your server is running on {SERVER_URL} and update the IP address in the code.
      </Text>
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
    marginBottom: 30,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusError: {
    color: '#F44336',
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#666',
  },
  instructionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
