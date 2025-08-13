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
 * Find the messages container where DM messages appear
 * @returns {Element|null} The messages container or null if not found
 */
function findMessagesContainer() {
  console.log('[IG Reel Tracker] Finding messages container...');
  
  const containerSelectors = [
    // Instagram's primary message container patterns
    'div[role="grid"]', // Most common for message lists
    'section div[role="grid"]',
    '[data-testid="conversation-viewer"]',
    '[role="main"] div[role="grid"]',
    
    // Scrollable message containers
    'div[style*="overflow"] div[role="row"]:first-child',
    'div[style*="scroll"] div[role="row"]:first-child',
    
    // Fallback selectors
    'div[role="row"]:first-child',
    '.conversation-viewer',
    '[class*="message"][class*="container"]'
  ];
  
  for (const selector of containerSelectors) {
    try {
      const container = document.querySelector(selector);
      if (container) {
        // Verify it contains actual messages by checking for multiple rows
        const messageRows = container.querySelectorAll('[role="row"], div[style*="flex"]');
        if (messageRows.length >= 1) {
          console.log(`[IG Reel Tracker] Found messages container using selector: ${selector}`);
          console.log(`[IG Reel Tracker] Container contains ${messageRows.length} potential message elements`);
          return container.closest('div[role="grid"]') || container;
        }
      }
    } catch (error) {
      console.warn(`[IG Reel Tracker] Selector failed: ${selector}`, error);
      continue;
    }
  }
  
  console.warn('[IG Reel Tracker] Could not find messages container');
  return null;
}

/**
 * Smart reel detection using Instagram-specific selectors within messages container
 * @returns {Array} Array of detected reel elements
 */
function detectReelsInConversation() {
  console.log('[IG Reel Tracker] Scanning for reels within messages container...');
  
  // First find the messages container
  const messagesContainer = findMessagesContainer();
  if (!messagesContainer) {
    console.log('[IG Reel Tracker] No messages container found, cannot detect reels');
    return [];
  }
  
  // Updated selectors that target actual reel messages, not UI elements
  const reelSelectors = [
    // Links to reels within messages
    'a[href*="/reel/"]',
    'a[href*="/reels/"]', 
    'a[href*="instagram.com/reel"]',
    
    // Video elements within message bubbles
    'div[role="row"] video',
    'div[role="button"]:has(video)',
    '[role="button"] video',
    
    // Message containers with video content
    'div[style*="aspect-ratio"] video',
    'div[class*="video"] a[href*="reel"]',
    
    // Instagram-specific video patterns within messages
    'video[src*="instagram"]',
    'video[src*="cdninstagram"]',
    'img[src*="reel"]'
  ];
  
  let foundReels = [];
  let workingSelector = null;
  
  // Try each selector strategy within the messages container only
  for (const selector of reelSelectors) {
    try {
      const elements = messagesContainer.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        // Filter out elements that are in navigation/header/sidebar
        const validElements = Array.from(elements).filter(element => {
          return !element.closest('nav, header, aside, [role="navigation"]');
        });
        
        if (validElements.length > 0) {
          foundReels = validElements;
          workingSelector = selector;
          console.log(`[IG Reel Tracker] Found ${foundReels.length} potential reels using selector: ${selector}`);
          break;
        }
      }
    } catch (selectorError) {
      console.warn(`[IG Reel Tracker] Selector failed: ${selector}`, selectorError);
      continue;
    }
  }
  
  if (foundReels.length === 0) {
    console.log('[IG Reel Tracker] No reel elements found with any strategy');
  }
  
  return foundReels;
}

/**
 * Validate element before processing as reel
 * @param {Element} element - Element to validate
 * @returns {boolean} True if element is valid for processing
 */
function validateReelElement(element) {
  try {
    if (!element || !element.getBoundingClientRect) {
      console.log('[IG Reel Tracker] Element validation failed: invalid element');
      return false;
    }
    
    // Check if element is visible and reasonably sized
    const rect = element.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) {
      console.log('[IG Reel Tracker] Element validation failed: too small', rect.width, 'x', rect.height);
      return false;
    }
    
    // Verify it's not in navigation/header/sidebar
    if (element.closest('nav, header, aside, [role="navigation"], [role="banner"]')) {
      console.log('[IG Reel Tracker] Element validation failed: in navigation/header area');
      return false;
    }
    
    // Verify it's within the messages container
    const messagesContainer = findMessagesContainer();
    if (messagesContainer && !messagesContainer.contains(element)) {
      console.log('[IG Reel Tracker] Element validation failed: not within messages container');
      return false;
    }
    
    console.log('[IG Reel Tracker] Element validation passed');
    return true;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error validating reel element:', error);
    return false;
  }
}

/**
 * Extract reel messages from the current conversation
 * @returns {Array} Array of reel message objects
 */
function extractReelMessages() {
  console.log('[IG Reel Tracker] Starting reel message extraction...');
  
  const reelMessages = [];
  const processedElements = new Set(); // Track processed elements to avoid duplicates
  
  try {
    // Use the new optimized reel detection function
    const reelElements = detectReelsInConversation();
    
    if (reelElements.length === 0) {
      console.log('[IG Reel Tracker] No reel elements found with any strategy');
      return reelMessages;
    }
    
    console.log(`[IG Reel Tracker] Total reel elements found: ${reelElements.length}`);
    
    // Process each reel element with validation
    reelElements.forEach((reelElement, index) => {
      try {
        console.log(`[IG Reel Tracker] Processing reel element ${index + 1}/${reelElements.length}:`, reelElement.tagName);
        
        // Validate element before processing
        if (!validateReelElement(reelElement)) {
          console.log(`[IG Reel Tracker] Skipping invalid reel element ${index + 1}`);
          return;
        }
        
        // Check for duplicates
        const elementKey = reelElement.outerHTML || reelElement.href || `element_${index}`;
        if (processedElements.has(elementKey)) {
          console.log(`[IG Reel Tracker] Skipping duplicate reel element ${index + 1}`);
          return;
        }
        processedElements.add(elementKey);
        
        const reelData = extractReelData(reelElement);
        if (reelData) {
          reelMessages.push(reelData);
          console.log(`[IG Reel Tracker] Successfully extracted reel: {id: "${reelData.id}", hasReaction: ${reelData.hasReaction}}`);
        }
      } catch (error) {
        console.error(`[IG Reel Tracker] Error processing reel element ${index + 1}:`, error);
      }
    });
    
    console.log(`[IG Reel Tracker] Reel extraction complete. Found ${reelMessages.length} valid reel messages`);
    
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
 * @param {Element} reelElement - The reel DOM element
 * @returns {Object|null} Reel data object or null if extraction fails
 */
function extractReelData(reelElement) {
  try {
    console.log('[IG Reel Tracker] Extracting data from reel element:', reelElement.tagName);
    
    // Extract reel ID using the improved function
    const reelId = extractReelId(reelElement);
    if (!reelId) {
      console.warn('[IG Reel Tracker] Could not extract reel ID from element');
      return null;
    }
    
    console.log('[IG Reel Tracker] Extracted reel ID:', reelId);
    
    // Get reel URL if available
    let reelUrl = reelElement.href || reelElement.getAttribute('href');
    if (!reelUrl) {
      // Try to get from video element
      const videoElement = reelElement.tagName === 'VIDEO' ? reelElement : reelElement.querySelector('video');
      if (videoElement) {
        reelUrl = videoElement.src || videoElement.getAttribute('src');
      }
    }
    
    // Find the message container (parent element that contains the reel)
    const messageContainer = findMessageContainer(reelElement);
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
    
    // Enhanced reel data model with proper ID
    const reelData = {
      id: reelId, // Use the extracted/generated reel ID
      timestamp: timestamp,
      hasReaction: hasReaction,
      reelUrl: reelUrl || null, // URL if available
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
 * Extract reel ID from element or URL with multiple strategies
 * @param {Element|string} elementOrUrl - The reel element or URL
 * @returns {string|null} The reel ID or null if not found
 */
function extractReelId(elementOrUrl) {
  try {
    let reelId = null;
    
    // Handle element input
    if (typeof elementOrUrl === 'object' && elementOrUrl.nodeType === Node.ELEMENT_NODE) {
      const element = elementOrUrl;
      console.log('[IG Reel Tracker] Extracting reel ID from element:', element.tagName);
      
      // Strategy 1: Extract from href attributes
      const href = element.href || element.getAttribute('href');
      if (href) {
        reelId = extractReelIdFromUrl(href);
        if (reelId) {
          console.log('[IG Reel Tracker] Extracted reel ID from href:', reelId);
          return reelId;
        }
      }
      
      // Strategy 2: Extract from video source URLs
      const videoElement = element.tagName === 'VIDEO' ? element : element.querySelector('video');
      if (videoElement) {
        const src = videoElement.src || videoElement.getAttribute('src');
        if (src) {
          reelId = extractReelIdFromUrl(src);
          if (reelId) {
            console.log('[IG Reel Tracker] Extracted reel ID from video src:', reelId);
            return reelId;
          }
        }
      }
      
      // Strategy 3: Extract from thumbnail image URLs
      const imgElement = element.tagName === 'IMG' ? element : element.querySelector('img');
      if (imgElement) {
        const src = imgElement.src || imgElement.getAttribute('src');
        if (src) {
          reelId = extractReelIdFromUrl(src);
          if (reelId) {
            console.log('[IG Reel Tracker] Extracted reel ID from image src:', reelId);
            return reelId;
          }
        }
      }
      
      // Strategy 4: Generate based on message position + timestamp (avoid same fallback pattern)
      const messageContainer = findMessageContainer(element);
      if (messageContainer) {
        const messageIndex = Array.from(messageContainer.parentElement.children).indexOf(messageContainer);
        const timestamp = Date.now().toString().slice(-8); // Last 8 digits
        reelId = `msg_${messageIndex}_${timestamp}`;
        console.log('[IG Reel Tracker] Generated contextual reel ID:', reelId);
        return reelId;
      }
      
      // Last resort: Generate completely unique ID
      reelId = `unknown_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log('[IG Reel Tracker] Generated fallback reel ID:', reelId);
      return reelId;
    }
    
    // Handle URL string input
    if (typeof elementOrUrl === 'string') {
      return extractReelIdFromUrl(elementOrUrl);
    }
    
    console.warn('[IG Reel Tracker] Invalid input for reel ID extraction:', elementOrUrl);
    return null;
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error extracting reel ID:', error);
    return `error_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    
    if (!url || typeof url !== 'string') {
      console.warn('[IG Reel Tracker] Invalid URL provided:', url);
      return null;
    }
    
    // Handle different URL formats
    const urlPatterns = [
      /\/reel\/([A-Za-z0-9_-]+)/,  // /reel/ABC123_xyz/
      /\/reels\/([A-Za-z0-9_-]+)/, // /reels/ABC123_xyz/
      /reel=([A-Za-z0-9_-]+)/,     // URL parameter format
      /video_id=([A-Za-z0-9_-]+)/,  // Video ID parameter
      /media_id=([A-Za-z0-9_-]+)/   // Media ID parameter
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length > 3) { // Ensure ID is meaningful length
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
 * Find the message container that contains the reel (walks UP the DOM tree)
 * @param {Element} reelElement - The reel element
 * @returns {Element|null} The message container or null if not found
 */
function findMessageContainer(reelElement) {
  try {
    console.log('[IG Reel Tracker] Finding message container for reel element, walking up DOM tree');
    
    if (!reelElement || !reelElement.parentElement) {
      console.warn('[IG Reel Tracker] Invalid reel element provided');
      return null;
    }
    
    // Instagram message container patterns (walking up from reel element)
    const containerSelectors = [
      // Instagram's primary message patterns
      '[role="row"]',              // Individual message rows
      '[role="button"]',           // Clickable message bubbles
      'div[style*="padding"][style*="margin"]', // Styled message containers
      
      // Common message container patterns
      '[role="listitem"]',
      '[data-testid*="message"]',
      '[class*="message"]',
      '.conversation-item',
      '.chat-item'
    ];
    
    let currentElement = reelElement;
    let depth = 0;
    const maxDepth = 8; // Reasonable depth for message structure
    
    // Walk UP the DOM tree to find the message bubble/container
    while (currentElement && currentElement !== document.body && depth < maxDepth) {
      const elementInfo = `${currentElement.tagName}${currentElement.className ? '.' + currentElement.className.split(' ')[0] : ''}`;
      console.log(`[IG Reel Tracker] Checking element at depth ${depth}: ${elementInfo}`);
      
      // Skip the reel element itself on first iteration
      if (depth > 0) {
        // Check if current element matches any container selector
        for (const selector of containerSelectors) {
          try {
            if (currentElement.matches(selector)) {
              // Verify this is actually a message container by checking its size
              const rect = currentElement.getBoundingClientRect();
              if (rect.width > 50 && rect.height > 20) {
                console.log('[IG Reel Tracker] Found message container with selector:', selector);
                console.log('[IG Reel Tracker] Container dimensions:', rect.width, 'x', rect.height);
                return currentElement;
              }
            }
          } catch (selectorError) {
            continue; // Skip invalid selectors
          }
        }
        
        // Check for Instagram-specific message container characteristics
        const hasMessageRole = currentElement.getAttribute('role') === 'row' || 
                              currentElement.getAttribute('role') === 'button';
        const hasMessageStyle = currentElement.style.padding || 
                               currentElement.style.margin ||
                               currentElement.style.backgroundColor;
        const hasMessageClass = currentElement.className && 
                               (currentElement.className.includes('message') ||
                                currentElement.className.includes('bubble') ||
                                currentElement.className.includes('chat'));
        
        if (hasMessageRole || hasMessageStyle || hasMessageClass) {
          const rect = currentElement.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 20) {
            console.log('[IG Reel Tracker] Found message container by characteristics:', elementInfo);
            return currentElement;
          }
        }
      }
      
      currentElement = currentElement.parentElement;
      depth++;
    }
    
    // Fallback: use the closest parent that seems like a reasonable message container
    if (reelElement.parentElement) {
      let fallbackElement = reelElement.parentElement;
      let fallbackDepth = 0;
      
      while (fallbackElement && fallbackElement !== document.body && fallbackDepth < 3) {
        const rect = fallbackElement.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 40) { // Reasonable message size
          console.log('[IG Reel Tracker] Using fallback message container at depth:', fallbackDepth);
          return fallbackElement;
        }
        fallbackElement = fallbackElement.parentElement;
        fallbackDepth++;
      }
    }
    
    console.warn('[IG Reel Tracker] Could not find suitable message container');
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
 * Detect if message has emoji reactions (improved for message bubbles)
 * @param {Element} messageContainer - The message container element
 * @returns {boolean} True if emoji reactions are present
 */
function detectEmojiReactions(messageContainer) {
  try {
    console.log('[IG Reel Tracker] Checking for emoji reactions in message bubble and surrounding areas');
    
    if (!messageContainer) {
      console.warn('[IG Reel Tracker] No message container provided for reaction detection');
      return false;
    }
    
    // Multiple search areas (message bubble + siblings)
    const searchAreas = [
      messageContainer,                    // The message itself
      messageContainer.parentElement,      // Parent container
      messageContainer.nextElementSibling, // Next sibling (reactions often appear after)
      messageContainer.previousElementSibling // Previous sibling
    ].filter(Boolean); // Remove null elements
    
    // Instagram reaction patterns for DM messages
    const reactionSelectors = [
      // Heart icons (both SVG and emoji)
      'svg[aria-label*="heart" i]',
      'svg[aria-label*="like" i]',
      '[data-testid*="heart"]',
      
      // Emoji reactions
      'span[role="img"]',
      '[class*="emoji"]',
      '[class*="reaction"]',
      
      // Text indicators
      '[aria-label*="liked" i]',
      '[title*="liked" i]',
      
      // Reaction containers
      '[data-testid*="reaction"]',
      '.reaction-button',
      '.message-reaction'
    ];
    
    // Common emoji patterns in text content
    const emojiPatterns = [
      /❤️|♥️|💖|💕|💗/, // Hearts
      /👍|👏|🙌/,        // Likes
      /😂|🤣|😆/,        // Laughs
      /🔥|💯|✨/         // Fire/100/sparkle
    ];
    
    // Search each area for reactions
    for (const area of searchAreas) {
      try {
        // Check for reaction elements
        for (const selector of reactionSelectors) {
          const reactionElements = area.querySelectorAll(selector);
          if (reactionElements.length > 0) {
            console.log(`[IG Reel Tracker] Found reaction elements with selector: ${selector}`);
            return true;
          }
        }
        
        // Check for emoji patterns in text content
        const textContent = area.textContent || '';
        for (const pattern of emojiPatterns) {
          if (pattern.test(textContent)) {
            console.log('[IG Reel Tracker] Found emoji reaction in text content');
            return true;
          }
        }
        
        // Check for small overlaid elements on message bubbles (reaction indicators)
        const smallElements = area.querySelectorAll('div, span');
        for (const element of smallElements) {
          const rect = element.getBoundingClientRect();
          if (rect.width > 10 && rect.width < 40 && rect.height > 10 && rect.height < 40) {
            const hasReactionContent = element.textContent && 
                                      (element.textContent.includes('❤') ||
                                       element.textContent.includes('👍') ||
                                       element.textContent.includes('Liked'));
            if (hasReactionContent) {
              console.log('[IG Reel Tracker] Found small reaction indicator element');
              return true;
            }
          }
        }
        
      } catch (areaError) {
        console.warn('[IG Reel Tracker] Error checking area for reactions:', areaError);
        continue;
      }
    }
    
    console.log('[IG Reel Tracker] No reactions detected in any search area');
    return false;
    
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
      // Validate element first
      if (!validateReelElement(reelElement)) {
        return;
      }
      
      const reelId = extractReelId(reelElement);
      
      if (reelId && !processedReels.has(reelId)) {
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
    } else {
      console.log('[IG Reel Tracker] No new reels found during scan');
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
      
      // Process each found reel with validation
      foundReels.forEach((reelElement, index) => {
        try {
          console.log(`[IG Reel Tracker] Processing reel element ${index + 1}/${foundReels.length}`);
          
          // Validate element before processing
          if (!validateReelElement(reelElement)) {
            console.log(`[IG Reel Tracker] Skipping invalid reel element ${index + 1}`);
            return;
          }
          
          // Extract reel ID using improved function
          const reelId = extractReelId(reelElement);
          
          if (!reelId) {
            console.warn(`[IG Reel Tracker] Could not extract reel ID from element ${index + 1}`);
            return;
          }
          
          // Check if already detected to avoid duplicates
          if (detectedReelsMap.has(reelId)) {
            console.log(`[IG Reel Tracker] Reel ${reelId} already detected, skipping`);
            return;
          }
          
          // Find message container for reaction detection
          const messageContainer = findMessageContainer(reelElement);
          if (!messageContainer) {
            console.warn(`[IG Reel Tracker] No message container found for reel ${reelId}`);
            return;
          }
          
          // Detect emoji reactions for this reel
          console.log(`[IG Reel Tracker] Detecting reactions for reel ${reelId}...`);
          const hasReaction = detectEmojiReactions(messageContainer);
          console.log(`[IG Reel Tracker] Reaction detection result for ${reelId}: ${hasReaction}`);
          
          // Get reel URL if available
          const reelUrl = reelElement.href || reelElement.getAttribute('href') || null;
          
          // Create enhanced reel data structure
          const reelData = {
            reelId: reelId,
            timestamp: Date.now(),
            domElement: reelElement,
            selector: workingSelector,
            extractionMethod: 'DOM_MUTATION',
            hasReaction: hasReaction,
            reelUrl: reelUrl
          };
          
          // Store in Map to avoid duplicates
          detectedReelsMap.set(reelId, reelData);
          
          // Enhanced console output
          if (hasReaction) {
            console.log(`[IG Reel Tracker] Reel detected: {id: "${reelId}", url: "${reelUrl || 'N/A'}"}`);
            console.log(`[IG Reel Tracker] Reaction detected: heart emoji found`);
          } else {
            console.log(`[IG Reel Tracker] Reel detected: {id: "${reelId}", url: "${reelUrl || 'N/A'}"}`);
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
  },
  
  // =============================================================================
  // DEBUG HELPERS
  // =============================================================================
  
  /**
   * Manual inspection of the messages container and its contents
   * Highlights messages container and provides detailed analysis
   * @returns {Object} Summary object with counts and analysis
   */
  inspectMessages: () => {
    try {
      console.info('%c[IG Reel Tracker Debug] Starting message container inspection...', 'color: #4285f4; font-weight: bold');
      
      // Clear any existing highlights
      document.querySelectorAll('[data-ig-debug-highlight]').forEach(el => {
        el.style.border = '';
        el.removeAttribute('data-ig-debug-highlight');
      });
      
      // Find messages container
      const messagesContainer = findMessagesContainer();
      const summary = {
        messagesContainerFound: !!messagesContainer,
        messagesContainerSelector: null,
        messageElementsCount: 0,
        videoElementsCount: 0,
        reelElementsCount: 0,
        workingSelectors: [],
        failedSelectors: []
      };
      
      if (!messagesContainer) {
        console.warn('%c[IG Debug] ❌ Messages container not found!', 'color: #ea4335; font-weight: bold');
        console.info('%c[IG Debug] Try navigating to a DM conversation first', 'color: #fbbc04');
        return summary;
      }
      
      // Highlight messages container with red border
      messagesContainer.style.border = '3px solid #ea4335';
      messagesContainer.setAttribute('data-ig-debug-highlight', 'messages-container');
      
      console.info('%c[IG Debug] ✅ Messages container found and highlighted (red border)', 'color: #34a853; font-weight: bold');
      
      // Count message elements
      const messageElements = messagesContainer.querySelectorAll('[role="row"], div[style*="flex"], div[style*="padding"]');
      summary.messageElementsCount = messageElements.length;
      
      // Count video elements
      const videoElements = messagesContainer.querySelectorAll('video');
      summary.videoElementsCount = videoElements.length;
      
      // Test reel detection selectors
      const reelSelectors = [
        'a[href*="/reel/"]',
        'a[href*="/reels/"]', 
        'a[href*="instagram.com/reel"]',
        'div[role="row"] video',
        'div[role="button"]:has(video)',
        '[role="button"] video',
        'div[style*="aspect-ratio"] video',
        'video[src*="instagram"]',
        'video[src*="cdninstagram"]'
      ];
      
      let totalReelElements = 0;
      reelSelectors.forEach(selector => {
        try {
          const elements = messagesContainer.querySelectorAll(selector);
          if (elements.length > 0) {
            summary.workingSelectors.push({ selector, count: elements.length });
            totalReelElements += elements.length;
          } else {
            summary.failedSelectors.push(selector);
          }
        } catch (error) {
          summary.failedSelectors.push(`${selector} (ERROR: ${error.message})`);
        }
      });
      
      summary.reelElementsCount = totalReelElements;
      
      // Console output with color coding
      console.info('%c[IG Debug] 📊 INSPECTION SUMMARY:', 'color: #4285f4; font-weight: bold; font-size: 14px');
      console.info(`%c  📁 Messages container: FOUND`, 'color: #34a853');
      console.info(`%c  📝 Message elements: ${summary.messageElementsCount}`, 'color: #4285f4');
      console.info(`%c  🎥 Video elements: ${summary.videoElementsCount}`, 'color: #4285f4');
      console.info(`%c  🎯 Reel elements: ${summary.reelElementsCount}`, 'color: #4285f4');
      
      if (summary.workingSelectors.length > 0) {
        console.info('%c  ✅ Working selectors:', 'color: #34a853');
        summary.workingSelectors.forEach(({ selector, count }) => {
          console.info(`%c    - ${selector}: ${count} elements`, 'color: #34a853');
        });
      }
      
      if (summary.failedSelectors.length > 0) {
        console.warn('%c  ❌ Failed selectors:', 'color: #ea4335');
        summary.failedSelectors.forEach(selector => {
          console.warn(`%c    - ${selector}`, 'color: #ea4335');
        });
      }
      
      console.info('%c[IG Debug] 💡 The messages container is highlighted with a red border', 'color: #fbbc04');
      console.info('%c[IG Debug] 💡 Use window.igReelTracker.highlightReels() to see detected reels', 'color: #fbbc04');
      
      return summary;
      
    } catch (error) {
      console.error('[IG Debug] Error during inspection:', error);
      return { error: error.message };
    }
  },
  
  /**
   * Visual highlighting of all detected reel elements
   * Green border for reels, yellow border for reels with reactions
   * @param {boolean} toggle - Toggle highlighting on/off
   * @returns {Object} Summary of highlighted elements
   */
  highlightReels: (toggle = true) => {
    try {
      const summary = {
        reelsHighlighted: 0,
        reelsWithReactions: 0,
        reelsWithoutReactions: 0
      };
      
      if (!toggle) {
        // Remove existing highlights
        document.querySelectorAll('[data-ig-debug-reel-highlight]').forEach(el => {
          el.style.border = '';
          el.style.position = '';
          el.removeAttribute('data-ig-debug-reel-highlight');
          el.removeAttribute('title');
        });
        console.info('%c[IG Debug] 🎨 Reel highlighting removed', 'color: #4285f4');
        return summary;
      }
      
      console.info('%c[IG Reel Tracker Debug] Starting visual reel highlighting...', 'color: #4285f4; font-weight: bold');
      
      // Find messages container
      const messagesContainer = findMessagesContainer();
      if (!messagesContainer) {
        console.warn('%c[IG Debug] ❌ No messages container found. Cannot highlight reels.', 'color: #ea4335');
        return summary;
      }
      
      // Use the same detection logic as the main function
      const reelElements = detectReelsInConversation();
      
      if (reelElements.length === 0) {
        console.warn('%c[IG Debug] ❌ No reel elements found to highlight', 'color: #ea4335');
        return summary;
      }
      
      console.info(`%c[IG Debug] 🎯 Found ${reelElements.length} reel elements to highlight`, 'color: #4285f4');
      
      reelElements.forEach((reelElement, index) => {
        try {
          // Validate element
          if (!validateReelElement(reelElement)) {
            return;
          }
          
          const reelId = extractReelId(reelElement);
          const messageContainer = findMessageContainer(reelElement);
          const hasReaction = messageContainer ? detectEmojiReactions(messageContainer) : false;
          
          // Apply highlighting
          if (hasReaction) {
            reelElement.style.border = '3px solid #fbbc04'; // Yellow for reactions
            reelElement.setAttribute('title', `Reel ID: ${reelId} (HAS REACTIONS)`);
            summary.reelsWithReactions++;
          } else {
            reelElement.style.border = '3px solid #34a853'; // Green for regular reels
            reelElement.setAttribute('title', `Reel ID: ${reelId}`);
            summary.reelsWithoutReactions++;
          }
          
          reelElement.setAttribute('data-ig-debug-reel-highlight', 'true');
          summary.reelsHighlighted++;
          
        } catch (elementError) {
          console.error(`[IG Debug] Error highlighting reel ${index + 1}:`, elementError);
        }
      });
      
      // Console output with color coding
      console.info('%c[IG Debug] 🎨 HIGHLIGHTING COMPLETE:', 'color: #4285f4; font-weight: bold; font-size: 14px');
      console.info(`%c  🟢 Reels highlighted: ${summary.reelsHighlighted}`, 'color: #34a853');
      console.info(`%c  🟡 Reels with reactions: ${summary.reelsWithReactions}`, 'color: #fbbc04');
      console.info(`%c  🟢 Reels without reactions: ${summary.reelsWithoutReactions}`, 'color: #34a853');
      console.info('%c  💡 Green border = reel, Yellow border = reel with reactions', 'color: #4285f4');
      console.info('%c  💡 Hover over highlighted elements to see reel IDs', 'color: #4285f4');
      console.info('%c  💡 Use window.igReelTracker.highlightReels(false) to remove highlights', 'color: #4285f4');
      
      return summary;
      
    } catch (error) {
      console.error('[IG Debug] Error during highlighting:', error);
      return { error: error.message };
    }
  },
  
  /**
   * Test a specific selector within the messages container
   * @param {string} selector - CSS selector to test
   * @returns {Object} Results of selector test
   */
  testSelector: (selector) => {
    try {
      console.info(`%c[IG Reel Tracker Debug] Testing selector: ${selector}`, 'color: #4285f4; font-weight: bold');
      
      if (!selector || typeof selector !== 'string') {
        console.error('%c[IG Debug] ❌ Invalid selector provided', 'color: #ea4335');
        return { error: 'Invalid selector' };
      }
      
      // Find messages container
      const messagesContainer = findMessagesContainer();
      if (!messagesContainer) {
        console.warn('%c[IG Debug] ❌ No messages container found', 'color: #ea4335');
        return { messagesContainerFound: false, elements: [] };
      }
      
      const results = {
        selector: selector,
        messagesContainerFound: true,
        elementsFound: 0,
        elements: [],
        validElements: 0,
        invalidElements: 0
      };
      
      try {
        // Test selector within messages container
        const elements = messagesContainer.querySelectorAll(selector);
        results.elementsFound = elements.length;
        
        if (elements.length === 0) {
          console.warn(`%c[IG Debug] ❌ Selector found 0 elements`, 'color: #ea4335');
          return results;
        }
        
        console.info(`%c[IG Debug] ✅ Selector found ${elements.length} elements`, 'color: #34a853');
        
        // Analyze each found element
        Array.from(elements).forEach((element, index) => {
          try {
            const isValid = validateReelElement(element);
            const elementInfo = {
              index: index + 1,
              tagName: element.tagName,
              className: element.className || '(no class)',
              href: element.href || element.getAttribute('href') || '(no href)',
              isValid: isValid,
              dimensions: {
                width: element.getBoundingClientRect().width,
                height: element.getBoundingClientRect().height
              }
            };
            
            results.elements.push(elementInfo);
            
            if (isValid) {
              results.validElements++;
            } else {
              results.invalidElements++;
            }
            
            // Log element details
            const validText = isValid ? '✅ VALID' : '❌ INVALID';
            const color = isValid ? '#34a853' : '#ea4335';
            console.info(`%c[IG Debug]   ${index + 1}. ${elementInfo.tagName} - ${validText}`, `color: ${color}`);
            console.info(`%c[IG Debug]      Class: ${elementInfo.className}`, 'color: #4285f4');
            console.info(`%c[IG Debug]      Href: ${elementInfo.href}`, 'color: #4285f4');
            console.info(`%c[IG Debug]      Size: ${elementInfo.dimensions.width}x${elementInfo.dimensions.height}px`, 'color: #4285f4');
            
          } catch (elementError) {
            console.error(`[IG Debug] Error analyzing element ${index + 1}:`, elementError);
          }
        });
        
        // Summary
        console.info('%c[IG Debug] 📊 SELECTOR TEST SUMMARY:', 'color: #4285f4; font-weight: bold; font-size: 14px');
        console.info(`%c  🎯 Selector: ${selector}`, 'color: #4285f4');
        console.info(`%c  📊 Total elements: ${results.elementsFound}`, 'color: #4285f4');
        console.info(`%c  ✅ Valid elements: ${results.validElements}`, 'color: #34a853');
        console.info(`%c  ❌ Invalid elements: ${results.invalidElements}`, 'color: #ea4335');
        
        return results;
        
      } catch (selectorError) {
        console.error(`%c[IG Debug] ❌ Selector error: ${selectorError.message}`, 'color: #ea4335');
        return { ...results, error: selectorError.message };
      }
      
    } catch (error) {
      console.error('[IG Debug] Error testing selector:', error);
      return { error: error.message };
    }
  }
};

console.log('[IG Reel Tracker] Global functions available:');
console.log('[IG Reel Tracker] - window.igReelTracker.initialize() - Manual initialization');
console.log('[IG Reel Tracker] - window.igReelTracker.detectReels() - Detect reels (requires initialization)');
console.log('[IG Reel Tracker] - window.igReelTracker.getReelData() - Get stored reel data');
console.log('[IG Reel Tracker] - window.igReelTracker.isOnDMPage() - Check if on Instagram DM page');
console.log('[IG Reel Tracker] - window.igReelTracker.isInitialized() - Check initialization status');
console.log('');
console.log('%c[IG Reel Tracker] 🛠️  DEBUG FUNCTIONS AVAILABLE:', 'color: #4285f4; font-weight: bold');
console.log('%c[IG Debug] - window.igReelTracker.inspectMessages() - Inspect messages container', 'color: #4285f4');
console.log('%c[IG Debug] - window.igReelTracker.highlightReels() - Visually highlight detected reels', 'color: #4285f4');
console.log('%c[IG Debug] - window.igReelTracker.testSelector("selector") - Test a specific CSS selector', 'color: #4285f4');
console.log('%c[IG Debug] - window.igReelTracker.highlightReels(false) - Remove highlights', 'color: #4285f4');
console.log('');
console.log('%c[IG Debug] 💡 USAGE EXAMPLES:', 'color: #fbbc04; font-weight: bold');
console.log('%c[IG Debug]   window.igReelTracker.inspectMessages()', 'color: #fbbc04');
console.log('%c[IG Debug]   window.igReelTracker.highlightReels()', 'color: #fbbc04');
console.log('%c[IG Debug]   window.igReelTracker.testSelector(\'a[href*="/reel/"]\')  ', 'color: #fbbc04');

// =============================================================================
// EMERGENCY DOM INVESTIGATION TOOLS
// =============================================================================

/**
 * Emergency diagnostic function to analyze ALL messages in the container
 * Provides detailed analysis of each child element to understand DOM structure
 * @returns {Object} Comprehensive analysis results
 */
window.igReelTracker.analyzeMessages = () => {
  try {
    console.info('%c[IG EMERGENCY DIAGNOSTIC] 🚨 Starting comprehensive message analysis...', 'color: #ea4335; font-weight: bold; font-size: 16px');
    
    const messagesContainer = findMessagesContainer();
    if (!messagesContainer) {
      console.error('%c[IG EMERGENCY] ❌ Messages container not found!', 'color: #ea4335; font-weight: bold');
      return { error: 'Messages container not found' };
    }
    
    console.info(`%c[IG EMERGENCY] ✅ Messages container found with ${messagesContainer.children.length} child elements`, 'color: #34a853; font-weight: bold');
    
    const analysis = {
      containerInfo: {
        tagName: messagesContainer.tagName,
        className: messagesContainer.className || '(no class)',
        role: messagesContainer.getAttribute('role') || '(no role)',
        childCount: messagesContainer.children.length,
        selector: getElementSelector(messagesContainer)
      },
      messages: [],
      summary: {
        textMessages: 0,
        mediaMessages: 0,
        reelMessages: 0,
        unknownMessages: 0
      }
    };
    
    // Analyze each child element
    Array.from(messagesContainer.children).forEach((child, index) => {
      console.log(`\n%c[IG EMERGENCY] 🔍 Analyzing Message #${index + 1}:`, 'color: #4285f4; font-weight: bold');
      
      const messageAnalysis = analyzeMessageElement(child, index + 1);
      analysis.messages.push(messageAnalysis);
      
      // Update summary counts
      if (messageAnalysis.type === 'text') analysis.summary.textMessages++;
      else if (messageAnalysis.type === 'media') analysis.summary.mediaMessages++;
      else if (messageAnalysis.type === 'reel') analysis.summary.reelMessages++;
      else analysis.summary.unknownMessages++;
    });
    
    // Log comprehensive summary
    console.log('\n%c[IG EMERGENCY] 📊 COMPREHENSIVE ANALYSIS SUMMARY:', 'color: #ea4335; font-weight: bold; font-size: 16px');
    console.log('%c' + '='.repeat(80), 'color: #ea4335');
    console.log(`%cContainer: ${analysis.containerInfo.tagName}${analysis.containerInfo.className ? '.' + analysis.containerInfo.className : ''}`, 'color: #4285f4');
    console.log(`%cRole: ${analysis.containerInfo.role}`, 'color: #4285f4');
    console.log(`%cTotal Messages: ${analysis.containerInfo.childCount}`, 'color: #4285f4');
    console.log(`%cText Messages: ${analysis.summary.textMessages}`, 'color: #34a853');
    console.log(`%cMedia Messages: ${analysis.summary.mediaMessages}`, 'color: #fbbc04');
    console.log(`%cReel Messages: ${analysis.summary.reelMessages}`, 'color: #ea4335');
    console.log(`%cUnknown Messages: ${analysis.summary.unknownMessages}`, 'color: #999');
    console.log('%c' + '='.repeat(80), 'color: #ea4335');
    
    if (analysis.summary.reelMessages === 0) {
      console.error('%c[IG EMERGENCY] 🚨 CRITICAL ISSUE: ZERO reels detected despite reels being present!', 'color: #ea4335; font-weight: bold; font-size: 16px');
      console.error('%c[IG EMERGENCY] 🚨 Current selectors are NOT matching Instagram\'s actual DOM structure', 'color: #ea4335; font-weight: bold');
      console.info('%c[IG EMERGENCY] 💡 Next step: Run window.igReelTracker.findReelPatterns() to discover working selectors', 'color: #fbbc04; font-weight: bold');
    }
    
    return analysis;
    
  } catch (error) {
    console.error('[IG EMERGENCY] Error during message analysis:', error);
    return { error: error.message };
  }
};

/**
 * Analyze a single message element in detail
 * @param {Element} element - The message element to analyze
 * @param {number} messageNumber - The message number for logging
 * @returns {Object} Detailed analysis of the message
 */
function analyzeMessageElement(element, messageNumber) {
  try {
    const analysis = {
      messageNumber: messageNumber,
      tagName: element.tagName,
      className: element.className || '(no class)',
      role: element.getAttribute('role') || '(no role)',
      type: 'unknown',
      containsVideo: false,
      containsLinks: [],
      containsImages: [],
      possibleReelIndicators: [],
      fullStructure: '',
      attributes: {},
      dimensions: { width: 0, height: 0 }
    };
    
    // Get dimensions
    try {
      const rect = element.getBoundingClientRect();
      analysis.dimensions = { width: rect.width, height: rect.height };
    } catch (e) {
      analysis.dimensions = { width: 'N/A', height: 'N/A' };
    }
    
    // Get all attributes
    Array.from(element.attributes).forEach(attr => {
      analysis.attributes[attr.name] = attr.value;
    });
    
    // Check for video elements
    const videoElements = element.querySelectorAll('video');
    if (videoElements.length > 0) {
      analysis.containsVideo = true;
      analysis.possibleReelIndicators.push(`Found ${videoElements.length} video element(s)`);
      analysis.type = 'reel';
    }
    
    // Check for links
    const linkElements = element.querySelectorAll('a');
    linkElements.forEach(link => {
      const href = link.href || link.getAttribute('href') || '(no href)';
      const text = link.textContent?.trim() || '(no text)';
      analysis.containsLinks.push({ href, text });
      
      // Check if this looks like a reel link
      if (href.includes('/reel/') || href.includes('/reels/') || href.includes('instagram.com/reel')) {
        analysis.possibleReelIndicators.push(`Reel link found: ${href}`);
        analysis.type = 'reel';
      }
    });
    
    // Check for images
    const imageElements = element.querySelectorAll('img');
    imageElements.forEach(img => {
      const src = img.src || img.getAttribute('src') || '(no src)';
      const alt = img.alt || '(no alt)';
      analysis.containsImages.push({ src, alt });
      
      // Check for Instagram CDN patterns
      if (src.includes('cdninstagram') || src.includes('scontent')) {
        analysis.possibleReelIndicators.push(`Instagram CDN image: ${src}`);
        if (analysis.type === 'unknown') analysis.type = 'media';
      }
    });
    
    // Check for aspect ratio indicators (video aspect ratio trick)
    const style = element.style.cssText || '';
    if (style.includes('aspect-ratio') || style.includes('padding-bottom')) {
      analysis.possibleReelIndicators.push('Aspect ratio styling detected (possible video)');
      if (analysis.type === 'unknown') analysis.type = 'media';
    }
    
    // Check for background images
    const backgroundImage = element.style.backgroundImage || '';
    if (backgroundImage && backgroundImage !== 'none') {
      analysis.possibleReelIndicators.push(`Background image: ${backgroundImage}`);
      if (analysis.type === 'unknown') analysis.type = 'media';
    }
    
    // Check for play button indicators
    const playButtons = element.querySelectorAll('svg[aria-label*="play" i], svg[aria-label*="video" i]');
    if (playButtons.length > 0) {
      analysis.possibleReelIndicators.push(`Found ${playButtons.length} play button(s)`);
      if (analysis.type === 'unknown') analysis.type = 'reel';
    }
    
    // Check for Instagram-specific data attributes
    const dataAttributes = ['data-bloks-name', 'data-media-id', 'data-testid'];
    dataAttributes.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        analysis.possibleReelIndicators.push(`${attr}: ${value}`);
        if (value.includes('reel') || value.includes('video') || value.includes('media')) {
          if (analysis.type === 'unknown') analysis.type = 'reel';
        }
      }
    });
    
    // Determine message type if still unknown
    if (analysis.type === 'unknown') {
      if (analysis.containsLinks.length > 0 || analysis.containsImages.length > 0) {
        analysis.type = 'media';
      } else if (element.textContent && element.textContent.trim().length > 0) {
        analysis.type = 'text';
      }
    }
    
    // Get first 200 chars of HTML structure
    try {
      analysis.fullStructure = element.outerHTML.substring(0, 200) + (element.outerHTML.length > 200 ? '...' : '');
    } catch (e) {
      analysis.fullStructure = 'Could not extract HTML structure';
    }
    
    // Log detailed analysis
    console.log(`%cMessage #${messageNumber}:`, 'color: #4285f4; font-weight: bold');
    console.log(`%c  Type: ${analysis.type.toUpperCase()}`, getTypeColor(analysis.type));
    console.log(`%c  Tag: ${analysis.tagName}`, 'color: #999');
    console.log(`%c  Class: ${analysis.className}`, 'color: #999');
    console.log(`%c  Role: ${analysis.role}`, 'color: #999');
    console.log(`%c  Size: ${analysis.dimensions.width}x${analysis.dimensions.height}px`, 'color: #999');
    console.log(`%c  Contains video: ${analysis.containsVideo ? 'YES' : 'NO'}`, analysis.containsVideo ? 'color: #34a853' : 'color: #999');
    
    if (analysis.containsLinks.length > 0) {
      console.log(`%c  Contains links: ${analysis.containsLinks.length}`, 'color: #fbbc04');
      analysis.containsLinks.forEach((link, i) => {
        console.log(`%c    ${i + 1}. ${link.href}`, 'color: #fbbc04');
      });
    }
    
    if (analysis.containsImages.length > 0) {
      console.log(`%c  Contains images: ${analysis.containsImages.length}`, 'color: #fbbc04');
      analysis.containsImages.forEach((img, i) => {
        console.log(`%c    ${i + 1}. ${img.src}`, 'color: #fbbc04');
      });
    }
    
    if (analysis.possibleReelIndicators.length > 0) {
      console.log(`%c  Possible reel indicators:`, 'color: #ea4335');
      analysis.possibleReelIndicators.forEach(indicator => {
        console.log(`%c    - ${indicator}`, 'color: #ea4335');
      });
    }
    
    console.log(`%c  Full structure: ${analysis.fullStructure}`, 'color: #999');
    
    return analysis;
    
  } catch (error) {
    console.error(`[IG EMERGENCY] Error analyzing message ${messageNumber}:`, error);
    return {
      messageNumber: messageNumber,
      type: 'error',
      error: error.message
    };
  }
}

/**
 * Get color for message type
 * @param {string} type - Message type
 * @returns {string} CSS color
 */
function getTypeColor(type) {
  switch (type) {
    case 'reel': return 'color: #ea4335; font-weight: bold';
    case 'media': return 'color: #fbbc04; font-weight: bold';
    case 'text': return 'color: #34a853; font-weight: bold';
    default: return 'color: #999';
  }
}

/**
 * Get unique selector for an element
 * @param {Element} element - Element to get selector for
 * @returns {string} Unique selector
 */
function getElementSelector(element) {
  try {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) return `${element.tagName.toLowerCase()}.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Pattern discovery function to find working reel selectors
 * Searches for ANY elements that might indicate reel content
 * @returns {Object} Detailed pattern discovery results
 */
window.igReelTracker.findReelPatterns = () => {
  try {
    console.info('%c[IG PATTERN DISCOVERY] 🔍 Starting reel pattern discovery...', 'color: #4285f4; font-weight: bold; font-size: 16px');
    
    const messagesContainer = findMessagesContainer();
    if (!messagesContainer) {
      console.error('%c[IG PATTERN] ❌ Messages container not found!', 'color: #ea4335; font-weight: bold');
      return { error: 'Messages container not found' };
    }
    
    const patterns = {
      reelTextElements: [],
      videoPatterns: [],
      instagramAttributes: [],
      clickableElements: [],
      mediaContainers: [],
      summary: {
        totalReelIndicators: 0,
        potentialSelectors: []
      }
    };
    
    // 1. Search for ANY element containing "reel" text (case insensitive)
    console.log('%c[IG PATTERN] 🔍 Searching for elements containing "reel" text...', 'color: #4285f4');
    const reelTextElements = messagesContainer.querySelectorAll('*');
    reelTextElements.forEach(element => {
      try {
        const text = element.textContent || '';
        if (text.toLowerCase().includes('reel')) {
          patterns.reelTextElements.push({
            element: element.tagName,
            text: text.substring(0, 100),
            selector: getElementSelector(element),
            path: generateDOMPath(element)
          });
        }
      } catch (e) {
        // Skip elements that can't be processed
      }
    });
    
    // 2. Search for video patterns
    console.log('%c[IG PATTERN] 🎥 Searching for video patterns...', 'color: #4285f4');
    const videoPatterns = [
      { pattern: '.mp4', elements: [] },
      { pattern: '.m3u8', elements: [] },
      { pattern: 'video/mp4', elements: [] },
      { pattern: 'cdninstagram', elements: [] },
      { pattern: 'scontent', elements: [] }
    ];
    
    videoPatterns.forEach(vp => {
      const elements = messagesContainer.querySelectorAll(`[src*="${vp.pattern}"], [href*="${vp.pattern}"], [style*="${vp.pattern}"]`);
      if (elements.length > 0) {
        vp.elements = Array.from(elements).map(el => ({
          tagName: el.tagName,
          src: el.src || el.getAttribute('src') || el.getAttribute('href') || '(no src)',
          selector: getElementSelector(el)
        }));
      }
    });
    patterns.videoPatterns = videoPatterns;
    
    // 3. Search for Instagram-specific attributes
    console.log('%c[IG PATTERN] 🏷️ Searching for Instagram-specific attributes...', 'color: #4285f4');
    const instagramAttributes = [
      'data-bloks-name',
      'data-media-id',
      'data-testid',
      'data-visualcompletion',
      'aria-label'
    ];
    
    instagramAttributes.forEach(attr => {
      const elements = messagesContainer.querySelectorAll(`[${attr}]`);
      if (elements.length > 0) {
        patterns.instagramAttributes.push({
          attribute: attr,
          elements: Array.from(elements).map(el => ({
            value: el.getAttribute(attr),
            selector: getElementSelector(el),
            tagName: el.tagName
          }))
        });
      }
    });
    
    // 4. Find all clickable elements within messages
    console.log('%c[IG PATTERN] 🖱️ Searching for clickable elements...', 'color: #4285f4');
    const clickableSelectors = [
      '[role="button"]',
      '[role="link"]',
      '[tabindex]',
      'a[href]',
      'button'
    ];
    
    clickableSelectors.forEach(selector => {
      try {
        const elements = messagesContainer.querySelectorAll(selector);
        if (elements.length > 0) {
          patterns.clickableElements.push({
            selector: selector,
            count: elements.length,
            elements: Array.from(elements).slice(0, 5).map(el => ({
              tagName: el.tagName,
              role: el.getAttribute('role') || '(no role)',
              href: el.href || el.getAttribute('href') || '(no href)',
              ariaLabel: el.getAttribute('aria-label') || '(no aria-label)'
            }))
          });
        }
      } catch (e) {
        // Skip invalid selectors
      }
    });
    
    // 5. Search for media containers with specific patterns
    console.log('%c[IG PATTERN] 📦 Searching for media containers...', 'color: #4285f4');
    const mediaContainerSelectors = [
      'div[style*="aspect-ratio"]',
      'div[style*="padding-bottom"]',
      'div[class*="video"]',
      'div[class*="media"]',
      'div[class*="reel"]',
      'div[data-testid*="media"]',
      'div[data-testid*="video"]'
    ];
    
    mediaContainerSelectors.forEach(selector => {
      try {
        const elements = messagesContainer.querySelectorAll(selector);
        if (elements.length > 0) {
          patterns.mediaContainers.push({
            selector: selector,
            count: elements.length,
            elements: Array.from(elements).slice(0, 3).map(el => ({
              tagName: el.tagName,
              className: el.className || '(no class)',
              style: el.style.cssText.substring(0, 100) || '(no style)',
              dimensions: {
                width: el.getBoundingClientRect().width,
                height: el.getBoundingClientRect().height
              }
            }))
          });
        }
      } catch (e) {
        // Skip invalid selectors
      }
    });
    
    // Calculate summary
    patterns.summary.totalReelIndicators = 
      patterns.reelTextElements.length +
      patterns.videoPatterns.reduce((sum, vp) => sum + vp.elements.length, 0) +
      patterns.instagramAttributes.reduce((sum, attr) => sum + attr.elements.length, 0);
    
    // Generate potential selectors based on findings
    patterns.summary.potentialSelectors = generatePotentialSelectors(patterns);
    
    // Log comprehensive results
    console.log('\n%c[IG PATTERN] 📊 PATTERN DISCOVERY RESULTS:', 'color: #4285f4; font-weight: bold; font-size: 16px');
    console.log('%c' + '='.repeat(80), 'color: #4285f4');
    
    console.log(`%cReel text elements: ${patterns.reelTextElements.length}`, 'color: #4285f4');
    patterns.reelTextElements.forEach((item, i) => {
      console.log(`%c  ${i + 1}. ${item.element} - "${item.text}"`, 'color: #4285f4');
    });
    
    console.log(`\n%cVideo patterns found:`, 'color: #4285f4');
    patterns.videoPatterns.forEach(vp => {
      if (vp.elements.length > 0) {
        console.log(`%c  ${vp.pattern}: ${vp.elements.length} elements`, 'color: #34a853');
        vp.elements.slice(0, 3).forEach(el => {
          console.log(`%c    - ${el.tagName} (${el.selector}): ${el.src}`, 'color: #34a853');
        });
      }
    });
    
    console.log(`\n%cInstagram attributes:`, 'color: #4285f4');
    patterns.instagramAttributes.forEach(attr => {
      if (attr.elements.length > 0) {
        console.log(`%c  ${attr.attribute}: ${attr.elements.length} elements`, 'color: #fbbc04');
        attr.elements.slice(0, 3).forEach(el => {
          console.log(`%c    - ${el.tagName} (${el.selector}): ${el.value}`, 'color: #fbbc04');
        });
      }
    });
    
    console.log(`\n%cClickable elements:`, 'color: #4285f4');
    patterns.clickableElements.forEach(clickable => {
      console.log(`%c  ${clickable.selector}: ${clickable.count} elements`, 'color: #fbbc04');
    });
    
    console.log(`\n%cMedia containers:`, 'color: #4285f4');
    patterns.mediaContainers.forEach(container => {
      console.log(`%c  ${container.selector}: ${container.count} elements`, 'color: #fbbc04');
    });
    
    console.log(`\n%cPOTENTIAL SELECTORS:`, 'color: #ea4335; font-weight: bold');
    patterns.summary.potentialSelectors.forEach((selector, i) => {
      console.log(`%c  ${i + 1}. ${selector}`, 'color: #ea4335');
    });
    
    console.log('%c' + '='.repeat(80), 'color: #4285f4');
    console.log(`%cTotal reel indicators found: ${patterns.summary.totalReelIndicators}`, 'color: #4285f4; font-weight: bold');
    console.log(`%cPotential selectors generated: ${patterns.summary.potentialSelectors.length}`, 'color: #4285f4; font-weight: bold');
    
    return patterns;
    
  } catch (error) {
    console.error('[IG PATTERN] Error during pattern discovery:', error);
    return { error: error.message };
  }
};

/**
 * Generate potential selectors based on discovered patterns
 * @param {Object} patterns - Pattern discovery results
 * @returns {Array} Array of potential CSS selectors
 */
function generatePotentialSelectors(patterns) {
  const selectors = [];
  
  try {
    // Based on video patterns
    patterns.videoPatterns.forEach(vp => {
      if (vp.elements.length > 0) {
        vp.elements.forEach(el => {
          if (el.src.includes('cdninstagram') || el.src.includes('scontent')) {
            selectors.push(`${el.tagName}[src*="cdninstagram"]`);
            selectors.push(`${el.tagName}[src*="scontent"]`);
          }
        });
      }
    });
    
    // Based on Instagram attributes
    patterns.instagramAttributes.forEach(attr => {
      if (attr.attribute === 'data-testid' && attr.elements.length > 0) {
        attr.elements.forEach(el => {
          if (el.value.includes('reel') || el.value.includes('video') || el.value.includes('media')) {
            selectors.push(`[data-testid*="${el.value.split('-')[0]}"]`);
          }
        });
      }
    });
    
    // Based on media containers
    patterns.mediaContainers.forEach(container => {
      if (container.count > 0) {
        selectors.push(container.selector);
      }
    });
    
    // Based on clickable elements with specific patterns
    patterns.clickableElements.forEach(clickable => {
      if (clickable.selector === '[role="button"]' && clickable.count > 0) {
        selectors.push('[role="button"]:has(img[src*="cdninstagram"])');
        selectors.push('[role="button"]:has(video)');
      }
    });
    
    // Common Instagram patterns
    selectors.push(
      'div[style*="aspect-ratio"]:has(img[src*="cdninstagram"])',
      'div[style*="padding-bottom"]:has(img[src*="cdninstagram"])',
      'div[role="button"]:has(div[style*="aspect-ratio"])',
      'div[class*="x1i10hfl"]:has(img[src*="scontent"])',
      'a[role="link"][href*="/reel/"]',
      'div:has(> div > div > img[alt=""])',
      '[data-visualcompletion="media-vc-image"]',
      'div:has(svg[aria-label="Play"])',
      'img[src*="cdninstagram"][style*="object-fit"]'
    );
    
    // Remove duplicates
    return [...new Set(selectors)];
    
  } catch (error) {
    console.error('[IG PATTERN] Error generating potential selectors:', error);
    return [];
  }
}

/**
 * Manual reel identification helper
 * Allows manual marking of an element as a reel for testing
 * @param {Element} element - Element to mark as reel
 * @returns {Object} Analysis results of the marked element
 */
window.igReelTracker.markAsReel = (element) => {
  try {
    if (!element) {
      console.error('%c[IG MANUAL] ❌ No element provided!', 'color: #ea4335; font-weight: bold');
      console.info('%c[IG MANUAL] 💡 Usage: Right-click on a reel message → Inspect Element → Copy element → window.igReelTracker.markAsReel(element)', 'color: #fbbc04');
      return { error: 'No element provided' };
    }
    
    console.info('%c[IG MANUAL] 🎯 Manual reel identification started...', 'color: #4285f4; font-weight: bold; font-size: 16px');
    
    // Highlight the element
    element.style.border = '4px solid #ea4335';
    element.style.boxShadow = '0 0 20px rgba(234, 67, 53, 0.5)';
    element.setAttribute('data-ig-manual-reel', 'true');
    
    const analysis = {
      element: element.tagName,
      className: element.className || '(no class)',
      role: element.getAttribute('role') || '(no role)',
      domPath: generateDOMPath(element),
      attributes: {},
      identifiers: [],
      potentialSelectors: []
    };
    
    // Extract all attributes
    Array.from(element.attributes).forEach(attr => {
      analysis.attributes[attr.name] = attr.value;
    });
    
    // Look for potential identifiers
    const identifierPatterns = [
      { attr: 'data-testid', pattern: /reel|video|media/i },
      { attr: 'data-bloks-name', pattern: /reel|video|media/i },
      { attr: 'aria-label', pattern: /reel|video|media|play/i },
      { attr: 'class', pattern: /reel|video|media/i },
      { attr: 'id', pattern: /reel|video|media/i }
    ];
    
    identifierPatterns.forEach(pattern => {
      const value = element.getAttribute(pattern.attr);
      if (value && pattern.pattern.test(value)) {
        analysis.identifiers.push(`${pattern.attr}: ${value}`);
      }
    });
    
    // Generate potential selectors for this specific element
    analysis.potentialSelectors = generateElementSelectors(element);
    
    // Log detailed analysis
    console.log('\n%c[IG MANUAL] 📊 MANUAL REEL ANALYSIS:', 'color: #4285f4; font-weight: bold; font-size: 16px');
    console.log('%c' + '='.repeat(80), 'color: #4285f4');
    console.log(`%cElement: ${analysis.element}`, 'color: #4285f4');
    console.log(`%cClass: ${analysis.className}`, 'color: #4285f4');
    console.log(`%cRole: ${analysis.role}`, 'color: #4285f4');
    console.log(`%cDOM Path: ${analysis.domPath}`, 'color: #4285f4');
    
    if (analysis.identifiers.length > 0) {
      console.log(`\n%cIdentifiers found:`, 'color: #34a853');
      analysis.identifiers.forEach(id => {
        console.log(`%c  - ${id}`, 'color: #34a853');
      });
    }
    
    console.log(`\n%cPotential selectors for this element:`, 'color: #ea4335');
    analysis.potentialSelectors.forEach((selector, i) => {
      console.log(`%c  ${i + 1}. ${selector}`, 'color: #ea4335');
    });
    
    console.log('%c' + '='.repeat(80), 'color: #4285f4');
    console.log('%c💡 Element is now highlighted with red border and shadow', 'color: #fbbc04');
    console.log('%c💡 Test selectors with: window.igReelTracker.testSelector("selector")', 'color: #fbbc04');
    
    return analysis;
    
  } catch (error) {
    console.error('[IG MANUAL] Error during manual reel identification:', error);
    return { error: error.message };
  }
};

/**
 * Generate potential selectors for a specific element
 * @param {Element} element - Element to generate selectors for
 * @returns {Array} Array of potential CSS selectors
 */
function generateElementSelectors(element) {
  const selectors = [];
  
  try {
    // Basic selectors
    if (element.id) {
      selectors.push(`#${element.id}`);
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      classes.forEach(cls => {
        if (cls.length > 0) {
          selectors.push(`${element.tagName.toLowerCase()}.${cls}`);
          selectors.push(`.${cls}`);
        }
      });
    }
    
    // Role-based selectors
    const role = element.getAttribute('role');
    if (role) {
      selectors.push(`[role="${role}"]`);
      selectors.push(`${element.tagName.toLowerCase()}[role="${role}"]`);
    }
    
    // Data attribute selectors
    const dataAttrs = ['data-testid', 'data-bloks-name', 'data-media-id'];
    dataAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selectors.push(`[${attr}="${value}"]`);
        selectors.push(`${element.tagName.toLowerCase()}[${attr}="${value}"]`);
      }
    });
    
    // Aria label selectors
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      selectors.push(`[aria-label="${ariaLabel}"]`);
      selectors.push(`${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`);
    }
    
    // Style-based selectors
    const style = element.style.cssText || '';
    if (style.includes('aspect-ratio')) {
      selectors.push(`${element.tagName.toLowerCase()}[style*="aspect-ratio"]`);
    }
    if (style.includes('padding-bottom')) {
      selectors.push(`${element.tagName.toLowerCase()}[style*="padding-bottom"]`);
    }
    
    // Parent-child relationship selectors
    if (element.parentElement) {
      const parent = element.parentElement;
      if (parent.className) {
        const parentClasses = parent.className.split(' ').filter(c => c.trim());
        parentClasses.forEach(cls => {
          if (cls.length > 0) {
            selectors.push(`.${cls} > ${element.tagName.toLowerCase()}`);
          }
        });
      }
    }
    
    // Remove duplicates and return
    return [...new Set(selectors)];
    
  } catch (error) {
    console.error('[IG MANUAL] Error generating element selectors:', error);
    return [];
  }
}

/**
 * Remove manual reel highlighting
 */
window.igReelTracker.clearManualHighlights = () => {
  try {
    const highlightedElements = document.querySelectorAll('[data-ig-manual-reel]');
    highlightedElements.forEach(el => {
      el.style.border = '';
      el.style.boxShadow = '';
      el.removeAttribute('data-ig-manual-reel');
    });
    
    console.info(`%c[IG MANUAL] 🧹 Cleared ${highlightedElements.length} manual highlights`, 'color: #4285f4');
    return { cleared: highlightedElements.length };
    
  } catch (error) {
    console.error('[IG MANUAL] Error clearing highlights:', error);
    return { error: error.message };
  }
};

// Update console help
console.log('');
console.log('%c[IG EMERGENCY] 🚨 EMERGENCY DIAGNOSTIC TOOLS AVAILABLE:', 'color: #ea4335; font-weight: bold; font-size: 14px');
console.log('%c[IG EMERGENCY] - window.igReelTracker.analyzeMessages() - Analyze ALL messages in detail', 'color: #ea4335');
console.log('%c[IG EMERGENCY] - window.igReelTracker.findReelPatterns() - Discover working reel selectors', 'color: #ea4335');
console.log('%c[IG EMERGENCY] - window.igReelTracker.markAsReel(element) - Manually mark element as reel', 'color: #ea4335');
console.log('%c[IG EMERGENCY] - window.igReelTracker.clearManualHighlights() - Clear manual highlights', 'color: #ea4335');
console.log('');
console.log('%c[IG EMERGENCY] 💡 EMERGENCY WORKFLOW:', 'color: #fbbc04; font-weight: bold');
console.log('%c[IG EMERGENCY]   1. Run window.igReelTracker.analyzeMessages() to see what\'s in the container', 'color: #fbbc04');
console.log('%c[IG EMERGENCY]   2. Run window.igReelTracker.findReelPatterns() to discover working selectors', 'color: #fbbc04');
console.log('%c[IG EMERGENCY]   3. Right-click a reel → Inspect → window.igReelTracker.markAsReel(element)', 'color: #fbbc04');
console.log('%c[IG EMERGENCY]   4. Test discovered selectors with window.igReelTracker.testSelector()', 'color: #fbbc04');

