import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Audio } from 'expo-av';

const PermissionsManager = ({ onPermissionsChange }) => {
  const [permissions, setPermissions] = useState({
    microphone: false,
    bluetooth: false,
    foregroundService: false,
  });

  useEffect(() => {
    checkAllPermissions();
  }, []);

  useEffect(() => {
    const allGranted = Object.values(permissions).every(granted => granted);
    onPermissionsChange(allGranted);
  }, [permissions, onPermissionsChange]);

  const checkAllPermissions = async () => {
    const microphoneStatus = await checkMicrophonePermission();
    const bluetoothStatus = await checkBluetoothPermissions();
    const foregroundServiceStatus = await checkForegroundServicePermission();

    setPermissions({
      microphone: microphoneStatus,
      bluetooth: bluetoothStatus,
      foregroundService: foregroundServiceStatus,
    });
  };

  const checkMicrophonePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return granted;
      } else {
        // For iOS, use expo-av to check
        const { status } = await Audio.getPermissionsAsync();
        return status === 'granted';
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      return false;
    }
  };

  const checkBluetoothPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const bluetoothGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH
        );
        const bluetoothAdminGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
        );
        
        let bluetoothConnectGranted = true;
        if (Platform.Version >= 31) {
          bluetoothConnectGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );
        }

        return bluetoothGranted && bluetoothAdminGranted && bluetoothConnectGranted;
      } else {
        // iOS handles Bluetooth permissions differently
        return true; // Assume granted for iOS
      }
    } catch (error) {
      console.error('Error checking Bluetooth permissions:', error);
      return false;
    }
  };

  const checkForegroundServicePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE
        );
        return granted;
      } else {
        return true; // iOS doesn't need explicit foreground service permission
      }
    } catch (error) {
      console.error('Error checking foreground service permission:', error);
      return false;
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to listen for voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setPermissions(prev => ({ ...prev, microphone: isGranted }));
        return isGranted;
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        const isGranted = status === 'granted';
        setPermissions(prev => ({ ...prev, microphone: isGranted }));
        return isGranted;
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      Alert.alert('Permission Error', 'Could not request microphone permission.');
      return false;
    }
  };

  const requestBluetoothPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
          PermissionsAndroid.PERMISSIONS.MODIFY_AUDIO_SETTINGS,
        ];

        // Add BLUETOOTH_CONNECT for Android 12+
        if (Platform.Version >= 31) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        }

        const granted = await PermissionsAndroid.requestMultiple(
          permissionsToRequest,
          {
            title: 'Bluetooth Permissions',
            message: 'This app needs Bluetooth permissions to connect to your AirPods for voice input and output.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const allGranted = permissionsToRequest.every(
          permission => granted[permission] === PermissionsAndroid.RESULTS.GRANTED
        );

        setPermissions(prev => ({ ...prev, bluetooth: allGranted }));
        return allGranted;
      } else {
        setPermissions(prev => ({ ...prev, bluetooth: true }));
        return true;
      }
    } catch (error) {
      console.error('Error requesting Bluetooth permissions:', error);
      Alert.alert('Permission Error', 'Could not request Bluetooth permissions.');
      return false;
    }
  };

  const requestForegroundServicePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
          {
            title: 'Foreground Service Permission',
            message: 'This app needs foreground service permission to run voice detection in the background.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setPermissions(prev => ({ ...prev, foregroundService: isGranted }));
        return isGranted;
      } else {
        setPermissions(prev => ({ ...prev, foregroundService: true }));
        return true;
      }
    } catch (error) {
      console.error('Error requesting foreground service permission:', error);
      Alert.alert('Permission Error', 'Could not request foreground service permission.');
      return false;
    }
  };

  const requestAllPermissions = async () => {
    const micGranted = await requestMicrophonePermission();
    const bluetoothGranted = await requestBluetoothPermissions();
    const foregroundGranted = await requestForegroundServicePermission();

    if (micGranted && bluetoothGranted && foregroundGranted) {
      Alert.alert('Success', 'All permissions granted! You can now start the voice assistant.');
    } else {
      Alert.alert(
        'Permissions Required',
        'Some permissions were not granted. The voice assistant may not work properly without all permissions.'
      );
    }
  };

  const getPermissionIcon = (granted) => {
    return granted ? '✓' : '✗';
  };

  const getPermissionColor = (granted) => {
    return granted ? '#4CAF50' : '#F44336';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Required Permissions</Text>
      
      <View style={styles.permissionsList}>
        <TouchableOpacity 
          style={styles.permissionItem}
          onPress={requestMicrophonePermission}
        >
          <Text style={styles.permissionName}>Microphone</Text>
          <Text style={[
            styles.permissionStatus, 
            { color: getPermissionColor(permissions.microphone) }
          ]}>
            {getPermissionIcon(permissions.microphone)} {permissions.microphone ? 'Granted' : 'Tap to Grant'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.permissionItem}
          onPress={requestBluetoothPermissions}
        >
          <Text style={styles.permissionName}>Bluetooth</Text>
          <Text style={[
            styles.permissionStatus, 
            { color: getPermissionColor(permissions.bluetooth) }
          ]}>
            {getPermissionIcon(permissions.bluetooth)} {permissions.bluetooth ? 'Granted' : 'Tap to Grant'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.permissionItem}
          onPress={requestForegroundServicePermission}
        >
          <Text style={styles.permissionName}>Background Service</Text>
          <Text style={[
            styles.permissionStatus, 
            { color: getPermissionColor(permissions.foregroundService) }
          ]}>
            {getPermissionIcon(permissions.foregroundService)} {permissions.foregroundService ? 'Granted' : 'Tap to Grant'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.requestAllButton}
        onPress={requestAllPermissions}
      >
        <Text style={styles.requestAllButtonText}>Request All Permissions</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={checkAllPermissions}
      >
        <Text style={styles.refreshButtonText}>Refresh Status</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  permissionsList: {
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  permissionName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  requestAllButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestAllButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  refreshButtonText: {
    color: '#2196F3',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PermissionsManager;
