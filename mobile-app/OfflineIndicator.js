// OfflineIndicator.js - Shows connection status
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import documentService from './documentService';

export default function OfflineIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [showDetails, setShowDetails] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const fadeAnim = new Animated.Value(1);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
      
      if (state.type === 'wifi' && state.isConnected) {
        documentService.processSyncQueue();
      }
    });

    const interval = setInterval(async () => {
      const status = await documentService.getSyncStatus();
      setSyncStatus(status);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getIcon = () => {
    if (!isConnected) return '📴';
    if (connectionType === 'wifi') return '📶';
    if (connectionType === 'cellular') return '📱';
    return '🔌';
  };

  const getMessage = () => {
    if (!isConnected) return 'Offline - Using saved data';
    if (connectionType === 'wifi') {
      const pending = syncStatus?.pending || 0;
      return pending > 0 ? `WiFi - Syncing ${pending} files...` : 'WiFi - Full access';
    }
    if (connectionType === 'cellular') return 'Mobile data - Download paused';
    return 'Connected';
  };

  const getColor = () => {
    if (!isConnected) return '#e74c3c';
    if (connectionType === 'wifi') return '#27ae60';
    return '#f39c12';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={[styles.indicator, { backgroundColor: getColor() }]}
        onPress={() => setShowDetails(!showDetails)}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{getIcon()}</Text>
        <Text style={styles.message} numberOfLines={1}>{getMessage()}</Text>
      </TouchableOpacity>

      {showDetails && syncStatus && (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailTitle}>📊 Sync Status</Text>
          <View style={styles.detailRow}>
            <Text>Documents:</Text>
            <Text>{syncStatus.totalDocuments} files</Text>
          </View>
          <View style={styles.detailRow}>
            <Text>Storage:</Text>
            <Text>{syncStatus.storageUsed}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text>Pending:</Text>
            <Text>{syncStatus.pending}</Text>
          </View>
          {syncStatus.isSyncing && (
            <View style={styles.syncingBadge}>
              <Text style={styles.syncingText}>SYNCING...</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  icon: {
    fontSize: 14,
    marginRight: 5,
    color: 'white',
  },
  message: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 150,
  },
  detailsPanel: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 150,
  },
  detailTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  syncingBadge: {
    backgroundColor: '#f39c12',
    borderRadius: 5,
    padding: 5,
    marginTop: 5,
    alignItems: 'center',
  },
  syncingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
});
