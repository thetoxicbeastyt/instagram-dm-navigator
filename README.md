# Instagram DM Navigator

A Chrome extension that helps you navigate Instagram Direct Messages with date-based filtering and human-like scrolling patterns.

## Features

- **Date-based Filtering**: Filter messages by exact date, date range, or relative time periods
- **Human-like Scrolling**: Advanced scrolling patterns that mimic natural user behavior
- **Visual Highlighting**: Messages matching your filter criteria are highlighted
- **Progress Tracking**: Real-time progress updates during navigation
- **Context Menu Integration**: Right-click activation for quick access
- **Modern UI**: Clean, responsive popup interface

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `instagram-dm-navigator` folder
5. The extension should now appear in your extensions list

### Requirements

- Google Chrome (Manifest V3 compatible)
- Instagram account and access to Instagram DMs

## Usage

### Basic Usage

1. **Navigate to Instagram DMs**
   - Go to [instagram.com](https://instagram.com)
   - Log in to your account
   - Navigate to your Direct Messages

2. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - Or right-click on the page and select "Navigate Instagram DMs"

3. **Configure Date Filter**
   - Select a filter type (Exact Date, Date Range, Days Ago, etc.)
   - Choose your target date or time period
   - Use quick date buttons for common periods

4. **Start Navigation**
   - Click "Activate Navigation"
   - The extension will scroll through your DMs
   - Matching messages will be highlighted

### Filter Types

- **Exact Date**: Find messages from a specific date
- **Date Range**: Find messages within 24 hours of a date
- **Days Ago**: Find messages from X days ago
- **Weeks Ago**: Find messages from X weeks ago
- **Months Ago**: Find messages from X months ago

### Navigation Options

- **Scroll Direction**: Choose to scroll up (older messages) or down (newer messages)
- **Max Scrolls**: Set the maximum number of scroll operations
- **Progress Tracking**: Monitor scroll count and found messages

## Architecture

The extension follows a modular architecture with clear separation of concerns:

```
instagram-dm-navigator/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for background tasks
├── content-script.js      # Main content script for DOM interaction
├── popup/                 # Popup UI components
│   ├── popup.html        # Popup HTML structure
│   ├── popup.js          # Popup JavaScript logic
│   └── popup.css         # Popup styling
├── utils/                 # Utility modules
│   ├── date-calculator.js # Date parsing and filtering
│   ├── dom-helpers.js    # DOM manipulation utilities
│   └── scroll-controller.js # Human-like scrolling logic
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Components

- **Background Service Worker**: Handles context menu creation and message routing
- **Content Script**: Manages DOM interactions and Instagram-specific logic
- **Utility Modules**: Modular code for date calculations, DOM helpers, and scrolling
- **Popup Interface**: Modern UI for configuration and control

## Technical Details

### Manifest V3 Compliance

- Uses service workers instead of background pages
- Implements proper permission handling
- Follows Chrome extension best practices

### Human-like Scrolling

The extension implements sophisticated scrolling patterns to avoid detection:

- **Variable Scroll Amounts**: Random scroll distances within configured ranges
- **Natural Pauses**: Random delays between scroll operations
- **Smooth Animations**: Easing functions for realistic movement
- **Acceleration/Deceleration**: Mimics natural scroll behavior

### Error Handling

- Comprehensive try-catch blocks throughout the codebase
- Graceful degradation when elements aren't found
- User-friendly error messages
- Automatic cleanup on errors

### Performance Optimization

- Efficient DOM queries with multiple fallback selectors
- Debounced progress updates
- Memory leak prevention with proper cleanup
- Minimal impact on page performance

## Development

### Prerequisites

- Node.js (for development tools)
- Chrome browser with developer mode enabled

### Local Development

1. Clone the repository
2. Make your changes
3. Load the extension in Chrome as described in Installation
4. Test on Instagram DMs

### Code Standards

- ES6+ features (async/await, destructuring, modules)
- Comprehensive JSDoc comments
- SOLID principles
- Error boundaries and proper error handling
- Meaningful variable names and functions

### Testing

The extension can be tested by:

1. Loading it in Chrome
2. Navigating to Instagram DMs
3. Using various date filters
4. Testing different scroll directions
5. Verifying message highlighting

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or transmit any user data
- **Local Processing**: All filtering and scrolling happens locally in the browser
- **Minimal Permissions**: Only requests necessary permissions for Instagram DMs
- **Open Source**: Full transparency of code and functionality

## Troubleshooting

### Common Issues

1. **Extension not working on Instagram**
   - Ensure you're on instagram.com
   - Check that you're in the DMs section
   - Verify the extension is enabled

2. **No messages found**
   - Try different date ranges
   - Check if messages exist for the selected time period
   - Verify the scroll direction is correct

3. **Scrolling stops unexpectedly**
   - Instagram may have loaded all available messages
   - Try adjusting the max scrolls setting
   - Check for any error messages in the console

### Debug Mode

To enable debug logging:

1. Open Chrome DevTools
2. Go to the Console tab
3. Look for messages from "Instagram DM Navigator"

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Disclaimer

This extension is for educational and personal use only. Users are responsible for complying with Instagram's Terms of Service and applicable laws. The developers are not responsible for any misuse of this tool.

## Support

For issues, questions, or feature requests:

1. Check the troubleshooting section above
2. Review the code comments for technical details
3. Open an issue on the repository
4. Ensure you're using the latest version

---

**Note**: This extension is designed to work with Instagram's web interface. Instagram may update their interface, which could affect functionality. The extension will be updated to maintain compatibility.