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
 * Initialize content script
 */
function initialize() {
  setupMessageListener();
  calculateTargetDate();
  console.log('Instagram DM Time Scroll content script initialized');
}

/**
 * Set up message listener for communication with background script
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'scrollToTwoMonthsAgo':
          handleScrollToTwoMonthsAgo(sendResponse);
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
    
    sendResponse({ success: true, message: 'Started scrolling to 2 months ago' });
  } catch (error) {
    console.error('Failed to start scrolling:', error);
    logError(error);
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
 * Start the scrolling process
 */
async function startScrolling() {
  try {
    console.log('Starting scroll to 2 months ago...');
    
    const dmContainer = getDmContainer();
    if (!dmContainer) {
      throw new Error('Could not find DM container');
    }
    
    // Scroll until we reach target date or max attempts
    while (scrollAttempts < SCROLL_CONFIG.MAX_SCROLL_ATTEMPTS) {
      const currentDate = getCurrentVisibleDate(dmContainer);
      
      if (currentDate && isDateBeforeTarget(currentDate)) {
        console.log('Reached target date range:', currentDate);
        showNotification('Reached 2 months ago!');
        break;
      }
      
      await scrollUp(dmContainer);
      await waitForNewContent(dmContainer);
      
      scrollAttempts++;
      
      // Add human-like delay
      await delay(getRandomDelay());
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
 * Scroll up in the DM container
 * @param {Element} container - DM container
 */
async function scrollUp(container) {
  try {
    // Find scrollable element
    const scrollableElement = findScrollableElement(container);
    if (!scrollableElement) {
      throw new Error('No scrollable element found');
    }
    
    // Scroll up
    scrollableElement.scrollTop -= SCROLL_CONFIG.SCROLL_AMOUNT;
    
    console.log(`Scrolled up ${SCROLL_CONFIG.SCROLL_AMOUNT}px (attempt ${scrollAttempts + 1})`);
    
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
 * Log error to background script
 * @param {Error} error - Error to log
 */
function logError(error) {
  chrome.runtime.sendMessage({
    action: 'logError',
    error: {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    }
  }).catch(console.error);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}