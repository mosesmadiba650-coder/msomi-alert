# 📱 FRONTEND ARCHITECTURE - Visual Diagrams

---

## 📊 1. APPLICATION LAYER ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                      │
│                     (React Native/Expo)                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌─────────┐        ┌──────────┐      ┌────────────┐
   │   UI    │        │  State   │      │  Services  │
   │ Layer   │        │Management│      │  Layer     │
   └─────────┘        └──────────┘      └────────────┘
        │                   │                   │
        ├─ Screens          ├─ useState        ├─ aiService
        ├─ Components       ├─ AsyncStorage    ├─ documentService
        ├─ Navigation       ├─ Context         ├─ firebaseConfig
        └─ Styles           └─ Reducers        └─ Cache Logic
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌──────────┐      ┌────────────┐      ┌────────────┐
   │  Network │      │  Storage   │      │ Notification│
   │  Layer   │      │  Layer     │      │   Layer     │
   └──────────┘      └────────────┘      └────────────┘
        │                   │                   │
   axios to API      AsyncStorage         Expo Notifications
   Network retries   SQLite DB            Push Handlers
   Error handling    File System          Message classification
```

---

## 🚀 2. APP LAUNCH SEQUENCE

```
START
  │
  ├─→ index.js
  │   └─→ registerRootComponent(App)
  │
  ├─→ App.js mounts
  │
  ├─→ useState() initialization
  │   ├─ deviceToken: null
  │   ├─ registered: false
  │   ├─ notifications: []
  │   ├─ courses: []
  │   └─ stats: { totalAlerts, unread, critical }
  │
  ├─→ useEffect Hook #1 (Main initialization)
  │   ├─ setupNotifications()
  │   │  ├─ Request FOREGROUNDPermissions
  │   │  ├─ Get Expo push token
  │   │  ├─ Store in AsyncStorage
  │   │  └─ setDeviceToken(token)
  │   │
  │   ├─ loadSavedData()
  │   │  ├─ Retrieve studentName from AsyncStorage
  │   │  ├─ Retrieve phoneNumber from AsyncStorage
  │   │  ├─ Retrieve courses from AsyncStorage
  │   │  ├─ Retrieve registered flag from AsyncStorage
  │   │  └─ Update state with restored values
  │   │
  │   ├─ initializeAI()
  │   │  └─ aiService.initialize()
  │   │     ├─ Load urgency keywords dictionary
  │   │     ├─ Load course patterns
  │   │     ├─ Load time patterns
  │   │     ├─ Load venue patterns
  │   │     └─ set isReady = true
  │   │
  │   ├─ Setup Notification Receivers
  │   │  ├─ notificationListener = Notifications.addNotificationReceivedListener()
  │   │  │  └─ Executes when notification arrives (app foreground)
  │   │  └─ responseListener = Notifications.addNotificationResponseReceivedListener()
  │   │     └─ Executes when user taps notification
  │   │
  │   └─ Cleanup function (return)
  │      ├─ Notifications.removeNotificationSubscription(notificationListener)
  │      └─ Notifications.removeNotificationSubscription(responseListener)
  │
  ├─→ useEffect Hook #2 (Stats update)
  │   └─ updateStats() when [notifications] changes
  │      ├─ setStats.totalAlerts = notifications.length
  │      ├─ setStats.unread = filter(!read)
  │      └─ setStats.critical = filter(urgency === critical)
  │
  ├─→ Conditional Render
  │   ├─ if (!registered)
  │   │  └─ return REGISTRATION_SCREEN
  │   └─ else
  │      └─ return NOTIFICATIONS_SCREEN
  │
  END
```

---

## 📋 3. REGISTRATION FLOW

```
┌─────────────────────────────────────────────────┐
│   REGISTRATION SCREEN                           │
│   (shown when registered === false)             │
└─────────────────────────────────────────────────┘
           │
           ├─ Header: "📚 MSOMI ALERT"
           │
           ├─ Input Fields
           │  ├─ studentName (TextInput, optional)
           │  ├─ phoneNumber (TextInput, optional)
           │  ├─ newCourse (TextInput field)
           │  └─ addCourse button
           │
           ├─ Courses List
           │  ├─ VirtualList of course tags
           │  ├─ Show "+" icon to add
           │  └─ Show "×" icon to remove
           │
           ├─ Register Button
           │  └─ onPress → registerDevice()
           │
           └─ Note: "You'll receive alerts..."
                │
                └─→ registerDevice()
                   │
                   ├─ if (!deviceToken) → Alert.alert("Error")
                   │
                   ├─ if (courses.length === 0) → Alert.alert("Error")
                   │
                   ├─ setLoading(true)
                   │
                   ├─ axios.post(API_URL/api/register-device)
                   │  Request: {
                   │    deviceToken,
                   │    phoneNumber,
                   │    studentName,
                   │    courses
                   │  }
                   │
                   ├─── Response Handler
                   │    ├─ if (success)
                   │    │  ├─ setRegistered(true)
                   │    │  ├─ AsyncStorage.save(all values)
                   │    │  ├─ Alert.alert("Success!")
                   │    │  └─ Component re-renders → NOTIFICATIONS_SCREEN
                   │    │
                   │    └─ if (error)
                   │       ├─ Check error type
                   │       │  ├─ ECONNABORTED → "Timeout (backend sleeping)"
                   │       │  ├─ Network error → "No internet"
                   │       │  ├─ 4xx/5xx → "Server error"
                   │       │  └─ Other → error.message
                   │       └─ Alert.alert("Error", message)
                   │
                   └─ setLoading(false)
```

---

## 🔔 4. NOTIFICATION RECEPTION & AI CLASSIFICATION

```
┌───────────────────────────────────────────────────────┐
│        FIREBASE/BACKEND SENDS NOTIFICATION            │
│        via Expo Push Notification Service             │
└───────────────────────────────────────────────────────┘
                        │
                        ↓ Device receives notification
                        │
            ┌───────────────────────────┐
            │  Notification Listener    │
            │  Triggered (foreground)   │
            └───────────────────────────┘
                        │
                        ├─ notification.request.content.title
                        ├─ notification.request.content.body
                        └─ notification.request.content.data
                        │
                        ↓
            ┌───────────────────────────┐
            │  AI Classification        │
            │  aiService.classifyMsg()  │
            └───────────────────────────┘
                        │
                        ├─ Extract courses (regex patterns)
                        │  Result: ["CSC201", "BIT401"]
                        │
                        ├─ Calculate urgency (keyword scoring)
                        │  Result: { level: "critical", score: 9 }
                        │
                        ├─ Extract time references
                        │  Result: ["Monday", "2:30 PM"]
                        │
                        ├─ Extract venue
                        │  Result: "LT5"
                        │
                        ├─ Detect language
                        │  Result: "english" | "swahili" | "sheng"
                        │
                        ├─ Generate summary
                        │  Result: "CSC201 exam Monday 2:30pm LT5"
                        │
                        └─ Set recommended notification settings
                           Result: { priority, sound, vibrate, popup }
                        │
                        ↓
            ┌───────────────────────────────┐
            │  Create Notification Object  │
            └───────────────────────────────┘
                        │
                        ├─ id: Date.now()
                        ├─ title: messageTitle
                        ├─ body: messageText
                        ├─ receivedAt: ISO timestamp
                        ├─ read: false
                        ├─ ai: { full classification result }
                        └─ critical: (urgency === "critical")
                        │
                        ↓
            ┌───────────────────────────┐
            │  Add to Notifications     │
            │  setNotifications(prev →  │
            │  [newNotification, ...p]) │
            └───────────────────────────┘
                        │
                        ↓
            ┌───────────────────────────┐
            │  Update Stats             │
            │  updateStats()            │
            └───────────────────────────┘
                        │
                        ├─ totalAlerts = notifications.length
                        ├─ unread = count(!read)
                        └─ critical = count(urgency=critical)
                        │
                        ↓
            ┌───────────────────────────┐
            │  Re-render Screen         │
            │  FlatList shows new badge │
            └───────────────────────────┘
```

---

## 🧠 5. AI CLASSIFICATION ALGORITHM DETAIL

```
INPUT MESSAGE: "⚠️ URGENT: CSC201 Final Exam Monday 2:30 PM LT5"

        │
        ├─→ COURSE EXTRACTION
        │   Patterns:
        │   ├─ [A-Z]{2,4}\d{3}[A-Z]?
        │   ├─ [A-Z]{2,4}\d{4}[A-Z]?
        │   └─ [A-Z]{3}\d{3}
        │
        │   Match: "CSC201"
        │   Result: ["CSC201"]
        │
        ├─→ URGENCY SCORING
        │   Keywords:
        │   ├─ "urgent" → +3 (critical)
        │   ├─ "final" → +3 (critical)
        │   ├─ "exam" → +3 (critical)
        │
        │   Score calculation: 3 + 3 + 3 = 9 (CRITICAL)
        │   Result: { level: "critical", score: 9, reasons: [...] }
        │
        ├─→ TIME EXTRACTION
        │   Patterns:
        │   ├─ \d{1,2}:\d{2}\s*[AP]M
        │   ├─ \d{1,2}\s*[AP]M
        │   ├─ Monday|Tuesday|...
        │   └─ tomorrow|today|next week
        │
        │   Matches: ["Monday", "2:30 PM"]
        │   Result: ["Monday", "2:30 PM"]
        │
        ├─→ VENUE EXTRACTION
        │   Patterns:
        │   ├─ LT\d+
        │   ├─ Lab\s?\d+
        │   ├─ Room\s?\d+
        │   ├─ Lecture\s?Theatre
        │   └─ (Main|New|Old)\s?Campus
        │
        │   Match: "LT5"
        │   Result: "LT5"
        │
        ├─→ LANGUAGE DETECTION
        │   Swahili keywords: kesho, leo, saa, mtihani...
        │   Sheng keywords: msomi, freshi, poa, kumiss...
        │   Default: english
        │
        │   Result: "english"
        │
        ├─→ SUMMARY GENERATION
        │   Extract key facts:
        │   ├─ What: "exam" (from title/body)
        │   ├─ Course: "CSC201" (from extraction)
        │   ├─ When: "Monday 2:30 PM" (from time refs)
        │   └─ Where: "LT5" (from venue)
        │
        │   Template: "[Course] [what] [when] [where]"
        │   Result: "CSC201 exam Monday 2:30 PM LT5"
        │
        ├─→ STRUCTURED DATA ANALYSIS
        │   ├─ hasExam: text.includes("exam") → true
        │   ├─ hasDeadline: text.includes("deadline") → false
        │   ├─ hasVenueChange: text.includes("venue|changed") → false
        │   ├─ hasCancellation: text.includes("cancel|futwa") → false
        │   ├─ isQuestion: text.includes("?") → false
        │   └─ hasTime: timeRefs.length > 0 → true
        │
        ├─→ RECOMMENDED SETTINGS
        │   Based on urgency.score:
        │   ├─ If score >= 7 → priority: "high"
        │   ├─ If score >= 8 → sound: "urgent"
        │   ├─ If score >= 6 → vibrate: true
        │   └─ If score >= 9 → showAsPopup: true
        │
        │   Result: {
        │     priority: "high",
        │     sound: "urgent",
        │     vibrate: true,
        │     showAsPopup: true
        │   }
        │
        └─→ FINAL CLASSIFICATION OBJECT
            {
              courses: ["CSC201"],
              urgency: {
                level: "critical",
                score: 9,
                reason: "exam, final, urgent"
              },
              timeRefs: ["Monday", "2:30 PM"],
              venue: "LT5",
              language: "english",
              summary: "CSC201 exam Monday 2:30 PM LT5",
              alertType: "critical",
              structuredData: {
                hasExam: true,
                hasDeadline: false,
                hasVenueChange: false,
                hasCancellation: false,
                isQuestion: false,
                hasTime: true
              },
              recommendedSettings: {
                priority: "high",
                sound: "urgent",
                vibrate: true,
                showAsPopup: true
              }
            }
```

---

## 📬 6. NOTIFICATIONS DISPLAY FLOW

```
┌─────────────────────────────────────────────────────┐
│         NOTIFICATIONS SCREEN                        │
│         (shown when registered === true)            │
└─────────────────────────────────────────────────────┘
                        │
                        ├─ HEADER SECTION
                        │  ├─ Green background (#27ae60)
                        │  ├─ Title: "📬 MSOMI ALERT"
                        │  ├─ Subtitle: "3 courses • 2 urgent"
                        │  ├─ Settings button (⚙️)
                        │  └─ Clear all button (🗑️)
                        │
                        ├─ STATS BAR
                        │  ├─ Total: 100
                        │  ├─ Unread: 4
                        │  └─ Urgent: 2
                        │
                        ├─ CONTENT AREA
                        │  │
                        │  ├─IF notifications.length === 0
                        │  │  ├─ Empty State Icon: 📭
                        │  │  ├─ Text: "No alerts yet"
                        │  │  ├─ Subtext: "Waiting for notifications..."
                        │  │  └─ Hint: "Class reps will send updates..."
                        │  │
                        │  ├─ELSE
                        │  │  ├─ FlatList (virtualized)
                        │  │  │  ├─ Each item = Notification Card
                        │  │  │  ├─ renderItem = NotificationCard component
                        │  │  │  ├─ keyExtractor = item.id
                        │  │  │  └─ scrollable (dynamic height)
                        │  │  │
                        │  │  ├─ Notification Card
                        │  │  │  (for each notification)
                        │  │  │  │
                        │  │  │  ├─ Visual Style
                        │  │  │  │  ├─ Background: white
                        │  │  │  │  ├─ BorderRadius: 10px
                        │  │  │  │  ├─ Shadow: light
                        │  │  │  │  ├─ if critical → Border left RED
                        │  │  │  │  ├─ else → Border left BLUE
                        │  │  │  │  └─ if read → opacity 0.8
                        │  │  │  │
                        │  │  │  ├─ if !read → Unread dot (top right)
                        │  │  │  │
                        │  │  │  ├─ Title
                        │  │  │  │  ├─ Bold, 16px, dark color
                        │  │  │  │  └─ Text: item.title
                        │  │  │  │
                        │  │  │  ├─ Body
                        │  │  │  │  ├─ Regular, 14px, medium color
                        │  │  │  │  └─ Text: item.body
                        │  │  │  │
                        │  │  │  ├─ AI Tags (if item.ai exists)
                        │  │  │  │  ├─ Course badges
                        │  │  │  │  │  ├─ Light blue background
                        │  │  │  │  │  ├─ Blue text
                        │  │  │  │  │  └─ Pill shape
                        │  │  │  │  ├─ Venue tag (if venue exists)
                        │  │  │  │  │  ├─ Orange background
                        │  │  │  │  │  ├─ Icon: 📍
                        │  │  │  │  │  └─ Text: item.ai.venue
                        │  │  │  │  └─ Time tag (if timeRefs exists)
                        │  │  │  │     ├─ Green background
                        │  │  │  │     ├─ Icon: ⏰
                        │  │  │  │     └─ Text: item.ai.timeRefs[0]
                        │  │  │  │
                        │  │  │  ├─ Timestamp
                        │  │  │  │  ├─ Small, 11px, gray
                        │  │  │  │  └─ Formatted: toLocaleTimeString()
                        │  │  │  │
                        │  │  │  ├─ onPress
                        │  │  │  │  └─ markAsRead(item.id)
                        │  │  │  │     └─ Set read: true (removes unread dot)
                        │  │  │  │
                        │  │  │  └─ onLongPress
                        │  │  │     └─ Alert.alert("AI Details", JSON.stringify(item.ai))
                        │  │  │
                        │  │  └─ [More cards...]
                        │  │
                        │  └─ END Content Area
                        │
                        └─ FOOTER SECTION
                           └─ OfflineIndicator Component
                              ├─ Connection status
                              ├─ Sync progress
                              └─ Auto-hides if connected
```

---

## 🔌 7. OFFLINE INDICATOR STATE MACHINE

```
                    START
                      │
                      ↓
            ┌──────────────────┐
            │  NetInfo.fetch() │
            └──────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    NOT CONNECTED   MOBILE DATA   WIFI
        │             │             │
        ↓             ↓             ↓


    ┌─────────┐  ┌───────────┐  ┌──────────┐
    │ OFFLINE │  │ CELLULAR  │  │ WIFI     │
    └─────────┘  └───────────┘  └──────────┘
        │             │             │
        │             │             │
    🔴 Red         🟠 Orange      🟢 Green
        │             │             │
        │             │             │
    Icon: 📴       Icon: 📱       Icon: 📶
    Msg: "Offline- Msg: "Mobile Msg: "WiFi-
    Using saved   data - Download Full access"
    data"         paused"        or
                                 "WiFi - Syncing
                                  X files..."
        │             │             │
        │             │             │
        │             │             ├─→ Can download
        │             │             │   documents
        │             │             │
        │             │             └─→ Check sync queue
        │             │                 every 10 seconds
        │             │
        │             └─→ Skip downloads
        │                 (Pause sync queue)
        │
        └─→ Show cached data
            (Already downloaded)


    ┌──────────────────────────────────┐
    │  Tap indicator to show details   │
    │  ┌──────────────────────────────┐ │
    │  │ 📊 Sync Status               │ │
    │  │ Documents: 45 files          │ │
    │  │ Downloaded: 40 files         │ │
    │  │ Pending: 5 files             │ │
    │  │ Total size: 234 MB           │ │
    │  │ Last sync: 2 min ago         │ │
    │  └──────────────────────────────┘ │
    └──────────────────────────────────┘
```

---

## 💾 8. DATA PERSISTENCE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│         DATA PERSISTENCE LAYERS                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ LAYER 1: REACT STATE (Volatile - Lost on app close)    │
├─────────────────────────────────────────────────────────┤
│ ├─ deviceToken                                          │
│ ├─ registered                                           │
│ ├─ notifications []                                     │
│ ├─ courses []                                           │
│ ├─ studentName                                          │
│ ├─ phoneNumber                                          │
│ └─ stats { totalAlerts, unread, critical }              │
└─────────────────────────────────────────────────────────┘
          │ (persist to)
          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: AsyncStorage (Device-encrypted, Persistent)   │
├─────────────────────────────────────────────────────────┤
│ ├─ deviceToken                                          │
│ ├─ registered (boolean)                                 │
│ ├─ studentName (string)                                 │
│ ├─ phoneNumber (string)                                 │
│ ├─ courses (JSON stringified array)                     │
│ └─ lastTokenRefresh (timestamp)                         │
│                                                          │
│ Storage Size: < 10 KB                                   │
│ Access Time: ~100ms                                     │
│ Encryption: Device-level (OS managed)                   │
└─────────────────────────────────────────────────────────┘
          │ (reference)
          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: SQLite Database (Structured, Queryable)       │
├─────────────────────────────────────────────────────────┤
│ Table: documents                                         │
│ ├─ id (PRIMARY KEY)                                     │
│ ├─ courseCode                                           │
│ ├─ title                                                │
│ ├─ fileName                                             │
│ ├─ fileSize                                             │
│ ├─ fileType                                             │
│ ├─ localUri (path to file)                              │
│ ├─ remoteUrl                                            │
│ ├─ downloadedAt (DATETIME)                              │
│ └─ tags (searchable)                                    │
│                                                          │
│ Total Records: Up to 1000                               │
│ Query Time: ~20ms                                       │
│ Total Size: ~500 MB (with documents)                    │
└─────────────────────────────────────────────────────────┘
          │ (reference)
          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 4: File System (Binary, Offline-accessible)      │
├─────────────────────────────────────────────────────────┤
│ Path: DocumentDirectory/course_materials/               │
│                                                          │
│ Structure:                                               │
│ ├─ CSC201/                                              │
│ │  ├─ lecture_1.pdf                                    │
│ │  ├─ lab_guide.pdf                                    │
│ │  └─ exam_prep.pdf                                    │
│ ├─ BIT401/                                              │
│ └─ MATH101/                                             │
│                                                          │
│ Auto-cleaned: Only on WiFi                             │
│ Sync Controlled: By application logic                   │
└─────────────────────────────────────────────────────────┘


    Data Flow:
    ┌──────────────┐
    │ Notification │
    │   Arrives    │
    └──────────────┘
          │
          ├─→ Store in React State (notifications [])
          │
          ├─→ If should persist
          │   └─→ AsyncStorage.setItem()
          │
          ├─→ If document attached
          │   ├─→ Queue for download
          │   └─→ SQLite.insert() (metadata)
          │
          └─→ If on WiFi
              └─→ Download file
                  └─→ Update FileSystem
                      └─→ SQLite.update() (localUri)
```

---

## 🎨 9. UI COMPONENT HIERARCHY

```
App (Main Component)
│
├─ SafeAreaView (respects notches)
│  │
│  ├─IF !registered
│  │  │
│  │  └─ ScrollView (Registration Screen)
│  │     │
│  │     ├─ View (Header Section)
│  │     │  ├─ Text "📚 MSOMI ALERT"
│  │     │  └─ Text "Zero-cost notifications"
│  │     │
│  │     ├─ View (Card Container)
│  │     │  ├─ TextInput (Name)
│  │     │  ├─ TextInput (Phone)
│  │     │  ├─ View (Course Input Row)
│  │     │  │  ├─ TextInput (Course code)
│  │     │  │  └─ TouchableOpacity (Add button)
│  │     │  ├─ View (Courses Display Row)
│  │     │  │  └─ [CourseTag, CourseTag, ...]
│  │     │  ├─ TouchableOpacity (Register button)
│  │     │  └─ Text (Note)
│  │     │
│  │     └─ View (Footer)
│  │
│  ├─ELSE (registered)
│  │  │
│  │  ├─ View (Header - green bar)
│  │  │  ├─ View (Left)
│  │  │  │  ├─ Text "📬 MSOMI ALERT"
│  │  │  │  └─ Text "3 courses • 2 urgent"
│  │  │  └─ View (Right - buttons)
│  │  │     ├─ TouchableOpacity (Settings)
│  │  │     └─ TouchableOpacity (Clear all)
│  │  │
│  │  ├─ View (Stats Bar)
│  │  │  ├─ View (Stat Item)
│  │  │  │  ├─ Text (100)
│  │  │  │  └─ Text ("Total")
│  │  │  ├─ View (Stat Item)
│  │  │  │  ├─ Text (4)
│  │  │  │  └─ Text ("Unread")
│  │  │  └─ View (Stat Item)
│  │  │     ├─ Text (2)
│  │  │     └─ Text ("Urgent")
│  │  │
│  │  ├─ FlatList (Notifications)
│  │  │  ├─IF empty
│  │  │  │  └─ View (Empty State)
│  │  │  │     ├─ Text "📭"
│  │  │  │     ├─ Text "No alerts yet"
│  │  │  │     └─ Text "Waiting for notifications..."
│  │  │  │
│  │  │  └─ELSE
│  │  │     └─ [NotificationCard, NotificationCard, ...]
│  │  │        │
│  │  │        └─ TouchableOpacity (Card)
│  │  │           ├─ View (Unread dot - if applicable)
│  │  │           ├─ Text (Title)
│  │  │           ├─ Text (Body)
│  │  │           ├─ View (AI Tags)
│  │  │           │  ├─ [Text, Text, ...] (Course badges)
│  │  │           │  ├─ Text (Venue tag - if exists)
│  │  │           │  └─ Text (Time tag - if exists)
│  │  │           └─ Text (Timestamp)
│  │  │
│  │  └─ OfflineIndicator (Footer)
│  │     │
│  │     ├─ Animated.View (Container)
│  │     │  └─ TouchableOpacity (Indicator bar)
│  │     │     ├─ Text (Icon: 📴/📶/📱)
│  │     │     └─ Text (Message)
│  │     │
│  │     └─IF showDetails
│  │        └─ View (Details panel)
│  │           ├─ Text "📊 Sync Status"
│  │           ├─ View (Detail row)
│  │           │  ├─ Text "Documents:"
│  │           │  └─ Text "45 files"
│  │           └─ [More rows...]
│  │
│  └─ StatusBar (System bar)
│
└─ StyleSheet.create (All styles)
```

---

## 🔄 10. STATE UPDATE CYCLE

```
User Action (Input/Tap/Gesture)
    │
    ├─ onChange event (TextInput)
    │  └─ setState (update React state)
    │
    ├─ onPress event (Button)
    │  ├─ Function called
    │  ├─ Async operation (if needed)
    │  ├─ setState (update React state)
    │  ├─ AsyncStorage.setItem (if persistent)
    │  └─ SQLite.insert/update (if database)
    │
    ├─ Notification received
    │  ├─ Listener triggered
    │  ├─ AI classification
    │  ├─ Create notification object
    │  ├─ setNotifications (prepend to state)
    │  └─ updateStats (recalculate counts)
    │
    └─ useEffect dependency change
       ├─ Effect function runs
       ├─ May call setState
       └─ May update AsyncStorage/SQLite


    State Update Triggers Re-render
    │
    ├─ Component function runs again
    ├─ JSX evaluated with new state values
    ├─ React diffing algorithm
    │  └─ Only changed DOM elements re-render (reconciliation)
    │
    └─ Screen updates with new UI


    Side Effects After Render
    │
    ├─ useEffect with dependencies
    │  └─ Runs after render (if dependencies changed)
    │
    ├─ AsyncStorage operations
    │  └─ Non-blocking (doesn't freeze UI)
    │
    ├─ Network requests
    │  └─ Handled by axios with error handling
    │
    └─ Notifications
       └─ Handled by Expo Notifications listener


Performance Considerations:
├─ FlatList virtualization (render only visible items)
├─ React.memo for expensive components
├─ useCallback for stable function references
├─ useMemo for expensive computations
└─ Async/await for non-blocking operations
```

---

## 📊 11. DATA FLOW: Registration to First Notification

```
STEP 1: User Registration
┌─────────────────────────────────────┐
│ User enters:                        │
│ - Course: CSC201                    │
│ - Name: John Doe                    │
│ - Phone: +254712345678              │
│ Taps: "Register Device"             │
└─────────────────────────────────────┘
              │
              ↓
STEP 2: Frontend Processing
┌─────────────────────────────────────┐
│ Validation checks:                  │
│ ✓ deviceToken exists                │
│ ✓ courses array not empty           │
│ Call: registerDevice()              │
└─────────────────────────────────────┘
              │
              ↓
STEP 3: Backend Registration
┌─────────────────────────────────────┐
│ POST /api/register-device           │
│ ├─ Save deviceToken → Firebase      │
│ ├─ Save courseCode → Firebase       │
│ ├─ Save metadata → Firebase         │
│ └─ Return: { success: true }        │
└─────────────────────────────────────┘
              │
              ↓
STEP 4: Frontend Response Handling
┌─────────────────────────────────────┐
│ if (response.data.success)          │
│ ├─ setRegistered(true)              │
│ ├─ AsyncStorage.save all data       │
│ └─ Component re-renders             │
│ → Notifications Screen shown        │
└─────────────────────────────────────┘
              │
              ↓
STEP 5: Backend Ready to Send
┌─────────────────────────────────────┐
│ Device token is now registered      │
│ FCM knows this device exists        │
│ Admin/Bot can send to course CSC201 │
└─────────────────────────────────────┘
              │
              ↓
STEP 6: Telegram Bot Sends Message
┌─────────────────────────────────────┐
│ Class rep types in Telegram bot:    │
│ "/notify CSC201 Exam Monday 2pm LT5"│
│ or sends to REST API                │
│                                      │
│ Backend processes:                   │
│ ├─ Parse course code (CSC201)       │
│ ├─ Find all devices with CSC201     │
│ ├─ Send FCM notification to each    │
│ └─ Log to notification history      │
└─────────────────────────────────────┘
              │
              ↓
STEP 7: Device Receives Notification
┌─────────────────────────────────────┐
│ Expo Notification Service           │
│ ├─ Route to device                  │
│ ├─ Trigger foreground listener      │
│ └─ Message: "Exam Monday 2pm LT5"   │
└─────────────────────────────────────┘
              │
              ↓
STEP 8: AI Classification Runs
┌─────────────────────────────────────┐
│ aiService.classifyMessage()         │
│ ├─ Extract: courses = ["CSC201"]    │
│ ├─ Calculate: urgency = 9 (HIGH)    │
│ ├─ Extract: time = ["Monday 2pm"]   │
│ ├─ Extract: venue = "LT5"           │
│ └─ Return: full classification obj  │
└─────────────────────────────────────┘
              │
              ↓
STEP 9: Create Notification Object
┌─────────────────────────────────────┐
│ {                                   │
│   id: "1708960000000",              │
│   title: "Exam Notice",             │
│   body: "Exam Monday 2pm LT5",      │
│   receivedAt: "2026-02-26T...",     │
│   read: false,                      │
│   ai: { ... classification ... },   │
│   critical: true                    │
│ }                                   │
└─────────────────────────────────────┘
              │
              ↓
STEP 10: Add to App State
┌─────────────────────────────────────┐
│ setNotifications(prev =>            │
│   [newNotification, ...prev]        │
│ )                                   │
│                                     │
│ State updated with new item         │
│ prepended to notification array     │
└─────────────────────────────────────┘
              │
              ↓
STEP 11: Update Statistics
┌─────────────────────────────────────┐
│ updateStats()                       │
│ ├─ totalAlerts = 1                  │
│ ├─ unread = 1                       │
│ └─ critical = 1                     │
│                                     │
│ Stats updated in state              │
└─────────────────────────────────────┘
              │
              ↓
STEP 12: Screen Re-render
┌─────────────────────────────────────┐
│ App.js re-renders with new state    │
│                                     │
│ Visible changes:                    │
│ ├─ Stats bar: Total = 1, Unread = 1│
│ ├─ Critical = 1 (in red)            │
│ ├─ New card appears at top          │
│ │  with red border (critical)       │
│ ├─ Card shows title, body           │
│ ├─ Unread dot appears (top-right)   │
│ └─ Course badge: [CSC201]           │
│    Time tag: ⏰ Monday 2pm           │
│    Venue tag: 📍 LT5                 │
└─────────────────────────────────────┘
              │
              ↓
STEP 13: User Interaction Ready
┌─────────────────────────────────────┐
│ User can:                           │
│ ├─ Tap card → Mark as read          │
│ ├─ Long-press → See AI details      │
│ ├─ Scroll → See other notifications │
│ ├─ Settings → Change courses        │
│ └─ Clear → Delete all notifications │
└─────────────────────────────────────┘
```

---

## ✅ SUMMARY OF COMPONENTS

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| **App** | App.js | Main component, state/flows | ✅ Complete |
| **Registration Screen** | App.js | Course signup | ✅ Complete |
| **Notifications Screen** | App.js | Display alerts | ✅ Complete |
| **OfflineIndicator** | OfflineIndicator.js | Connection status | ✅ Complete |
| **AIService** | aiService.js | Message classification | ✅ Complete |
| **DocumentService** | documentService.js | File sync/cache | ✅ Complete |
| **FirebaseConfig** | firebaseConfig.js | Push setup | ✅ Complete |

**Frontend Status:** ✅ **PRODUCTION READY**

Generated: February 26, 2026
