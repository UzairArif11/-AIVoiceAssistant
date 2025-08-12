import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import io from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.100:3001'; // Replace with your server IP

const VoiceAssistant = ({ isActive, onStop }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationLog, setConversationLog] = useState([]);
  const [socket, setSocket] = useState(null);
  const [recording, setRecording] = useState(null);
  const recordingRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      initializeAssistant();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isActive]);

  const initializeAssistant = async () => {
    try {
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Audio permission is required for voice assistant.');
        onStop();
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      // Connect to server
      const socketConnection = io(SERVER_URL, {
        transports: ['websocket'],
        timeout: 5000,
      });

      socketConnection.on('connect', () => {
        console.log('Connected to AI server');
        setSocket(socketConnection);
        startContinuousListening();
      });

      socketConnection.on('connect_error', (error) => {
        console.error('Connection error:', error);
        Alert.alert('Connection Error', 'Could not connect to AI server. Check your network connection.');
      });

      setupSocketListeners(socketConnection);

    } catch (error) {
      console.error('Error initializing assistant:', error);
      Alert.alert('Initialization Error', error.message);
    }
  };

  const setupSocketListeners = (socketConnection) => {
    socketConnection.on('speech-started', () => {
      setIsListening(true);
      console.log('Speech detection started');
    });

    socketConnection.on('processing-speech', () => {
      setIsProcessing(true);
      setIsListening(false);
      console.log('Processing speech...');
    });

    socketConnection.on('transcription', (data) => {
      setTranscription(data.text);
      addToConversationLog('user', data.text);
      console.log('Transcription:', data.text);
    });

    socketConnection.on('ai-response', async (data) => {
      setAiResponse(data.text);
      setIsProcessing(false);
      addToConversationLog('assistant', data.text);
      
      // Play AI response
      await playAIResponse(data.text, data.audio);
    });

    socketConnection.on('error', (data) => {
      console.error('Server error:', data.message);
      setIsProcessing(false);
      setIsListening(false);
    });
  };

  const startContinuousListening = async () => {
    try {
      // Create recording configuration
      const recordingOptions = {
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
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
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
      recordingRef.current = newRecording;

      // Start streaming audio chunks
      startAudioStreaming(newRecording);

    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Could not start audio recording.');
    }
  };

  const startAudioStreaming = async (recording) => {
    const CHUNK_INTERVAL = 100; // Send chunks every 100ms

    const sendAudioChunks = setInterval(async () => {
      if (!socket || !recording || isPlayingRef.current) {
        return;
      }

      try {
        // Get recording status
        const status = await recording.getStatusAsync();
        if (!status.isRecording) {
          return;
        }

        // Read audio data (this is simplified - in real implementation you'd need native modules)
        // For Expo, we'll use a different approach with periodic uploads
        // This is where you'd implement the native audio streaming
        
      } catch (error) {
        console.error('Error streaming audio:', error);
      }
    }, CHUNK_INTERVAL);

    // Store interval reference for cleanup
    recordingRef.current.streamInterval = sendAudioChunks;
  };

  const playAIResponse = async (text, audioBase64) => {
    try {
      isPlayingRef.current = true;
      socket?.emit('tts-started');

      if (audioBase64) {
        // Play audio response
        const audioUri = `${FileSystem.cacheDirectory}response_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(audioUri, audioBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            isPlayingRef.current = false;
            socket?.emit('tts-finished');
            // Clean up audio file
            FileSystem.deleteAsync(audioUri, { idempotent: true });
          }
        });

        await sound.playAsync();
      } else {
        // Fallback to text-to-speech
        await Speech.speak(text, {
          onDone: () => {
            isPlayingRef.current = false;
            socket?.emit('tts-finished');
          },
          onError: (error) => {
            console.error('TTS Error:', error);
            isPlayingRef.current = false;
            socket?.emit('tts-finished');
          }
        });
      }
    } catch (error) {
      console.error('Error playing response:', error);
      isPlayingRef.current = false;
      socket?.emit('tts-finished');
    }
  };

  const addToConversationLog = (role, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setConversationLog(prev => [
      ...prev,
      { role, message, timestamp }
    ]);
  };

  const cleanup = async () => {
    try {
      if (recordingRef.current) {
        if (recordingRef.current.streamInterval) {
          clearInterval(recordingRef.current.streamInterval);
        }
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      }

      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      setIsListening(false);
      setIsProcessing(false);
      setRecording(null);
      recordingRef.current = null;
      isPlayingRef.current = false;

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleManualStop = () => {
    cleanup();
    onStop();
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            isListening ? styles.listeningDot : 
            isProcessing ? styles.processingDot : styles.idleDot
          ]} />
          <Text style={styles.statusText}>
            {isListening ? 'Listening...' : 
             isProcessing ? 'Processing...' : 'Ready'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.stopButton}
          onPress={handleManualStop}
        >
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.currentInteraction}>
        {transcription ? (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionLabel}>You said:</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        ) : null}

        {aiResponse ? (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Assistant:</Text>
            <Text style={styles.responseText}>{aiResponse}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView style={styles.conversationLog}>
        <Text style={styles.logTitle}>Conversation History</Text>
        {conversationLog.map((entry, index) => (
          <View key={index} style={styles.logEntry}>
            <Text style={styles.logTimestamp}>{entry.timestamp}</Text>
            <Text style={[
              styles.logMessage,
              entry.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}>
              {entry.role === 'user' ? 'You: ' : 'Assistant: '}
              {entry.message}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  listeningDot: {
    backgroundColor: '#4CAF50',
  },
  processingDot: {
    backgroundColor: '#FF9800',
  },
  idleDot: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  currentInteraction: {
    marginBottom: 20,
  },
  transcriptionContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  transcriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
  },
  responseContainer: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 16,
    color: '#333',
  },
  conversationLog: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  logEntry: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessage: {
    color: '#1976D2',
  },
  assistantMessage: {
    color: '#388E3C',
  },
});

export default VoiceAssistant;
