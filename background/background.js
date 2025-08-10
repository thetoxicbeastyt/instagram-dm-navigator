
chrome.runtime.onInstalled.addListener(() => {
  console.log("Instagram DM Navigator extension installed.");
});

chrome.runtime.onStartup.addListener(() => {
  console.log("Instagram DM Navigator extension started.");
});

function checkPermissions() {
  chrome.permissions.contains({
    permissions: ['storage', 'scripting'],
    origins: ['https://*.instagram.com/*']
  }, (result) => {
    if (result) {
      console.log("Permissions are granted.");
    } else {
      console.error("Permissions are not granted.");
    }
  });
}

checkPermissions();
