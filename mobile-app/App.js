import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  StatusBar,
  ScrollView
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import aiService from './aiService';
import OfflineIndicator from './OfflineIndicator';
import DemoMode from './DemoMode';
import documentService from './documentService';

// Production backend URL (update after deploying to Render)
// For local testing, use: 'http://localhost:5000'
const API_URL = 'https://msomi-alert-backend.onrender.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [deviceToken, setDeviceToken] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    unread: 0,
    critical: 0
  });
  
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    setupNotifications();
    loadSavedData();
    initializeAI();
    documentService.initialize();
    
    notificationListener.current = Notifications.addNotificationReceivedListener(async (notification) => {
      const messageText = notification.request.content.body || '';
      const messageTitle = notification.request.content.title || '';
      
      let aiResult = null;
      if (aiService.isReady && messageText) {
        aiResult = await aiService.classifyMessage(messageText);
        console.log('🧠 AI Classification:', aiResult);
      }
      
      const newNotification = {
        id: Date.now().toString(),
        title: messageTitle,
        body: messageText,
        data: notification.request.content.data,
        receivedAt: new Date().toISOString(),
        read: false,
        ai: aiResult,
        critical: aiResult?.urgency.level === 'critical'
      };
      
      setNotifications(prev => [newNotification, ...prev]);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      Alert.alert('Notification Opened', JSON.stringify(data));
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    updateStats();
  }, [notifications]);

  const updateStats = () => {
    setStats({
      totalAlerts: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      critical: notifications.filter(n => n.ai?.urgency.level === 'critical').length
    });
  };

  const initializeAI = async () => {
    await aiService.initialize();
  };

  const setupNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Error', 'Failed to get notification permissions');
        return;
      }
      
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setDeviceToken(token);
      await AsyncStorage.setItem('deviceToken', token);
    } catch (error) {
      console.error('Setup error:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedName = await AsyncStorage.getItem('studentName');
      const savedPhone = await AsyncStorage.getItem('phoneNumber');
      const savedCourses = await AsyncStorage.getItem('courses');
      const savedRegistered = await AsyncStorage.getItem('registered');
      
      if (savedName) setStudentName(savedName);
      if (savedPhone) setPhoneNumber(savedPhone);
      if (savedCourses) setCourses(JSON.parse(savedCourses));
      if (savedRegistered === 'true') setRegistered(true);
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const registerDevice = async () => {
    if (!deviceToken) {
      Alert.alert('Error', 'No device token available');
      return;
    }

    if (courses.length === 0) {
      Alert.alert('Error', 'Add at least one course');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/register-device`, {
        deviceToken: deviceToken,
        phoneNumber: phoneNumber,
        studentName: studentName,
        courses: courses
      });

      if (response.data.success) {
        setRegistered(true);
        await AsyncStorage.setItem('registered', 'true');
        await AsyncStorage.setItem('studentName', studentName);
        await AsyncStorage.setItem('phoneNumber', phoneNumber);
        await AsyncStorage.setItem('courses', JSON.stringify(courses));
        
        Alert.alert('Success', 'Device registered successfully!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const addCourse = () => {
    if (newCourse.trim()) {
      const formattedCourse = newCourse.trim().toUpperCase();
      setCourses([...courses, formattedCourse]);
      setNewCourse('');
    }
  };

  const removeCourse = (courseToRemove) => {
    setCourses(courses.filter(c => c !== courseToRemove));
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const clearAll = () => {
    Alert.alert(
      'Clear All',
      'Delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => setNotifications([]),
          style: 'destructive'
        }
      ]
    );
  };

  if (!registered) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>📚 MSOMI ALERT</Text>
            <Text style={styles.subtitle}>Zero-cost offline notifications</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Your Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={studentName}
              onChangeText={setStudentName}
            />

            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+254712345678"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Your Courses</Text>
            <View style={styles.courseInputContainer}>
              <TextInput
                style={[styles.input, styles.courseInput]}
                placeholder="e.g., CSC201"
                value={newCourse}
                onChangeText={setNewCourse}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.addButton} onPress={addCourse}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.coursesContainer}>
              {courses.map((course) => (
                <View key={course} style={styles.courseTag}>
                  <Text style={styles.courseTagText}>{course}</Text>
                  <TouchableOpacity onPress={() => removeCourse(course)}>
                    <Text style={styles.removeTag}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {courses.length === 0 && (
                <Text style={styles.hint}>Add at least one course</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.disabledButton]}
              onPress={registerDevice}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Registering...' : '✅ Register Device'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Note: You'll receive alerts even with zero data balance
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.notificationHeader}>
        <View>
          <Text style={styles.title}>📬 MSOMI ALERT</Text>
          <Text style={styles.courseBadge}>
            {courses.length} courses • {stats.critical} urgent
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => setShowDemo(true)}
          >
            <Text style={styles.refreshButtonText}>🎯</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => setRegistered(false)}
          >
            <Text style={styles.refreshButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearAll}
          >
            <Text style={styles.clearButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.totalAlerts}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.unread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#e74c3c' }]}>{stats.critical}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No alerts yet</Text>
          <Text style={styles.emptySubtext}>
            Send a test from Telegram bot or demo mode
          </Text>
          <TouchableOpacity 
            style={styles.demoLaunchButton}
            onPress={() => setShowDemo(true)}
          >
            <Text style={styles.demoLaunchText}>🚀 Launch Demo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.notificationCard, item.critical && styles.criticalCard, item.read && styles.readCard]}
              onPress={() => markAsRead(item.id)}
              onLongPress={() => item.ai && Alert.alert('AI Details', JSON.stringify(item.ai, null, 2))}
            >
              {!item.read && <View style={styles.unreadDot} />}
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationBody}>{item.body}</Text>
              
              {item.ai && (
                <View style={styles.aiTags}>
                  {item.ai.courses.map(c => (
                    <Text key={c} style={styles.courseTagSmall}>{c}</Text>
                  ))}
                  {item.ai.venue && (
                    <Text style={styles.venueTag}>📍 {item.ai.venue}</Text>
                  )}
                  {item.ai.timeRefs.length > 0 && (
                    <Text style={styles.timeTag}>⏰ {item.ai.timeRefs[0]}</Text>
                  )}
                </View>
              )}
              
              <Text style={styles.notificationTime}>
                {new Date(item.receivedAt).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <OfflineIndicator />
      <DemoMode visible={showDemo} onClose={() => setShowDemo(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  courseInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  courseInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  coursesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    minHeight: 40,
  },
  courseTag: {
    backgroundColor: '#e1f5fe',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseTagText: {
    color: '#0288d1',
    fontWeight: '500',
    marginRight: 5,
  },
  removeTag: {
    color: '#0288d1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  registerButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  note: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginTop: 15,
    fontSize: 12,
  },
  notificationHeader: {
    backgroundColor: '#27ae60',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseBadge: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  refreshButton: {
    padding: 10,
  },
  refreshButtonText: {
    fontSize: 22,
    color: 'white',
  },
  clearButton: {
    padding: 10,
  },
  clearButtonText: {
    fontSize: 22,
    color: 'white',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  listContainer: {
    padding: 15,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    position: 'relative',
  },
  criticalCard: {
    borderLeftColor: '#e74c3c',
    backgroundColor: '#fff5f5',
  },
  readCard: {
    borderLeftColor: '#95a5a6',
    opacity: 0.8,
  },
  unreadDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3498db',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
    paddingRight: 20,
  },
  notificationBody: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 20,
  },
  demoLaunchButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  demoLaunchText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 5,
  },
  courseTagSmall: {
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: '#0288d1',
    fontSize: 11,
    fontWeight: '500',
  },
  venueTag: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: '#e67e22',
    fontSize: 11,
  },
  timeTag: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    color: '#27ae60',
    fontSize: 11,
  },
});
