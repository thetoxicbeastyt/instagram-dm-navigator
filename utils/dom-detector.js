class DOMDetector {
  constructor() {
    this.log("DOMDetector initialized");
    this.lightweightObserver = null;
    this.intensiveObserver = null;
    this.cachedSelectors = {};
    this.loadCachedSelectors();
    this.startLightweightObserver();
  }

  startLightweightObserver() {
    this.lightweightObserver = new MutationObserver((mutations) => {
      this.log("Lightweight observer detected DOM changes.");
      // In a real implementation, you would have logic here to decide if an intensive scan is needed.
    });

    this.lightweightObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.log("Lightweight observer started.");
  }

  stopLightweightObserver() {
    if (this.lightweightObserver) {
      this.lightweightObserver.disconnect();
      this.lightweightObserver = null;
      this.log("Lightweight observer stopped.");
    }
  }

  startIntensiveObserver(callback) {
    if (this.intensiveObserver) {
      this.stopIntensiveObserver();
    }

    this.intensiveObserver = new MutationObserver(callback);

    this.intensiveObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    this.log("Intensive observer started.");

    // Auto-disable after 30 seconds of inactivity
    setTimeout(() => {
      this.stopIntensiveObserver();
    }, 30000);
  }

  stopIntensiveObserver() {
    if (this.intensiveObserver) {
      this.intensiveObserver.disconnect();
      this.intensiveObserver = null;
      this.log("Intensive observer stopped.");
    }
  }

  log(message, level = "info") {
    console.log(`[DOMDetector][${level.toUpperCase()}] ${message}`);
  }

  async loadCachedSelectors() {
    const result = await chrome.storage.local.get('cachedSelectors');
    if (result.cachedSelectors) {
      this.cachedSelectors = result.cachedSelectors;
      this.log("Loaded cached selectors.");
    }
  }

  async saveCachedSelectors() {
    await chrome.storage.local.set({ cachedSelectors: this.cachedSelectors });
    this.log("Saved selectors to cache.");
  }

  // Detection functions will be added here
  async detectMessageContainers() {
    const selectors = {
      attribute: 'div[role="none"][class*="x78zum5 xdt5ytf x1n2onr6"]',
      class: '.message-container',
      structure: 'div > div > div > div[role="none"]',
      // Instagram-specific patterns
      instagram: 'div[data-testid="message-bubble"], div[role="button"][tabindex="0"]',
      fallback: 'div[class*="message"], div[class*="bubble"]'
    };

    return this.detect(selectors, 'messageContainers');
  }

  async detectTimestampElements() {
    const selectors = {
      // Instagram's aria-label patterns for timestamps
      ariaLabel: '[aria-label*="ago"], [aria-label*="yesterday"], [aria-label*="today"], [aria-label*="minute"], [aria-label*="hour"], [aria-label*="day"]',
      // Instagram's timestamp test IDs
      testId: 'span[data-testid="message-timestamp"], span[data-testid="timestamp"]',
      // Instagram's common timestamp classes
      class: '.timestamp, .time, [class*="timestamp"], [class*="time"]',
      // Structure-based with text pattern matching
      structure: 'div > span, div > time, div > div[class*="time"]',
      // Fallback: elements with time-like text content
      fallback: 'span, time, div'
    };

    return this.detectWithTextPattern(selectors, 'timestampElements', /\b\d+[mhd]\b|\byesterday\b|\btoday\b|\bnow\b/i);
  }



  async detectLoadingStates() {
    const selectors = {
      attribute: 'div[data-testid="loading-spinner"]',
      class: '.loading-spinner',
      structure: 'div > div[aria-busy="true"]',
    };

    return this.detect(selectors, 'loadingStates');
  }

  async detectWithTextPattern(selectors, cacheKey, textPattern) {
    // First try standard detection
    const standardResult = await this.detect(selectors, cacheKey);
    
    // If we found elements, return them
    if (standardResult.elements.length > 0) {
      return standardResult;
    }

    // Fallback: search for elements with time-like text content
    const allElements = document.querySelectorAll(selectors.fallback || 'span, time, div');
    const timeElements = Array.from(allElements).filter(element => {
      const text = element.textContent?.trim();
      return text && textPattern.test(text) && text.length < 50; // Reasonable length for timestamps
    });

    if (timeElements.length > 0) {
      this.log(`Found ${timeElements.length} timestamp elements using text pattern matching`);
      return { 
        elements: timeElements, 
        confidence: 0.6, 
        method: 'text-pattern', 
        cached: false, 
        timestamp: Date.now() 
      };
    }

    return { elements: [], confidence: 0, method: 'none', cached: false, timestamp: Date.now() };
  }

  async detect(selectors, cacheKey) {
    if (this.cachedSelectors[cacheKey]) {
      const { selector, method } = this.cachedSelectors[cacheKey];
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        this.log(`Using cached selector for ${cacheKey}`);
        return { elements: Array.from(elements), confidence: 1, method, cached: true, timestamp: Date.now() };
      }
    }

    // Instagram-specific detection (highest priority)
    if (selectors.instagram) {
      let elements = document.querySelectorAll(selectors.instagram);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.instagram, method: 'instagram' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.95, method: 'instagram', cached: false, timestamp: Date.now() };
      }
    }

    // Test ID-based detection (high priority)
    if (selectors.testId) {
      let elements = document.querySelectorAll(selectors.testId);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.testId, method: 'testId' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.9, method: 'testId', cached: false, timestamp: Date.now() };
      }
    }

    // Aria-label-based detection (high priority)
    if (selectors.ariaLabel) {
      let elements = document.querySelectorAll(selectors.ariaLabel);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.ariaLabel, method: 'ariaLabel' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.85, method: 'ariaLabel', cached: false, timestamp: Date.now() };
      }
    }

    // Attribute-based detection
    if (selectors.attribute) {
      let elements = document.querySelectorAll(selectors.attribute);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.attribute, method: 'attribute' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.8, method: 'attribute', cached: false, timestamp: Date.now() };
      }
    }

    // Class-based detection
    if (selectors.class) {
      elements = document.querySelectorAll(selectors.class);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.class, method: 'class' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.7, method: 'class', cached: false, timestamp: Date.now() };
      }
    }

    // Structure-based detection
    if (selectors.structure) {
      elements = document.querySelectorAll(selectors.structure);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.structure, method: 'structure' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.5, method: 'structure', cached: false, timestamp: Date.now() };
      }
    }

    // Fallback detection (lowest priority)
    if (selectors.fallback) {
      elements = document.querySelectorAll(selectors.fallback);
      if (elements.length > 0) {
        this.cachedSelectors[cacheKey] = { selector: selectors.fallback, method: 'fallback' };
        this.saveCachedSelectors();
        return { elements: Array.from(elements), confidence: 0.3, method: 'fallback', cached: false, timestamp: Date.now() };
      }
    }

    this.log(`Could not detect ${cacheKey}`, 'warning');
    return { elements: [], confidence: 0, method: 'none', cached: false, timestamp: Date.now() };
  }
}

export default DOMDetector;
