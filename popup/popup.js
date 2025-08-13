document.addEventListener('DOMContentLoaded', () => {
  const initButton = document.getElementById('initButton');
  const testButton = document.getElementById('testButton');
  const testResult = document.getElementById('testResult');
  const statusDisplay = document.getElementById('statusDisplay');

  // Initialize test button as disabled until extension is initialized
  testButton.disabled = true;

  // Check current extension status on popup open
  checkExtensionStatus();

  initButton.addEventListener('click', async () => {
    initButton.disabled = true;
    initButton.textContent = 'Initializing...';
    statusDisplay.textContent = 'Status: Initializing...';
    statusDisplay.className = 'status info';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        throw new Error('No active tab found.');
      }

      if (!tab.url.includes('instagram.com/direct/')) {
        displayResult('ℹ️ Navigate to Instagram DMs first', 'info');
        statusDisplay.textContent = 'Status: Please navigate to Instagram DMs';
        statusDisplay.className = 'status error';
        return;
      }

      // Send initialization message to content script
      const response = await sendMessageWithTimeout(tab.id, { action: 'beginInitialization' }, 5000);

      if (response && response.success) {
        displayResult('✅ Extension initialized successfully!', 'success');
        statusDisplay.textContent = 'Status: Initialized and Ready';
        statusDisplay.className = 'status success';
        testButton.disabled = false; // Enable test button
        initButton.textContent = 'Initialized ✓';
        initButton.style.background = '#6c757d';
      } else {
        throw new Error(response?.error || 'Initialization failed');
      }
    } catch (error) {
      console.error(error);
      displayResult('❌ Initialization failed: ' + error.message, 'error');
      statusDisplay.textContent = 'Status: Initialization Failed';
      statusDisplay.className = 'status error';
      initButton.disabled = false;
      initButton.textContent = 'Retry Initialization';
    }
  });

  testButton.addEventListener('click', async () => {
    testButton.disabled = true;
    testButton.textContent = 'Testing...';
    testResult.style.display = 'none';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        throw new Error('No active tab found.');
      }

      if (!tab.url.includes('instagram.com/direct/')) {
        displayResult('ℹ️ Navigate to Instagram DMs first', 'info');
        return;
      }

      const response = await sendMessageWithTimeout(tab.id, { action: 'testInjection', timestamp: Date.now() }, 3000);

      if (response && response.success) {
        displayResult('✅ Injection successful!', 'success');
      } else {
        displayResult('❌ Injection failed', 'error');
      }
    } catch (error) {
      console.error(error);
      displayResult('❌ An error occurred during the test', 'error');
    } finally {
      testButton.disabled = false;
      testButton.textContent = 'Test Instagram DM Injection';
    }
  });

  async function checkExtensionStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url.includes('instagram.com/direct/')) {
        // Check if extension is already initialized
        const response = await sendMessageWithTimeout(tab.id, { action: 'getStatus' }, 2000);
        
        if (response && response.success && response.isInitialized) {
          statusDisplay.textContent = 'Status: Already Initialized';
          statusDisplay.className = 'status success';
          testButton.disabled = false;
          initButton.textContent = 'Initialized ✓';
          initButton.style.background = '#6c757d';
        } else {
          statusDisplay.textContent = 'Status: Ready to Initialize';
          statusDisplay.className = 'status info';
        }
      } else {
        statusDisplay.textContent = 'Status: Navigate to Instagram DMs';
        statusDisplay.className = 'status info';
      }
    } catch (error) {
      console.log('Status check failed (content script may not be loaded yet):', error);
      statusDisplay.textContent = 'Status: Ready to Initialize';
      statusDisplay.className = 'status info';
    }
  }

  function displayResult(message, type) {
    testResult.textContent = message;
    testResult.className = type;
    testResult.style.display = 'block';
  }

  function sendMessageWithTimeout(tabId, message, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Message timeout')), timeout);

      chrome.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }
});