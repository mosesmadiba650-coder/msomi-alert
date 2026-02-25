// aiService.js - On-device AI for Message Classification

class AIService {
  constructor() {
    this.isReady = false;
    this.urgencyKeywords = {
      critical: [
        'urgent', 'emergency', 'immediately', 'asap', '‼️', '🚨',
        'last minute', 'changed', 'moved', 'cancelled', 'postponed',
        'exam', 'test', 'cat', 'deadline', 'closing', 'final'
      ],
      high: [
        'important', 'attention', 'notice', 'reminder', 'please',
        'required', 'mandatory', 'must', 'deadline'
      ],
      medium: [
        'update', 'information', 'schedule', 'time', 'venue',
        'location', 'room', 'lecture', 'class'
      ]
    };

    this.coursePatterns = [
      /[A-Z]{2,4}\s?\d{3}[A-Z]?/g,
      /[A-Z]{2,4}\s?\d{4}[A-Z]?/g,
      /[A-Z]{3}\s?\d{3}/g
    ];

    this.timePatterns = [
      /(\d{1,2}:\d{2}\s*[AP]M)/i,
      /(\d{1,2}\s*[AP]M)/i,
      /(\d{1,2}:\d{2})\s*(hours?)?/i,
      /tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
    ];

    this.venuePatterns = [
      /LT\d+/i,
      /Lab\s?\d+/i,
      /Room\s?\d+/i,
      /Lecture\s?Theat(er|re)?\s?\d*/i,
      /(Main|New|Old)\s?Campus/i
    ];

    this.swahiliKeywords = [
      'kesho', 'leo', 'saa', 'darasa', 'mtihani', 'mwalimu',
      'wanafunzi', 'tafadhali', 'asante', 'sawa', 'msomi',
      'imasomwa', 'imefutwa', 'imebadilishwa', 'kuanza', 'kumaliza'
    ];

    this.shengKeywords = [
      'msomi', 'msee', 'mbogi', 'dame', 'manze', 'siz',
      'kitu', 'poa', 'freshi', 'kumiss', 'kufail'
    ];
  }

  async initialize() {
    try {
      this.isReady = true;
      console.log('✅ AI Service initialized');
    } catch (error) {
      console.error('AI initialization error:', error);
    }
  }

  async classifyMessage(text) {
    if (!text || text.length === 0) {
      return this.getDefaultResult();
    }

    const lowerText = text.toLowerCase();
    
    const courses = this.extractCourses(text);
    const urgency = this.calculateUrgency(text, lowerText);
    const timeRefs = this.extractTimeReferences(text);
    const venue = this.extractVenue(text);
    const language = this.detectLanguage(lowerText);
    const summary = this.generateSummary(text);
    
    let alertType = 'information';
    if (urgency.score >= 8) alertType = 'critical';
    else if (urgency.score >= 5) alertType = 'important';
    else if (courses.length > 0) alertType = 'course_update';
    
    return {
      courses,
      urgency: {
        level: urgency.level,
        score: urgency.score,
        reason: urgency.reason
      },
      timeRefs,
      venue,
      language,
      summary,
      alertType,
      structuredData: {
        hasExam: lowerText.includes('exam') || lowerText.includes('mtihani'),
        hasDeadline: lowerText.includes('deadline') || lowerText.includes('due'),
        hasVenueChange: lowerText.includes('venue') || lowerText.includes('location') || lowerText.includes('changed'),
        hasCancellation: lowerText.includes('cancel') || lowerText.includes('futwa'),
        isQuestion: text.includes('?'),
        hasTime: timeRefs.length > 0
      },
      recommendedSettings: {
        priority: urgency.score >= 7 ? 'high' : 'normal',
        sound: urgency.score >= 8 ? 'urgent' : 'default',
        vibrate: urgency.score >= 6,
        showAsPopup: urgency.score >= 9
      }
    };
  }

  extractCourses(text) {
    const courses = [];
    for (const pattern of this.coursePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const clean = m.replace(/\s+/g, '').toUpperCase();
          if (!courses.includes(clean)) {
            courses.push(clean);
          }
        });
      }
    }
    return courses;
  }

  calculateUrgency(text, lowerText) {
    let score = 0;
    const reasons = [];
    
    this.urgencyKeywords.critical.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 3;
        reasons.push(`critical:${keyword}`);
      }
    });
    
    this.urgencyKeywords.high.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 2;
        reasons.push(`high:${keyword}`);
      }
    });
    
    this.urgencyKeywords.medium.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
        reasons.push(`medium:${keyword}`);
      }
    });
    
    const words = text.split(' ');
    const allCapsWords = words.filter(word => 
      word.length > 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
    ).length;
    score += allCapsWords * 2;
    if (allCapsWords > 0) reasons.push('all_caps');
    
    const exclamationCount = (text.match(/!/g) || []).length;
    score += exclamationCount;
    if (exclamationCount > 1) reasons.push('multiple_exclamations');
    
    if (lowerText.includes('today') || lowerText.includes('tomorrow')) {
      score += 2;
      reasons.push('near_future');
    }
    
    if (lowerText.includes('now') || lowerText.includes('immediately')) {
      score += 3;
      reasons.push('immediate');
    }
    
    let level = 'normal';
    if (score >= 8) level = 'critical';
    else if (score >= 5) level = 'high';
    else if (score >= 3) level = 'medium';
    else level = 'low';
    
    score = Math.min(10, score);
    
    return { score, level, reasons: reasons.slice(0, 3) };
  }

  extractTimeReferences(text) {
    const matches = [];
    this.timePatterns.forEach(pattern => {
      const found = text.match(pattern);
      if (found) {
        found.forEach(f => {
          if (!matches.includes(f)) matches.push(f);
        });
      }
    });
    return matches;
  }

  extractVenue(text) {
    for (const pattern of this.venuePatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  detectLanguage(lowerText) {
    let swahiliCount = 0;
    let shengCount = 0;
    let englishCount = 0;
    
    this.swahiliKeywords.forEach(word => {
      if (lowerText.includes(word)) swahiliCount++;
    });
    
    this.shengKeywords.forEach(word => {
      if (lowerText.includes(word)) shengCount++;
    });
    
    const englishWords = ['the', 'is', 'at', 'on', 'for', 'to', 'and', 'or', 'in'];
    englishWords.forEach(word => {
      if (lowerText.includes(word)) englishCount++;
    });
    
    if (shengCount > swahiliCount && shengCount > englishCount) {
      return { primary: 'sheng', confidence: 'high', swahiliCount, shengCount, englishCount };
    } else if (swahiliCount > englishCount) {
      return { primary: 'swahili', confidence: swahiliCount > 2 ? 'high' : 'medium', swahiliCount, shengCount, englishCount };
    } else {
      return { primary: 'english', confidence: 'high', swahiliCount, shengCount, englishCount };
    }
  }

  generateSummary(text) {
    let summary = text.trim();
    if (summary.length > 100) {
      summary = summary.substring(0, 97) + '...';
    }
    return summary;
  }

  getDefaultResult() {
    return {
      courses: [],
      urgency: { level: 'low', score: 0, reason: [] },
      timeRefs: [],
      venue: null,
      language: { primary: 'unknown', confidence: 'low' },
      summary: '',
      alertType: 'unknown',
      structuredData: {},
      recommendedSettings: {
        priority: 'normal',
        sound: 'default',
        vibrate: false,
        showAsPopup: false
      }
    };
  }
}

const aiService = new AIService();
export default aiService;
