package com.aivoiceassistant.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class VoiceListenerService extends Service {
    
    private static final String CHANNEL_ID = "VoiceAssistantChannel";
    private static final int NOTIFICATION_ID = 1;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        createNotificationChannel();
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AI Voice Assistant")
            .setContentText("Listening for voice commands...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .build();
            
        startForeground(NOTIFICATION_ID, notification);
        
        // TODO: Start actual voice listening logic here
        // For now, we'll simulate the service starting
        sendEvent("onListeningStarted", null);
        
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        sendEvent("onListeningStopped", null);
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                CHANNEL_ID,
                "Voice Assistant Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
    
    private void sendEvent(String eventName, WritableMap params) {
        try {
            // This would need to be properly implemented to send events to React Native
            // For now, this is a placeholder
            
            // In a real implementation, you would:
            // 1. Get the ReactApplicationContext
            // 2. Send events via DeviceEventManagerModule.RCTDeviceEventEmitter
            
        } catch (Exception e) {
            // Handle error
        }
    }
}
