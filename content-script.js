/**
 * Content Script for Instagram DM Navigator
 * Handles DOM interactions, message processing, and utility module injection
 */

// Global state management
const state = {
  isActive: false,
  currentDate: null,
  scrollController: null,
  domHelpers: null,
  dateCalculator: null
};

/**
 * Initialize the content script and inject utility modules
 */
async function initialize() {
  try {
    // Inject utility modules
    await injectUtilityModules();
    
    // Initialize state
    state.scrollController = new ScrollController();
    state.domHelpers = new DomHelpers();
    state.dateCalculator = new DateCalculator();
    
    // Set up message listener
    setupMessageListener();
    
    console.log('Instagram DM Navigator content script initialized');
  } catch (error) {
    console.error('Failed to initialize content script:', error);
    logError(error);
  }
}

/**
 * Inject utility modules into the page context
 */
async function injectUtilityModules() {
  const modules = [
    { name: 'date-calculator', path: chrome.runtime.getURL('utils/date-calculator.js') },
    { name: 'dom-helpers', path: chrome.runtime.getURL('utils/dom-helpers.js') },
    { name: 'scroll-controller', path: chrome.runtime.getURL('utils/scroll-controller.js') }
  ];
  
  for (const module of modules) {
    try {
      const script = document.createElement('script');
      script.src = module.path;
      script.type = 'module';
      document.head.appendChild(script);
      
      // Wait for module to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    } catch (error) {
      console.error(`Failed to inject module ${module.name}:`, error);
      throw error;
    }
  }
}

/**
 * Set up message listener for communication with background script
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'activateDmNavigation':
          handleActivateDmNavigation(message, sendResponse);
          break;
        
        case 'setDateFilter':
          handleSetDateFilter(message, sendResponse);
          break;
        
        case 'getCurrentState':
          handleGetCurrentState(sendResponse);
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
 * Handle DM navigation activation
 * @param {Object} message - Message object
 * @param {Function} sendResponse - Response callback
 */
async function handleActivateDmNavigation(message, sendResponse) {
  try {
    if (state.isActive) {
      sendResponse({ success: false, error: 'Navigation already active' });
      return;
    }
    
    // Check if we're on Instagram
    if (!window.location.hostname.includes('instagram.com')) {
      sendResponse({ success: false, error: 'Not on Instagram' });
      return;
    }
    
    // Check if we're in DMs
    if (!state.domHelpers.isInDmSection()) {
      sendResponse({ success: false, error: 'Not in Instagram DMs' });
      return;
    }
    
    state.isActive = true;
    
    // Start navigation process
    await startDmNavigation();
    
    sendResponse({ success: true, message: 'DM navigation activated' });
  } catch (error) {
    console.error('Failed to activate DM navigation:', error);
    logError(error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle date filter setting
 * @param {Object} message - Message object with date information
 * @param {Function} sendResponse - Response callback
 */
async function handleSetDateFilter(message, sendResponse) {
  try {
    const { date, filterType } = message;
    
    if (!date || !filterType) {
      sendResponse({ success: false, error: 'Missing date or filter type' });
      return;
    }
    
    state.currentDate = {
      date: new Date(date),
      filterType: filterType
    };
    
    sendResponse({ success: true, message: 'Date filter set' });
  } catch (error) {
    console.error('Failed to set date filter:', error);
    logError(error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle current state request
 * @param {Function} sendResponse - Response callback
 */
function handleGetCurrentState(sendResponse) {
  try {
    sendResponse({
      success: true,
      data: {
        isActive: state.isActive,
        currentDate: state.currentDate,
        isInDmSection: state.domHelpers?.isInDmSection() || false
      }
    });
  } catch (error) {
    console.error('Failed to get current state:', error);
    logError(error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Start the DM navigation process
 */
async function startDmNavigation() {
  try {
    console.log('Starting DM navigation...');
    
    // Get DM container
    const dmContainer = state.domHelpers.getDmContainer();
    if (!dmContainer) {
      throw new Error('Could not find DM container');
    }
    
    // Apply date filter if set
    if (state.currentDate) {
      await applyDateFilter(dmContainer);
    }
    
    // Start human-like scrolling
    await state.scrollController.startScrolling(dmContainer);
    
  } catch (error) {
    console.error('Failed to start DM navigation:', error);
    logError(error);
    throw error;
  }
}

/**
 * Apply date filter to DM messages
 * @param {Element} dmContainer - DM container element
 */
async function applyDateFilter(dmContainer) {
  try {
    const { date, filterType } = state.currentDate;
    
    // Get all message elements
    const messages = state.domHelpers.getDmMessages(dmContainer);
    
    // Filter messages based on date
    const filteredMessages = messages.filter(message => {
      const messageDate = state.domHelpers.getMessageDate(message);
      return state.dateCalculator.matchesFilter(messageDate, date, filterType);
    });
    
    console.log(`Filtered ${filteredMessages.length} messages from ${messages.length} total`);
    
    // Highlight filtered messages
    state.domHelpers.highlightMessages(filteredMessages);
    
  } catch (error) {
    console.error('Failed to apply date filter:', error);
    logError(error);
    throw error;
  }
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

/**
 * Cleanup function for extension deactivation
 */
function cleanup() {
  try {
    state.isActive = false;
    state.scrollController?.stopScrolling();
    state.domHelpers?.clearHighlights();
    
    console.log('Instagram DM Navigator cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup:', error);
    logError(error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);