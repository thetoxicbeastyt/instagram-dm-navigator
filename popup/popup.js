console.log("Popup script loaded");

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("timestamp").textContent = new Date().toLocaleString();

  const testButton = document.getElementById("test-button");
  const resultsDiv = document.getElementById("results");
  const resultsContent = document.getElementById("results-content");
  
  if (testButton) {
    testButton.addEventListener("click", async function() {
      console.log("Popup button clicked");
      
      // Show loading state
      testButton.textContent = "Testing...";
      testButton.disabled = true;
      resultsDiv.style.display = "none";
      
      try {
        // Get the active tab to send message to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url && tab.url.includes('instagram.com/direct')) {
          console.log("Sending message to content script...");
          
          // Send message to content script with proper error handling
          chrome.tabs.sendMessage(tab.id, { type: 'TEST_BUTTON_CLICKED' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Message sending error:', chrome.runtime.lastError);
              document.getElementById("timestamp").textContent = "Error: " + chrome.runtime.lastError.message;
            } else if (response && response.success) {
              console.log("Response from content script:", response);
              // Display results
              displayResults(response.results);
              document.getElementById("timestamp").textContent = "Test completed successfully!";
            } else {
              console.error("Test failed:", response);
              document.getElementById("timestamp").textContent = "Test failed: " + (response?.error || "Unknown error");
            }
          });
        } else {
          console.error("Not on Instagram DM page");
          document.getElementById("timestamp").textContent = "Please navigate to Instagram DM page first";
        }
      } catch (error) {
        console.error("Error sending message:", error);
        document.getElementById("timestamp").textContent = "Error: " + error.message;
      } finally {
        // Reset button state
        testButton.textContent = "Test Button";
        testButton.disabled = false;
      }
    });
  } else {
    console.error("Test button not found");
  }

  function displayResults(results) {
    if (results.error) {
      resultsContent.innerHTML = `<p style="color: red;">Error: ${results.error}</p>`;
    } else {
      const html = `
        <div style="text-align: left; margin: 10px 0;">
          <p><strong>Messages:</strong> ${results.messages}</p>
          <p><strong>Timestamps:</strong> ${results.timestamps}</p>
          <p><strong>Videos:</strong> ${results.videos}</p>
        </div>
      `;
      resultsContent.innerHTML = html;
    }
    resultsDiv.style.display = "block";
  }
});