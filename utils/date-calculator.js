/**
 * Date Calculator Utility Module
 * Handles date calculations, filtering, and Instagram-specific date parsing
 */

export class DateCalculator {
  constructor() {
    this.filterTypes = {
      EXACT_DATE: 'exact_date',
      DATE_RANGE: 'date_range',
      DAYS_AGO: 'days_ago',
      WEEKS_AGO: 'weeks_ago',
      MONTHS_AGO: 'months_ago'
    };
  }

  /**
   * Check if a message date matches the specified filter
   * @param {Date} messageDate - Date of the message
   * @param {Date} filterDate - Date to filter by
   * @param {string} filterType - Type of filter to apply
   * @returns {boolean} - Whether the message matches the filter
   */
  matchesFilter(messageDate, filterDate, filterType) {
    try {
      if (!messageDate || !filterDate || !filterType) {
        return false;
      }

      const messageTime = messageDate.getTime();
      const filterTime = filterDate.getTime();

      switch (filterType) {
        case this.filterTypes.EXACT_DATE:
          return this.isSameDay(messageDate, filterDate);

        case this.filterTypes.DATE_RANGE:
          return this.isInDateRange(messageDate, filterDate);

        case this.filterTypes.DAYS_AGO:
          return this.isDaysAgo(messageDate, filterDate);

        case this.filterTypes.WEEKS_AGO:
          return this.isWeeksAgo(messageDate, filterDate);

        case this.filterTypes.MONTHS_AGO:
          return this.isMonthsAgo(messageDate, filterDate);

        default:
          console.warn('Unknown filter type:', filterType);
          return false;
      }
    } catch (error) {
      console.error('Error in matchesFilter:', error);
      return false;
    }
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} - Whether dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Check if a date is within a range (within 24 hours of filter date)
   * @param {Date} messageDate - Message date
   * @param {Date} filterDate - Filter date
   * @returns {boolean} - Whether date is in range
   */
  isInDateRange(messageDate, filterDate) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const diff = Math.abs(messageDate.getTime() - filterDate.getTime());
    return diff <= oneDayMs;
  }

  /**
   * Check if message is from specified days ago
   * @param {Date} messageDate - Message date
   * @param {Date} filterDate - Filter date (days ago)
   * @returns {boolean} - Whether message is from specified days ago
   */
  isDaysAgo(messageDate, filterDate) {
    const now = new Date();
    const daysDiff = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    const filterDays = Math.floor((now - filterDate) / (1000 * 60 * 60 * 24));
    
    return Math.abs(daysDiff - filterDays) <= 1; // Allow 1 day tolerance
  }

  /**
   * Check if message is from specified weeks ago
   * @param {Date} messageDate - Message date
   * @param {Date} filterDate - Filter date (weeks ago)
   * @returns {boolean} - Whether message is from specified weeks ago
   */
  isWeeksAgo(messageDate, filterDate) {
    const now = new Date();
    const weeksDiff = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24 * 7));
    const filterWeeks = Math.floor((now - filterDate) / (1000 * 60 * 60 * 24 * 7));
    
    return Math.abs(weeksDiff - filterWeeks) <= 1; // Allow 1 week tolerance
  }

  /**
   * Check if message is from specified months ago
   * @param {Date} messageDate - Message date
   * @param {Date} filterDate - Filter date (months ago)
   * @returns {boolean} - Whether message is from specified months ago
   */
  isMonthsAgo(messageDate, filterDate) {
    const now = new Date();
    const monthsDiff = (now.getFullYear() - messageDate.getFullYear()) * 12 + 
                      (now.getMonth() - messageDate.getMonth());
    const filterMonths = (now.getFullYear() - filterDate.getFullYear()) * 12 + 
                        (now.getMonth() - filterDate.getMonth());
    
    return Math.abs(monthsDiff - filterMonths) <= 1; // Allow 1 month tolerance
  }

  /**
   * Parse Instagram's relative time format
   * @param {string} timeText - Instagram time text (e.g., "2h", "3d", "1w")
   * @returns {Date} - Parsed date
   */
  parseInstagramTime(timeText) {
    try {
      if (!timeText) return null;

      const now = new Date();
      const text = timeText.toLowerCase().trim();

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

      // Handle years (e.g., "1y", "1 year ago")
      const yearMatch = text.match(/(\d+)\s*y/);
      if (yearMatch) {
        const years = parseInt(yearMatch[1]);
        const newDate = new Date(now);
        newDate.setFullYear(newDate.getFullYear() - years);
        return newDate;
      }

      // Try to parse as absolute date
      const absoluteDate = new Date(text);
      if (!isNaN(absoluteDate.getTime())) {
        return absoluteDate;
      }

      console.warn('Could not parse Instagram time format:', timeText);
      return null;
    } catch (error) {
      console.error('Error parsing Instagram time:', error);
      return null;
    }
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @returns {string} - Formatted date string
   */
  formatDate(date) {
    try {
      if (!date) return 'Unknown';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  }

  /**
   * Get date range for a specific filter type
   * @param {string} filterType - Type of filter
   * @param {Date} filterDate - Filter date
   * @returns {Object} - Start and end dates for the range
   */
  getDateRange(filterType, filterDate) {
    try {
      const now = new Date();
      
      switch (filterType) {
        case this.filterTypes.EXACT_DATE:
          return {
            start: new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate()),
            end: new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59)
          };

        case this.filterTypes.DATE_RANGE:
          const oneDayMs = 24 * 60 * 60 * 1000;
          return {
            start: new Date(filterDate.getTime() - oneDayMs),
            end: new Date(filterDate.getTime() + oneDayMs)
          };

        case this.filterTypes.DAYS_AGO:
          const daysAgo = Math.floor((now - filterDate) / (1000 * 60 * 60 * 24));
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() - daysAgo);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          return { start: startDate, end: endDate };

        default:
          return { start: null, end: null };
      }
    } catch (error) {
      console.error('Error getting date range:', error);
      return { start: null, end: null };
    }
  }
}