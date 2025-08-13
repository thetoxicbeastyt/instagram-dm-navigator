/**
 * IG Reel Tracker - Service Worker
 * Handles extension lifecycle events and popup communication
 */

/**
 * Initialize extension on install
 * Sets up default storage values
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    console.log('[IG Reel Tracker] Extension installed:', details.reason);
    
    // Initialize storage with default values
    await chrome.storage.local.set({
      isEnabled: true,
      lastSync: Date.now(),
      trackedReels: [],
      settings: {
        autoMark: false,
        notifications: true
      }
    });
    
    console.log('[IG Reel Tracker] Storage initialized successfully');
  } catch (error) {
    console.error('[IG Reel Tracker] Error during installation:', error);
  }
});

/**
 * Handle extension startup
 * Logs startup and verifies storage integrity
 */
chrome.runtime.onStartup.addListener(async () => {
  try {
    console.log('[IG Reel Tracker] Extension started');
    
    // Verify storage integrity
    const data = await chrome.storage.local.get(['isEnabled', 'trackedReels']);
    console.log('[IG Reel Tracker] Current storage state:', data);
  } catch (error) {
    console.error('[IG Reel Tracker] Error during startup:', error);
  }
});

/**
 * Handle messages from popup and content scripts
 * Provides communication bridge between components
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('[IG Reel Tracker] Received message:', message, 'from:', sender.tab ? 'content script' : 'popup');
    
    switch (message.action) {
      case 'getStatus':
        handleGetStatus(sendResponse);
        break;
      
      case 'toggleEnabled':
        handleToggleEnabled(sendResponse);
        break;
      
      case 'contentScriptReady':
        handleContentScriptReady(sender, sendResponse);
        break;
      
      default:
        console.warn('[IG Reel Tracker] Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // Return true to indicate async response
  return true;
});

/**
 * Get current extension status
 * @param {Function} sendResponse - Response callback
 */
async function handleGetStatus(sendResponse) {
  try {
    const data = await chrome.storage.local.get(['isEnabled', 'trackedReels', 'lastSync']);
    sendResponse({
      success: true,
      status: {
        isEnabled: data.isEnabled || false,
        reelCount: data.trackedReels ? data.trackedReels.length : 0,
        lastSync: data.lastSync || null
      }
    });
  } catch (error) {
    console.error('[IG Reel Tracker] Error getting status:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Toggle extension enabled state
 * @param {Function} sendResponse - Response callback
 */
async function handleToggleEnabled(sendResponse) {
  try {
    const { isEnabled } = await chrome.storage.local.get(['isEnabled']);
    const newState = !isEnabled;
    
    await chrome.storage.local.set({ isEnabled: newState });
    console.log('[IG Reel Tracker] Extension toggled:', newState ? 'enabled' : 'disabled');
    
    sendResponse({ success: true, isEnabled: newState });
  } catch (error) {
    console.error('[IG Reel Tracker] Error toggling enabled state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle content script ready notification
 * @param {Object} sender - Message sender info
 * @param {Function} sendResponse - Response callback
 */
async function handleContentScriptReady(sender, sendResponse) {
  try {
    console.log('[IG Reel Tracker] Content script ready on tab:', sender.tab.id);
    
    const { isEnabled } = await chrome.storage.local.get(['isEnabled']);
    sendResponse({ 
      success: true, 
      isEnabled,
      message: 'Service worker connected' 
    });
  } catch (error) {
    console.error('[IG Reel Tracker] Error handling content script ready:', error);
    sendResponse({ success: false, error: error.message });
  }
}

console.log('[IG Reel Tracker] Service worker loaded successfully');