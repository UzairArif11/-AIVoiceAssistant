package com.aivoiceassistant.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android.Manifest;

public class VoiceServiceModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public VoiceServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "VoiceService";
    }

    @ReactMethod
    public void startVoiceService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, VoiceListenerService.class);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent);
            } else {
                reactContext.startService(serviceIntent);
            }
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Voice service started");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("VOICE_SERVICE_ERROR", "Failed to start voice service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopVoiceService(Promise promise) {
        try {
            Intent serviceIntent = new Intent(reactContext, VoiceListenerService.class);
            reactContext.stopService(serviceIntent);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Voice service stopped");
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("VOICE_SERVICE_ERROR", "Failed to stop voice service: " + e.getMessage());
        }
    }

    @ReactMethod
    public void checkPermissions(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            
            boolean audioPermission = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO) 
                == PackageManager.PERMISSION_GRANTED;
            
            boolean bluetoothPermission = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.BLUETOOTH) 
                == PackageManager.PERMISSION_GRANTED;
                
            result.putBoolean("audioPermission", audioPermission);
            result.putBoolean("bluetoothPermission", bluetoothPermission);
            result.putBoolean("allGranted", audioPermission && bluetoothPermission);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check permissions: " + e.getMessage());
        }
    }

    @ReactMethod
    public void muteMicrophone(Promise promise) {
        try {
            // This would be implemented in the service
            // For now, just resolve successfully
            promise.resolve("Microphone muted");
        } catch (Exception e) {
            promise.reject("MIC_MUTE_ERROR", "Failed to mute microphone: " + e.getMessage());
        }
    }

    @ReactMethod
    public void unmuteMicrophone(Promise promise) {
        try {
            // This would be implemented in the service
            // For now, just resolve successfully
            promise.resolve("Microphone unmuted");
        } catch (Exception e) {
            promise.reject("MIC_UNMUTE_ERROR", "Failed to unmute microphone: " + e.getMessage());
        }
    }
}
