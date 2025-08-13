/**
 * IG Reel Tracker - Content Script
 * Handles Instagram DM page detection and reel tracking
 * 
 * Phase 2 Implementation Complete:
 * - Smart reel detection with Instagram-specific selectors
 * - Optimized mutation observer targeting
 * - Performance optimizations with throttling and caching
 * - Enhanced data structure with DOM paths and message IDs
 */

/**
 * Check if current page is Instagram DM
 * @returns {boolean} True if on Instagram DM page
 */
function isInstagramDMPage() {
  const currentPath = window.location.pathname;
  const isDMPage = currentPath.includes('/direct/');
  console.log('[IG Reel Tracker] Page check:', currentPath, 'isDM:', isDMPage);
  return isDMPage;
}

/**
 * Smart reel detection using Instagram-specific selectors
 * @returns {Array} Array of detected reel elements
 */
function detectReelsInConversation() {
  const reelSelectors = [
    // Primary selectors (most reliable)
    '[role="button"][aria-label*="reel" i]',
    '[aria-label*="video" i][role="button"]',
    
    // Fallback selectors
    'div[role="listitem"] video',
    '[data-testid*="reel"]',
    
    // Structure-based detection
    'div[role="listitem"] div[style*="aspect-ratio"]'
  ];
  
  // Try multiple selector strategies
  for (const selector of reelSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`[IG Reel Tracker] Found ${elements.length} reels with selector: ${selector}`);
      return Array.from(elements);
    }
  }
  
  return [];
}

/**
 * Extract reel messages from the current conversation
 * @returns {Array} Array of reel message objects
 */
function extractReelMessages() {
  console.log('[IG Reel Tracker] Starting reel message extraction...');
  
  const reelMessages = [];
  
  try {
    // Use the new optimized reel detection function
    const reelElements = detectReelsInConversation();
    
    if (reelElements.length === 0) {
      console.log('[IG Reel Tracker] No reel elements found with any strategy');
      return reelMessages;
    }
    
    console.log(`[IG Reel Tracker] Total reel elements found: ${reelElements.length}`);
    
    // Process each reel element
    reelElements.forEach((reelElement, index) => {
      try {
        console.log(`[IG Reel Tracker] Processing reel element ${index + 1}/${reelElements.length}:`, reelElement);
        
        const reelData = extractReelData(reelElement);
        if (reelData) {
          reelMessages.push(reelData);
          console.log(`[IG Reel Tracker] Successfully extracted reel:`, reelData);
        }
      } catch (error) {
        console.error(`[IG Reel Tracker] Error processing reel element ${index + 1}:`, error);
      }
    });
    
    console.log(`[IG Reel Tracker] Reel extraction complete. Found ${reelMessages.length} reel messages`);
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error during reel extraction:', error);
      }
  
  return reelMessages;
}

/**
 * Generate unique ID for reel element
 * @param {Element} reelElement - The reel DOM element
 * @returns {string} Unique ID based on content or position
 */
function generateUniqueId(reelElement) {
  try {
    // Try to generate ID based on content hash
    const content = reelElement.textContent || reelElement.outerHTML || '';
    const hash = content.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `reel_${Math.abs(hash)}_${Date.now()}`;
  } catch (error) {
    // Fallback to timestamp-based ID
    return `reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Generate DOM path for navigation
 * @param {Element} reelElement - The reel DOM element
 * @returns {string} DOM path string
 */
function generateDOMPath(reelElement) {
  try {
    const path = [];
    let current = reelElement;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  } catch (error) {
    return 'unknown_path';
  }
}

/**
 * Extract message ID from reel element
 * @param {Element} reelElement - The reel DOM element
 * @returns {string|null} Message ID or null if not found
 */
function extractMessageId(reelElement) {
  try {
    const messageContainer = findMessageContainer(reelElement);
    if (!messageContainer) return null;
    
    // Try to find message ID from various attributes
    const messageId = messageContainer.getAttribute('data-message-id') ||
                     messageContainer.getAttribute('data-testid') ||
                     messageContainer.id ||
                     `msg_${Date.now()}`;
    
    return messageId;
  } catch (error) {
    return `msg_${Date.now()}`;
  }
}

/**
 * Get current conversation ID
 * @returns {string} Current conversation ID
 */
function getCurrentConversationId() {
  try {
    // Extract from URL or generate from current page
    const url = window.location.href;
    const conversationMatch = url.match(/\/direct\/t\/([^\/\?]+)/);
    
    if (conversationMatch) {
      return conversationMatch[1];
    }
    
    // Fallback to URL hash or current timestamp
    return url.split('/').pop() || `conv_${Date.now()}`;
  } catch (error) {
    return `conv_${Date.now()}`;
  }
}

/**
 * Extract data from a single reel element
 * @param {Element|Object} reelElement - The reel DOM element or synthetic reel object
 * @returns {Object|null} Reel data object or null if extraction fails
 */
function extractReelData(reelElement) {
  try {
    console.log('[IG Reel Tracker] Extracting data from reel element:', reelElement);
    
    let reelUrl, reelId, messageContainer;
    
    // Handle synthetic reel elements (from text search)
    if (reelElement.synthetic) {
      console.log('[IG Reel Tracker] Processing synthetic reel element');
      reelUrl = reelElement.href || window.location.href;
      reelId = 'synthetic_' + Date.now(); // Generate unique ID
      messageContainer = reelElement.messageContainer;
    } else {
      // Handle regular reel elements
      reelUrl = reelElement.href;
      if (!reelUrl) {
        console.warn('[IG Reel Tracker] No href found on reel element');
        return null;
      }
      
      reelId = extractReelIdFromUrl(reelUrl);
      if (!reelId) {
        console.warn('[IG Reel Tracker] Could not extract reel ID from URL:', reelUrl);
        return null;
      }
      
      console.log('[IG Reel Tracker] Extracted reel ID:', reelId);
      
      // Find the message container (parent element that contains the reel)
      messageContainer = findMessageContainer(reelElement);
    }
    
    if (!messageContainer) {
      console.warn('[IG Reel Tracker] Could not find message container for reel');
      return null;
    }
    
    // Extract timestamp
    const timestamp = extractTimestamp(messageContainer);
    console.log('[IG Reel Tracker] Extracted timestamp:', timestamp);
    
    // Check for emoji reactions
    const hasReaction = detectEmojiReactions(messageContainer);
    console.log('[IG Reel Tracker] Has emoji reactions:', hasReaction);
    
    // Enhanced reel data model as specified in the prompt
    const reelData = {
      id: generateUniqueId(reelElement), // Based on content or position
      timestamp: timestamp,
      hasReaction: hasReaction,
      reelUrl: reelUrl, // If available
      domPath: generateDOMPath(reelElement), // For navigation
      messageId: extractMessageId(reelElement),
      conversationId: getCurrentConversationId()
    };
    
    console.log('[IG Reel Tracker] Final reel data:', reelData);
    return reelData;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error extracting reel data:', error);
    return null;
  }
}

/**
 * Extract reel ID from Instagram reel URL
 * @param {string} url - The reel URL
 * @returns {string|null} The reel ID or null if not found
 */
function extractReelIdFromUrl(url) {
  try {
    console.log('[IG Reel Tracker] Extracting reel ID from URL:', url);
    
    // Handle different URL formats
    const urlPatterns = [
      /\/reel\/([^\/\?]+)/,  // /reel/ABC123/
      /\/reel\/([^\/\?]+)\?/, // /reel/ABC123?param=value
      /\/reel\/([^\/\?]+)$/   // /reel/ABC123 (end of URL)
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const reelId = match[1];
        console.log('[IG Reel Tracker] Successfully extracted reel ID:', reelId);
        return reelId;
      }
    }
    
    console.warn('[IG Reel Tracker] No reel ID pattern matched for URL:', url);
    return null;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error extracting reel ID from URL:', error);
    return null;
  }
}

/**
 * Find the message container that contains the reel
 * @param {Element} reelElement - The reel element
 * @returns {Element|null} The message container or null if not found
 */
function findMessageContainer(reelElement) {
  try {
    console.log('[IG Reel Tracker] Finding message container for reel element');
    
    // Look for common message container selectors
    const containerSelectors = [
      '[role="listitem"]',
      '.message-container',
      '.message',
      '[data-testid*="message"]',
      '.conversation-item',
      '[data-testid*="conversation"]',
      '.conversation',
      '.chat-item',
      '.dm-item'
    ];
    
    let currentElement = reelElement;
    let depth = 0;
    const maxDepth = 10; // Prevent infinite loops
    
    // Traverse up the DOM tree to find the message container
    while (currentElement && currentElement !== document.body && depth < maxDepth) {
      console.log(`[IG Reel Tracker] Checking element at depth ${depth}:`, currentElement.tagName, currentElement.className);
      
      // Check if current element matches any container selector
      for (const selector of containerSelectors) {
        if (currentElement.matches(selector)) {
          console.log('[IG Reel Tracker] Found message container with selector:', selector);
          return currentElement;
        }
      }
      
      // Check if current element has message-like attributes
      if (currentElement.hasAttribute('data-testid') || 
          currentElement.hasAttribute('role') ||
          currentElement.className.includes('message') ||
          currentElement.className.includes('conversation') ||
          currentElement.className.includes('chat')) {
        console.log('[IG Reel Tracker] Found potential message container by attributes:', currentElement);
        return currentElement;
      }
      
      currentElement = currentElement.parentElement;
      depth++;
    }
    
    // If we couldn't find a specific container, try to find the closest div that might be a message
    if (reelElement.parentElement && reelElement.parentElement.tagName === 'DIV') {
      console.log('[IG Reel Tracker] Using parent div as fallback message container');
      return reelElement.parentElement;
    }
    
    console.warn('[IG Reel Tracker] Could not find message container');
    return null;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error finding message container:', error);
    return null;
  }
}

/**
 * Extract timestamp from message container
 * @param {Element} messageContainer - The message container element
 * @returns {number|null} Timestamp in milliseconds or null if not found
 */
function extractTimestamp(messageContainer) {
  try {
    console.log('[IG Reel Tracker] Extracting timestamp from message container');
    
    // Multiple selectors for timestamp elements
    const timestampSelectors = [
      'time[datetime]',
      '[data-testid*="timestamp"]',
      '.timestamp',
      '.message-time',
      'span[title*=":"]' // Instagram often uses title attribute for time
    ];
    
    for (const selector of timestampSelectors) {
      const timestampElement = messageContainer.querySelector(selector);
      if (timestampElement) {
        console.log('[IG Reel Tracker] Found timestamp element with selector:', selector);
        
        // Try to get datetime attribute first
        if (timestampElement.hasAttribute('datetime')) {
          const dateTime = timestampElement.getAttribute('datetime');
          const timestamp = new Date(dateTime).getTime();
          if (!isNaN(timestamp)) {
            console.log('[IG Reel Tracker] Extracted timestamp from datetime:', dateTime, '->', timestamp);
            return timestamp;
          }
        }
        
        // Try to get title attribute
        if (timestampElement.hasAttribute('title')) {
          const title = timestampElement.getAttribute('title');
          console.log('[IG Reel Tracker] Found title attribute:', title);
          // Instagram titles often contain relative time, so we'll use current time as fallback
          return Date.now();
        }
        
        // Try to get text content
        const textContent = timestampElement.textContent?.trim();
        if (textContent) {
          console.log('[IG Reel Tracker] Found timestamp text:', textContent);
          // Instagram often shows relative time (e.g., "2h ago"), so use current time
          return Date.now();
        }
      }
    }
    
    console.warn('[IG Reel Tracker] No timestamp found, using current time as fallback');
    return Date.now();
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error extracting timestamp:', error);
    return Date.now(); // Fallback to current time
  }
}

/**
 * Detect if message has emoji reactions
 * @param {Element} messageContainer - The message container element
 * @returns {boolean} True if emoji reactions are present
 */
function detectEmojiReactions(messageContainer) {
  try {
    console.log('[IG Reel Tracker] Checking for emoji reactions in message container');
    
    // Instagram reaction patterns
    const reactionSelectors = [
      '.reaction-indicator',
      '[data-testid*="reaction"]',
      'span[role="img"]', // Emoji reactions
      '.emoji-reaction'
    ];
    
    // Check within reel container and nearby elements
    const container = messageContainer.closest('[role="listitem"]');
    if (!container) return false;
    
    return reactionSelectors.some(selector => 
      container.querySelector(selector) !== null
    );
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error detecting emoji reactions:', error);
    return false;
  }
}

/**
 * Log all detected reel messages to console
 * @param {Array} reelMessages - Array of reel message objects
 */
function logReelMessages(reelMessages) {
  console.log('='.repeat(60));
  console.log('[IG Reel Tracker] REEL MESSAGES SUMMARY');
  console.log('='.repeat(60));
  
  if (reelMessages.length === 0) {
    console.log('No reel messages found in current conversation');
  } else {
    console.log(`Found ${reelMessages.length} reel message(s):`);
    reelMessages.forEach((reel, index) => {
      console.log(`\n${index + 1}. Reel ID: ${reel.reelId}`);
      console.log(`   URL: ${reel.reelUrl}`);
      console.log(`   Timestamp: ${reel.timestamp} (${new Date(reel.timestamp).toLocaleString()})`);
      console.log(`   Has Reactions: ${reel.hasReaction ? '✅ Yes' : '❌ No'}`);
    });
  }
  
  console.log('='.repeat(60));
}

/**
 * Main function to detect and log all reels in the conversation
 * @returns {Array} Array of detected reel messages
 */
function detectAndLogReels() {
  try {
    console.log('[IG Reel Tracker] Starting reel detection process...');
    
    if (!isInstagramDMPage()) {
      console.log('[IG Reel Tracker] Not on Instagram DM page, skipping reel detection');
      return [];
    }
    
    // Extract all reel messages
    const reelMessages = extractReelMessages();
    
    // Log summary to console
    logReelMessages(reelMessages);
    
    // Store reels in extension storage for popup access
    if (reelMessages.length > 0) {
      chrome.storage.local.set({ 
        detectedReels: reelMessages,
        lastDetectionTime: Date.now()
      }, () => {
        console.log('[IG Reel Tracker] Stored reel data in extension storage');
      });
    }
    
    return reelMessages;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error during reel detection:', error);
    return [];
  }
}

// Track initialization state
let isInitialized = false;
let mutationObserver = null;

// Cached results to prevent reprocessing
const processedReels = new Set();

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

// Throttled detection for performance
const reelDetectionThrottle = throttle(scanForNewReels, 1000);

/**
 * Initialize content script
 * Sets up observers and communicates with service worker
 */
async function initializeContentScript() {
  try {
    console.log('[IG Reel Tracker] Content script initializing...');
    
    if (!isInstagramDMPage()) {
      console.log('[IG Reel Tracker] Not on DM page, content script inactive');
      return { success: false, error: 'Not on Instagram DM page' };
    }
    
    console.log('[IG Reel Tracker] Instagram DM page detected, initializing tracking');
    
    // Notify service worker that content script is ready
    const response = await chrome.runtime.sendMessage({
      action: 'contentScriptReady',
      url: window.location.href
    });
    
    if (response && response.success) {
      console.log('[IG Reel Tracker] Service worker connection established:', response.message);
      console.log('[IG Reel Tracker] Extension enabled:', response.isEnabled);
      
      if (response.isEnabled) {
        setupMutationObserver();
        
        // Perform initial reel detection after a short delay
        setTimeout(() => {
          console.log('[IG Reel Tracker] Performing initial reel detection...');
          detectAndLogReels();
        }, 2000);
        
        isInitialized = true;
        return { success: true, message: 'Extension initialized successfully' };
      } else {
        return { success: false, error: 'Extension is disabled' };
      }
    } else {
      console.error('[IG Reel Tracker] Failed to connect to service worker:', response);
      return { success: false, error: 'Service worker connection failed' };
    }
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error initializing content script:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set up DOM mutation observer for Instagram content changes
 * Optimized for Phase 2 implementation
 */
function setupMutationObserver() {
  try {
    console.log('[IG Reel Tracker] Setting up mutation observer...');
    
    // Clean up existing observer if any
    if (mutationObserver) {
      mutationObserver.disconnect();
      console.log('[IG Reel Tracker] Disconnected existing mutation observer');
    }
    
    // Observer configuration
    const observerConfig = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    };
    
    // Create observer instance
    const observer = new MutationObserver((mutations) => {
      handleDOMChanges(mutations);
    });
    
    // Smart observer targeting - only observe the messages container, not entire body
    const messagesContainer = document.querySelector('[role="main"]') || 
                             document.querySelector('[data-testid="conversation-list"]') ||
                             document.querySelector('.conversation-container');
    
    if (messagesContainer) {
      observer.observe(messagesContainer, observerConfig);
      mutationObserver = observer;
      console.log('[IG Reel Tracker] Observing messages container only');
    } else {
      // Fallback to body but with filtering
      observer.observe(document.body, observerConfig);
      mutationObserver = observer;
      console.log('[IG Reel Tracker] Fallback: observing body with filtering');
    }
    
    console.log('[IG Reel Tracker] Mutation observer started successfully');
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error setting up mutation observer:', error);
  }
}

/**
 * Scan for new reels and process them
 * Prevents reprocessing of already detected reels
 */
function scanForNewReels() {
  try {
    console.log('[IG Reel Tracker] Scanning for new reels...');
    
    const newReels = detectReelsInConversation();
    const newReelData = [];
    
    newReels.forEach(reelElement => {
      const reelId = extractReelIdFromUrl(reelElement.href) || generateUniqueId(reelElement);
      
      if (!processedReels.has(reelId)) {
        processedReels.add(reelId);
        const reelData = extractReelData(reelElement);
        if (reelData) {
          newReelData.push(reelData);
        }
      }
    });
    
    if (newReelData.length > 0) {
      console.log(`[IG Reel Tracker] Found ${newReelData.length} new reels`);
      // Store new reels in extension storage
      chrome.storage.local.get(['detectedReels'], (result) => {
        const existingReels = result.detectedReels || [];
        const updatedReels = [...existingReels, ...newReelData];
        chrome.storage.local.set({ 
          detectedReels: updatedReels,
          lastDetectionTime: Date.now()
        });
      });
    }
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error scanning for new reels:', error);
  }
}

/**
 * Handle DOM changes detected by mutation observer
 * Optimized for Phase 2 implementation
 * @param {MutationRecord[]} mutations - Array of mutation records
 */
function handleDOMChanges(mutations) {
  try {
    console.log('[IG Reel Tracker] DOM changes detected:', mutations.length, 'mutations');
    
    // Filter only relevant mutations
    const relevantMutations = mutations.filter(mutation => {
      if (mutation.type !== 'childList') return false;
      
      // Only process mutations in message containers
      const target = mutation.target;
      return target.matches('[role="main"]') || 
             target.closest('[role="main"]') ||
             target.matches('[role="listitem"]');
    });
    
    if (relevantMutations.length === 0) return;
    
    // Use throttled detection for performance
    reelDetectionThrottle();
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling DOM changes:', error);
  }
}

/**
 * Handle messages from popup
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('[IG Reel Tracker] Content script received message:', message);
    
    switch (message.action) {
      case 'testInjection':
        sendResponse({ success: true, message: 'Content script active' });
        break;
        
      case 'getPageInfo':
        handleGetPageInfo(sendResponse);
        break;
        
      case 'refreshTracking':
        handleRefreshTracking(sendResponse);
        break;
        
      case 'detectReels':
        handleDetectReels(sendResponse);
        break;
        
      case 'getReelData':
        handleGetReelData(sendResponse);
        break;
        
      case 'beginInitialization':
        handleBeginInitialization(sendResponse);
        break;
        
      case 'getStatus':
        handleGetStatus(sendResponse);
        break;
        
      default:
        console.warn('[IG Reel Tracker] Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep message channel open for async response
});

/**
 * Get current page information
 * @param {Function} sendResponse - Response callback
 */
function handleGetPageInfo(sendResponse) {
  try {
    const pageInfo = {
      url: window.location.href,
      isInstagramDM: isInstagramDMPage(),
      title: document.title,
      timestamp: Date.now()
    };
    
    console.log('[IG Reel Tracker] Page info requested:', pageInfo);
    sendResponse({ success: true, pageInfo });
  } catch (error) {
    console.error('[IG Reel Tracker] Error getting page info:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Refresh tracking system
 * @param {Function} sendResponse - Response callback
 */
function handleRefreshTracking(sendResponse) {
  try {
    console.log('[IG Reel Tracker] Refreshing tracking system...');
    
    if (isInstagramDMPage()) {
      setupMutationObserver();
      sendResponse({ success: true, message: 'Tracking refreshed' });
    } else {
      sendResponse({ success: false, error: 'Not on Instagram DM page' });
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error refreshing tracking:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle reel detection request
 * @param {Function} sendResponse - Response callback
 */
function handleDetectReels(sendResponse) {
  try {
    console.log('[IG Reel Tracker] Reel detection requested...');
    
    if (!isInstagramDMPage()) {
      sendResponse({ success: false, error: 'Not on Instagram DM page' });
      return;
    }
    
    const reelMessages = detectAndLogReels();
    sendResponse({ 
      success: true, 
      message: 'Reel detection completed',
      reelCount: reelMessages.length,
      reels: reelMessages
    });
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling reel detection request:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get reel data request
 * @param {Function} sendResponse - Response callback
 */
function handleGetReelData(sendResponse) {
  try {
    console.log('[IG Reel Tracker] Reel data requested...');
    
    chrome.storage.local.get(['detectedReels', 'lastDetectionTime'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[IG Reel Tracker] Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: 'Storage access failed' });
        return;
      }
      
      const reelData = {
        reels: result.detectedReels || [],
        lastDetectionTime: result.lastDetectionTime || null,
        totalCount: (result.detectedReels || []).length
      };
      
      console.log('[IG Reel Tracker] Retrieved reel data:', reelData);
      sendResponse({ success: true, data: reelData });
    });
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling get reel data request:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle begin initialization request
 * @param {Function} sendResponse - Response callback
 */
async function handleBeginInitialization(sendResponse) {
  try {
    console.log('[IG Reel Tracker] Begin initialization requested...');
    
    if (isInitialized) {
      console.log('[IG Reel Tracker] Extension already initialized');
      sendResponse({ success: true, message: 'Extension already initialized' });
      return;
    }
    
    const result = await initializeContentScript();
    sendResponse(result);
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling begin initialization request:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get status request
 * @param {Function} sendResponse - Response callback
 */
function handleGetStatus(sendResponse) {
  try {
    console.log('[IG Reel Tracker] Status requested...');
    
    const status = {
      isInitialized: isInitialized,
      isOnDMPage: isInstagramDMPage(),
      hasMutationObserver: mutationObserver !== null,
      url: window.location.href
    };
    
    console.log('[IG Reel Tracker] Current status:', status);
    sendResponse({ success: true, ...status });
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling get status request:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle page navigation changes
 */
function handlePageNavigation() {
  try {
    console.log('[IG Reel Tracker] Page navigation detected');
    
    // Re-initialize if navigated to DM page
    if (isInstagramDMPage()) {
      console.log('[IG Reel Tracker] Navigated to DM page, reinitializing...');
      setTimeout(initializeContentScript, 1000); // Delay for Instagram's SPA navigation
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling page navigation:', error);
  }
}

// Listen for Instagram's SPA navigation
window.addEventListener('popstate', handlePageNavigation);

// Don't auto-initialize - wait for user to click "Begin Initialization"
console.log('[IG Reel Tracker] Content script loaded - waiting for initialization request');

console.log('[IG Reel Tracker] Content script loaded successfully');

// Expose reel detection function globally for console testing
window.igReelTracker = {
  detectReels: () => {
    if (!isInitialized) {
      console.warn('[IG Reel Tracker] Extension not initialized. Please click "Begin Initialization" in the popup first.');
      return [];
    }
    return detectAndLogReels();
  },
  getReelData: () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['detectedReels', 'lastDetectionTime'], (result) => {
        resolve({
          reels: result.detectedReels || [],
          lastDetectionTime: result.lastDetectionTime || null,
          totalCount: (result.detectedReels || []).length
        });
      });
    });
  },
  isOnDMPage: isInstagramDMPage,
  isInitialized: () => isInitialized,
  initialize: async () => {
    if (isInitialized) {
      console.log('[IG Reel Tracker] Extension already initialized');
      return true;
    }
    console.log('[IG Reel Tracker] Manual initialization requested');
    const result = await initializeContentScript();
    return result.success;
  }
};

console.log('[IG Reel Tracker] Global functions available:');
console.log('[IG Reel Tracker] - window.igReelTracker.initialize() - Manual initialization');
console.log('[IG Reel Tracker] - window.igReelTracker.detectReels() - Detect reels (requires initialization)');
console.log('[IG Reel Tracker] - window.igReelTracker.getReelData() - Get stored reel data');
console.log('[IG Reel Tracker] - window.igReelTracker.isOnDMPage() - Check if on Instagram DM page');
console.log('[IG Reel Tracker] - window.igReelTracker.isInitialized() - Check initialization status');