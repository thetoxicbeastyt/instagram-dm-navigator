/**
 * DOM Helpers Utility Module
 * Handles Instagram-specific DOM interactions and element selection
 */

export class DomHelpers {
  constructor() {
    // Instagram-specific selectors
    this.selectors = {
      // Main containers
      dmContainer: '[data-testid="dm-conversation-list"]',
      messageContainer: '[data-testid="message-container"]',
      messageList: '[data-testid="message-list"]',
      
      // Message elements
      message: '[data-testid="message"]',
      messageText: '[data-testid="message-text"]',
      messageTime: '[data-testid="message-time"]',
      messageBubble: '[data-testid="message-bubble"]',
      
      // Navigation elements
      scrollContainer: '[data-testid="scroll-container"]',
      loadMoreButton: '[data-testid="load-more"]',
      
      // UI elements
      highlightClass: 'instagram-dm-highlight',
      filterClass: 'instagram-dm-filtered'
    };
  }

  /**
   * Check if we're currently in Instagram DMs
   * @returns {boolean} - Whether we're in DM section
   */
  isInDmSection() {
    try {
      // Check URL for DM indicators
      const url = window.location.href;
      const isDmUrl = url.includes('/direct/') || url.includes('/messages/');
      
      // Check for DM-specific elements
      const dmContainer = this.getDmContainer();
      const messageList = document.querySelector(this.selectors.messageList);
      
      return isDmUrl && (dmContainer || messageList);
    } catch (error) {
      console.error('Error checking DM section:', error);
      return false;
    }
  }

  /**
   * Get the main DM container element
   * @returns {Element|null} - DM container element
   */
  getDmContainer() {
    try {
      // Try multiple selectors for DM container
      const selectors = [
        this.selectors.dmContainer,
        '[role="main"]',
        '[data-testid="conversation-list"]',
        '.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting DM container:', error);
      return null;
    }
  }

  /**
   * Get all DM message elements
   * @param {Element} container - Container to search in
   * @returns {Array<Element>} - Array of message elements
   */
  getDmMessages(container = null) {
    try {
      const searchContainer = container || document;
      
      // Try multiple selectors for messages
      const selectors = [
        this.selectors.message,
        '[data-testid="message-bubble"]',
        '.x1n2onr6.x1ja2u2z',
        '[role="listitem"]'
      ];

      let messages = [];
      for (const selector of selectors) {
        const elements = searchContainer.querySelectorAll(selector);
        if (elements.length > 0) {
          messages = Array.from(elements);
          break;
        }
      }

      return messages;
    } catch (error) {
      console.error('Error getting DM messages:', error);
      return [];
    }
  }

  /**
   * Get message date from a message element
   * @param {Element} messageElement - Message element
   * @returns {Date|null} - Message date
   */
  getMessageDate(messageElement) {
    try {
      if (!messageElement) return null;

      // Try to find time element
      const timeSelectors = [
        this.selectors.messageTime,
        '[data-testid="message-time"]',
        'time',
        '.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6 span'
      ];

      let timeElement = null;
      for (const selector of timeSelectors) {
        timeElement = messageElement.querySelector(selector);
        if (timeElement) break;
      }

      if (!timeElement) {
        // Try to find time in aria-label or title
        const ariaLabel = messageElement.getAttribute('aria-label');
        const title = messageElement.getAttribute('title');
        const timeText = ariaLabel || title;
        
        if (timeText) {
          return this.parseTimeFromText(timeText);
        }
        return null;
      }

      const timeText = timeElement.textContent || timeElement.getAttribute('title');
      return this.parseTimeFromText(timeText);
    } catch (error) {
      console.error('Error getting message date:', error);
      return null;
    }
  }

  /**
   * Parse time text into Date object
   * @param {string} timeText - Time text to parse
   * @returns {Date|null} - Parsed date
   */
  parseTimeFromText(timeText) {
    try {
      if (!timeText) return null;

      const text = timeText.toLowerCase().trim();
      const now = new Date();

      // Handle "now" or "just now"
      if (text.includes('now')) {
        return now;
      }

      // Handle hours (e.g., "2h", "2 hours ago")
      const hourMatch = text.match(/(\d+)\s*h/);
      if (hourMatch) {
        const hours = parseInt(hourMatch[1]);
        return new Date(now.getTime() - (hours * 60 * 60 * 1000));
      }

      // Handle days (e.g., "3d", "3 days ago")
      const dayMatch = text.match(/(\d+)\s*d/);
      if (dayMatch) {
        const days = parseInt(dayMatch[1]);
        return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
      }

      // Handle weeks (e.g., "1w", "1 week ago")
      const weekMatch = text.match(/(\d+)\s*w/);
      if (weekMatch) {
        const weeks = parseInt(weekMatch[1]);
        return new Date(now.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000));
      }

      // Handle months (e.g., "2mo", "2 months ago")
      const monthMatch = text.match(/(\d+)\s*mo/);
      if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        const newDate = new Date(now);
        newDate.setMonth(newDate.getMonth() - months);
        return newDate;
      }

      // Try to parse as absolute date
      const absoluteDate = new Date(text);
      if (!isNaN(absoluteDate.getTime())) {
        return absoluteDate;
      }

      return null;
    } catch (error) {
      console.error('Error parsing time text:', error);
      return null;
    }
  }

  /**
   * Highlight messages with visual indicator
   * @param {Array<Element>} messages - Messages to highlight
   */
  highlightMessages(messages) {
    try {
      if (!messages || messages.length === 0) return;

      messages.forEach(message => {
        if (message && !message.classList.contains(this.selectors.highlightClass)) {
          message.classList.add(this.selectors.highlightClass);
          message.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
          message.style.border = '2px solid #ffd700';
          message.style.borderRadius = '8px';
          message.style.margin = '2px 0';
        }
      });

      console.log(`Highlighted ${messages.length} messages`);
    } catch (error) {
      console.error('Error highlighting messages:', error);
    }
  }

  /**
   * Clear all message highlights
   */
  clearHighlights() {
    try {
      const highlightedElements = document.querySelectorAll(`.${this.selectors.highlightClass}`);
      
      highlightedElements.forEach(element => {
        element.classList.remove(this.selectors.highlightClass);
        element.style.backgroundColor = '';
        element.style.border = '';
        element.style.borderRadius = '';
        element.style.margin = '';
      });

      console.log(`Cleared ${highlightedElements.length} highlights`);
    } catch (error) {
      console.error('Error clearing highlights:', error);
    }
  }

  /**
   * Get scrollable container for messages
   * @returns {Element|null} - Scrollable container
   */
  getScrollContainer() {
    try {
      const selectors = [
        this.selectors.scrollContainer,
        '[data-testid="message-list"]',
        '.x1n2onr6.x1ja2u2z',
        '[role="list"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && this.isScrollable(element)) {
          return element;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting scroll container:', error);
      return null;
    }
  }

  /**
   * Check if element is scrollable
   * @param {Element} element - Element to check
   * @returns {boolean} - Whether element is scrollable
   */
  isScrollable(element) {
    try {
      if (!element) return false;

      const style = window.getComputedStyle(element);
      const overflow = style.overflow + style.overflowY + style.overflowX;
      
      return overflow.includes('scroll') || overflow.includes('auto');
    } catch (error) {
      console.error('Error checking scrollable:', error);
      return false;
    }
  }

  /**
   * Wait for element to be present in DOM
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element>} - Promise resolving to element
   */
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get element position relative to viewport
   * @param {Element} element - Element to get position for
   * @returns {Object} - Position object with top, left, width, height
   */
  getElementPosition(element) {
    try {
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      };
    } catch (error) {
      console.error('Error getting element position:', error);
      return null;
    }
  }

  /**
   * Check if element is visible in viewport
   * @param {Element} element - Element to check
   * @returns {boolean} - Whether element is visible
   */
  isElementVisible(element) {
    try {
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= windowHeight &&
        rect.right <= windowWidth
      );
    } catch (error) {
      console.error('Error checking element visibility:', error);
      return false;
    }
  }

  /**
   * Scroll element into view smoothly
   * @param {Element} element - Element to scroll to
   * @param {Object} options - Scroll options
   */
  scrollToElement(element, options = {}) {
    try {
      if (!element) return;

      const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      };

      element.scrollIntoView({ ...defaultOptions, ...options });
    } catch (error) {
      console.error('Error scrolling to element:', error);
    }
  }
}