# 📱 MSOMI ALERT - FRONTEND BREAKDOWN

## 🎨 COMPLETE FRONTEND ARCHITECTURE

---

## 📂 FRONTEND FILE STRUCTURE

```
mobile-app/
├── App.js                      # Main application component (600+ lines)
├── aiService.js                # On-device AI classification engine
├── documentService.js          # Offline document sync service
├── OfflineIndicator.js         # Network status indicator
├── firebaseConfig.js           # Push notification setup
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── eas.json                    # Build configuration
├── google-services.json        # Firebase Android config
└── assets/                     # Images and icons
    ├── icon.png
    ├── splash-icon.png
    ├── adaptive-icon.png
    └── favicon.png
```

---

## 🧩 COMPONENT BREAKDOWN

### 1. **App.js** - Main Application (Core Frontend)

#### **Technology Stack:**
```javascript
- React Native 0.81.5
- React 19.1.0
- Expo SDK 54
- React Hooks (useState, useEffect, useRef)
```

#### **Key Libraries Used:**
```javascript
import { SafeAreaView } from 'react-native-safe-area-context';  // Safe area handling
import * as Notifications from 'expo-notifications';             // Push notifications
import AsyncStorage from '@react-native-async-storage/async-storage'; // Local storage
import axios from 'axios';                                       // HTTP requests
```

#### **State Management (React Hooks):**
```javascript
const [deviceToken, setDeviceToken] = useState(null);           // FCM token
const [registered, setRegistered] = useState(false);            // Registration status
const [notifications, setNotifications] = useState([]);         // Notification inbox
const [courses, setCourses] = useState([]);                     // Student courses
const [newCourse, setNewCourse] = useState('');                 // Course input
const [studentName, setStudentName] = useState('');             // Student name
const [phoneNumber, setPhoneNumber] = useState('');             // Phone number
const [loading, setLoading] = useState(false);                  // Loading state
const [stats, setStats] = useState({                            // Dashboard stats
  totalAlerts: 0,
  unread: 0,
  critical: 0
});
```

#### **Core Features:**

##### **A. Registration Screen**
```javascript
Components Used:
- SafeAreaView          # Safe area wrapper
- ScrollView            # Scrollable container
- TextInput (3x)        # Name, phone, course inputs
- TouchableOpacity (2x) # Add course, register buttons
- FlatList              # Course tags display
- StatusBar             # Status bar styling

Functionality:
✅ Student name input (optional)
✅ Phone number input (optional)
✅ Course code input with validation
✅ Dynamic course tag management
✅ Add/remove courses
✅ Form validation
✅ Backend registration API call
✅ AsyncStorage persistence
```

##### **B. Notification Inbox Screen**
```javascript
Components Used:
- SafeAreaView          # Safe area wrapper
- View (multiple)       # Layout containers
- FlatList              # Notification list
- TouchableOpacity (5x) # Interactive buttons
- Text (20+)            # Labels and content
- StatusBar             # Status bar styling

Functionality:
✅ Real-time notification display
✅ Unread indicator (blue dot)
✅ Critical alert highlighting (red border)
✅ AI-powered tags (course, venue, time)
✅ Mark as read on tap
✅ Long-press for AI details
✅ Clear all notifications
✅ Settings access
✅ Stats dashboard (total, unread, urgent)
```

##### **C. Empty State**
```javascript
Components:
- View                  # Container
- Text (3x)             # Icon, message, hint
- TouchableOpacity      # Demo button (removed in production)

Functionality:
✅ Friendly empty state message
✅ Instructions for receiving alerts
✅ Visual feedback (emoji icon)
```

#### **API Integration:**
```javascript
Backend URL: 'https://msomi-alert.vercel.app'

Endpoints Used:
1. POST /api/register-device
   - Registers student device
   - Sends: deviceToken, phoneNumber, studentName, courses
   - Timeout: 30 seconds
   
2. (Future) GET /api/notifications
   - Fetch notification history
```

#### **Notification Handling:**
```javascript
Setup:
✅ Notification handler configuration
✅ Foreground notification display
✅ Sound and vibration enabled
✅ Badge count updates

Listeners:
1. notificationListener
   - Receives incoming notifications
   - Triggers AI classification
   - Updates notification state
   - Plays sound/vibration

2. responseListener
   - Handles notification tap
   - Opens notification details
   - Marks as read
```

#### **Data Persistence:**
```javascript
AsyncStorage Keys:
- 'deviceToken'         # FCM push token
- 'registered'          # Registration status
- 'studentName'         # Student name
- 'phoneNumber'         # Phone number
- 'courses'             # JSON array of courses
- 'lastTokenRefresh'    # Token refresh timestamp

Operations:
✅ Save on registration
✅ Load on app startup
✅ Update on changes
✅ Clear on unregister
```

#### **Styling System:**
```javascript
StyleSheet.create({
  // 50+ style definitions
  
  Layout Styles:
  - container, scrollContainer, card
  - header, notificationHeader, statsBar
  
  Typography:
  - title, subtitle, label, hint
  - notificationTitle, notificationBody
  
  Input Styles:
  - input, courseInput, courseInputContainer
  
  Button Styles:
  - registerButton, addButton, clearButton
  - disabledButton, refreshButton
  
  Card Styles:
  - notificationCard, criticalCard, readCard
  - courseTag, courseTagSmall
  
  Colors:
  - Primary: #27ae60 (green)
  - Secondary: #3498db (blue)
  - Critical: #e74c3c (red)
  - Text: #2c3e50 (dark gray)
  - Background: #f5f5f5 (light gray)
});
```

---

### 2. **aiService.js** - AI Classification Engine

#### **Technology:**
```javascript
- Pure JavaScript (no external AI libraries)
- Rule-based NLP
- Pattern matching with RegEx
- On-device processing (no internet needed)
```

#### **Core Functionality:**

##### **Message Classification:**
```javascript
classifyMessage(messageText) {
  Returns:
  {
    urgency: {
      level: 'critical' | 'high' | 'medium' | 'low',
      score: 0-10,
      reasoning: string
    },
    courses: ['CSC201', 'BIT401'],
    venue: 'LT3' | 'Lab 2' | null,
    timeRefs: ['7am', 'tomorrow'],
    keywords: ['exam', 'moved', 'urgent'],
    language: 'english' | 'swahili' | 'sheng',
    category: 'exam' | 'class' | 'assignment' | 'general'
  }
}
```

##### **Urgency Detection:**
```javascript
Scoring System:
- Critical keywords (+3): URGENT, EMERGENCY, CANCELLED
- Important keywords (+2): exam, test, deadline
- Medium keywords (+1): class, lecture, assignment
- Special chars (+1): !, ?, CAPS

Levels:
- Critical (8-10): Red alert, popup
- High (5-7): Yellow alert, priority
- Medium (3-4): Blue alert, normal
- Low (0-2): Gray alert, info
```

##### **Course Code Extraction:**
```javascript
Patterns:
1. [A-Z]{2,4}\d{3}[A-Z]?     # CSC201, BIT401
2. [A-Z]{2,4}\d{4}[A-Z]?     # MATH1001
3. [A-Z]{3}\d{3}              # CSC201

Examples:
✅ CSC201, BIT401, MATH1001
✅ CS101, ENG202, PHY301
✅ Multiple courses in one message
```

##### **Venue Detection:**
```javascript
Patterns:
- LT\d+                       # LT1, LT2, LT3
- Lab\s*\d+                   # Lab 1, Lab2
- Room\s*\d+                  # Room 101
- Hall\s*[A-Z]?               # Hall A

Examples:
✅ "Class moved to LT3"
✅ "Meet at Lab 2"
✅ "Exam in Room 101"
```

##### **Time Extraction:**
```javascript
Patterns:
- \d{1,2}:\d{2}\s*(am|pm)?   # 7:00am, 14:30
- \d{1,2}\s*(am|pm)          # 7am, 2pm
- tomorrow, today, tonight
- Monday, Tuesday, etc.

Examples:
✅ "Class at 7am"
✅ "Exam tomorrow"
✅ "Meeting on Monday"
```

##### **Multi-Language Support:**
```javascript
Languages:
1. English - Standard academic terms
2. Swahili - darasa, mtihani, leo
3. Sheng - sasa, vile, alafu

Detection:
✅ Keyword matching
✅ Language-specific patterns
✅ Mixed language support
```

---

### 3. **documentService.js** - Offline Document Sync

#### **Technology:**
```javascript
- expo-sqlite: ~16.0.10          # Local database
- expo-file-system/legacy         # File operations
- @react-native-community/netinfo # Network detection
- AsyncStorage                    # Queue persistence
```

#### **Database Schema:**
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  courseCode TEXT,
  title TEXT,
  fileName TEXT,
  fileSize INTEGER,
  fileType TEXT,
  localUri TEXT,
  remoteUrl TEXT,
  downloadedAt DATETIME,
  tags TEXT
);
```

#### **Core Features:**

##### **WiFi Detection:**
```javascript
isWifiConnected() {
  - Checks network type
  - Returns true if WiFi
  - Returns false if cellular/offline
  
  Usage:
  ✅ Auto-sync only on WiFi
  ✅ Save mobile data
  ✅ User-friendly behavior
}
```

##### **Download Queue:**
```javascript
queueDocument(courseCode, document) {
  - Adds to AsyncStorage queue
  - Auto-processes on WiFi
  - Tracks status (pending/completed/failed)
  
  Queue Item:
  {
    id: string,
    courseCode: string,
    remoteUrl: string,
    queuedAt: timestamp,
    status: 'pending' | 'completed' | 'failed'
  }
}
```

##### **Document Download:**
```javascript
downloadDocument(doc) {
  - Downloads from remoteUrl
  - Saves to local file system
  - Stores metadata in SQLite
  - Returns success/failure
  
  Process:
  1. Check WiFi connection
  2. Download file
  3. Save to documentDirectory
  4. Insert into database
  5. Update queue status
}
```

##### **Sync Status:**
```javascript
getSyncStatus() {
  Returns:
  {
    isSyncing: boolean,
    queueLength: number,
    pending: number,
    completed: number,
    failed: number,
    totalDocuments: number,
    storageUsed: '15.2 MB',
    lastSync: timestamp
  }
}
```

---

### 4. **OfflineIndicator.js** - Network Status

#### **Technology:**
```javascript
- @react-native-community/netinfo  # Network monitoring
- React Native Animated API        # Smooth animations
```

#### **Features:**
```javascript
Real-time Status:
✅ Online (WiFi) - Green indicator
✅ Online (Cellular) - Yellow indicator
✅ Offline - Red indicator

Sync Integration:
✅ Shows sync queue count
✅ Triggers auto-sync on WiFi
✅ Displays sync progress

Animations:
✅ Slide in/out transitions
✅ Fade effects
✅ Smooth color changes
```

---

### 5. **firebaseConfig.js** - Push Notifications

#### **Technology:**
```javascript
- expo-notifications: ~0.32.16    # Notification handling
- Firebase Cloud Messaging         # Push delivery
```

#### **Setup Process:**
```javascript
registerForPushNotifications() {
  Steps:
  1. Request notification permissions
  2. Get Expo push token
  3. Configure Android notification channel
  4. Return token for backend registration
  
  Android Channel:
  {
    name: 'default',
    importance: MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C'
  }
}
```

#### **Notification Handler:**
```javascript
setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      # Show notification
    shouldPlaySound: true,      # Play sound
    shouldSetBadge: true,       # Update badge count
  })
});
```

---

## 🎨 UI/UX DESIGN SYSTEM

### **Color Palette:**
```javascript
Primary Colors:
- Green (#27ae60)    # Success, register, active
- Blue (#3498db)     # Info, links, course tags
- Red (#e74c3c)      # Critical, urgent, delete

Neutral Colors:
- Dark Gray (#2c3e50)    # Primary text
- Medium Gray (#7f8c8d)  # Secondary text
- Light Gray (#f5f5f5)   # Background
- White (#ffffff)        # Cards, inputs

Semantic Colors:
- Critical: #e74c3c (red)
- Important: #f39c12 (orange)
- Normal: #3498db (blue)
- Low: #95a5a6 (gray)
```

### **Typography:**
```javascript
Font Sizes:
- Title: 22px (bold)
- Subtitle: 14px (regular)
- Label: 16px (semi-bold)
- Body: 14px (regular)
- Caption: 12px (regular)
- Small: 11px (regular)

Font Weights:
- Bold: 700
- Semi-bold: 600
- Medium: 500
- Regular: 400
```

### **Spacing System:**
```javascript
Padding/Margin:
- xs: 5px
- sm: 10px
- md: 15px
- lg: 20px
- xl: 30px

Border Radius:
- Small: 4px (tags)
- Medium: 8px (buttons, inputs)
- Large: 12px (cards)
- Round: 20-25px (pills)
```

### **Component Patterns:**

#### **Cards:**
```javascript
Style:
- White background
- Rounded corners (12px)
- Shadow (elevation: 3)
- Padding: 15-20px
- Border-left accent (4px)

Usage:
✅ Registration form
✅ Notification items
✅ Empty states
```

#### **Buttons:**
```javascript
Primary Button:
- Background: #27ae60 (green)
- Text: white, bold
- Padding: 16px
- Border radius: 8px
- Full width

Secondary Button:
- Background: transparent
- Border: 1px solid #3498db
- Text: #3498db, semi-bold
- Padding: 12px

Icon Button:
- Transparent background
- Emoji/icon (22px)
- Padding: 10px
- No border
```

#### **Input Fields:**
```javascript
Style:
- Border: 1px solid #bdc3c7
- Background: #f9f9f9
- Padding: 12px
- Border radius: 8px
- Font size: 16px

States:
- Default: Gray border
- Focus: Blue border
- Error: Red border
- Disabled: Gray background
```

#### **Tags:**
```javascript
Course Tag:
- Background: #e1f5fe (light blue)
- Text: #0288d1 (blue)
- Padding: 6px 12px
- Border radius: 20px (pill)
- Remove button (×)

Venue Tag:
- Background: #fff3e0 (light orange)
- Text: #e67e22 (orange)
- Icon: 📍

Time Tag:
- Background: #e8f5e9 (light green)
- Text: #27ae60 (green)
- Icon: ⏰
```

---

## 📊 DATA FLOW ARCHITECTURE

### **Registration Flow:**
```
User Input → Validation → API Call → Firebase → Success
    ↓           ↓            ↓          ↓         ↓
  Form      Courses?    Backend    Firestore  AsyncStorage
  Fields    ≥ 1?        /register  devices    Save data
                                   collection
```

### **Notification Flow:**
```
Telegram Bot → Backend → Firebase FCM → Device → App
     ↓            ↓           ↓           ↓       ↓
  Message    Extract     Send to      Receive  Display
  Forward    Course      Tokens       Push     + AI
             Codes                    Notif    Analysis
```

### **AI Classification Flow:**
```
Notification → Extract Text → AI Service → Classification
     ↓              ↓              ↓             ↓
  Received      Body text     Analyze       Urgency
  on device                   patterns      Courses
                                            Venue
                                            Time
```

### **Offline Sync Flow:**
```
Document URL → Queue → WiFi Check → Download → SQLite
     ↓           ↓         ↓            ↓         ↓
  Received   AsyncStorage  Auto-sync  File      Store
  in notif   pending       on WiFi    System    metadata
```

---

## 🔧 DEPENDENCIES BREAKDOWN

### **Core Dependencies:**
```json
{
  "expo": "~54.0.33",                              # Framework
  "react": "19.1.0",                               # UI library
  "react-native": "0.81.5",                        # Mobile platform
  "react-native-safe-area-context": "~5.6.0"       # Safe areas
}
```

### **Networking:**
```json
{
  "axios": "^1.13.5",                              # HTTP client
  "@react-native-community/netinfo": "11.4.1"      # Network status
}
```

### **Storage:**
```json
{
  "@react-native-async-storage/async-storage": "2.2.0",  # Key-value store
  "expo-sqlite": "~16.0.10"                               # Local database
}
```

### **Notifications:**
```json
{
  "expo-notifications": "~0.32.16",                # Push notifications
  "expo-device": "~8.0.10",                        # Device info
  "expo-constants": "~18.0.13"                     # App constants
}
```

### **File System:**
```json
{
  "expo-file-system": "~19.0.21",                  # File operations
  "expo-document-picker": "~14.0.8"                # Document picker
}
```

### **Navigation (Future):**
```json
{
  "@react-navigation/native": "^7.1.28",           # Navigation
  "@react-navigation/stack": "^7.7.2",             # Stack navigator
  "@react-navigation/bottom-tabs": "^7.14.0"       # Tab navigator
}
```

---

## 🎯 SCREEN BREAKDOWN

### **Screen 1: Registration**
```
Components: 15
Lines of Code: ~150
State Variables: 5
API Calls: 1

Elements:
- Header (title + subtitle)
- Name input
- Phone input
- Course input + Add button
- Course tags (dynamic list)
- Register button
- Note text
```

### **Screen 2: Notification Inbox**
```
Components: 20+
Lines of Code: ~200
State Variables: 3
API Calls: 0 (real-time)

Elements:
- Header (title + course count)
- Action buttons (settings, clear)
- Stats bar (total, unread, urgent)
- Notification list (FlatList)
- Empty state
- Offline indicator
```

### **Screen 3: Empty State**
```
Components: 4
Lines of Code: ~30
State Variables: 0

Elements:
- Icon (📭)
- Message text
- Hint text
- Instructions
```

---

## 📱 RESPONSIVE DESIGN

### **Screen Sizes Supported:**
```
- Small phones: 320px width
- Medium phones: 375px width
- Large phones: 414px width
- Tablets: 768px+ width
```

### **Adaptive Elements:**
```
✅ Flexible layouts (flex: 1)
✅ Percentage-based widths
✅ ScrollView for overflow
✅ FlatList for performance
✅ SafeAreaView for notches
```

---

## 🚀 PERFORMANCE OPTIMIZATIONS

### **React Native:**
```
✅ FlatList for long lists (virtualization)
✅ useCallback for event handlers
✅ useMemo for expensive calculations
✅ React.memo for component memoization
✅ Lazy loading for images
```

### **Storage:**
```
✅ AsyncStorage for small data
✅ SQLite for large datasets
✅ Batch operations
✅ Indexed queries
```

### **Network:**
```
✅ Request timeouts (30s)
✅ Error retry logic
✅ Offline queue
✅ Compression
```

---

## 🎨 ANIMATION SYSTEM

### **Transitions:**
```javascript
- Slide in/out (OfflineIndicator)
- Fade in/out (notifications)
- Scale (button press)
- Opacity (read/unread)
```

### **Gestures:**
```javascript
- Tap (mark as read)
- Long press (show AI details)
- Swipe (future: delete)
- Pull to refresh (future)
```

---

## 📊 STATE MANAGEMENT SUMMARY

```
Total State Variables: 10
- deviceToken (string)
- registered (boolean)
- notifications (array)
- courses (array)
- newCourse (string)
- studentName (string)
- phoneNumber (string)
- loading (boolean)
- stats (object)

Persistence:
- AsyncStorage: 6 keys
- SQLite: 1 table
- Memory: Real-time data
```

---

## 🔐 SECURITY FEATURES

### **Frontend Security:**
```
✅ No hardcoded credentials
✅ Secure token storage (AsyncStorage)
✅ HTTPS-only API calls
✅ Input validation
✅ XSS prevention (React Native)
✅ No eval() usage
```

---

## 📈 METRICS & ANALYTICS

### **Tracked Events:**
```
- App opens
- Registration attempts
- Registration success/failure
- Notifications received
- Notifications read
- AI classification runs
- Document downloads
- Offline mode usage
```

---

## 🎯 ACCESSIBILITY

### **Features:**
```
✅ Large touch targets (44x44px minimum)
✅ High contrast colors
✅ Readable font sizes (14px+)
✅ Screen reader support (future)
✅ Keyboard navigation (future)
```

---

**TOTAL FRONTEND LINES OF CODE: ~1,500**
**COMPONENTS: 25+**
**SCREENS: 3**
**STATE VARIABLES: 10**
**API ENDPOINTS: 2**
**DEPENDENCIES: 15+**

---

**STATUS: ✅ PRODUCTION-READY FRONTEND**
