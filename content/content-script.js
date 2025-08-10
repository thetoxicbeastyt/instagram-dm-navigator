// === CONTENT SCRIPT LOADED ===
console.log('Location:', window.location.href);
console.log('Time:', new Date().toISOString());

// Import utility functions directly (no ES6 imports in content scripts)
// InstagramDetector functionality
class InstagramDetector {
  constructor() {
    this.isReady = false;
    this.readyPromise = null;
  }

  async waitForInstagramReady() {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise((resolve) => {
      const checkReady = () => {
        // Check if Instagram DM page is loaded
        const messageContainer = document.querySelector('[data-testid="conversation"]') ||
                               document.querySelector('[role="main"]') ||
                               document.querySelector('main');
        
        if (messageContainer) {
          this.isReady = true;
          resolve({ ready: true, container: messageContainer });
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });

    return this.readyPromise;
  }
}

// DOMDetector functionality
class DOMDetector {
  constructor() {
    this.selectors = {
      messageContainers: [
        // Instagram-specific message selectors (highest priority)
        '[data-testid="message-bubble"]',
        '[data-testid="message"]',
        'div[role="row"][data-testid*="message"]',
        '[aria-label*="message"]',
        // Conversation structure selectors
        '[data-testid="conversation"] div[role="button"]',
        '[data-testid="conversation"] div[data-testid*="message"]',
        // Fallback selectors
        '[role="main"] div[role="button"]',
        'main div[role="button"]'
      ],
      timestampElements: [
        // Instagram's aria-label timestamp patterns (highest priority)
        '[aria-label*="ago"]',
        '[aria-label*="yesterday"]',
        '[aria-label*="today"]',
        '[aria-label*="minute"]',
        '[aria-label*="hour"]',
        '[aria-label*="day"]',
        // Instagram's timestamp test IDs
        'span[data-testid="message-timestamp"]',
        'span[data-testid="timestamp"]',
        // Instagram's common timestamp classes
        '.timestamp',
        '.time',
        '[class*="timestamp"]',
        '[class*="time"]',
        // Structure-based with text pattern matching
        'div > span',
        'div > time',
        'div > div[class*="time"]',
        // Fallback: elements with time-like text content
        'span',
        'time',
        'div'
      ],

    };
  }

  async detectMessageContainers() {
    try {
      const elements = [];
      let confidence = 0;
      let method = 'none';

      // Try Instagram-specific selectors first
      for (let i = 0; i < this.selectors.messageContainers.length; i++) {
        const selector = this.selectors.messageContainers[i];
        const found = document.querySelectorAll(selector);
        
        if (found.length > 0) {
          elements.push(...Array.from(found));
          
          // Calculate confidence based on selector priority and element count
          if (i < 4) {
            // Instagram-specific selectors get higher confidence
            confidence = Math.max(confidence, Math.min(0.95, 0.7 + (found.length * 0.02)));
            method = 'instagram-specific';
          } else if (i < 6) {
            // Conversation structure selectors
            confidence = Math.max(confidence, Math.min(0.85, 0.6 + (found.length * 0.02)));
            method = 'conversation-structure';
          } else {
            // Fallback selectors
            confidence = Math.max(confidence, Math.min(0.7, 0.4 + (found.length * 0.02)));
            method = 'fallback';
          }
        }
      }

      // Ensure minimum confidence when elements are found
      if (elements.length > 0 && confidence < 0.7) {
        confidence = 0.7;
      }

      return {
        elements: elements,
        confidence: confidence,
        method: method,
        selector: this.selectors.messageContainers[0]
      };
    } catch (error) {
      console.error('Error detecting message containers:', error);
      return { elements: [], confidence: 0, error: error.message, method: 'error' };
    }
  }

  async detectTimestampElements() {
    try {
      const elements = [];
      let confidence = 0;
      let method = 'none';

      // Try Instagram-specific selectors first
      for (let i = 0; i < this.selectors.timestampElements.length; i++) {
        const selector = this.selectors.timestampElements[i];
        const found = document.querySelectorAll(selector);
        
        if (found.length > 0) {
          elements.push(...Array.from(found));
          
          // Calculate confidence based on selector priority and element count
          if (i < 6) {
            // Instagram's aria-label patterns get highest confidence
            confidence = Math.max(confidence, Math.min(0.95, 0.75 + (found.length * 0.02)));
            method = 'instagram-aria-label';
          } else if (i < 8) {
            // Instagram's timestamp test IDs
            confidence = Math.max(confidence, Math.min(0.9, 0.65 + (found.length * 0.02)));
            method = 'instagram-testid';
          } else if (i < 11) {
            // Instagram's common timestamp classes
            confidence = Math.max(confidence, Math.min(0.8, 0.55 + (found.length * 0.02)));
            method = 'instagram-classes';
          } else if (i < 14) {
            // Structure-based detection
            confidence = Math.max(confidence, Math.min(0.7, 0.45 + (found.length * 0.02)));
            method = 'structure-based';
          } else {
            // Fallback selectors
            confidence = Math.max(confidence, Math.min(0.6, 0.35 + (found.length * 0.02)));
            method = 'fallback';
          }
        }
      }

      // If no elements found with standard selectors, try text pattern matching
      if (elements.length === 0) {
        const timeElements = this.detectTimestampsByTextPattern();
        if (timeElements.length > 0) {
          elements.push(...timeElements);
          confidence = 0.6;
          method = 'text-pattern';
        }
      }

      // Ensure minimum confidence when elements are found
      if (elements.length > 0 && confidence < 0.7) {
        confidence = 0.7;
      }

      return {
        elements: elements,
        confidence: confidence,
        method: method,
        selector: this.selectors.timestampElements[0]
      };
    } catch (error) {
      console.error('Error detecting timestamp elements:', error);
      return { elements: [], confidence: 0, error: error.message, method: 'error' };
    }
  }



  // Helper method for text pattern matching when standard selectors fail
  detectTimestampsByTextPattern() {
    const allElements = document.querySelectorAll('span, time, div');
    const timeElements = Array.from(allElements).filter(element => {
      const text = element.textContent?.trim();
      if (!text || text.length > 50) return false; // Reasonable length for timestamps
      
      // Instagram timestamp patterns
      const timePatterns = [
        /\b\d+[mhd]\b/,           // "5m", "2h", "1d"
        /\byesterday\b/i,          // "yesterday"
        /\btoday\b/i,              // "today"
        /\bnow\b/i,                // "now"
        /\b\d{1,2}:\d{2}\b/,      // "14:30"
        /\b\d{1,2}:\d{2}\s*(am|pm)\b/i, // "2:30 PM"
        /\b\d{4}-\d{2}-\d{2}\b/,  // "2023-06-01"
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/ // "6/1/23" or "6/1/2023"
      ];
      
      return timePatterns.some(pattern => pattern.test(text));
    });

    return timeElements;
  }
}

// ReelDetector functionality
class ReelDetector {
  constructor() {
    this.confidenceThreshold = 0.7;
    this.log('ReelDetector initialized');
  }

  log(message, level = 'info') {
    console.log(`[ReelDetector][${level.toUpperCase()}] ${message}`);
  }

  /**
   * Main detection function for Instagram reels
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} Detection result with confidence and metadata
   */
  detectReels(messageElement) {
    try {
      // DEBUG: Log message content for analysis
      const messageText = messageElement.textContent?.substring(0, 150) || 'No text content';
      this.log(`[DEBUG] Checking message: ${messageText}`, 'debug');
      
      // DEBUG: Log all links found
      const allLinks = messageElement.querySelectorAll('a[href]');
      const linkUrls = Array.from(allLinks).map(link => link.href || link.getAttribute('href')).filter(Boolean);
      this.log(`[DEBUG] Found ${linkUrls.length} links: ${linkUrls.join(', ')}`, 'debug');
      
      // DEBUG: Log visual elements that might indicate reels
      const visualElements = messageElement.querySelectorAll('[aria-label*="reel"], [data-testid*="reel"], [class*="reel"], [class*="video"]');
      this.log(`[DEBUG] Found ${visualElements.length} potential visual indicators`, 'debug');

      // Primary detection: URL pattern matching (90% confidence)
      const urlResult = this.detectByUrlPattern(messageElement);
      if (urlResult.isReel && urlResult.confidence >= this.confidenceThreshold) {
        this.log(`Reel detected via URL pattern: ${urlResult.reelId} (confidence: ${urlResult.confidence})`);
        return urlResult;
      }

      // Secondary detection: Visual indicators (75% confidence)
      const visualResult = this.detectByVisualIndicators(messageElement);
      if (visualResult.isReel && visualResult.confidence >= this.confidenceThreshold) {
        this.log(`Reel detected via visual indicators: ${visualResult.reelId} (confidence: ${visualResult.confidence})`);
        return visualResult;
      }

      // Tertiary detection: Text content analysis (60% confidence)
      const textResult = this.detectByTextContent(messageElement);
      if (textResult.isReel && textResult.confidence >= this.confidenceThreshold) {
        this.log(`Reel detected via text content: ${textResult.reelId} (confidence: ${textResult.confidence})`);
        return textResult;
      }

      // Quaternary detection: Instagram-specific components (50% confidence)
      const componentResult = this.detectByInstagramComponents(messageElement);
      if (componentResult.isReel && componentResult.confidence >= this.confidenceThreshold) {
        this.log(`Reel detected via Instagram components: ${componentResult.reelId} (confidence: ${componentResult.confidence})`);
        return componentResult;
      }

      // No reel detected
      this.log(`[DEBUG] No reel detected in message`, 'debug');
      return {
        isReel: false,
        confidence: 0,
        reelId: null,
        detectionMethod: 'none',
        reelUrl: null,
        messageElement: messageElement
      };

    } catch (error) {
      this.log(`Error detecting reels: ${error.message}`, 'error');
      return {
        isReel: false,
        confidence: 0,
        reelId: null,
        detectionMethod: 'error',
        reelUrl: null,
        messageElement: messageElement,
        error: error.message
      };
    }
  }

  /**
   * Detect reels by URL pattern matching (highest confidence)
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} URL-based detection result
   */
  detectByUrlPattern(messageElement) {
    const urlPatterns = [
      // Instagram reel URLs
      /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i,
      /\/reel\/([a-zA-Z0-9_-]+)/i,
      // Instagram short links
      /ig\.me\/([a-zA-Z0-9_-]+)/i,
      // Reel sharing URLs
      /reel\/([a-zA-Z0-9_-]+)/i
    ];

    // Search for links within the message element
    const links = messageElement.querySelectorAll('a[href]');
    
    for (const link of links) {
      const href = link.href || link.getAttribute('href');
      if (!href) continue;

      for (const pattern of urlPatterns) {
        const match = href.match(pattern);
        if (match) {
          const reelId = match[1];
          const confidence = this.calculateReelConfidence('url_pattern', reelId, link);
          
          return {
            isReel: true,
            confidence: confidence,
            reelId: reelId,
            detectionMethod: 'url_pattern',
            reelUrl: href,
            messageElement: messageElement,
            linkElement: link
          };
        }
      }
    }

    // Search for text content that might contain reel URLs
    const textContent = messageElement.textContent || '';
    for (const pattern of urlPatterns) {
      const match = textContent.match(pattern);
      if (match) {
        const reelId = match[1];
        const confidence = this.calculateReelConfidence('url_pattern', reelId, null);
        
        return {
          isReel: true,
          confidence: confidence,
          reelId: reelId,
          detectionMethod: 'url_pattern',
          reelUrl: match[0],
          messageElement: messageElement
        };
      }
    }

    return {
      isReel: false,
      confidence: 0,
      reelId: null,
      detectionMethod: 'url_pattern',
      reelUrl: null,
      messageElement: messageElement
    };
  }

  /**
   * Detect reels by visual indicators (secondary method)
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} Visual-based detection result
   */
  detectByVisualIndicators(messageElement) {
    const visualSelectors = [
      // Instagram's aria-label patterns for reels
      '[aria-label*="reel"]',
      '[aria-label*="Reel"]',
      '[aria-label*="video"]',
      '[aria-label*="Video"]',
      // Instagram's test ID patterns for reels
      '[data-testid*="reel"]',
      '[data-testid*="Reel"]',
      '[data-testid*="video"]',
      '[data-testid*="Video"]',
      // Reel-specific container classes
      '[class*="reel"]',
      '[class*="Reel"]',
      '[class*="video"]',
      '[class*="Video"]',
      // Reel sharing UI components
      '[role="button"][aria-label*="reel"]',
      '[role="button"][aria-label*="Reel"]',
      '[role="button"][aria-label*="video"]',
      '[role="button"][aria-label*="Video"]',
      // Instagram story/reel sharing patterns
      '[data-testid*="story"]',
      '[data-testid*="Story"]',
      '[aria-label*="story"]',
      '[aria-label*="Story"]'
    ];

    for (const selector of visualSelectors) {
      const elements = messageElement.querySelectorAll(selector);
      if (elements.length > 0) {
        this.log(`[DEBUG] Found visual indicator with selector: ${selector}`, 'debug');
        // Try to extract reel ID from the element or its children
        const reelId = this.extractReelId(elements[0]);
        const confidence = this.calculateReelConfidence('visual_indicators', reelId, elements[0]);
        
        return {
          isReel: true,
          confidence: confidence,
          reelId: reelId,
          detectionMethod: 'visual_indicators',
          reelUrl: reelId ? `https://instagram.com/reel/${reelId}` : null,
          messageElement: messageElement,
          visualElement: elements[0]
        };
      }
    }

    return {
      isReel: false,
      confidence: 0,
      reelId: null,
      detectionMethod: 'visual_indicators',
      reelUrl: null,
      messageElement: messageElement
    };
  }

  /**
   * Detect reels by text content analysis (tertiary method)
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} Text-based detection result
   */
  detectByTextContent(messageElement) {
    const textContent = messageElement.textContent || '';
    this.log(`[DEBUG] Analyzing text content: ${textContent.substring(0, 200)}`, 'debug');
    
    // Look for reel-related text patterns
    const textPatterns = [
      // Instagram reel sharing text
      /shared\s+(?:a\s+)?(?:reel|video)/i,
      /(?:reel|video)\s+shared/i,
      /(?:reel|video)\s+from\s+instagram/i,
      /instagram\s+(?:reel|video)/i,
      // Reel ID patterns in text
      /reel\/([a-zA-Z0-9_-]+)/i,
      /video\/([a-zA-Z0-9_-]+)/i,
      // Instagram sharing indicators
      /(?:reel|video)\s+by\s+@/i,
      /@\w+\s+(?:reel|video)/i
    ];

    for (const pattern of textPatterns) {
      const match = textContent.match(pattern);
      if (match) {
        this.log(`[DEBUG] Text pattern matched: ${pattern.source}`, 'debug');
        const reelId = match[1] || this.extractReelIdFromText(textContent);
        const confidence = this.calculateReelConfidence('text_content', reelId, null);
        
        return {
          isReel: true,
          confidence: confidence,
          reelId: reelId,
          detectionMethod: 'text_content',
          reelUrl: reelId ? `https://instagram.com/reel/${reelId}` : null,
          messageElement: messageElement
        };
      }
    }

    return {
      isReel: false,
      confidence: 0,
      reelId: null,
      detectionMethod: 'text_content',
      reelUrl: null,
      messageElement: messageElement
    };
  }

  /**
   * Detect reels by Instagram-specific components (quaternary method)
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} Component-based detection result
   */
  detectByInstagramComponents(messageElement) {
    // Look for Instagram-specific sharing components
    const componentSelectors = [
      // Instagram story/reel sharing components
      '[data-testid*="story"]',
      '[data-testid*="Story"]',
      '[data-testid*="reel"]',
      '[data-testid*="Reel"]',
      '[data-testid*="video"]',
      '[data-testid*="Video"]',
      // Instagram media containers
      '[data-testid*="media"]',
      '[data-testid*="Media"]',
      // Instagram sharing buttons
      '[aria-label*="share"]',
      '[aria-label*="Share"]',
      // Instagram thumbnail containers
      '[role="img"]',
      'img[alt*="reel"]',
      'img[alt*="video"]',
      // Instagram media preview elements
      '[class*="media"]',
      '[class*="Media"]',
      '[class*="preview"]',
      '[class*="Preview"]'
    ];

    for (const selector of componentSelectors) {
      const elements = messageElement.querySelectorAll(selector);
      if (elements.length > 0) {
        this.log(`[DEBUG] Found Instagram component with selector: ${selector}`, 'debug');
        
        // Check if this looks like a reel/video component
        const isReelComponent = this.isReelComponent(elements[0]);
        if (isReelComponent) {
          const reelId = this.extractReelId(elements[0]);
          const confidence = this.calculateReelConfidence('instagram_components', reelId, elements[0]);
          
          return {
            isReel: true,
            confidence: confidence,
            reelId: reelId,
            detectionMethod: 'instagram_components',
            reelUrl: reelId ? `https://instagram.com/reel/${reelId}` : null,
            messageElement: messageElement,
            componentElement: elements[0]
          };
        }
      }
    }

    return {
      isReel: false,
      confidence: 0,
      reelId: null,
      detectionMethod: 'instagram_components',
      reelUrl: null,
      messageElement: messageElement
    };
  }

  /**
   * Extract reel ID from various sources
   * @param {HTMLElement} element - Element to extract reel ID from
   * @returns {string|null} Extracted reel ID or null if not found
   */
  extractReelId(element) {
    if (!element) return null;

    // Try to get reel ID from data attributes
    const dataReelId = element.dataset.reelId || 
                      element.dataset.reel || 
                      element.dataset.id;
    if (dataReelId) return dataReelId;

    // Try to get reel ID from href attributes
    const href = element.href || element.getAttribute('href');
    if (href) {
      const urlMatch = href.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      if (urlMatch) return urlMatch[1];
    }

    // Try to get reel ID from parent links
    const parentLink = element.closest('a[href*="/reel/"]');
    if (parentLink) {
      const urlMatch = parentLink.href.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      if (urlMatch) return urlMatch[1];
    }

    // Try to get reel ID from child links
    const childLinks = element.querySelectorAll('a[href*="/reel/"]');
    for (const link of childLinks) {
      const urlMatch = link.href.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      if (urlMatch) return urlMatch[1];
    }

    return null;
  }

  /**
   * Calculate confidence score for reel detection
   * @param {string} method - Detection method used
   * @param {string|null} reelId - Extracted reel ID
   * @param {HTMLElement|null} element - Element used for detection
   * @returns {number} Confidence score between 0 and 1
   */
  calculateReelConfidence(method, reelId, element) {
    let confidence = 0;

    // Base confidence by detection method
    switch (method) {
      case 'url_pattern':
        confidence = 0.9;
        break;
      case 'visual_indicators':
        confidence = 0.75;
        break;
      case 'text_content':
        confidence = 0.6;
        break;
      case 'instagram_components':
        confidence = 0.5;
        break;
      default:
        confidence = 0.5;
    }

    // Boost confidence if we have a valid reel ID
    if (reelId && reelId.length >= 8) {
      confidence += 0.05;
    }

    // Boost confidence if we have a strong visual element
    if (element && element.getAttribute('data-testid')) {
      confidence += 0.05;
    }

    // Ensure confidence doesn't exceed 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Extract reel ID from text content
   * @param {string} textContent - Text content to analyze
   * @returns {string|null} Extracted reel ID or null if not found
   */
  extractReelIdFromText(textContent) {
    // Look for Instagram reel ID patterns in text
    const reelIdPatterns = [
      /reel\/([a-zA-Z0-9_-]+)/i,
      /video\/([a-zA-Z0-9_-]+)/i,
      /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i,
      /ig\.me\/([a-zA-Z0-9_-]+)/i
    ];

    for (const pattern of reelIdPatterns) {
      const match = textContent.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if an element looks like a reel/video component
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if element appears to be a reel component
   */
  isReelComponent(element) {
    if (!element) return false;

    // Check for video elements
    const hasVideo = element.querySelector('video') !== null;
    if (hasVideo) {
      this.log(`[DEBUG] Found video element in component`, 'debug');
      return true;
    }

    // Check for play button indicators
    const hasPlayButton = element.querySelector('[aria-label*="play"], [aria-label*="Play"]') !== null;
    if (hasPlayButton) {
      this.log(`[DEBUG] Found play button in component`, 'debug');
      return true;
    }

    // Check for media preview images
    const hasMediaImage = element.querySelector('img[alt*="reel"], img[alt*="video"], img[alt*="media"]') !== null;
    if (hasMediaImage) {
      this.log(`[DEBUG] Found media image in component`, 'debug');
      return true;
    }

    // Check for Instagram sharing UI patterns
    const hasSharingUI = element.querySelector('[role="button"], [data-testid*="share"], [aria-label*="share"]') !== null;
    if (hasSharingUI) {
      this.log(`[DEBUG] Found sharing UI in component`, 'debug');
      return true;
    }

    return false;
  }

  /**
   * Batch detect reels in multiple message elements
   * @param {HTMLElement[]} messageElements - Array of message container elements
   * @returns {Object[]} Array of detection results
   */
  detectReelsBatch(messageElements) {
    if (!Array.isArray(messageElements)) {
      this.log('Invalid message elements array provided', 'error');
      return [];
    }

    this.log(`Starting batch detection for ${messageElements.length} messages`);
    
    const results = messageElements.map(element => this.detectReels(element));
    const detectedReels = results.filter(result => result.isReel);
    
    this.log(`Batch detection complete: ${detectedReels.length} reels found out of ${messageElements.length} messages`);
    
    return results;
  }

  /**
   * Get detection statistics
   * @param {Object[]} detectionResults - Array of detection results
   * @returns {Object} Statistics about the detection
   */
  getDetectionStats(detectionResults) {
    if (!Array.isArray(detectionResults)) {
      return { total: 0, reels: 0, confidence: 0, methods: {} };
    }

    const total = detectionResults.length;
    const reels = detectionResults.filter(result => result.isReel).length;
    const avgConfidence = reels > 0 
      ? detectionResults
          .filter(result => result.isReel)
          .reduce((sum, result) => sum + result.confidence, 0) / reels
      : 0;

    const methods = detectionResults
      .filter(result => result.isReel)
      .reduce((acc, result) => {
        acc[result.detectionMethod] = (acc[result.detectionMethod] || 0) + 1;
        return acc;
      }, {});

    return {
      total,
      reels,
      confidence: Math.round(avgConfidence * 100) / 100,
      methods,
      successRate: total > 0 ? Math.round((reels / total) * 100) / 100 : 0
    };
  }
}

  // Initialize Instagram detector
  const instagramDetector = new InstagramDetector();

  instagramDetector.waitForInstagramReady().then((result) => {
    console.log("Instagram is ready:", result);

    // Initialize DOM detector and reel detector
    const domDetector = new DOMDetector();
    const reelDetector = new ReelDetector();

      // Expose the detectors and their methods to the window object for debugging
  window.domDetector = domDetector;
  window.reelDetector = reelDetector;
  
  // Bind methods properly to preserve 'this' context
  window.detectMessageContainers = domDetector.detectMessageContainers.bind(domDetector);
  window.detectTimestampElements = domDetector.detectTimestampElements.bind(domDetector);
  window.detectReels = reelDetector.detectReels.bind(reelDetector);

  // Add comprehensive testing helper
  window.testDOMDetection = async () => {
    console.log('=== DOM Detection Test ===');
    try {
      const messages = await window.detectMessageContainers();
      const timestamps = await window.detectTimestampElements();
      
      // Test reel detection on message containers
      let reels = { elements: [], confidence: 0, method: 'none' };
      if (messages.elements.length > 0) {
        const reelResults = reelDetector.detectReelsBatch(messages.elements);
        const reelStats = reelDetector.getDetectionStats(reelResults);
        reels = {
          elements: reelResults.filter(r => r.isReel),
          confidence: reelStats.confidence,
          method: 'batch_detection'
        };
      }
      
      const results = {
        messages: `${messages.elements.length} found (confidence: ${messages.confidence})`,
        timestamps: `${timestamps.elements.length} found (confidence: ${timestamps.confidence})`,
        reels: `${reels.elements.length} found (confidence: ${reels.confidence})`
      };
      
      console.log('Test Results:', results);
      return results;
    } catch (error) {
      const errorResult = { error: error.message };
      console.error('Test failed:', errorResult);
      return errorResult;
    }
  };

  // Add individual message testing helper for debugging
  window.testSingleMessageReel = (messageIndex = 0) => {
    console.log('=== Single Message Reel Test ===');
    try {
      const messages = window.domDetector.detectMessageContainers();
      if (messages.elements && messages.elements.length > messageIndex) {
        const targetMessage = messages.elements[messageIndex];
        console.log(`[DEBUG] Testing message ${messageIndex}:`, targetMessage);
        
        // Test individual reel detection
        const reelResult = window.detectReels(targetMessage);
        console.log(`[DEBUG] Reel detection result for message ${messageIndex}:`, reelResult);
        
        // Log detailed message structure
        console.log(`[DEBUG] Message HTML structure:`, targetMessage.outerHTML.substring(0, 500));
        console.log(`[DEBUG] Message text content:`, targetMessage.textContent?.substring(0, 200));
        
        return reelResult;
      } else {
        console.log(`[DEBUG] No message found at index ${messageIndex}`);
        return null;
      }
    } catch (error) {
      console.error('Single message test failed:', error);
      return { error: error.message };
    }
  };

  // Add batch testing with detailed logging
  window.testReelDetectionDetailed = async () => {
    console.log('=== Detailed Reel Detection Test ===');
    try {
      const messages = await window.detectMessageContainers();
      console.log(`[DEBUG] Found ${messages.elements.length} messages to test`);
      
      if (messages.elements.length === 0) {
        console.log('[DEBUG] No messages found to test');
        return { error: 'No messages found' };
      }
      
      // Test first 5 messages individually for debugging
      const testResults = [];
      for (let i = 0; i < Math.min(5, messages.elements.length); i++) {
        console.log(`[DEBUG] Testing message ${i + 1}/${Math.min(5, messages.elements.length)}`);
        const result = window.detectReels(messages.elements[i]);
        testResults.push({ messageIndex: i, result });
        
        if (result.isReel) {
          console.log(`[DEBUG] REEL FOUND in message ${i + 1}:`, result);
        }
      }
      
      // Run full batch detection
      console.log('[DEBUG] Running full batch detection...');
      const batchResults = reelDetector.detectReelsBatch(messages.elements);
      const stats = reelDetector.getDetectionStats(batchResults);
      
      console.log('[DEBUG] Batch detection complete:', stats);
      console.log('[DEBUG] Individual test results:', testResults);
      
      return { batchResults, stats, testResults };
    } catch (error) {
      console.error('Detailed test failed:', error);
      return { error: error.message };
    }
  };

  // Test the first few messages individually as requested
  window.testFirstFewMessages = async () => {
    console.log('=== Testing First Few Messages Individually ===');
    try {
      const messages = await window.detectMessageContainers();
      console.log(`[DEBUG] Found ${messages.elements.length} total messages`);
      
      if (messages.elements.length === 0) {
        console.log('[DEBUG] No messages found to test');
        return { error: 'No messages found' };
      }
      
      // Test first 3 messages individually
      const results = [];
      for (let i = 0; i < Math.min(3, messages.elements.length); i++) {
        console.log(`\n[DEBUG] === Testing Message ${i + 1} ===`);
        const message = messages.elements[i];
        
        // Log message details
        console.log(`[DEBUG] Message ${i + 1} text:`, message.textContent?.substring(0, 100));
        console.log(`[DEBUG] Message ${i + 1} HTML:`, message.outerHTML.substring(0, 300));
        
        // Test reel detection
        const reelResult = window.detectReels(message);
        console.log(`[DEBUG] Message ${i + 1} reel result:`, reelResult);
        
        results.push({
          messageIndex: i,
          text: message.textContent?.substring(0, 100),
          reelResult: reelResult
        });
      }
      
      console.log('[DEBUG] Individual message test results:', results);
      return results;
    } catch (error) {
      console.error('First few messages test failed:', error);
      return { error: error.message };
    }
  };

  console.log('DOM Detection functions exposed globally for testing');

  // Verify global assignment worked
  setTimeout(() => {
    console.log('Global check:', {
      messageContainers: typeof window.detectMessageContainers,
      timestampElements: typeof window.detectTimestampElements,
      detectReels: typeof window.detectReels,
      testFunction: typeof window.testDOMDetection
    });
  }, 1000);

  // Auto-test the functions after exposure
  setTimeout(async () => {
    try {
      console.log('Testing detectMessageContainers:', await window.detectMessageContainers());
      console.log('Testing detectTimestampElements:', await window.detectTimestampElements()); 
      
      // Test reel detection on a sample message if available
      const messages = await window.detectMessageContainers();
      if (messages.elements.length > 0) {
        const sampleReel = window.detectReels(messages.elements[0]);
        console.log('Testing detectReels on sample message:', sampleReel);
      }
      
      console.log('Running comprehensive test:', await window.testDOMDetection());
    } catch (error) {
      console.error('Auto-test failed:', error);
    }
  }, 2000);

  // Add message listener for popup communication
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.type === 'TEST_BUTTON_CLICKED') {
      console.log('Test button clicked from popup');
      
      // Run comprehensive detection test
      window.testDOMDetection().then(results => {
        sendResponse({
          success: true,
          results: results,
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href
        });
      }).catch(error => {
        sendResponse({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
      
      return true; // Keep message channel open for async response
    }
    
    return false;
  });

}).catch((error) => {
  console.error('Error in Instagram detector:', error);
});