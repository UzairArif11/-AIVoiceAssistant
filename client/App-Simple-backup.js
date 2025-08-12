import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const SERVER_URL = 'http://192.168.1.100:3001'; // Replace with your computer's IP address

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  const findIP = async () => {
    Alert.alert(
      'Find Your IP Address', 
      '1. Open Command Prompt on your computer\n2. Type: ipconfig\n3. Find your WiFi adapter IPv4 address\n4. Update SERVER_URL in the code\n\nCurrent URL: ' + SERVER_URL
    );
  };

  const testServer = async () => {
    try {
      setConnectionStatus('Connecting...');
      
      // Simple fetch test to server
      const response = await fetch(SERVER_URL.replace('3001', '3001'), {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        setConnectionStatus('Connected ✅');
        Alert.alert('Success!', 'Server is reachable');
      } else {
        setConnectionStatus('Server Error ❌');
        Alert.alert('Server Error', 'Server responded but with an error');
      }
    } catch (error) {
      setConnectionStatus('Connection Failed ❌');
      Alert.alert(
        'Connection Failed', 
        'Make sure:\n1. Server is running (npm run dev)\n2. IP address is correct\n3. Both devices on same WiFi\n\nError: ' + error.message
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <Text style={styles.title}>AI Voice Assistant</Text>
      <Text style={styles.subtitle}>Connection Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusText}>{connectionStatus}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={findIP}>
          <Text style={styles.buttonText}>📍 Find Your IP Address</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testServer}>
          <Text style={styles.buttonText}>🔌 Test Server Connection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Instructions:</Text>
        <Text style={styles.infoText}>1. Make sure your server is running</Text>
        <Text style={styles.infoText}>2. Find your computer's IP address</Text>
        <Text style={styles.infoText}>3. Update SERVER_URL in the code</Text>
        <Text style={styles.infoText}>4. Test the connection</Text>
      </View>

      <Text style={styles.urlText}>Server URL: {SERVER_URL}</Text>
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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  buttonsContainer: {
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
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
  urlText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
