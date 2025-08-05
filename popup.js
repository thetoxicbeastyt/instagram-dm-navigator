/**
 * Popup script for Instagram DM Time Scroll
 * Handles UI interactions and content script communication
 */

// DOM elements
const scrollButton = document.getElementById('scrollButton');
const statusDiv = document.getElementById('status');

/**
 * Initialize popup
 */
function initialize() {
  setupEventListeners();
  checkCurrentTab();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  scrollButton.addEventListener('click', handleScrollButtonClick);
}

/**
 * Check if current tab is on Instagram
 */
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url?.includes('instagram.com')) {
      disableButton('Not on Instagram');
      return;
    }
    
    // Check if we can communicate with content script
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      enableButton();
    } catch (error) {
      disableButton('Not in Instagram DMs');
    }
    
  } catch (error) {
    console.error('Failed to check current tab:', error);
    disableButton('Error checking page');
  }
}

/**
 * Handle scroll button click
 */
async function handleScrollButtonClick() {
  try {
    setButtonLoading(true);
    clearStatus();
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url?.includes('instagram.com')) {
      showError('Please navigate to Instagram first');
      return;
    }
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'scrollToTwoMonthsAgo',
      timestamp: Date.now()
    });
    
    if (response.success) {
      showSuccess('Started scrolling to 2 months ago!');
      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      showError(response.error || 'Failed to start scrolling');
    }
    
  } catch (error) {
    console.error('Failed to start scrolling:', error);
    showError('Failed to communicate with Instagram page');
  } finally {
    setButtonLoading(false);
  }
}

/**
 * Set button to loading state
 * @param {boolean} loading - Loading state
 */
function setButtonLoading(loading) {
  if (loading) {
    scrollButton.disabled = true;
    scrollButton.textContent = 'Scrolling...';
  } else {
    scrollButton.disabled = false;
    scrollButton.textContent = 'Scroll to 2 Months Ago';
  }
}

/**
 * Enable button
 */
function enableButton() {
  scrollButton.disabled = false;
  scrollButton.textContent = 'Scroll to 2 Months Ago';
}

/**
 * Disable button with reason
 * @param {string} reason - Reason for disabling
 */
function disableButton(reason) {
  scrollButton.disabled = true;
  scrollButton.textContent = 'Not Available';
  showError(reason);
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  statusDiv.textContent = message;
  statusDiv.className = 'status success';
  statusDiv.style.display = 'block';
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  statusDiv.textContent = message;
  statusDiv.className = 'status error';
  statusDiv.style.display = 'block';
}

/**
 * Clear status message
 */
function clearStatus() {
  statusDiv.style.display = 'none';
  statusDiv.textContent = '';
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', initialize);