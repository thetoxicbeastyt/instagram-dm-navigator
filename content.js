/**
 * Content Script for Instagram DM Time Scroll
 * Handles scrolling back 2 months in Instagram DM conversations
 */

// Configuration constants
const SCROLL_CONFIG = {
  DELAY_MIN: 200,
  DELAY_MAX: 800,
  SCROLL_AMOUNT: 300,
  MAX_SCROLL_ATTEMPTS: 100,
  LOAD_WAIT_TIME: 1000
};

const DATE_CONFIG = {
  TARGET_MONTHS_AGO: 2,
  DATE_SELECTORS: [
    '[data-testid="message-timestamp"]',
    'time[datetime]',
    '.timestamp',
    '[aria-label*="message"] time',
    'span[title*="message"]'
  ]
};

// State management
let isScrolling = false;
let scrollAttempts = 0;
let targetDate = null;

/**
 * Advanced Instagram Stealth Class
 * Provides comprehensive anti-detection measures
 */
class AdvancedInstagramStealth {
  static stealthMultiplier = 1.0;
  static maxScrollAmount = 800;
  static humanBehaviorProbability = 0.3;

  static async initializeUltraStealthMode() {
    console.log('🥷 Initializing Ultra Stealth Mode...');
    
    // 1. Remove ALL automation signals
    await this.removeAutomationSignals();
    
    // 2. Natural user simulation
    await this.simulateNaturalUserBehavior();
    
    // 3. Request pattern masking
    await this.maskRequestPatterns();
    
    // 4. Monitor Instagram blocking
    await this.monitorInstagramBlocking();
    
    console.log('✅ Ultra Stealth Mode initialized');
  }

  static async removeAutomationSignals() {
    // Remove webdriver properties more aggressively
    const automationProps = [
      'webdriver', '__webdriver_unwrapped', 'automation',
      '__webdriver_script_fn', '__webdriver_script_func', '__webdriver_script_function'
    ];
    
    automationProps.forEach(prop => {
      try {
        delete window.navigator[prop];
        delete window[prop];
        Object.defineProperty(navigator, prop, {
          get: () => undefined,
          configurable: true
        });
      } catch (e) {
        // Ignore errors
      }
    });

    // Override chrome runtime if present
    if (window.chrome && window.chrome.runtime && window.chrome.runtime.onConnect) {
      delete window.chrome.runtime.onConnect;
    }

    // Remove console automation traces
    const originalConsole = { ...console };
    ['log', 'warn', 'error'].forEach(method => {
      console[method] = (...args) => {
        const message = args[0]?.toString() || '';
        if (!message.includes('🔍') && !message.includes('📊') && !message.includes('🥷')) {
          originalConsole[method].apply(console, args);
        }
      };
    });
  }

  static async simulateNaturalUserBehavior() {
    // 1. Random mouse movements
    setInterval(() => {
      if (Math.random() < this.humanBehaviorProbability) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        
        const event = new MouseEvent('mousemove', {
          clientX: x,
          clientY: y,
          bubbles: true
        });
        document.dispatchEvent(event);
      }
    }, 3000 + Math.random() * 7000);

    // 2. Occasional clicks outside message area
    setInterval(() => {
      if (Math.random() < 0.1) {
        const safeAreas = ['header', 'nav', 'aside'];
        const area = document.querySelector(safeAreas[Math.floor(Math.random() * safeAreas.length)]);
        if (area) {
          const rect = area.getBoundingClientRect();
          const event = new MouseEvent('click', {
            clientX: rect.left + rect.width * 0.5,
            clientY: rect.top + rect.height * 0.5,
            bubbles: true
          });
          area.dispatchEvent(event);
        }
      }
    }, 30000 + Math.random() * 30000);

    // 3. Natural viewport scrolling
    setInterval(() => {
      if (Math.random() < 0.2) {
        const scrollAmount = Math.random() * 200 - 100;
        window.scrollBy({
          top: scrollAmount,
          behavior: 'smooth'
        });
        
        // Return to original position
        setTimeout(() => {
          window.scrollBy({
            top: -scrollAmount,
            behavior: 'smooth'
          });
        }, 1000 + Math.random() * 2000);
      }
    }, 20000 + Math.random() * 20000);
  }

  static async maskRequestPatterns() {
    // Intercept and delay requests to look more human
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;
    
    // Fetch interception
    window.fetch = async (...args) => {
      // Add natural delay based on request type
      const url = args[0]?.toString() || '';
      let delay = 200 + Math.random() * 800;
      
      if (url.includes('ajax')) delay += 500;
      if (url.includes('bz')) delay += 300;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        return await originalFetch.apply(window, args);
      } catch (error) {
        console.warn('🛡️ Request blocked, activating stealth mode');
        throw error;
      }
    };

    // XHR interception
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalSend = xhr.send;
      
      xhr.send = function(...args) {
        // Add delay before sending
        setTimeout(() => {
          originalSend.apply(xhr, args);
        }, Math.random() * 500 + 100);
      };
      
      return xhr;
    };
  }

  static async monitorInstagramBlocking() {
    // Monitor for DTSG errors and adapt
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (message?.includes('DTSG') || message?.includes('Sorry, something went wrong')) {
        console.log('🚨 Instagram blocking detected, switching to ultra-stealth mode');
        this.activateUltraStealthMode();
      }
      
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
    };

    // Monitor fetch errors
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('BLOCKED_BY_CLIENT')) {
        console.log('🚨 Client blocking detected, adjusting behavior');
        this.activateUltraStealthMode();
      }
    });
  }

  static async activateUltraStealthMode() {
    console.log('🔄 Ultra Stealth Mode Activated');
    
    // 1. Drastically slow down all operations
    this.stealthMultiplier = 3.0;
    
    // 2. Add longer natural breaks
    await new Promise(resolve => setTimeout(resolve, 10000 + Math.random() * 10000));
    
    // 3. Reduce scroll amounts
    this.maxScrollAmount = 500;
    
    // 4. Increase human-like behaviors
    this.humanBehaviorProbability = 0.8;
    
    console.log('✅ Ultra Stealth Mode Ready');
  }

  static getStealthDelay() {
    return Math.random() * 1000 * this.stealthMultiplier + 200;
  }

  static getStealthScrollAmount() {
    return Math.min(
      Math.random() * this.maxScrollAmount + 100,
      this.maxScrollAmount
    );
  }
}

/**
 * Initialize content script
 */
async function initialize() {
  try {
    // Initialize stealth measures first
    await AdvancedInstagramStealth.initializeUltraStealthMode();
    
    setupMessageListener();
    calculateTargetDate();
    console.log('Instagram DM Time Scroll content script initialized with stealth mode');
  } catch (error) {
    console.error('Failed to initialize content script:', error);
    // Continue without stealth if it fails
    setupMessageListener();
    calculateTargetDate();
  }
}

/**
 * Set up message listener for communication with background script
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'ping':
          sendResponse({ success: true, message: 'Content script is ready' });
          break;
        case 'scrollToTwoMonthsAgo':
          handleScrollToTwoMonthsAgo(sendResponse);
          break;
        case 'scrollToMonthsAgo':
          handleScrollToMonthsAgo(message.months, sendResponse);
          break;
        default:
          console.warn('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      logError(error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open for async response
  });
}

/**
 * Calculate target date (2 months ago)
 */
function calculateTargetDate() {
  const now = new Date();
  targetDate = new Date(now.getFullYear(), now.getMonth() - DATE_CONFIG.TARGET_MONTHS_AGO, now.getDate());
  console.log('Target date set to:', targetDate.toDateString());
}

/**
 * Handle scroll to 2 months ago request
 * @param {Function} sendResponse - Response callback
 */
async function handleScrollToTwoMonthsAgo(sendResponse) {
  try {
    if (isScrolling) {
      sendResponse({ success: false, error: 'Already scrolling' });
      return;
    }
    
    // Check if we're on Instagram
    if (!window.location.hostname.includes('instagram.com')) {
      sendResponse({ success: false, error: 'Not on Instagram' });
      return;
    }
    
    // Check if we're in DMs
    if (!isInDmSection()) {
      sendResponse({ success: false, error: 'Not in Instagram DMs' });
      return;
    }
    
    isScrolling = true;
    scrollAttempts = 0;
    
    // Start scrolling process
    await startScrolling();
    
    sendResponse({ success: true, message: 'Scrolling started successfully' });
    
  } catch (error) {
    console.error('Failed to start scrolling:', error);
    isScrolling = false;
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle scroll to specified months ago request
 * @param {number} months - Number of months to scroll back
 * @param {Function} sendResponse - Response callback
 */
async function handleScrollToMonthsAgo(months, sendResponse) {
  try {
    if (isScrolling) {
      sendResponse({ success: false, error: 'Already scrolling' });
      return;
    }
    
    // Check if we're on Instagram
    if (!window.location.hostname.includes('instagram.com')) {
      sendResponse({ success: false, error: 'Not on Instagram' });
      return;
    }
    
    // Check if we're in DMs
    if (!isInDmSection()) {
      sendResponse({ success: false, error: 'Not in Instagram DMs' });
      return;
    }
    
    // Calculate target date based on months
    const now = new Date();
    targetDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    console.log(`Target date set to ${months} months ago:`, targetDate.toDateString());
    
    isScrolling = true;
    scrollAttempts = 0;
    
    // Start scrolling process
    await startScrolling();
    
    sendResponse({ success: true, message: `Scrolling started to ${months} months ago` });
    
  } catch (error) {
    console.error('Failed to start scrolling:', error);
    isScrolling = false;
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Check if we're in Instagram DM section
 * @returns {boolean} True if in DM section
 */
function isInDmSection() {
  // Check for DM-specific URL patterns
  if (window.location.pathname.includes('/direct/')) {
    return true;
  }
  
  // Check for DM-specific DOM elements
  const dmIndicators = [
    '[data-testid="dm-conversation"]',
    '[aria-label*="Direct message"]',
    '.direct-message',
    '[data-testid="message-bubble"]'
  ];
  
  return dmIndicators.some(selector => document.querySelector(selector));
}

/**
 * Start the scrolling process with stealth measures
 */
async function startScrolling() {
  try {
    console.log('Starting stealth scroll to target date...');
    
    const dmContainer = getDmContainer();
    if (!dmContainer) {
      throw new Error('Could not find DM container');
    }
    
    // Scroll until we reach target date or max attempts
    while (scrollAttempts < SCROLL_CONFIG.MAX_SCROLL_ATTEMPTS) {
      const currentDate = getCurrentVisibleDate(dmContainer);
      
      if (currentDate && isDateBeforeTarget(currentDate)) {
        console.log('Reached target date range:', currentDate);
        showNotification('Reached target date!');
        break;
      }
      
      await scrollUp(dmContainer);
      await waitForNewContent(dmContainer);
      
      scrollAttempts++;
      
      // Use stealth delay
      await delay(AdvancedInstagramStealth.getStealthDelay());
      
      // Add natural breaks occasionally
      if (Math.random() < 0.1) {
        await delay(2000 + Math.random() * 3000);
      }
    }
    
    if (scrollAttempts >= SCROLL_CONFIG.MAX_SCROLL_ATTEMPTS) {
      showNotification('Reached scroll limit');
    }
    
  } catch (error) {
    console.error('Scrolling failed:', error);
    logError(error);
    throw error;
  } finally {
    isScrolling = false;
  }
}

/**
 * Get the main DM conversation container
 * @returns {Element|null} DM container element
 */
function getDmContainer() {
  const selectors = [
    '[data-testid="dm-conversation"]',
    '[aria-label*="Direct message"]',
    '.direct-message-container',
    '[role="main"]',
    'main'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  return null;
}

/**
 * Get the current visible date from the conversation
 * @param {Element} container - DM container
 * @returns {Date|null} Current visible date
 */
function getCurrentVisibleDate(container) {
  for (const selector of DATE_CONFIG.DATE_SELECTORS) {
    const dateElements = container.querySelectorAll(selector);
    
    for (const element of dateElements) {
      const date = parseDateFromElement(element);
      if (date) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Parse date from DOM element
 * @param {Element} element - DOM element containing date
 * @returns {Date|null} Parsed date
 */
function parseDateFromElement(element) {
  try {
    // Try datetime attribute first
    const datetime = element.getAttribute('datetime');
    if (datetime) {
      const date = new Date(datetime);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try title attribute
    const title = element.getAttribute('title');
    if (title) {
      const date = new Date(title);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try text content
    const text = element.textContent?.trim();
    if (text) {
      const date = parseRelativeDate(text);
      if (date) {
        return date;
      }
    }
    
  } catch (error) {
    console.warn('Failed to parse date from element:', error);
  }
  
  return null;
}

/**
 * Parse relative date strings like "2 days ago", "Dec 15", etc.
 * @param {string} text - Date text
 * @returns {Date|null} Parsed date
 */
function parseRelativeDate(text) {
  const now = new Date();
  
  // Handle "X days ago" format
  const daysAgoMatch = text.match(/(\d+)\s*days?\s*ago/i);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1]);
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    return date;
  }
  
  // Handle "X months ago" format
  const monthsAgoMatch = text.match(/(\d+)\s*months?\s*ago/i);
  if (monthsAgoMatch) {
    const months = parseInt(monthsAgoMatch[1]);
    const date = new Date(now);
    date.setMonth(date.getMonth() - months);
    return date;
  }
  
  // Handle "Dec 15" format
  const monthDayMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/i);
  if (monthDayMatch) {
    const month = monthDayMatch[1];
    const day = parseInt(monthDayMatch[2]);
    const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month.toLowerCase());
    
    if (monthIndex !== -1) {
      const date = new Date(now.getFullYear(), monthIndex, day);
      // If the date is in the future, it's from last year
      if (date > now) {
        date.setFullYear(date.getFullYear() - 1);
      }
      return date;
    }
  }
  
  return null;
}

/**
 * Check if a date is before our target date
 * @param {Date} date - Date to check
 * @returns {boolean} True if before target
 */
function isDateBeforeTarget(date) {
  return date <= targetDate;
}

/**
 * Scroll up in the DM container with stealth measures
 * @param {Element} container - DM container
 */
async function scrollUp(container) {
  try {
    // Find scrollable element
    const scrollableElement = findScrollableElement(container);
    if (!scrollableElement) {
      throw new Error('No scrollable element found');
    }
    
    // Use stealth scroll amount
    const scrollAmount = AdvancedInstagramStealth.getStealthScrollAmount();
    scrollableElement.scrollTop -= scrollAmount;
    
    // Add natural scroll behavior
    if (Math.random() < 0.3) {
      // Sometimes scroll in smaller chunks
      const smallScroll = scrollAmount * 0.5;
      setTimeout(() => {
        scrollableElement.scrollTop -= smallScroll;
      }, 100 + Math.random() * 200);
    }
    
    console.log(`Stealth scrolled up ${scrollAmount}px (attempt ${scrollAttempts + 1})`);
    
  } catch (error) {
    console.error('Failed to scroll:', error);
    throw error;
  }
}

/**
 * Find the scrollable element within the container
 * @param {Element} container - Container element
 * @returns {Element|null} Scrollable element
 */
function findScrollableElement(container) {
  // Check if container itself is scrollable
  if (container.scrollHeight > container.clientHeight) {
    return container;
  }
  
  // Look for scrollable children
  const scrollableSelectors = [
    '[data-testid="dm-conversation"]',
    '.scrollable',
    '[style*="overflow"]',
    'div[role="main"]'
  ];
  
  for (const selector of scrollableSelectors) {
    const element = container.querySelector(selector);
    if (element && element.scrollHeight > element.clientHeight) {
      return element;
    }
  }
  
  // Fallback: find any element with scroll
  const elements = container.querySelectorAll('*');
  for (const element of elements) {
    if (element.scrollHeight > element.clientHeight) {
      return element;
    }
  }
  
  return null;
}

/**
 * Wait for new content to load after scrolling
 * @param {Element} container - DM container
 */
async function waitForNewContent(container) {
  const initialHeight = container.scrollHeight;
  
  // Wait for content to load
  await delay(SCROLL_CONFIG.LOAD_WAIT_TIME);
  
  // Check if new content loaded
  if (container.scrollHeight > initialHeight) {
    console.log('New content loaded');
  }
}

/**
 * Get random delay for human-like behavior
 * @returns {number} Delay in milliseconds
 */
function getRandomDelay() {
  return Math.random() * (SCROLL_CONFIG.DELAY_MAX - SCROLL_CONFIG.DELAY_MIN) + SCROLL_CONFIG.DELAY_MIN;
}

/**
 * Delay function
 * @param {number} ms - Milliseconds to delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show notification
 * @param {string} text - Notification text
 */
function showNotification(text) {
  chrome.runtime.sendMessage({
    action: 'showNotification',
    text: text
  }).catch(console.error);
}

/**
 * Log error with context
 * @param {Error} error - Error to log
 */
function logError(error) {
  console.error('Instagram DM Scroller Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
}

/**
 * Main extension initialization with comprehensive error handling
 */
async function initializeExtension() {
  try {
    console.log('🚀 Initializing Instagram DM Scroller with stealth mode...');
    
    // Step 1: Initialize stealth measures
    await AdvancedInstagramStealth.initializeUltraStealthMode();
    
    // Step 2: Initialize content script
    await initialize();
    
    // Step 3: Test DOM access
    const testAccess = document.querySelector('div');
    if (!testAccess) {
      throw new Error('Cannot access Instagram DOM');
    }
    
    // Step 4: Test if we're on Instagram
    if (!window.location.hostname.includes('instagram.com')) {
      console.log('Not on Instagram, extension ready but inactive');
      return;
    }
    
    console.log('✅ Extension initialized successfully with stealth mode');
    
  } catch (error) {
    console.error('❌ Extension initialization failed:', error);
    
    // Show user-friendly error message
    const errorPopup = document.createElement('div');
    errorPopup.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #E1306C;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 99999;
        font-family: system-ui;
        max-width: 300px;
        color: #262626;
      ">
        <h4 style="margin: 0 0 12px; color: #E1306C;">📱 Instagram DM Scroller</h4>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.4;">
          Extension loaded with limited functionality.<br>
          <small style="color: #8E8E8E;">Some features may be restricted due to Instagram's security measures.</small>
        </p>
        <div style="display: flex; gap: 8px;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            background: #E1306C;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(errorPopup);
    
    // Remove error popup after 10 seconds
    setTimeout(() => {
      if (errorPopup.parentElement) {
        errorPopup.remove();
      }
    }, 10000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Handle page navigation
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('Page navigated, reinitializing extension...');
    setTimeout(initializeExtension, 1000); // Wait for page to load
  }
}).observe(document, { subtree: true, childList: true });