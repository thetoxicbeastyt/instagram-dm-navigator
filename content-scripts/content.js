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

// Map to store detected reels and avoid duplicates
const detectedReelsMap = new Map();

// Debouncing for storage operations
let storageDebounceTimer = null;
const STORAGE_DEBOUNCE_DELAY = 1000; // 1 second

// Storage constants
const MAX_REELS_STORAGE = 1000;
const STORAGE_KEY_PREFIX = 'ig_reel_data_';

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
 * Detect emoji reactions for Instagram reel containers
 * Checks for SVG icons, Unicode emojis, and reaction container elements
 * @param {Element} reelElement - The reel DOM element
 * @returns {Object} Reaction data with hasReaction and reactionType
 */
function detectReelReactions(reelElement) {
  try {
    console.log('[IG Reel Tracker] Detecting reactions for reel element...');
    
    // Defensive null check
    if (!reelElement) {
      console.warn('[IG Reel Tracker] Null reel element provided for reaction detection');
      return { hasReaction: false, reactionType: null };
    }
    
    // Find the message container that contains this reel
    const messageContainer = findMessageContainer(reelElement);
    if (!messageContainer) {
      console.log('[IG Reel Tracker] No message container found for reaction detection');
      return { hasReaction: false, reactionType: null };
    }
    
    console.log('[IG Reel Tracker] Searching for reactions in message container and surrounding areas...');
    
    // Multiple location strategies for reaction detection
    const searchAreas = [
      messageContainer, // Primary container
      messageContainer.parentElement, // Parent container
      messageContainer.nextElementSibling, // Next sibling (reactions often appear after)
      messageContainer.previousElementSibling, // Previous sibling
    ].filter(Boolean); // Remove null elements
    
    // Instagram reaction patterns to search for
    const reactionSelectors = [
      // SVG-based reactions
      'svg[aria-label*="reaction" i]',
      'svg[aria-label*="heart" i]',
      'svg[aria-label*="like" i]',
      'svg[aria-label*="love" i]',
      'svg[aria-label*="laugh" i]',
      'svg[aria-label*="wow" i]',
      'svg[aria-label*="angry" i]',
      'svg[aria-label*="sad" i]',
      
      // Reaction container elements
      '[data-testid*="reaction"]',
      '[aria-label*="reaction" i]',
      '.reaction-button',
      '.reaction-pill',
      '.message-reaction',
      
      // Emoji-based reactions (span with role="img")
      'span[role="img"][aria-label*="heart" i]',
      'span[role="img"][aria-label*="laugh" i]',
      'span[role="img"][aria-label*="wow" i]',
      'span[role="img"][aria-label*="angry" i]',
      'span[role="img"][aria-label*="sad" i]',
      'span[role="img"][aria-label*="like" i]',
      
      // Generic emoji containers
      'span[role="img"]',
      '[class*="emoji"]',
      '[class*="reaction"]'
    ];
    
    // Common emoji Unicode patterns for Instagram reactions
    const emojiPatterns = [
      /❤️|♥️|💖|💕|💗/g, // Heart variants
      /😂|🤣|😆|😄/g, // Laugh variants  
      /😮|😯|😲|🤯/g, // Wow/surprise variants
      /😡|😠|🤬/g, // Angry variants
      /😢|😭|😔|☹️/g, // Sad variants
      /👍|👏|🙌/g, // Like/approval variants
      /🔥|💯|✨/g // Fire/100/sparkle variants
    ];
    
    const reactionTypes = [
      'heart', 'laugh', 'wow', 'angry', 'sad', 'like', 'fire'
    ];
    
    // Search each area for reactions
    for (const area of searchAreas) {
      console.log(`[IG Reel Tracker] Checking area: ${area.tagName}${area.className ? '.' + area.className : ''}`);
      
      // Check for reaction selector patterns
      for (const selector of reactionSelectors) {
        try {
          const reactionElements = area.querySelectorAll(selector);
          if (reactionElements.length > 0) {
            console.log(`[IG Reel Tracker] Found ${reactionElements.length} reaction elements with selector: ${selector}`);
            
            // Try to determine reaction type from aria-label or content
            for (const reactionEl of reactionElements) {
              const ariaLabel = reactionEl.getAttribute('aria-label') || '';
              const textContent = reactionEl.textContent || '';
              
              console.log(`[IG Reel Tracker] Reaction element aria-label: "${ariaLabel}", content: "${textContent}"`);
              
              // Match reaction type
              const detectedType = determineReactionType(ariaLabel + ' ' + textContent);
              if (detectedType) {
                console.log(`[IG Reel Tracker] Detected reaction type: ${detectedType}`);
                return { hasReaction: true, reactionType: detectedType };
              }
            }
            
            // If we found reaction elements but couldn't determine type
            console.log('[IG Reel Tracker] Found reactions but could not determine specific type');
            return { hasReaction: true, reactionType: 'unknown' };
          }
        } catch (selectorError) {
          console.warn(`[IG Reel Tracker] Reaction selector failed: ${selector}`, selectorError);
          continue;
        }
      }
      
      // Check for Unicode emoji patterns in text content
      const areaText = area.textContent || '';
      for (let i = 0; i < emojiPatterns.length; i++) {
        const pattern = emojiPatterns[i];
        const matches = areaText.match(pattern);
        if (matches && matches.length > 0) {
          const detectedType = reactionTypes[i];
          console.log(`[IG Reel Tracker] Found emoji reactions: ${matches.join(', ')} - Type: ${detectedType}`);
          return { hasReaction: true, reactionType: detectedType };
        }
      }
    }
    
    // Check for lazy-loaded reactions by looking for reaction count indicators
    for (const area of searchAreas) {
      const reactionCounts = area.querySelectorAll('[class*="reaction-count"], [class*="emoji-count"], [aria-label*="reaction" i]');
      if (reactionCounts.length > 0) {
        console.log(`[IG Reel Tracker] Found reaction count indicators, likely lazy-loaded reactions`);
        return { hasReaction: true, reactionType: 'lazy-loaded' };
      }
    }
    
    console.log('[IG Reel Tracker] No reactions detected for this reel');
    return { hasReaction: false, reactionType: null };
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error detecting reel reactions:', error);
    return { hasReaction: false, reactionType: null };
  }
}

/**
 * Determine reaction type from text content or aria labels
 * @param {string} text - Text to analyze
 * @returns {string|null} Detected reaction type or null
 */
function determineReactionType(text) {
  const lowerText = text.toLowerCase();
  
  // Heart/like patterns
  if (lowerText.includes('heart') || lowerText.includes('love') || lowerText.includes('like')) {
    return 'heart';
  }
  
  // Laugh patterns
  if (lowerText.includes('laugh') || lowerText.includes('funny') || lowerText.includes('haha')) {
    return 'laugh';
  }
  
  // Wow/surprise patterns
  if (lowerText.includes('wow') || lowerText.includes('surprise') || lowerText.includes('amazing')) {
    return 'wow';
  }
  
  // Angry patterns
  if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('upset')) {
    return 'angry';
  }
  
  // Sad patterns
  if (lowerText.includes('sad') || lowerText.includes('cry') || lowerText.includes('tear')) {
    return 'sad';
  }
  
  // Fire/lit patterns
  if (lowerText.includes('fire') || lowerText.includes('lit') || lowerText.includes('100')) {
    return 'fire';
  }
  
  return null;
}

/**
 * Extract reel ID from DOM element structure
 * Checks data attributes, URL parameters, and element properties
 * @param {Element} reelElement - The reel DOM element
 * @returns {string|null} Extracted reel ID or null if not found
 */
function extractReelIdFromDOMElement(reelElement) {
  try {
    console.log('[IG Reel Tracker] Extracting reel ID from DOM element:', reelElement);
    
    // Defensive null check
    if (!reelElement) {
      console.warn('[IG Reel Tracker] Null reel element provided');
      return null;
    }
    
    // Strategy 1: Check data attributes
    const dataAttributes = [
      'data-reel-id',
      'data-video-id', 
      'data-media-id',
      'data-id',
      'data-testid',
      'data-story-id'
    ];
    
    for (const attr of dataAttributes) {
      const value = reelElement.getAttribute(attr);
      if (value && value.length > 0) {
        console.log(`[IG Reel Tracker] Found reel ID in ${attr}: ${value}`);
        return value;
      }
    }
    
    // Strategy 2: Check src/href URLs for reel IDs
    const urlAttributes = ['src', 'href', 'data-src', 'poster'];
    for (const attr of urlAttributes) {
      const url = reelElement.getAttribute(attr);
      if (url) {
        const reelId = extractReelIdFromUrl(url);
        if (reelId) {
          console.log(`[IG Reel Tracker] Found reel ID in ${attr} URL: ${reelId}`);
          return reelId;
        }
      }
    }
    
    // Strategy 3: Check parent elements for data attributes
    let currentElement = reelElement.parentElement;
    let depth = 0;
    const maxDepth = 5;
    
    while (currentElement && depth < maxDepth) {
      for (const attr of dataAttributes) {
        const value = currentElement.getAttribute(attr);
        if (value && value.length > 0) {
          console.log(`[IG Reel Tracker] Found reel ID in parent ${attr}: ${value}`);
          return value;
        }
      }
      
      // Check parent URLs
      for (const attr of urlAttributes) {
        const url = currentElement.getAttribute(attr);
        if (url) {
          const reelId = extractReelIdFromUrl(url);
          if (reelId) {
            console.log(`[IG Reel Tracker] Found reel ID in parent ${attr} URL: ${reelId}`);
            return reelId;
          }
        }
      }
      
      currentElement = currentElement.parentElement;
      depth++;
    }
    
    // Strategy 4: Generate unique ID based on element properties
    const fallbackId = generateUniqueId(reelElement);
    console.log(`[IG Reel Tracker] Generated fallback reel ID: ${fallbackId}`);
    return fallbackId;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error extracting reel ID from DOM element:', error);
    return generateUniqueId(reelElement);
  }
}

/**
 * Check available storage quota before writing
 * @returns {Promise<boolean>} True if storage is available
 */
async function checkStorageQuota() {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      
      // Check if we're using more than 80% of available storage
      const usagePercentage = (usedBytes / quotaBytes) * 100;
      
      console.log(`[IG Reel Tracker] Storage usage: ${usedBytes} / ${quotaBytes} bytes (${usagePercentage.toFixed(1)}%)`);
      
      if (usagePercentage > 80) {
        console.warn('[IG Reel Tracker] Storage quota approaching limit, skipping save');
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn('[IG Reel Tracker] Could not check storage quota:', error);
    return true; // Proceed with storage if quota check fails
  }
}

/**
 * Persist reel data to chrome.storage.local with debouncing
 * @param {boolean} immediate - Force immediate save without debouncing
 */
function persistReelData(immediate = false) {
  try {
    console.log('[IG Reel Tracker] Scheduling reel data persistence...');
    
    // Clear existing timer if not immediate
    if (storageDebounceTimer && !immediate) {
      clearTimeout(storageDebounceTimer);
    }
    
    const saveFunction = async () => {
      try {
        console.log('[IG Reel Tracker] Executing reel data persistence...');
        
        // Check storage quota before proceeding
        const hasStorageSpace = await checkStorageQuota();
        if (!hasStorageSpace) {
          console.warn('[IG Reel Tracker] Skipping persistence due to storage quota limits');
          return;
        }
        
        const conversationId = getCurrentConversationId();
        if (!conversationId) {
          console.warn('[IG Reel Tracker] No conversation ID available, skipping persistence');
          return;
        }
        
        // Convert Map to array and clean DOM references for storage
        const reelsArray = Array.from(detectedReelsMap.values()).map(reel => ({
          reelId: reel.reelId,
          timestamp: reel.timestamp,
          selector: reel.selector,
          extractionMethod: reel.extractionMethod,
          hasReaction: reel.hasReaction,
          reactionType: reel.reactionType,
          // Remove domElement reference for storage
          domPath: reel.domElement ? generateDOMPath(reel.domElement) : null
        }));
        
        if (reelsArray.length === 0) {
          console.log('[IG Reel Tracker] No reels to persist');
          return;
        }
        
        // Get existing data for this conversation
        const storageKey = STORAGE_KEY_PREFIX + conversationId;
        const existingData = await getStoredReelData(conversationId);
        
        // Merge new reels with existing data
        const mergedReels = mergeReelData(existingData.reels || [], reelsArray);
        
        // Limit to MAX_REELS_STORAGE most recent reels
        const limitedReels = limitReelStorage(mergedReels);
        
        // Create storage structure
        const storageData = {
          conversationId: conversationId,
          reels: limitedReels,
          lastUpdated: Date.now()
        };
        
        // Save to chrome.storage.local
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [storageKey]: storageData }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        
        console.log(`[IG Reel Tracker] Successfully persisted ${limitedReels.length} reels for conversation ${conversationId}`);
        
        // Send update message to service worker
        await notifyServiceWorkerOfUpdate(conversationId, limitedReels.length);
        
      } catch (error) {
        console.error('[IG Reel Tracker] Error persisting reel data:', error);
        handleStorageError(error);
      }
    };
    
    if (immediate) {
      saveFunction();
    } else {
      storageDebounceTimer = setTimeout(saveFunction, STORAGE_DEBOUNCE_DELAY);
    }
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error scheduling reel data persistence:', error);
  }
}

/**
 * Get stored reel data for a conversation
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object>} Stored reel data
 */
async function getStoredReelData(conversationId) {
  try {
    const storageKey = STORAGE_KEY_PREFIX + conversationId;
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[IG Reel Tracker] Error getting stored data:', chrome.runtime.lastError);
          resolve({ reels: [], lastUpdated: null });
        } else {
          resolve(result[storageKey] || { reels: [], lastUpdated: null });
        }
      });
    });
  } catch (error) {
    console.error('[IG Reel Tracker] Error getting stored reel data:', error);
    return { reels: [], lastUpdated: null };
  }
}

/**
 * Merge new reel data with existing stored data
 * @param {Array} existingReels - Previously stored reels
 * @param {Array} newReels - Newly detected reels
 * @returns {Array} Merged reel array
 */
function mergeReelData(existingReels, newReels) {
  try {
    console.log(`[IG Reel Tracker] Merging ${newReels.length} new reels with ${existingReels.length} existing reels`);
    
    // Create a Map of existing reels by reelId for fast lookups
    const existingReelsMap = new Map();
    existingReels.forEach(reel => {
      existingReelsMap.set(reel.reelId, reel);
    });
    
    // Add new reels, updating existing ones if found
    newReels.forEach(newReel => {
      const existingReel = existingReelsMap.get(newReel.reelId);
      if (existingReel) {
        // Update existing reel with new reaction data if available
        existingReel.hasReaction = newReel.hasReaction;
        existingReel.reactionType = newReel.reactionType;
        existingReel.lastUpdated = newReel.timestamp;
        console.log(`[IG Reel Tracker] Updated existing reel: ${newReel.reelId}`);
      } else {
        // Add new reel
        existingReelsMap.set(newReel.reelId, newReel);
        console.log(`[IG Reel Tracker] Added new reel: ${newReel.reelId}`);
      }
    });
    
    // Convert back to array and sort by timestamp (newest first)
    const mergedArray = Array.from(existingReelsMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`[IG Reel Tracker] Merge complete: ${mergedArray.length} total reels`);
    return mergedArray;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error merging reel data:', error);
    return newReels; // Return new reels as fallback
  }
}

/**
 * Limit reel storage to prevent overflow
 * @param {Array} reels - Array of reel objects
 * @returns {Array} Limited reel array
 */
function limitReelStorage(reels) {
  try {
    if (reels.length <= MAX_REELS_STORAGE) {
      return reels;
    }
    
    console.log(`[IG Reel Tracker] Limiting storage from ${reels.length} to ${MAX_REELS_STORAGE} reels`);
    
    // Keep only the most recent MAX_REELS_STORAGE reels
    return reels
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_REELS_STORAGE);
      
  } catch (error) {
    console.error('[IG Reel Tracker] Error limiting reel storage:', error);
    return reels.slice(0, MAX_REELS_STORAGE); // Fallback to simple slice
  }
}

/**
 * Send update message to service worker with reel count
 * @param {string} conversationId - The conversation ID
 * @param {number} reelCount - Number of reels detected
 */
async function notifyServiceWorkerOfUpdate(conversationId, reelCount) {
  try {
    console.log(`[IG Reel Tracker] Notifying service worker of ${reelCount} reels in conversation ${conversationId}`);
    
    const updateMessage = {
      action: 'reelDataUpdated',
      data: {
        conversationId: conversationId,
        reelCount: reelCount,
        timestamp: Date.now(),
        url: window.location.href
      }
    };
    
    chrome.runtime.sendMessage(updateMessage, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[IG Reel Tracker] Error sending update to service worker:', chrome.runtime.lastError);
      } else {
        console.log('[IG Reel Tracker] Service worker notified successfully:', response);
      }
    });
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error notifying service worker:', error);
  }
}

/**
 * Handle storage errors gracefully
 * @param {Error} error - The storage error
 */
function handleStorageError(error) {
  try {
    console.error('[IG Reel Tracker] Storage error details:', error);
    
    // Check for specific error types
    if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
      console.error('[IG Reel Tracker] Storage quota exceeded - clearing old data');
      // Could implement cleanup logic here
    } else if (error.message && error.message.includes('MAX_WRITE_OPERATIONS_PER_MINUTE')) {
      console.error('[IG Reel Tracker] Too many storage operations - slowing down');
      // Could implement rate limiting here
    }
    
    // Log error for debugging but don't crash the extension
    console.warn('[IG Reel Tracker] Continuing operation despite storage error');
    
  } catch (handlingError) {
    console.error('[IG Reel Tracker] Error handling storage error:', handlingError);
  }
}

/**
 * Handle DOM changes detected by mutation observer
 * Enhanced with reel detection in Instagram DMs
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
    
    // Enhanced reel detection for Instagram DMs
    console.log('[IG Reel Tracker] Scanning for reels...');
    
    // Multiple selector strategies for reel message containers
    const reelSelectors = [
      // Video elements with Instagram patterns
      'video[src*="instagram"]',
      'video[src*="cdninstagram"]',
      'video[poster*="instagram"]',
      
      // Data attribute selectors
      '[data-testid*="reel"]',
      '[data-testid*="video"]',
      '[data-testid*="story"]',
      
      // Aria label selectors
      '[aria-label*="reel" i]',
      '[aria-label*="video" i]',
      '[aria-label*="story" i]',
      
      // Structural patterns for video containers
      'div[role="listitem"] video',
      'div[role="button"] video',
      '[role="button"][aria-label*="video" i]',
      
      // Instagram-specific patterns
      'div[style*="aspect-ratio"] video',
      'div[class*="video"] video',
      'div[class*="reel"]',
      
      // Fallback selectors
      'video[controls]',
      'video[autoplay]'
    ];
    
    let foundReels = [];
    let workingSelector = null;
    
    // Try each selector strategy with defensive null checks
    for (const selector of reelSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          foundReels = Array.from(elements);
          workingSelector = selector;
          console.log(`[IG Reel Tracker] Found ${foundReels.length} reel containers using selector: ${selector}`);
          break;
        }
      } catch (selectorError) {
        console.warn(`[IG Reel Tracker] Selector failed: ${selector}`, selectorError);
        continue;
      }
    }
    
    if (foundReels.length === 0) {
      console.log('[IG Reel Tracker] No reel containers found with any strategy');
    } else {
      console.log(`[IG Reel Tracker] Found ${foundReels.length} reel containers`);
      
      // Process each found reel
      foundReels.forEach((reelElement, index) => {
        try {
          // Extract reel ID from DOM structure
          const reelId = extractReelIdFromDOMElement(reelElement);
          
          if (!reelId) {
            console.warn(`[IG Reel Tracker] Could not extract reel ID from element ${index + 1}`);
            return;
          }
          
          // Check if already detected to avoid duplicates
          if (detectedReelsMap.has(reelId)) {
            console.log(`[IG Reel Tracker] Reel ${reelId} already detected, skipping`);
            return;
          }
          
          // Detect emoji reactions for this reel
          console.log(`[IG Reel Tracker] Detecting reactions for reel ${reelId}...`);
          const reactionData = detectReelReactions(reelElement);
          console.log(`[IG Reel Tracker] Reaction detection result for ${reelId}:`, reactionData);
          
          // Create enhanced reel data structure with reaction fields
          const reelData = {
            reelId: reelId,
            timestamp: Date.now(),
            domElement: reelElement,
            selector: workingSelector,
            extractionMethod: 'DOM_MUTATION',
            hasReaction: reactionData.hasReaction,
            reactionType: reactionData.reactionType
          };
          
          // Store in Map to avoid duplicates
          detectedReelsMap.set(reelId, reelData);
          
          // Enhanced console output with reaction status
          if (reactionData.hasReaction) {
            console.log(`[IG Reel Tracker] Reel detected with reaction: {id: "${reelId}", timestamp: ${reelData.timestamp}, reactionType: "${reactionData.reactionType}"}`, reelData);
          } else {
            console.log(`[IG Reel Tracker] Reel detected (no reactions): {id: "${reelId}", timestamp: ${reelData.timestamp}}`, reelData);
          }
          
          // Schedule persistence with debouncing
          persistReelData();
          
        } catch (elementError) {
          console.error(`[IG Reel Tracker] Error processing reel element ${index + 1}:`, elementError);
        }
      });
    }
    
    // Use throttled detection for additional processing
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