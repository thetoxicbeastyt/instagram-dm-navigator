class InstagramDetector {
  constructor() {
    this.log("InstagramDetector initialized");
  }

  log(message, level = "info") {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  waitForInstagramReady() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = 30000; // 30 seconds
      let attempt = 0;

      const checkReadiness = () => {
        this.log("Checking for Instagram readiness...");
        const pageType = this.getPageType();

        if (pageType === 'dm-conversation') {
          this.log("DM conversation page detected. Verifying DOM readiness...");
          this.observeDOM().then((detectedElements) => {
            resolve({ isReady: true, pageType: 'dm-conversation', confidence: 0.9, detectedElements });
          }).catch(reject);
        } else {
          this.log(`Not on a DM conversation page. Page type: ${pageType}`);
          if (Date.now() - startTime > timeout) {
            reject(new Error("Timeout: Instagram app did not become ready in 30 seconds."));
          } else {
            attempt++;
            const delay = Math.min(100 * Math.pow(2, attempt), 5000);
            this.log(`Retrying in ${delay}ms...`);
            setTimeout(checkReadiness, delay);
          }
        }
      };

      checkReadiness();
    });
  }

  getPageType() {
    const url = window.location.href;
    if (url.includes('/direct/t/')) {
      return 'dm-conversation';
    } else if (url.includes('/direct/inbox/')) {
      return 'dm-inbox';
    } else {
      return 'other';
    }
  }

  observeDOM() {
    return new Promise((resolve, reject) => {
      const observer = new MutationObserver((mutations, obs) => {
        const detectedElements = this.runDetectionStrategies();
        if (detectedElements.length > 0) {
          obs.disconnect();
          resolve(detectedElements);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout for the observer
      setTimeout(() => {
        observer.disconnect();
        reject(new Error("DOM observation timed out."));
      }, 20000);
    });
  }

  runDetectionStrategies() {
    const detectedElements = [];

    // Strategy 1: Check for main React root element
    const reactRoot = document.getElementById('react-root');
    if (reactRoot) {
      this.log("React root element found.");
      detectedElements.push('react-root');
    }

    // Strategy 2: Verify message thread container exists
    const messageThread = document.querySelector('div[data-testid="message-thread"]');
    if (messageThread) {
      this.log("Message thread container found.");
      detectedElements.push('message-thread');
    }

    // Strategy 3: Confirm Instagram's navigation elements are present
    const navBar = document.querySelector('div[data-testid="nav-bar"]');
    if (navBar) {
      this.log("Navigation bar found.");
      detectedElements.push('nav-bar');
    }

    // Strategy 4: Wait for any loading spinners to disappear
    const spinner = document.querySelector('div[data-testid="loading-spinner"]');
    if (!spinner) {
      this.log("No loading spinners found.");
      detectedElements.push('no-spinner');
    }

    return detectedElements;
  }
}

// Export the class as default export
export default InstagramDetector;
