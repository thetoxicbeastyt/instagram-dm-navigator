# Instagram DM Time Scroll Chrome Extension

A simple Chrome extension that automatically scrolls back 2 months in Instagram DM conversations with a single click.

## Features

- **One-Click Scrolling**: Automatically scroll back 2 months in Instagram DMs
- **Smart Date Detection**: Parses Instagram's date formats and stops at the target date
- **Human-Like Behavior**: Uses random delays and natural scrolling patterns
- **Context Menu Access**: Right-click the extension icon for quick access
- **Clean UI**: Simple popup interface with status feedback

## Installation

### Method 1: Load Unpacked Extension (Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

### Method 2: Install from Chrome Web Store (Coming Soon)

1. Search for "Instagram DM Time Scroll" in the Chrome Web Store
2. Click "Add to Chrome"
3. Confirm the installation

## Usage

### Basic Usage

1. **Navigate to Instagram DMs**:
   - Go to [instagram.com](https://instagram.com)
   - Click on the Direct Messages icon (paper plane)
   - Open any conversation

2. **Start Scrolling**:
   - Click the extension icon in your toolbar
   - Click "Scroll to 2 Months Ago" in the popup
   - OR right-click the extension icon and select "Scroll to 2 months ago"

3. **Wait for Completion**:
   - The extension will automatically scroll up
   - It will stop when it reaches messages from approximately 2 months ago
   - You'll see a notification when complete

### Advanced Usage

- **Context Menu**: Right-click the extension icon for quick access without opening the popup
- **Status Feedback**: The extension shows progress and completion status
- **Error Handling**: Graceful handling of Instagram layout changes and network issues

## How It Works

### Date Detection

The extension identifies Instagram's date formats:

- **Relative dates**: "2 days ago", "3 months ago"
- **Absolute dates**: "Dec 15", "January 3"
- **ISO dates**: From `datetime` attributes
- **Title attributes**: From message timestamps

### Smart Scrolling

1. **Target Calculation**: Calculates the date 2 months ago from today
2. **DOM Analysis**: Finds the scrollable DM conversation container
3. **Incremental Scrolling**: Scrolls up in small increments to trigger lazy loading
4. **Date Checking**: After each scroll, checks visible dates against target
5. **Completion**: Stops when target date range is reached

### Human-Like Behavior

- **Random Delays**: 200-800ms delays between scrolls
- **Natural Patterns**: Mimics human scrolling behavior
- **Rate Limiting**: Respects Instagram's loading patterns
- **Error Recovery**: Handles network issues and DOM changes

## Technical Details

### File Structure

```
instagram-dm-time-scroll/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for context menu
├── content.js            # Content script for Instagram interaction
├── popup.html            # Extension popup interface
├── popup.js              # Popup script logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Permissions

- `activeTab`: Access to the current Instagram tab
- `contextMenus`: Create right-click context menu
- `host_permissions`: Access to Instagram.com

### Browser Compatibility

- **Chrome**: 88+ (Manifest V3 support)
- **Edge**: 88+ (Chromium-based)
- **Opera**: 74+ (Chromium-based)

## Configuration

### Scroll Settings

You can modify these constants in `content.js`:

```javascript
const SCROLL_CONFIG = {
  DELAY_MIN: 200,        // Minimum delay between scrolls (ms)
  DELAY_MAX: 800,        // Maximum delay between scrolls (ms)
  SCROLL_AMOUNT: 300,    // Pixels to scroll each time
  MAX_SCROLL_ATTEMPTS: 100, // Maximum scroll attempts
  LOAD_WAIT_TIME: 1000   // Wait time for content to load (ms)
};
```

### Date Detection

Modify date selectors in `content.js`:

```javascript
const DATE_CONFIG = {
  TARGET_MONTHS_AGO: 2,  // Target months to scroll back
  DATE_SELECTORS: [       // CSS selectors for date elements
    '[data-testid="message-timestamp"]',
    'time[datetime]',
    '.timestamp',
    // ... more selectors
  ]
};
```

## Troubleshooting

### Common Issues

**Extension doesn't work on Instagram**
- Ensure you're on instagram.com
- Make sure you're in a DM conversation
- Check that the page is fully loaded

**Scrolling stops too early**
- Instagram may have changed their DOM structure
- Check the browser console for errors
- Try refreshing the page and retrying

**Scrolling doesn't stop**
- The conversation may not have messages from 2 months ago
- Instagram's date format may have changed
- Check browser console for parsing errors

### Debug Mode

1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for messages from "Instagram DM Time Scroll"
4. Check for any error messages

### Error Reporting

If you encounter issues:

1. Open the browser console
2. Look for error messages
3. Take a screenshot of the console
4. Report the issue with:
   - Chrome version
   - Instagram URL
   - Console error messages
   - Steps to reproduce

## Development

### Building from Source

1. Clone the repository
2. Make your changes
3. Load as unpacked extension in Chrome
4. Test on Instagram DMs

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Testing

- Test on different Instagram DM conversation lengths
- Test with various date formats
- Test on different Chrome versions
- Test with slow network connections

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or store any personal data
- **Local Processing**: All date parsing and scrolling happens locally
- **Minimal Permissions**: Only requests necessary permissions for functionality
- **Open Source**: Code is transparent and auditable

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions:

1. Check the troubleshooting section above
2. Search existing issues
3. Create a new issue with detailed information
4. Include browser version and Instagram URL

## Changelog

### Version 1.0.0
- Initial release
- Basic 2-month scroll functionality
- Context menu support
- Simple popup interface
- Human-like scrolling behavior