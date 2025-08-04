/**
 * Popup JavaScript for Instagram DM Navigator
 * Handles UI interactions, date selection, and communication with content script
 */

class PopupController {
  constructor() {
    this.currentState = {
      isActive: false,
      isInDmSection: false,
      currentDate: null
    };
    
    this.elements = {};
    this.initializeElements();
    this.setupEventListeners();
    this.initializePopup();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.elements = {
      // Status elements
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      
      // Filter elements
      filterType: document.getElementById('filterType'),
      dateInput: document.getElementById('dateInput'),
      quickDateButtons: document.querySelectorAll('.quick-date-btn'),
      
      // Navigation elements
      activateBtn: document.getElementById('activateBtn'),
      stopBtn: document.getElementById('stopBtn'),
      scrollDirection: document.getElementById('scrollDirection'),
      maxScrolls: document.getElementById('maxScrolls'),
      
      // Progress elements
      progressSection: document.getElementById('progressSection'),
      scrollCount: document.getElementById('scrollCount'),
      messageCount: document.getElementById('messageCount'),
      progressStatus: document.getElementById('progressStatus'),
      
      // Modal elements
      helpBtn: document.getElementById('helpBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      helpModal: document.getElementById('helpModal'),
      closeHelpModal: document.getElementById('closeHelpModal')
    };
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Quick date buttons
    this.elements.quickDateButtons.forEach(button => {
      button.addEventListener('click', (e) => this.handleQuickDateClick(e));
    });

    // Navigation buttons
    this.elements.activateBtn.addEventListener('click', () => this.handleActivateClick());
    this.elements.stopBtn.addEventListener('click', () => this.handleStopClick());

    // Filter type change
    this.elements.filterType.addEventListener('change', () => this.handleFilterTypeChange());

    // Modal events
    this.elements.helpBtn.addEventListener('click', () => this.showHelpModal());
    this.elements.closeHelpModal.addEventListener('click', () => this.hideHelpModal());
    this.elements.helpModal.addEventListener('click', (e) => {
      if (e.target === this.elements.helpModal) {
        this.hideHelpModal();
      }
    });

    // Settings button (placeholder for future functionality)
    this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
  }

  /**
   * Initialize popup state and check current status
   */
  async initializePopup() {
    try {
      this.updateStatus('Checking Instagram status...', 'loading');
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.updateStatus('No active tab found', 'error');
        return;
      }

      // Check if we're on Instagram
      if (!tab.url?.includes('instagram.com')) {
        this.updateStatus('Not on Instagram', 'error');
        this.disableControls();
        return;
      }

      // Get current state from content script
      await this.getCurrentState();
      
      // Set default date to today
      this.setDefaultDate();
      
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.updateStatus('Failed to initialize', 'error');
    }
  }

  /**
   * Get current state from content script
   */
  async getCurrentState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getCurrentState'
      });

      if (response?.success) {
        this.currentState = response.data;
        this.updateUI();
      } else {
        console.warn('Failed to get current state:', response?.error);
      }
    } catch (error) {
      console.error('Error getting current state:', error);
    }
  }

  /**
   * Update UI based on current state
   */
  updateUI() {
    // Update status
    if (this.currentState.isInDmSection) {
      if (this.currentState.isActive) {
        this.updateStatus('Navigation active', 'active');
        this.elements.activateBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.showProgressSection();
      } else {
        this.updateStatus('Ready to navigate', 'ready');
        this.elements.activateBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.hideProgressSection();
      }
    } else {
      this.updateStatus('Not in Instagram DMs', 'error');
      this.disableControls();
    }
  }

  /**
   * Update status display
   * @param {string} text - Status text
   * @param {string} type - Status type (loading, ready, active, error)
   */
  updateStatus(text, type) {
    this.elements.statusText.textContent = text;
    this.elements.statusDot.className = `status-dot ${type}`;
  }

  /**
   * Disable navigation controls
   */
  disableControls() {
    this.elements.activateBtn.disabled = true;
    this.elements.stopBtn.disabled = true;
  }

  /**
   * Set default date to today
   */
  setDefaultDate() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    this.elements.dateInput.value = dateString;
  }

  /**
   * Handle quick date button clicks
   * @param {Event} event - Click event
   */
  handleQuickDateClick(event) {
    const days = parseInt(event.target.dataset.days);
    if (isNaN(days)) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);
    
    const dateString = targetDate.toISOString().split('T')[0];
    this.elements.dateInput.value = dateString;
    
    // Update filter type to days ago
    this.elements.filterType.value = 'days_ago';
  }

  /**
   * Handle filter type change
   */
  handleFilterTypeChange() {
    const filterType = this.elements.filterType.value;
    
    // Update date input behavior based on filter type
    if (filterType === 'days_ago' || filterType === 'weeks_ago' || filterType === 'months_ago') {
      this.elements.dateInput.type = 'number';
      this.elements.dateInput.placeholder = 'Enter number';
      this.elements.dateInput.value = '1';
    } else {
      this.elements.dateInput.type = 'date';
      this.elements.dateInput.placeholder = '';
      if (!this.elements.dateInput.value) {
        this.setDefaultDate();
      }
    }
  }

  /**
   * Handle activate button click
   */
  async handleActivateClick() {
    try {
      this.elements.activateBtn.disabled = true;
      this.updateStatus('Activating navigation...', 'loading');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Get form data
      const filterData = this.getFilterData();
      if (!filterData) {
        this.updateStatus('Invalid date filter', 'error');
        this.elements.activateBtn.disabled = false;
        return;
      }

      // Send activation message
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'activateDmNavigation',
        filterData: filterData,
        navigationOptions: this.getNavigationOptions()
      });

      if (response?.success) {
        this.updateStatus('Navigation activated', 'active');
        this.currentState.isActive = true;
        this.elements.stopBtn.disabled = false;
        this.showProgressSection();
        this.startProgressUpdates();
      } else {
        throw new Error(response?.error || 'Failed to activate navigation');
      }

    } catch (error) {
      console.error('Error activating navigation:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');
      this.elements.activateBtn.disabled = false;
    }
  }

  /**
   * Handle stop button click
   */
  async handleStopClick() {
    try {
      this.elements.stopBtn.disabled = true;
      this.updateStatus('Stopping navigation...', 'loading');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Send stop message
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'stopNavigation'
      });

      if (response?.success) {
        this.updateStatus('Navigation stopped', 'ready');
        this.currentState.isActive = false;
        this.elements.activateBtn.disabled = false;
        this.hideProgressSection();
        this.stopProgressUpdates();
      } else {
        throw new Error(response?.error || 'Failed to stop navigation');
      }

    } catch (error) {
      console.error('Error stopping navigation:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');
      this.elements.stopBtn.disabled = false;
    }
  }

  /**
   * Get filter data from form
   * @returns {Object|null} - Filter data or null if invalid
   */
  getFilterData() {
    const filterType = this.elements.filterType.value;
    const dateValue = this.elements.dateInput.value;

    if (!dateValue) return null;

    if (filterType === 'days_ago' || filterType === 'weeks_ago' || filterType === 'months_ago') {
      const number = parseInt(dateValue);
      if (isNaN(number) || number < 1) return null;

      const targetDate = new Date();
      if (filterType === 'days_ago') {
        targetDate.setDate(targetDate.getDate() - number);
      } else if (filterType === 'weeks_ago') {
        targetDate.setDate(targetDate.getDate() - (number * 7));
      } else if (filterType === 'months_ago') {
        targetDate.setMonth(targetDate.getMonth() - number);
      }

      return {
        date: targetDate.toISOString(),
        filterType: filterType
      };
    } else {
      // For exact_date and date_range
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;

      return {
        date: date.toISOString(),
        filterType: filterType
      };
    }
  }

  /**
   * Get navigation options from form
   * @returns {Object} - Navigation options
   */
  getNavigationOptions() {
    return {
      scrollDirection: this.elements.scrollDirection.value,
      maxScrolls: parseInt(this.elements.maxScrolls.value) || 50
    };
  }

  /**
   * Show progress section
   */
  showProgressSection() {
    this.elements.progressSection.style.display = 'block';
    this.elements.progressSection.classList.add('fade-in');
  }

  /**
   * Hide progress section
   */
  hideProgressSection() {
    this.elements.progressSection.style.display = 'none';
    this.elements.progressSection.classList.remove('fade-in');
  }

  /**
   * Start progress updates
   */
  startProgressUpdates() {
    this.progressInterval = setInterval(() => {
      this.updateProgress();
    }, 1000);
  }

  /**
   * Stop progress updates
   */
  stopProgressUpdates() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * Update progress display
   */
  async updateProgress() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getProgress'
      });

      if (response?.success) {
        const { scrollCount, messageCount, status } = response.data;
        this.elements.scrollCount.textContent = scrollCount || 0;
        this.elements.messageCount.textContent = messageCount || 0;
        this.elements.progressStatus.textContent = status || 'Running';
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  /**
   * Show help modal
   */
  showHelpModal() {
    this.elements.helpModal.style.display = 'flex';
    this.elements.helpModal.classList.add('fade-in');
  }

  /**
   * Hide help modal
   */
  hideHelpModal() {
    this.elements.helpModal.style.display = 'none';
    this.elements.helpModal.classList.remove('fade-in');
  }

  /**
   * Show settings (placeholder for future functionality)
   */
  showSettings() {
    // TODO: Implement settings functionality
    console.log('Settings functionality not yet implemented');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});