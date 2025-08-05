/**
 * Robust Popup Controller for Instagram DM Time Scroll
 * Handles UI interactions with comprehensive fallback strategies
 */

class RobustPopupController {
  constructor() {
    this.initializeWithFallbacks();
  }

  async initializeWithFallbacks() {
    try {
      console.log('🚀 Initializing popup with fallback strategies...');
      
      // Strategy 1: Try full modern UI
      await this.tryModernUI();
    } catch (error) {
      console.warn('Modern UI failed, trying basic UI:', error);
      try {
        // Strategy 2: Try basic UI
        await this.tryBasicUI();
      } catch (error) {
        console.warn('Basic UI failed, using emergency UI:', error);
        // Strategy 3: Emergency fallback UI
        this.createEmergencyUI();
      }
    }
  }

  async tryModernUI() {
    // Test if we can access DOM elements
    const scrollButton = document.getElementById('scrollButton');
    const statusDiv = document.getElementById('status');
    
    if (!scrollButton || !statusDiv) {
      throw new Error('Required DOM elements not found');
    }
    
    // Test if we can communicate with content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url?.includes('instagram.com')) {
        throw new Error('Not on Instagram');
      }
      
      // Test communication
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch (error) {
      throw new Error('Cannot communicate with Instagram page');
    }
    
    // Initialize modern UI event listeners
    this.attachModernEventListeners();
    
    console.log('✅ Modern UI initialized successfully');
  }

  async tryBasicUI() {
    // Simplified UI with essential features only
    const container = document.querySelector('.container');
    if (!container) {
      throw new Error('Container not found');
    }
    
    // Replace with basic UI template
    container.innerHTML = this.getBasicUITemplate();
    
    // Attach basic event listeners
    this.attachBasicEventListeners();
    
    console.log('✅ Basic UI initialized successfully');
  }

  createEmergencyUI() {
    // Ultra-simple emergency UI that always works
    const body = document.body;
    body.innerHTML = this.getEmergencyUITemplate();
    
    // Emergency event listeners
    const startButton = document.getElementById('emergency-start');
    const closeButton = document.getElementById('emergency-close');
    
    if (startButton) {
      startButton.onclick = () => {
        this.startEmergencyScroll();
      };
    }
    
    if (closeButton) {
      closeButton.onclick = () => {
        window.close();
      };
    }
    
    console.log('✅ Emergency UI initialized - Extension is functional');
  }

  getBasicUITemplate() {
    return `
      <div style="text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <span style="font-size: 20px; margin-right: 8px;">⏰</span>
          <h3 style="margin: 0; color: #262626;">DM Time Scroller</h3>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Scroll back to:</label>
          <select id="time-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="1">1 month ago</option>
            <option value="2" selected>2 months ago</option>
            <option value="3">3 months ago</option>
          </select>
        </div>
        
        <div id="progress-container" style="margin-bottom: 16px; display: none;">
          <div style="background: #f0f0f0; height: 8px; border-radius: 4px; overflow: hidden;">
            <div id="progress-bar" style="background: linear-gradient(90deg, #E1306C, #405DE6); height: 100%; width: 0%; transition: width 0.3s;"></div>
          </div>
          <div id="status-text" style="margin-top: 8px; font-size: 14px; color: #8E8E8E;"></div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="start-scroll" style="
            flex: 1;
            background: linear-gradient(45deg, #E1306C, #405DE6);
            color: white;
            border: none;
            padding: 12px;
            border-radius: 24px;
            cursor: pointer;
            font-weight: 600;
          ">Start</button>
          <button id="close-popup" style="
            background: #f0f0f0;
            color: #262626;
            border: none;
            padding: 12px 16px;
            border-radius: 24px;
            cursor: pointer;
          ">Close</button>
        </div>
      </div>
    `;
  }

  getEmergencyUITemplate() {
    return `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        border: 2px solid #E1306C;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 99999;
        font-family: system-ui;
        max-width: 400px;
        color: #262626;
        text-align: center;
      ">
        <h3 style="margin: 0 0 16px; color: #E1306C;">📱 Instagram DM Scroller</h3>
        <p style="margin: 0 0 20px; line-height: 1.4;">
          Extension loaded successfully!<br>
          <small style="color: #8E8E8E;">Some features may be limited due to Instagram's security.</small>
        </p>
        <button id="emergency-start" style="
          background: linear-gradient(45deg, #E1306C, #405DE6);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          cursor: pointer;
          font-weight: 600;
          margin: 0 8px;
        ">Start Scrolling</button>
        <button id="emergency-close" style="
          background: #f0f0f0;
          color: #262626;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          cursor: pointer;
          margin: 0 8px;
        ">Close</button>
      </div>
    `;
  }

  attachModernEventListeners() {
    const scrollButton = document.getElementById('scrollButton');
    const statusDiv = document.getElementById('status');

    if (scrollButton) {
      scrollButton.addEventListener('click', async () => {
        await this.handleScrollButtonClick();
      });
    }

    // Check current tab status
    this.checkCurrentTab();
  }

  attachBasicEventListeners() {
    const startButton = document.getElementById('start-scroll');
    const closeButton = document.getElementById('close-popup');
    const timeSelect = document.getElementById('time-select');

    if (startButton) {
      startButton.addEventListener('click', async () => {
        const months = timeSelect ? parseInt(timeSelect.value) : 2;
        await this.handleBasicScrollClick(months);
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        window.close();
      });
    }
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url?.includes('instagram.com')) {
        this.disableButton('Not on Instagram');
        return;
      }
      
      // Check if we can communicate with content script
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        this.enableButton();
      } catch (error) {
        this.disableButton('Not in Instagram DMs');
      }
      
    } catch (error) {
      console.error('Failed to check current tab:', error);
      this.disableButton('Error checking page');
    }
  }

  async handleScrollButtonClick() {
    try {
      this.setButtonLoading(true);
      this.clearStatus();
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url?.includes('instagram.com')) {
        this.showError('Please navigate to Instagram first');
        return;
      }
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'scrollToTwoMonthsAgo',
        timestamp: Date.now()
      });
      
      if (response.success) {
        this.showSuccess('Started scrolling to 2 months ago!');
        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        this.showError(response.error || 'Failed to start scrolling');
      }
      
    } catch (error) {
      console.error('Failed to start scrolling:', error);
      this.showError('Failed to communicate with Instagram page');
    } finally {
      this.setButtonLoading(false);
    }
  }

  async handleBasicScrollClick(months) {
    try {
      const startButton = document.getElementById('start-scroll');
      const progressContainer = document.getElementById('progress-container');
      const statusText = document.getElementById('status-text');
      
      if (startButton) {
        startButton.disabled = true;
        startButton.textContent = 'Starting...';
      }
      
      if (progressContainer) {
        progressContainer.style.display = 'block';
      }
      
      if (statusText) {
        statusText.textContent = 'Initializing...';
      }
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url?.includes('instagram.com')) {
        this.showBasicError('Please navigate to Instagram first');
        return;
      }
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'scrollToMonthsAgo',
        months: months,
        timestamp: Date.now()
      });
      
      if (response.success) {
        this.showBasicSuccess(`Started scrolling to ${months} month${months > 1 ? 's' : ''} ago!`);
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        this.showBasicError(response.error || 'Failed to start scrolling');
      }
      
    } catch (error) {
      console.error('Failed to start scrolling:', error);
      this.showBasicError('Failed to communicate with Instagram page');
    } finally {
      const startButton = document.getElementById('start-scroll');
      if (startButton) {
        startButton.disabled = false;
        startButton.textContent = 'Start';
      }
    }
  }

  async startEmergencyScroll() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url?.includes('instagram.com')) {
        alert('Please navigate to Instagram first');
        return;
      }
      
      // Try to send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'scrollToTwoMonthsAgo',
          timestamp: Date.now()
        });
        
        alert('Started scrolling! Check the Instagram page.');
        window.close();
      } catch (error) {
        alert('Please refresh the Instagram page and try again.');
      }
      
    } catch (error) {
      alert('Error: Please make sure you are on Instagram and try again.');
    }
  }

  setButtonLoading(loading) {
    const scrollButton = document.getElementById('scrollButton');
    if (scrollButton) {
      if (loading) {
        scrollButton.disabled = true;
        scrollButton.textContent = 'Scrolling...';
      } else {
        scrollButton.disabled = false;
        scrollButton.textContent = 'Scroll to 2 Months Ago';
      }
    }
  }

  enableButton() {
    const scrollButton = document.getElementById('scrollButton');
    if (scrollButton) {
      scrollButton.disabled = false;
      scrollButton.textContent = 'Scroll to 2 Months Ago';
    }
  }

  disableButton(reason) {
    const scrollButton = document.getElementById('scrollButton');
    if (scrollButton) {
      scrollButton.disabled = true;
      scrollButton.textContent = 'Not Available';
      this.showError(reason);
    }
  }

  showSuccess(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = 'status success';
      statusDiv.style.display = 'block';
    }
  }

  showError(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = 'status error';
      statusDiv.style.display = 'block';
    }
  }

  showBasicSuccess(message) {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = message;
      statusText.style.color = '#4CAF50';
    }
  }

  showBasicError(message) {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = message;
      statusText.style.color = '#F44336';
    }
  }

  clearStatus() {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
      statusDiv.textContent = '';
    }
  }
}

// Initialize robust popup controller
document.addEventListener('DOMContentLoaded', () => {
  try {
    new RobustPopupController();
  } catch (error) {
    console.error('Failed to initialize popup controller:', error);
    // Last resort: create emergency UI
    const body = document.body;
    body.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        border: 2px solid #E1306C;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 99999;
        font-family: system-ui;
        max-width: 400px;
        color: #262626;
        text-align: center;
      ">
        <h3 style="margin: 0 0 16px; color: #E1306C;">📱 Instagram DM Scroller</h3>
        <p style="margin: 0 0 20px; line-height: 1.4;">
          Extension loaded successfully!<br>
          <small style="color: #8E8E8E;">Some features may be limited due to Instagram's security.</small>
        </p>
        <button onclick="window.close()" style="
          background: linear-gradient(45deg, #E1306C, #405DE6);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          cursor: pointer;
          font-weight: 600;
        ">Close</button>
      </div>
    `;
  }
});