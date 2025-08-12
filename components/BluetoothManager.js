import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  NativeModules,
  DeviceEventEmitter,
  NativeEventEmitter,
} from 'react-native';

const BluetoothManager = ({ onConnectionChange }) => {
  const [bluetoothState, setBluetoothState] = useState({
    isEnabled: false,
    isConnected: false,
    connectedDevices: [],
    availableDevices: [],
    isScanning: false,
    audioRoute: 'speaker', // 'speaker', 'bluetooth', 'wired'
  });

  useEffect(() => {
    checkBluetoothState();
    setupBluetoothListeners();

    return () => {
      // Cleanup listeners
    };
  }, []);

  useEffect(() => {
    onConnectionChange(bluetoothState.isConnected);
  }, [bluetoothState.isConnected, onConnectionChange]);

  const checkBluetoothState = async () => {
    try {
      // Check if Bluetooth is enabled
      const isEnabled = await checkBluetoothEnabled();
      setBluetoothState(prev => ({ ...prev, isEnabled }));

      if (isEnabled) {
        await scanForDevices();
        await checkConnectedDevices();
        await checkAudioRoute();
      }
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
    }
  };

  const checkBluetoothEnabled = async () => {
    try {
      if (Platform.OS === 'android') {
        // For Android, you'd use a native module or library
        // This is a placeholder - implement with react-native-bluetooth-serial or similar
        return true; // Placeholder
      } else {
        // For iOS
        return true; // Placeholder - iOS doesn't allow checking BT state directly
      }
    } catch (error) {
      console.error('Error checking Bluetooth enabled state:', error);
      return false;
    }
  };

  const scanForDevices = async () => {
    try {
      setBluetoothState(prev => ({ ...prev, isScanning: true }));
      
      // This would be implemented with a proper Bluetooth library
      // For now, we'll simulate finding AirPods
      setTimeout(() => {
        setBluetoothState(prev => ({
          ...prev,
          isScanning: false,
          availableDevices: [
            { id: '1', name: 'AirPods Pro', type: 'audio' },
            { id: '2', name: 'AirPods (3rd generation)', type: 'audio' },
          ]
        }));
      }, 2000);
    } catch (error) {
      console.error('Error scanning for devices:', error);
      setBluetoothState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const checkConnectedDevices = async () => {
    try {
      // Check for connected audio devices
      // This would use native modules to check actual Bluetooth connections
      // For now, simulate connected AirPods
      const mockConnectedDevices = [
        { id: '1', name: 'AirPods Pro', type: 'audio', connected: true }
      ];
      
      const hasConnectedAudioDevice = mockConnectedDevices.some(
        device => device.type === 'audio' && device.connected
      );

      setBluetoothState(prev => ({
        ...prev,
        connectedDevices: mockConnectedDevices,
        isConnected: hasConnectedAudioDevice
      }));
    } catch (error) {
      console.error('Error checking connected devices:', error);
    }
  };

  const checkAudioRoute = async () => {
    try {
      // Check current audio routing
      // This would use AudioManager on Android or AVAudioSession on iOS
      // For now, simulate checking audio route
      
      const audioRoute = await getCurrentAudioRoute();
      setBluetoothState(prev => ({ ...prev, audioRoute }));
    } catch (error) {
      console.error('Error checking audio route:', error);
    }
  };

  const getCurrentAudioRoute = async () => {
    // This would be implemented with native modules
    // For Android: AudioManager.getDevices() or similar
    // For iOS: AVAudioSession.currentRoute
    
    // Mock implementation
    if (bluetoothState.connectedDevices.length > 0) {
      return 'bluetooth';
    }
    return 'speaker';
  };

  const setupBluetoothListeners = () => {
    // Set up listeners for Bluetooth state changes
    // This would use native event emitters
    
    if (Platform.OS === 'android') {
      // Android Bluetooth state listeners
      DeviceEventEmitter.addListener('BluetoothStateChanged', (state) => {
        setBluetoothState(prev => ({ ...prev, isEnabled: state.enabled }));
      });

      DeviceEventEmitter.addListener('BluetoothDeviceConnected', (device) => {
        setBluetoothState(prev => ({
          ...prev,
          connectedDevices: [...prev.connectedDevices, device],
          isConnected: true
        }));
      });

      DeviceEventEmitter.addListener('BluetoothDeviceDisconnected', (device) => {
        setBluetoothState(prev => ({
          ...prev,
          connectedDevices: prev.connectedDevices.filter(d => d.id !== device.id),
          isConnected: prev.connectedDevices.length > 1
        }));
      });
    }
  };

  const connectToDevice = async (device) => {
    try {
      // Implement device connection
      // This would use a Bluetooth library like react-native-bluetooth-serial
      
      Alert.alert(
        'Connect to Device',
        `Attempting to connect to ${device.name}...`,
        [{ text: 'OK' }]
      );

      // Mock successful connection
      setTimeout(() => {
        setBluetoothState(prev => ({
          ...prev,
          connectedDevices: [...prev.connectedDevices, { ...device, connected: true }],
          isConnected: true,
          audioRoute: 'bluetooth'
        }));
        
        Alert.alert('Success', `Connected to ${device.name}`);
      }, 2000);

    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Connection Error', `Could not connect to ${device.name}`);
    }
  };

  const disconnectDevice = async (device) => {
    try {
      setBluetoothState(prev => ({
        ...prev,
        connectedDevices: prev.connectedDevices.filter(d => d.id !== device.id),
        isConnected: prev.connectedDevices.length > 1,
        audioRoute: 'speaker'
      }));

      Alert.alert('Disconnected', `Disconnected from ${device.name}`);
    } catch (error) {
      console.error('Error disconnecting device:', error);
      Alert.alert('Disconnection Error', `Could not disconnect from ${device.name}`);
    }
  };

  const setAudioRoute = async (route) => {
    try {
      // Set audio routing (speaker, bluetooth, etc.)
      // This would use native audio management APIs
      
      setBluetoothState(prev => ({ ...prev, audioRoute: route }));
      Alert.alert('Audio Route Changed', `Audio route set to ${route}`);
    } catch (error) {
      console.error('Error setting audio route:', error);
      Alert.alert('Error', 'Could not change audio route');
    }
  };

  const openBluetoothSettings = () => {
    if (Platform.OS === 'android') {
      // Open Android Bluetooth settings
      // This would require native modules
      Alert.alert('Settings', 'Please enable Bluetooth in your device settings');
    } else {
      Alert.alert('Settings', 'Please enable Bluetooth in your device settings');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bluetooth Audio</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={checkBluetoothState}
        >
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Bluetooth:</Text>
          <Text style={[
            styles.statusValue,
            bluetoothState.isEnabled ? styles.statusEnabled : styles.statusDisabled
          ]}>
            {bluetoothState.isEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Audio Device:</Text>
          <Text style={[
            styles.statusValue,
            bluetoothState.isConnected ? styles.statusEnabled : styles.statusDisabled
          ]}>
            {bluetoothState.isConnected ? 'Connected' : 'Not Connected'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Audio Route:</Text>
          <Text style={styles.statusValue}>{bluetoothState.audioRoute}</Text>
        </View>
      </View>

      {!bluetoothState.isEnabled && (
        <TouchableOpacity 
          style={styles.enableButton}
          onPress={openBluetoothSettings}
        >
          <Text style={styles.enableButtonText}>Enable Bluetooth</Text>
        </TouchableOpacity>
      )}

      {bluetoothState.isEnabled && (
        <>
          <View style={styles.devicesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected Devices</Text>
            </View>
            
            {bluetoothState.connectedDevices.length > 0 ? (
              bluetoothState.connectedDevices.map((device) => (
                <View key={device.id} style={styles.deviceItem}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceStatus}>Connected</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.disconnectButton}
                    onPress={() => disconnectDevice(device)}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noDevicesText}>No connected audio devices</Text>
            )}
          </View>

          <View style={styles.devicesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Devices</Text>
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={scanForDevices}
                disabled={bluetoothState.isScanning}
              >
                <Text style={styles.scanButtonText}>
                  {bluetoothState.isScanning ? 'Scanning...' : 'Scan'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {bluetoothState.availableDevices
              .filter(device => !bluetoothState.connectedDevices.find(cd => cd.id === device.id))
              .map((device) => (
                <View key={device.id} style={styles.deviceItem}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceStatus}>Available</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.connectButton}
                    onPress={() => connectToDevice(device)}
                  >
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>

          <View style={styles.audioRouteSection}>
            <Text style={styles.sectionTitle}>Audio Route</Text>
            <View style={styles.audioRouteButtons}>
              <TouchableOpacity 
                style={[
                  styles.audioRouteButton,
                  bluetoothState.audioRoute === 'speaker' && styles.audioRouteButtonActive
                ]}
                onPress={() => setAudioRoute('speaker')}
              >
                <Text style={[
                  styles.audioRouteButtonText,
                  bluetoothState.audioRoute === 'speaker' && styles.audioRouteButtonTextActive
                ]}>
                  Speaker
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.audioRouteButton,
                  bluetoothState.audioRoute === 'bluetooth' && styles.audioRouteButtonActive
                ]}
                onPress={() => setAudioRoute('bluetooth')}
                disabled={!bluetoothState.isConnected}
              >
                <Text style={[
                  styles.audioRouteButtonText,
                  bluetoothState.audioRoute === 'bluetooth' && styles.audioRouteButtonTextActive,
                  !bluetoothState.isConnected && styles.audioRouteButtonTextDisabled
                ]}>
                  Bluetooth
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#2196F3',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusEnabled: {
    color: '#4CAF50',
  },
  statusDisabled: {
    color: '#F44336',
  },
  enableButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  deviceStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  noDevicesText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  audioRouteSection: {
    marginTop: 8,
  },
  audioRouteButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  audioRouteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  audioRouteButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  audioRouteButtonText: {
    fontSize: 14,
    color: '#333',
  },
  audioRouteButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  audioRouteButtonTextDisabled: {
    color: '#ccc',
  },
});

export default BluetoothManager;
