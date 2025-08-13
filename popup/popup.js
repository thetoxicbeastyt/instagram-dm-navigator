/**
 * IG Reel Tracker - Popup Script
 * Handles popup interface and communication with service worker
 */

/**
 * DOM elements
 */
const elements = {
  statusDot: null,
  statusText: null,
  extensionStatus: null,
  pageStatus: null,
  reelCount: null,
  toggleButton: null,
  toggleText: null,
  refreshButton: null
};

/**
 * Application state
 */
const state = {
  isEnabled: false,
  isInstagramDM: false,
  reelCount: 0,
  isLoading: false
};

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[IG Reel Tracker] Popup initializing...');
    
    initializeElements();
    setupEventListeners();
    
    // Set a timeout to prevent getting stuck
    const initTimeout = setTimeout(() => {
      console.warn('[IG Reel Tracker] Initialization timeout, forcing UI update');
      updateUI();
      updatePageStatus('Initialization timeout');
      updateHeaderStatus('Timeout');
    }, 5000); // 5 second timeout
    
    // Load extension state first
    await loadExtensionState();
    
    // Check current page status
    await checkCurrentPage();
    
    // Clear timeout since we completed successfully
    clearTimeout(initTimeout);
    
    // Ensure UI is updated even if there were errors
    updateUI();
    
    console.log('[IG Reel Tracker] Popup initialized successfully');
  } catch (error) {
    console.error('[IG Reel Tracker] Error initializing popup:', error);
    showError('Failed to initialize popup');
    
    // Still try to update UI with whatever state we have
    try {
      updateUI();
      updatePageStatus('Initialization failed');
    } catch (uiError) {
      console.error('[IG Reel Tracker] Error updating UI after initialization failure:', uiError);
    }
  }
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
  elements.statusDot = document.getElementById('statusDot');
  elements.statusText = document.getElementById('statusText');
  elements.extensionStatus = document.getElementById('extensionStatus');
  elements.pageStatus = document.getElementById('pageStatus');
  elements.reelCount = document.getElementById('reelCount');
  elements.toggleButton = document.getElementById('toggleButton');
  elements.toggleText = document.getElementById('toggleText');
  elements.refreshButton = document.getElementById('refreshButton');
  
  // Verify all elements are found
  const missingElements = Object.entries(elements)
    .filter(([key, element]) => !element)
    .map(([key]) => key);
    
  if (missingElements.length > 0) {
    throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
  }
}

/**
 * Set up event listeners for popup interactions
 */
function setupEventListeners() {
  elements.toggleButton.addEventListener('click', handleToggleClick);
  elements.refreshButton.addEventListener('click', handleRefreshClick);
}

/**
 * Load extension state from service worker
 */
async function loadExtensionState() {
  try {
    setLoadingState(true);
    
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    if (response && response.success) {
      state.isEnabled = response.status.isEnabled;
      state.reelCount = response.status.reelCount;
      
      updateUI();
      console.log('[IG Reel Tracker] Extension state loaded:', response.status);
    } else {
      throw new Error(response ? response.error : 'No response from service worker');
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error loading extension state:', error);
    showError('Failed to connect to extension');
  } finally {
    setLoadingState(false);
  }
}

/**
 * Check current page status
 */
async function checkCurrentPage() {
  try {
    updateHeaderStatus('Checking page...');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    console.log('[IG Reel Tracker] Current tab:', tab.url);
    
    const isInstagram = tab.url && tab.url.includes('instagram.com');
    const isDMPage = tab.url && tab.url.includes('/direct/');
    
    state.isInstagramDM = isInstagram && isDMPage;
    
    // Update status immediately based on URL check
    if (isInstagram && isDMPage) {
      updatePageStatus('Instagram DMs');
      updateHeaderStatus('Instagram DMs');
    } else if (isInstagram) {
      updatePageStatus('Instagram (not DMs)');
      updateHeaderStatus('Instagram');
    } else {
      updatePageStatus('Not on Instagram');
      updateHeaderStatus('Not Instagram');
    }
    
    if (isInstagram && isDMPage) {
      // Try to get page info from content script with timeout
      try {
        const response = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Content script timeout')), 2000)
          )
        ]);
        
        if (response && response.success) {
          console.log('[IG Reel Tracker] Content script response:', response.pageInfo);
          // Update status with more detailed info if available
          updatePageStatus('Instagram DMs (Active)');
          updateHeaderStatus('Active');
        }
      } catch (contentScriptError) {
        console.log('[IG Reel Tracker] Content script not ready or timed out:', contentScriptError.message);
        
        // Try to inject the content script if it's not available
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/content.js']
          });
          console.log('[IG Reel Tracker] Content script injected successfully');
          
          // Wait a bit for the script to initialize, then try again
          setTimeout(async () => {
            try {
              const retryResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
              if (retryResponse && retryResponse.success) {
                console.log('[IG Reel Tracker] Content script retry successful:', retryResponse.pageInfo);
                updatePageStatus('Instagram DMs (Active)');
                updateHeaderStatus('Active');
              }
            } catch (retryError) {
              console.log('[IG Reel Tracker] Content script retry failed:', retryError.message);
            }
          }, 1000);
        } catch (injectionError) {
          console.log('[IG Reel Tracker] Failed to inject content script:', injectionError.message);
        }
      }
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error checking current page:', error);
    updatePageStatus('Error checking page');
    updateHeaderStatus('Error');
  }
}

/**
 * Handle toggle button click
 */
async function handleToggleClick() {
  try {
    if (state.isLoading) return;
    
    setLoadingState(true);
    elements.toggleButton.disabled = true;
    
    const response = await chrome.runtime.sendMessage({ action: 'toggleEnabled' });
    
    if (response && response.success) {
      state.isEnabled = response.isEnabled;
      updateUI();
      console.log('[IG Reel Tracker] Extension toggled:', state.isEnabled ? 'enabled' : 'disabled');
    } else {
      throw new Error(response ? response.error : 'No response from service worker');
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error toggling extension:', error);
    showError('Failed to toggle extension');
  } finally {
    setLoadingState(false);
    elements.toggleButton.disabled = false;
  }
}

/**
 * Handle refresh button click
 */
async function handleRefreshClick() {
  try {
    if (state.isLoading) return;
    
    setLoadingState(true);
    elements.refreshButton.disabled = true;
    
    await loadExtensionState();
    await checkCurrentPage();
    
    console.log('[IG Reel Tracker] Popup refreshed');
  } catch (error) {
    console.error('[IG Reel Tracker] Error refreshing popup:', error);
    showError('Failed to refresh');
  } finally {
    setLoadingState(false);
    elements.refreshButton.disabled = false;
  }
}

/**
 * Update UI based on current state
 */
function updateUI() {
  try {
    // Update status indicator
    elements.statusDot.className = 'status-dot';
    if (state.isEnabled) {
      elements.statusDot.classList.add('active');
      updateHeaderStatus('Active');
    } else {
      updateHeaderStatus('Inactive');
    }
    
    // Update extension status
    elements.extensionStatus.textContent = state.isEnabled ? 'Extension Ready' : 'Disabled';
    
    // Update toggle button
    elements.toggleText.textContent = state.isEnabled ? 'Disable Tracking' : 'Enable Tracking';
    
    // Update reel count
    elements.reelCount.textContent = state.reelCount.toString();
    
    console.log('[IG Reel Tracker] UI updated:', state);
  } catch (error) {
    console.error('[IG Reel Tracker] Error updating UI:', error);
  }
}

/**
 * Update header status text
 * @param {string} status - Status text to display
 */
function updateHeaderStatus(status) {
  try {
    if (elements.statusText) {
      elements.statusText.textContent = status;
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error updating header status:', error);
  }
}

/**
 * Update page status display
 * @param {string} customStatus - Custom status message
 */
function updatePageStatus(customStatus = null) {
  try {
    if (!elements.pageStatus) {
      console.warn('[IG Reel Tracker] Page status element not found');
      return;
    }
    
    if (customStatus) {
      elements.pageStatus.textContent = customStatus;
      return;
    }
    
    if (state.isInstagramDM) {
      elements.pageStatus.textContent = 'Instagram DMs';
      elements.pageStatus.style.color = 'var(--ig-success)';
    } else {
      elements.pageStatus.textContent = 'Not on Instagram DMs';
      elements.pageStatus.style.color = 'var(--ig-text-secondary)';
    }
  } catch (error) {
    console.error('[IG Reel Tracker] Error updating page status:', error);
  }
}

/**
 * Set loading state for UI elements
 * @param {boolean} loading - Whether app is in loading state
 */
function setLoadingState(loading) {
  state.isLoading = loading;
  
  if (loading) {
    elements.statusText.classList.add('loading');
  } else {
    elements.statusText.classList.remove('loading');
  }
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
  elements.statusDot.className = 'status-dot error';
  elements.statusText.textContent = 'Error';
  elements.extensionStatus.textContent = message;
  elements.extensionStatus.style.color = 'var(--ig-error)';
  
  console.error('[IG Reel Tracker] Error displayed to user:', message);
}

console.log('[IG Reel Tracker] Popup script loaded successfully');