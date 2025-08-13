/**
 * IG Reel Tracker - Content Script
 * Handles Instagram DM page detection and reel tracking
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
 * Initialize content script
 * Sets up observers and communicates with service worker
 */
async function initializeContentScript() {
  try {
    console.log('[IG Reel Tracker] Content script initializing...');
    
    if (!isInstagramDMPage()) {
      console.log('[IG Reel Tracker] Not on DM page, content script inactive');
      return;
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
      }
    } else {
      console.error('[IG Reel Tracker] Failed to connect to service worker:', response);
    }
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error initializing content script:', error);
  }
}

/**
 * Set up DOM mutation observer for Instagram content changes
 * Prepared for Phase 2 implementation
 */
function setupMutationObserver() {
  try {
    console.log('[IG Reel Tracker] Setting up mutation observer...');
    
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
    
    // Start observing Instagram content container
    const targetNode = document.body;
    if (targetNode) {
      observer.observe(targetNode, observerConfig);
      console.log('[IG Reel Tracker] Mutation observer started successfully');
    } else {
      console.warn('[IG Reel Tracker] Could not find target node for observer');
    }
    
  } catch (error) {
    console.error('[IG Reel Tracker] Error setting up mutation observer:', error);
  }
}

/**
 * Handle DOM changes detected by mutation observer
 * Placeholder for Phase 2 reel detection logic
 * @param {MutationRecord[]} mutations - Array of mutation records
 */
function handleDOMChanges(mutations) {
  try {
    // Phase 2: Implement reel detection logic here
    console.log('[IG Reel Tracker] DOM changes detected:', mutations.length, 'mutations');
    
    // Placeholder for reel detection
    // This will be implemented in Phase 2
    
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
      case 'getPageInfo':
        handleGetPageInfo(sendResponse);
        break;
        
      case 'refreshTracking':
        handleRefreshTracking(sendResponse);
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

console.log('[IG Reel Tracker] Content script loaded successfully');