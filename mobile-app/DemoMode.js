// DemoMode.js - Hackathon presentation helper
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import documentService from './documentService';

export default function DemoMode({ visible, onClose }) {
  const [demoStep, setDemoStep] = useState(0);

  const demoScenarios = [
    {
      name: '🚨 Urgent Exam Change',
      message: 'URGENT: CSC201 exam moved to LT3 tomorrow 7am. Bring calculators.',
      course: 'CSC201',
      expected: 'Critical alert with venue and time'
    },
    {
      name: '📚 Swahili Message',
      message: 'Msomi kesho 7am venue LT5. Darasa muhimu sana!',
      course: 'CSC201',
      expected: 'Detects Swahili, extracts time/venue'
    },
    {
      name: '📄 Document Sync',
      action: 'sync',
      expected: 'Downloads sample PDF on WiFi'
    },
    {
      name: '📴 Offline Mode',
      action: 'offline',
      expected: 'Shows offline indicator, cached alerts work'
    }
  ];

  const runDemo = async (index) => {
    setDemoStep(index);
    
    switch (index) {
      case 0:
      case 1:
        await triggerNotification(demoScenarios[index]);
        break;
      case 2:
        await documentService.queueDocument('CSC201', {
          id: 'demo-' + Date.now(),
          title: 'Sample Lecture Notes - Programming Basics',
          remoteUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          tags: 'demo,lecture'
        });
        Alert.alert('📥 Queued', 'Document will sync when WiFi available');
        break;
      case 3:
        await AsyncStorage.setItem('demo_offline', 'true');
        Alert.alert('📴 Demo Mode', 'App now thinks it\'s offline. Turn on airplane mode for full effect.');
        break;
    }
  };

  const triggerNotification = async (scenario) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📢 ${scenario.course}`,
        body: scenario.message,
        data: { demo: true, course: scenario.course },
      },
      trigger: null,
    });
  };

  const resetDemo = async () => {
    await AsyncStorage.removeItem('demo_offline');
    setDemoStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🎯 Hackathon Demo Mode</Text>
          
          <Text style={styles.subtitle}>Click to demonstrate:</Text>
          
          {demoScenarios.map((scenario, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.demoButton, demoStep === index && styles.demoButtonActive]}
              onPress={() => runDemo(index)}
            >
              <Text style={styles.demoButtonText}>{scenario.name}</Text>
              <Text style={styles.demoDesc}>{scenario.expected}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
            <Text style={styles.resetButtonText}>🔄 Reset Demo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={resetDemo}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>⚡ Everything works OFFLINE - no data needed!</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  demoButton: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  demoButtonActive: {
    backgroundColor: '#3498db',
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  demoDesc: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  resetButton: {
    backgroundColor: '#e67e22',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  closeButtonText: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    color: '#27ae60',
    fontWeight: 'bold',
  },
});
