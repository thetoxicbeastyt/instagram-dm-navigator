/**
 * Scroll Controller Utility Module
 * Implements human-like scrolling patterns to avoid detection
 */

export class ScrollController {
  constructor() {
    this.isScrolling = false;
    this.scrollInterval = null;
    this.currentTarget = null;
    
    // Human-like scrolling parameters
    this.scrollConfig = {
      minScrollAmount: 100,
      maxScrollAmount: 300,
      minPauseTime: 500,
      maxPauseTime: 2000,
      accelerationFactor: 0.8,
      decelerationFactor: 1.2,
      naturalVariation: 0.3
    };
  }

  /**
   * Start human-like scrolling
   * @param {Element} container - Container to scroll
   * @param {Object} options - Scroll options
   */
  async startScrolling(container, options = {}) {
    try {
      if (this.isScrolling) {
        console.warn('Scrolling already in progress');
        return;
      }

      if (!container) {
        throw new Error('No container provided for scrolling');
      }

      this.currentTarget = container;
      this.isScrolling = true;

      console.log('Starting human-like scrolling...');

      // Start the scrolling loop
      await this.scrollLoop(container, options);

    } catch (error) {
      console.error('Error starting scroll:', error);
      this.stopScrolling();
      throw error;
    }
  }

  /**
   * Stop scrolling
   */
  stopScrolling() {
    try {
      this.isScrolling = false;
      
      if (this.scrollInterval) {
        clearInterval(this.scrollInterval);
        this.scrollInterval = null;
      }
      
      this.currentTarget = null;
      
      console.log('Scrolling stopped');
    } catch (error) {
      console.error('Error stopping scroll:', error);
    }
  }

  /**
   * Main scrolling loop with human-like patterns
   * @param {Element} container - Container to scroll
   * @param {Object} options - Scroll options
   */
  async scrollLoop(container, options = {}) {
    try {
      const {
        targetDate = null,
        maxScrolls = 50,
        scrollDirection = 'up'
      } = options;

      let scrollCount = 0;
      let lastScrollTop = container.scrollTop;

      while (this.isScrolling && scrollCount < maxScrolls) {
        // Check if we've reached the target date
        if (targetDate && await this.hasReachedTargetDate(container, targetDate)) {
          console.log('Reached target date, stopping scroll');
          break;
        }

        // Perform human-like scroll
        await this.performHumanScroll(container, scrollDirection);
        
        // Check if we're stuck (no scroll progress)
        const currentScrollTop = container.scrollTop;
        if (Math.abs(currentScrollTop - lastScrollTop) < 10) {
          console.log('Scroll stuck, attempting to load more content');
          await this.attemptLoadMore(container);
        }
        
        lastScrollTop = currentScrollTop;
        scrollCount++;

        // Random pause between scrolls
        await this.randomPause();
      }

      if (scrollCount >= maxScrolls) {
        console.log('Reached maximum scroll count');
      }

    } catch (error) {
      console.error('Error in scroll loop:', error);
      throw error;
    }
  }

  /**
   * Perform a single human-like scroll action
   * @param {Element} container - Container to scroll
   * @param {string} direction - Scroll direction ('up' or 'down')
   */
  async performHumanScroll(container, direction = 'up') {
    try {
      // Calculate scroll amount with natural variation
      const baseAmount = this.getRandomScrollAmount();
      const variation = this.getNaturalVariation();
      const scrollAmount = Math.round(baseAmount * variation);

      // Determine scroll direction
      const scrollValue = direction === 'up' ? -scrollAmount : scrollAmount;

      // Perform smooth scroll with easing
      await this.smoothScroll(container, scrollValue);

      // Add small random delay
      await this.randomDelay(50, 150);

    } catch (error) {
      console.error('Error performing human scroll:', error);
      throw error;
    }
  }

  /**
   * Smooth scroll with easing function
   * @param {Element} container - Container to scroll
   * @param {number} targetScroll - Target scroll amount
   */
  async smoothScroll(container, targetScroll) {
    return new Promise((resolve) => {
      const startScroll = container.scrollTop;
      const startTime = performance.now();
      const duration = this.getRandomDuration(300, 800);

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentScroll = startScroll + (targetScroll * easeProgress);
        container.scrollTop = currentScroll;

        if (progress < 1 && this.isScrolling) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Check if we've reached the target date
   * @param {Element} container - Container to check
   * @param {Date} targetDate - Target date to find
   * @returns {boolean} - Whether target date was found
   */
  async hasReachedTargetDate(container, targetDate) {
    try {
      // Get visible messages
      const messages = this.getVisibleMessages(container);
      
      for (const message of messages) {
        const messageDate = this.getMessageDate(message);
        if (messageDate && messageDate <= targetDate) {
          console.log('Found message from target date:', messageDate);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking target date:', error);
      return false;
    }
  }

  /**
   * Get visible messages in container
   * @param {Element} container - Container to search
   * @returns {Array<Element>} - Visible message elements
   */
  getVisibleMessages(container) {
    try {
      const messageSelectors = [
        '[data-testid="message"]',
        '[data-testid="message-bubble"]',
        '.x1n2onr6.x1ja2u2z'
      ];

      let messages = [];
      for (const selector of messageSelectors) {
        const elements = container.querySelectorAll(selector);
        if (elements.length > 0) {
          messages = Array.from(elements).filter(msg => this.isElementVisible(msg));
          break;
        }
      }

      return messages;
    } catch (error) {
      console.error('Error getting visible messages:', error);
      return [];
    }
  }

  /**
   * Get message date from element
   * @param {Element} messageElement - Message element
   * @returns {Date|null} - Message date
   */
  getMessageDate(messageElement) {
    try {
      if (!messageElement) return null;

      // Try to find time element
      const timeSelectors = [
        '[data-testid="message-time"]',
        'time',
        '.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6 span'
      ];

      let timeElement = null;
      for (const selector of timeSelectors) {
        timeElement = messageElement.querySelector(selector);
        if (timeElement) break;
      }

      if (!timeElement) return null;

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
   * Attempt to load more content
   * @param {Element} container - Container to load more in
   */
  async attemptLoadMore(container) {
    try {
      // Look for "Load more" or similar buttons
      const loadMoreSelectors = [
        '[data-testid="load-more"]',
        'button:contains("Load more")',
        'button:contains("Show more")',
        '.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6 button'
      ];

      for (const selector of loadMoreSelectors) {
        const button = container.querySelector(selector);
        if (button && button.offsetParent !== null) { // Check if visible
          console.log('Found load more button, clicking...');
          button.click();
          await this.randomPause(1000, 2000);
          break;
        }
      }
    } catch (error) {
      console.error('Error attempting to load more:', error);
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
   * Get random scroll amount within configured range
   * @returns {number} - Random scroll amount
   */
  getRandomScrollAmount() {
    return Math.random() * 
      (this.scrollConfig.maxScrollAmount - this.scrollConfig.minScrollAmount) + 
      this.scrollConfig.minScrollAmount;
  }

  /**
   * Get natural variation factor
   * @returns {number} - Variation factor
   */
  getNaturalVariation() {
    return 1 + (Math.random() - 0.5) * this.scrollConfig.naturalVariation;
  }

  /**
   * Get random duration between min and max
   * @param {number} min - Minimum duration
   * @param {number} max - Maximum duration
   * @returns {number} - Random duration
   */
  getRandomDuration(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Random pause between actions
   * @param {number} min - Minimum pause time
   * @param {number} max - Maximum pause time
   */
  async randomPause(min = null, max = null) {
    const pauseMin = min || this.scrollConfig.minPauseTime;
    const pauseMax = max || this.scrollConfig.maxPauseTime;
    const pauseTime = this.getRandomDuration(pauseMin, pauseMax);
    
    await new Promise(resolve => setTimeout(resolve, pauseTime));
  }

  /**
   * Random delay for micro-interactions
   * @param {number} min - Minimum delay
   * @param {number} max - Maximum delay
   */
  async randomDelay(min, max) {
    const delay = this.getRandomDuration(min, max);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}