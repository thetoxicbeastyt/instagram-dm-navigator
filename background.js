/**
 * Background Service Worker for Instagram DM Navigator
 * Handles context menu creation, message routing, and extension lifecycle
 */

// Context menu ID constants
const CONTEXT_MENU_ID = 'instagram-dm-navigator';

/**
 * Initialize the extension when installed
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Create context menu for Instagram pages
    await chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Navigate Instagram DMs',
      contexts: ['page'],
      documentUrlPatterns: ['*://www.instagram.com/*']
    });
    
    console.log('Instagram DM Navigator extension installed successfully');
  } catch (error) {
    console.error('Failed to create context menu:', error);
  }
});

/**
 * Handle context menu clicks
 * @param {chrome.contextMenus.OnClickData} info - Click information
 * @param {chrome.tabs.Tab} tab - Active tab information
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && tab?.url?.includes('instagram.com')) {
    try {
      // Send message to content script to activate DM navigation
      await chrome.tabs.sendMessage(tab.id, {
        action: 'activateDmNavigation',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send message to content script:', error);
    }
  }
});

/**
 * Handle messages from content script and popup
 * @param {Object} message - Message object
 * @param {chrome.runtime.MessageSender} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'getStorageData':
        handleGetStorageData(message.key, sendResponse);
        break;
      
      case 'setStorageData':
        handleSetStorageData(message.key, message.value, sendResponse);
        break;
      
      case 'logError':
        console.error('Content script error:', message.error);
        sendResponse({ success: true });
        break;
      
      default:
        console.warn('Unknown message action:', message.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // Return true to indicate async response
  return true;
});

/**
 * Handle storage get requests
 * @param {string} key - Storage key
 * @param {Function} sendResponse - Response callback
 */
async function handleGetStorageData(key, sendResponse) {
  try {
    const result = await chrome.storage.local.get(key);
    sendResponse({ success: true, data: result[key] });
  } catch (error) {
    console.error('Failed to get storage data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle storage set requests
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @param {Function} sendResponse - Response callback
 */
async function handleSetStorageData(key, value, sendResponse) {
  try {
    await chrome.storage.local.set({ [key]: value });
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to set storage data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Instagram DM Navigator extension started');
});

/**
 * Handle extension update
 */
chrome.runtime.onUpdateAvailable.addListener(() => {
  console.log('Instagram DM Navigator update available');
});