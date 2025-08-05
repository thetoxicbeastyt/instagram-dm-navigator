/**
 * Background Service Worker for Instagram DM Time Scroll
 * Handles context menu creation and message routing
 */

const CONTEXT_MENU_ID = 'scroll-to-2-months-ago';

/**
 * Initialize the extension when installed
 */
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Create context menu for Instagram pages
    await chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Scroll to 2 months ago',
      contexts: ['page'],
      documentUrlPatterns: ['*://www.instagram.com/*']
    });
    
    console.log('Instagram DM Time Scroll extension installed successfully');
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
      // Send message to content script to start scrolling
      await chrome.tabs.sendMessage(tab.id, {
        action: 'scrollToTwoMonthsAgo',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to send message to content script:', error);
    }
  }
});

/**
 * Handle messages from content script
 * @param {Object} message - Message object
 * @param {chrome.runtime.MessageSender} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'logError':
        console.error('Content script error:', message.error);
        sendResponse({ success: true });
        break;
      
      case 'showNotification':
        // Show simple notification
        chrome.action.setBadgeText({ text: message.text || '!' });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: '' });
        }, 3000);
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
  
  return true; // Keep message channel open for async response
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Instagram DM Time Scroll extension started');
});