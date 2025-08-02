/**
 * JW Meeting Content API Client
 * Auto-generated JavaScript client for the JW.org Meeting Content API
 * 
 * @version 1.0.0
 * @author Auto-generated
 */

class JWMeetingAPI {
    /**
     * Initialize the API client
     * @param {string} baseUrl - Base URL for the API
     * @param {object} options - Configuration options
     */
    constructor(baseUrl = 'https://neri-gut.github.io/jw-scraping', options = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.options = {
            timeout: 10000,
            cache: true,
            cacheTimeout: 60 * 60 * 1000, // 1 hour
            ...options
        };
        
        this.cache = new Map();
    }

    /**
     * Make a request to the API
     * @private
     * @param {string} endpoint - API endpoint
     * @returns {Promise<object>} API response
     */
    async _request(endpoint) {
        const url = `${this.baseUrl}/${endpoint}`;
        
        // Check cache
        if (this.options.cache && this.cache.has(url)) {
            const cached = this.cache.get(url);
            if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'JW-Meeting-API-Client-JS/1.0.0'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Store in cache
            if (this.options.cache) {
                this.cache.set(url, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.options.timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Get API metadata and information
     * @returns {Promise<object>} API metadata
     */
    async getIndex() {
        return this._request('index.json');
    }

    /**
     * Get the latest week's meeting data
     * @returns {Promise<object>} Latest week data
     */
    async getLatest() {
        return this._request('latest.json');
    }

    /**
     * Get list of all available weeks
     * @returns {Promise<object>} Weeks list
     */
    async getWeeks() {
        return this._request('weeks.json');
    }

    /**
     * Get comprehensive API statistics
     * @returns {Promise<object>} API statistics
     */
    async getStats() {
        return this._request('stats.json');
    }

    /**
     * Get specific week data
     * @param {number} year - Year (e.g., 2025)
     * @param {number} weekNumber - Week number (1-53)
     * @returns {Promise<object>} Week data
     */
    async getWeekData(year, weekNumber) {
        const paddedWeek = weekNumber.toString().padStart(2, '0');
        return this._request(`data/${year}/week-${paddedWeek}.json`);
    }

    /**
     * Search for weeks within a date range
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     * @returns {Promise<Array>} Filtered weeks
     */
    async getWeeksByDateRange(startDate, endDate) {
        const weeks = await this.getWeeks();
        const start = new Date(startDate);
        const end = new Date(endDate);

        return weeks.weeks.filter(week => {
            const weekStart = new Date(week.weekStartDate);
            return weekStart >= start && weekStart <= end;
        });
    }

    /**
     * Get all materials of a specific type
     * @param {string} materialType - Type: 'videos', 'images', 'audio', 'songs'
     * @returns {Promise<Array>} All materials of the specified type
     */
    async getAllMaterials(materialType = 'videos') {
        const weeks = await this.getWeeks();
        const allMaterials = [];

        for (const weekSummary of weeks.weeks) {
            try {
                const weekData = await this.getWeekData(weekSummary.year, weekSummary.weekNumber);
                
                for (const meeting of weekData.meetings) {
                    if (meeting.materials[materialType]) {
                        allMaterials.push(...meeting.materials[materialType].map(material => ({
                            ...material,
                            weekId: weekData.id,
                            meetingType: meeting.type,
                            weekOf: weekData.weekOf
                        })));
                    }
                }
            } catch (error) {
                console.warn(`Failed to fetch week ${weekSummary.id}: ${error.message}`);
            }
        }

        return allMaterials;
    }

    /**
     * Clear the cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JWMeetingAPI;
} else if (typeof window !== 'undefined') {
    window.JWMeetingAPI = JWMeetingAPI;
}

// Example usage:
/*
const api = new JWMeetingAPI();

// Get latest week
api.getLatest().then(data => {
    console.log('Latest week:', data.weekOf);
    console.log('Meetings:', data.meetings.length);
});

// Get specific week
api.getWeekData(2025, 31).then(data => {
    console.log('Week data:', data);
});

// Get all videos
api.getAllMaterials('videos').then(videos => {
    console.log('Total videos:', videos.length);
});
*/