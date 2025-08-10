/**
 * Instagram Reel Detection System
 * Detects Instagram reels in DM conversations using multiple detection methods
 */

class ReelDetector {
  constructor() {
    this.confidenceThreshold = 0.7;
    this.log('ReelDetector initialized');
  }

  log(message, level = 'info') {
    console.log(`[ReelDetector][${level.toUpperCase()}] ${message}`);
  }

  /**
   * Main detection function for Instagram reels
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} Detection result with confidence and metadata
   */
  detectReels(messageElement) {
    try {
      // Primary detection: URL pattern matching (90% confidence)
      const urlResult = this.detectByUrlPattern(messageElement);
      if (urlResult.isReel && urlResult.confidence >= this.confidenceThreshold) {
        this.log(`Reel detected via URL pattern: ${urlResult.reelId} (confidence: ${urlResult.confidence})`);
        return urlResult;
      }

      // Secondary detection: Visual indicators (75% confidence)
      const visualResult = this.detectByVisualIndicators(messageElement);
      if (visualResult.isReel && visualResult.confidence >= this.confidenceThreshold) {
        this.log(`Reel detected via visual indicators: ${visualResult.reelId} (confidence: ${visualResult.confidence})`);
        return visualResult;
      }

      // No reel detected
      return {
        isReel: false,
        confidence: 0,
        reelId: null,
        detectionMethod: 'none',
        reelUrl: null,
        messageElement: messageElement
      };

    } catch (error) {
      this.log(`Error detecting reels: ${error.message}`, 'error');
      return {
        isReel: false,
        confidence: 0,
        reelId: null,
        detectionMethod: 'error',
        reelUrl: null,
        messageElement: messageElement,
        error: error.message
      };
    }
  }

  /**
   * Detect reels by URL pattern matching (highest confidence)
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} URL-based detection result
   */
  detectByUrlPattern(messageElement) {
    const urlPatterns = [
      // Instagram reel URLs
      /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i,
      /\/reel\/([a-zA-Z0-9_-]+)/i,
      // Instagram short links
      /ig\.me\/([a-zA-Z0-9_-]+)/i,
      // Reel sharing URLs
      /reel\/([a-zA-Z0-9_-]+)/i
    ];

    // Search for links within the message element
    const links = messageElement.querySelectorAll('a[href]');
    
    for (const link of links) {
      const href = link.href || link.getAttribute('href');
      if (!href) continue;

      for (const pattern of urlPatterns) {
        const match = href.match(pattern);
        if (match) {
          const reelId = match[1];
          const confidence = this.calculateReelConfidence('url_pattern', reelId, link);
          
          return {
            isReel: true,
            confidence: confidence,
            reelId: reelId,
            detectionMethod: 'url_pattern',
            reelUrl: href,
            messageElement: messageElement,
            linkElement: link
          };
        }
      }
    }

    // Search for text content that might contain reel URLs
    const textContent = messageElement.textContent || '';
    for (const pattern of urlPatterns) {
      const match = textContent.match(pattern);
      if (match) {
        const reelId = match[1];
        const confidence = this.calculateReelConfidence('url_pattern', reelId, null);
        
        return {
          isReel: true,
          confidence: confidence,
          reelId: reelId,
          detectionMethod: 'url_pattern',
          reelUrl: match[0],
          messageElement: messageElement
        };
      }
    }

    return {
      isReel: false,
      confidence: 0,
      reelId: null,
      detectionMethod: 'url_pattern',
      reelUrl: null,
      messageElement: messageElement
    };
  }

  /**
   * Detect reels by visual indicators (secondary method)
   * @param {HTMLElement} messageElement - The message container element
   * @returns {Object} Visual-based detection result
   */
  detectByVisualIndicators(messageElement) {
    const visualSelectors = [
      // Instagram's aria-label patterns for reels
      '[aria-label*="reel"]',
      '[aria-label*="Reel"]',
      // Instagram's test ID patterns for reels
      '[data-testid*="reel"]',
      '[data-testid*="Reel"]',
      // Reel-specific container classes
      '[class*="reel"]',
      '[class*="Reel"]',
      // Reel sharing UI components
      '[role="button"][aria-label*="reel"]',
      '[role="button"][aria-label*="Reel"]'
    ];

    for (const selector of visualSelectors) {
      const elements = messageElement.querySelectorAll(selector);
      if (elements.length > 0) {
        // Try to extract reel ID from the element or its children
        const reelId = this.extractReelId(elements[0]);
        const confidence = this.calculateReelConfidence('visual_indicators', reelId, elements[0]);
        
        return {
          isReel: true,
          confidence: confidence,
          reelId: reelId,
          detectionMethod: 'visual_indicators',
          reelUrl: reelId ? `https://instagram.com/reel/${reelId}` : null,
          messageElement: messageElement,
          visualElement: elements[0]
        };
      }
    }

    return {
      isReel: false,
      confidence: 0,
      reelId: null,
      detectionMethod: 'visual_indicators',
      reelUrl: null,
      messageElement: messageElement
    };
  }

  /**
   * Extract reel ID from various sources
   * @param {HTMLElement} element - Element to extract reel ID from
   * @returns {string|null} Extracted reel ID or null if not found
   */
  extractReelId(element) {
    if (!element) return null;

    // Try to get reel ID from data attributes
    const dataReelId = element.dataset.reelId || 
                      element.dataset.reel || 
                      element.dataset.id;
    if (dataReelId) return dataReelId;

    // Try to get reel ID from href attributes
    const href = element.href || element.getAttribute('href');
    if (href) {
      const urlMatch = href.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      if (urlMatch) return urlMatch[1];
    }

    // Try to get reel ID from parent links
    const parentLink = element.closest('a[href*="/reel/"]');
    if (parentLink) {
      const urlMatch = parentLink.href.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      if (urlMatch) return urlMatch[1];
    }

    // Try to get reel ID from child links
    const childLinks = element.querySelectorAll('a[href*="/reel/"]');
    for (const link of childLinks) {
      const urlMatch = link.href.match(/\/reel\/([a-zA-Z0-9_-]+)/i);
      if (urlMatch) return urlMatch[1];
    }

    return null;
  }

  /**
   * Calculate confidence score for reel detection
   * @param {string} method - Detection method used
   * @param {string|null} reelId - Extracted reel ID
   * @param {HTMLElement|null} element - Element used for detection
   * @returns {number} Confidence score between 0 and 1
   */
  calculateReelConfidence(method, reelId, element) {
    let confidence = 0;

    // Base confidence by detection method
    switch (method) {
      case 'url_pattern':
        confidence = 0.9;
        break;
      case 'visual_indicators':
        confidence = 0.75;
        break;
      default:
        confidence = 0.5;
    }

    // Boost confidence if we have a valid reel ID
    if (reelId && reelId.length >= 8) {
      confidence += 0.05;
    }

    // Boost confidence if we have a strong visual element
    if (element && element.getAttribute('data-testid')) {
      confidence += 0.05;
    }

    // Ensure confidence doesn't exceed 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Batch detect reels in multiple message elements
   * @param {HTMLElement[]} messageElements - Array of message container elements
   * @returns {Object[]} Array of detection results
   */
  detectReelsBatch(messageElements) {
    if (!Array.isArray(messageElements)) {
      this.log('Invalid message elements array provided', 'error');
      return [];
    }

    this.log(`Starting batch detection for ${messageElements.length} messages`);
    
    const results = messageElements.map(element => this.detectReels(element));
    const detectedReels = results.filter(result => result.isReel);
    
    this.log(`Batch detection complete: ${detectedReels.length} reels found out of ${messageElements.length} messages`);
    
    return results;
  }

  /**
   * Get detection statistics
   * @param {Object[]} detectionResults - Array of detection results
   * @returns {Object} Statistics about the detection
   */
  getDetectionStats(detectionResults) {
    if (!Array.isArray(detectionResults)) {
      return { total: 0, reels: 0, confidence: 0, methods: {} };
    }

    const total = detectionResults.length;
    const reels = detectionResults.filter(result => result.isReel).length;
    const avgConfidence = reels > 0 
      ? detectionResults
          .filter(result => result.isReel)
          .reduce((sum, result) => sum + result.confidence, 0) / reels
      : 0;

    const methods = detectionResults
      .filter(result => result.isReel)
      .reduce((acc, result) => {
        acc[result.detectionMethod] = (acc[result.detectionMethod] || 0) + 1;
        return acc;
      }, {});

    return {
      total,
      reels,
      confidence: Math.round(avgConfidence * 100) / 100,
      methods,
      successRate: total > 0 ? Math.round((reels / total) * 100) / 100 : 0
    };
  }
}

export default ReelDetector;
