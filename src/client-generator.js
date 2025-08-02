#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import SwaggerParser from '@apidevtools/swagger-parser';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ClientGenerator {
    constructor() {
        this.specPath = join(__dirname, '..', 'openapi.yaml');
        this.outputDir = join(__dirname, '..', 'clients');
        this.apiBaseUrl = 'https://neri-gut.github.io/jw-scraping';
    }

    ensureOutputDir() {
        try {
            mkdirSync(this.outputDir, { recursive: true });
            mkdirSync(join(this.outputDir, 'javascript'), { recursive: true });
            mkdirSync(join(this.outputDir, 'python'), { recursive: true });
            mkdirSync(join(this.outputDir, 'typescript'), { recursive: true });
            mkdirSync(join(this.outputDir, 'java'), { recursive: true });
        } catch (error) {
            // Directory already exists
        }
    }

    generateJavaScriptClient() {
        console.log(chalk.blue('🟨 Generating JavaScript client...'));

        const jsClient = `/**
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
    constructor(baseUrl = '${this.apiBaseUrl}', options = {}) {
        this.baseUrl = baseUrl.replace(/\\/$/, ''); // Remove trailing slash
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
        const url = \`\${this.baseUrl}/\${endpoint}\`;
        
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
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
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
                throw new Error(\`Request timeout after \${this.options.timeout}ms\`);
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
        return this._request(\`data/\${year}/week-\${paddedWeek}.json\`);
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
                console.warn(\`Failed to fetch week \${weekSummary.id}: \${error.message}\`);
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
*/`;

        writeFileSync(join(this.outputDir, 'javascript', 'jw-meeting-api.js'), jsClient);
        console.log(chalk.green('✅ JavaScript client generated'));
    }

    generateTypeScriptClient() {
        console.log(chalk.blue('🔵 Generating TypeScript client...'));

        const tsTypes = `/**
 * TypeScript type definitions for JW Meeting Content API
 */

export interface ApiMetadata {
    api: {
        name: string;
        description: string;
        version: string;
        generatedAt: string;
        language: string;
        baseUrl: string;
    };
    endpoints: Record<string, EndpointInfo>;
    stats: QuickStats;
    usage: UsageInfo;
}

export interface EndpointInfo {
    url: string;
    description: string;
    cache: string;
    parameters?: Record<string, string>;
}

export interface QuickStats {
    totalWeeks: number;
    totalMeetings: number;
    totalMaterials: number;
    averageDuration: number;
    lastUpdate: string;
}

export interface UsageInfo {
    examples: UsageExample[];
    cors: string;
    rateLimit: string;
    authentication: string;
}

export interface UsageExample {
    description: string;
    url: string;
}

export interface WeeklyMeeting {
    id: string;
    weekStartDate: string;
    weekEndDate: string;
    weekOf: string;
    year: number;
    weekNumber: number;
    meetings: Meeting[];
    urls?: SourceUrls;
    stats: WeekStats;
    metadata: WeekMetadata;
    meta?: EndpointMeta;
}

export interface Meeting {
    type: 'midweek' | 'weekend';
    title: string;
    date: string;
    url: string;
    sections: MeetingSection[];
    materials: MeetingMaterials;
    totalDuration: number;
    scrapedAt: string;
}

export interface MeetingSection {
    id: string;
    title: string;
    duration: number;
    type: string;
    description?: string;
    materials?: MediaFile[];
    order?: number;
}

export interface MeetingMaterials {
    videos: VideoFile[];
    images: ImageFile[];
    audio: AudioFile[];
    songs: SongFile[];
}

export interface MediaFile {
    id: string;
    title: string;
    downloadUrl: string;
    format: string;
    fileSize?: number;
    duration?: number;
}

export interface VideoFile extends MediaFile {
    format: 'mp4' | 'webm' | 'avi' | 'mov';
    resolution?: string;
    subtitles?: string[];
}

export interface ImageFile extends MediaFile {
    format: 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp';
    sizes?: {
        large?: string;
        medium?: string;
        small?: string;
    };
    dimensions?: {
        width: number;
        height: number;
    };
}

export interface AudioFile extends MediaFile {
    format: 'mp3' | 'wav' | 'aac' | 'ogg';
    bitrate?: number;
}

export interface SongFile extends AudioFile {
    songNumber?: number;
    lyrics?: string;
    sheet_music?: string;
}

export interface WeekSummary {
    id: string;
    weekOf: string;
    weekStartDate: string;
    weekEndDate: string;
    year: number;
    weekNumber: number;
    meetingCount: number;
    totalDuration: number;
    totalMaterials: number;
    dataUrl: string;
    lastUpdated: string;
}

export interface WeekStats {
    totalSections: number;
    totalMaterials: number;
    totalDuration: number;
}

export interface WeekMetadata {
    generatedAt: string;
    weekNumber: number;
    year: number;
    filename?: string;
    version: string;
    language: string;
}

export interface SourceUrls {
    midweek?: string;
    weekend?: string;
    workbook?: string;
    meetings?: string;
}

export interface EndpointMeta {
    endpoint: string;
    description: string;
    generatedAt: string;
    version: string;
    totalWeeksAvailable?: number;
}

export interface WeeksResponse {
    weeks: WeekSummary[];
    meta: EndpointMeta & {
        totalWeeks: number;
        dateRange: DateRange;
    };
}

export interface DateRange {
    earliest: string;
    latest: string;
}

export interface ApiStatistics {
    overview: {
        totalWeeks: number;
        totalMeetings: number;
        totalSections: number;
        totalMaterials: number;
        totalDuration: number;
    };
    byMeetingType: Record<string, MeetingTypeStats>;
    byMaterialType: Record<string, number>;
    byYear: Record<string, YearStats>;
    dateRange: DateRange;
    quality: QualityStats;
    meta: {
        generatedAt: string;
        dataVersion: string;
    };
}

export interface MeetingTypeStats {
    count: number;
    avgDuration: number;
    materials: number;
}

export interface YearStats {
    weeks: number;
    meetings: number;
    materials: number;
}

export interface QualityStats {
    weeksWithErrors: number;
    avgMaterialsPerWeek: number;
    avgSectionsPerMeeting: number;
}

export interface ClientOptions {
    timeout?: number;
    cache?: boolean;
    cacheTimeout?: number;
}`;

        const tsClient = `${tsTypes}

/**
 * JW Meeting Content API TypeScript Client
 */
export class JWMeetingAPI {
    private baseUrl: string;
    private options: Required<ClientOptions>;
    private cache: Map<string, { data: any; timestamp: number }> = new Map();

    constructor(baseUrl = '${this.apiBaseUrl}', options: ClientOptions = {}) {
        this.baseUrl = baseUrl.replace(/\\/$/, '');
        this.options = {
            timeout: 10000,
            cache: true,
            cacheTimeout: 60 * 60 * 1000,
            ...options
        };
    }

    private async _request<T>(endpoint: string): Promise<T> {
        const url = \`\${this.baseUrl}/\${endpoint}\`;
        
        if (this.options.cache && this.cache.has(url)) {
            const cached = this.cache.get(url)!;
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
                    'User-Agent': 'JW-Meeting-API-Client-TS/1.0.0'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            }

            const data = await response.json();

            if (this.options.cache) {
                this.cache.set(url, { data, timestamp: Date.now() });
            }

            return data;

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(\`Request timeout after \${this.options.timeout}ms\`);
            }
            throw error;
        }
    }

    async getIndex(): Promise<ApiMetadata> {
        return this._request<ApiMetadata>('index.json');
    }

    async getLatest(): Promise<WeeklyMeeting> {
        return this._request<WeeklyMeeting>('latest.json');
    }

    async getWeeks(): Promise<WeeksResponse> {
        return this._request<WeeksResponse>('weeks.json');
    }

    async getStats(): Promise<ApiStatistics> {
        return this._request<ApiStatistics>('stats.json');
    }

    async getWeekData(year: number, weekNumber: number): Promise<WeeklyMeeting> {
        const paddedWeek = weekNumber.toString().padStart(2, '0');
        return this._request<WeeklyMeeting>(\`data/\${year}/week-\${paddedWeek}.json\`);
    }

    async getWeeksByDateRange(startDate: Date | string, endDate: Date | string): Promise<WeekSummary[]> {
        const weeks = await this.getWeeks();
        const start = new Date(startDate);
        const end = new Date(endDate);

        return weeks.weeks.filter(week => {
            const weekStart = new Date(week.weekStartDate);
            return weekStart >= start && weekStart <= end;
        });
    }

    async getAllMaterials(materialType: keyof MeetingMaterials = 'videos'): Promise<MediaFile[]> {
        const weeks = await this.getWeeks();
        const allMaterials: MediaFile[] = [];

        for (const weekSummary of weeks.weeks) {
            try {
                const weekData = await this.getWeekData(weekSummary.year, weekSummary.weekNumber);
                
                for (const meeting of weekData.meetings) {
                    const materials = meeting.materials[materialType];
                    if (materials) {
                        allMaterials.push(...materials.map(material => ({
                            ...material,
                            weekId: weekData.id,
                            meetingType: meeting.type,
                            weekOf: weekData.weekOf
                        } as any)));
                    }
                }
            } catch (error) {
                console.warn(\`Failed to fetch week \${weekSummary.id}: \${error instanceof Error ? error.message : 'Unknown error'}\`);
            }
        }

        return allMaterials;
    }

    clearCache(): void {
        this.cache.clear();
    }

    getCacheStats(): { size: number; entries: string[] } {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

export default JWMeetingAPI;`;

        writeFileSync(join(this.outputDir, 'typescript', 'jw-meeting-api.ts'), tsClient);
        writeFileSync(join(this.outputDir, 'typescript', 'types.ts'), tsTypes);
        console.log(chalk.green('✅ TypeScript client generated'));
    }

    generatePythonClient() {
        console.log(chalk.blue('🐍 Generating Python client...'));

        const pythonClient = `"""
JW Meeting Content API Python Client

Auto-generated Python client for the JW.org Meeting Content API

Version: 1.0.0
Author: Auto-generated
"""

import requests
import time
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import json


class JWMeetingAPIError(Exception):
    """Custom exception for API errors"""
    pass


class JWMeetingAPI:
    """
    Python client for the JW Meeting Content API
    
    Provides easy access to weekly meeting content, statistics, and materials
    from the JW.org scraping API.
    """
    
    def __init__(self, base_url: str = "${this.apiBaseUrl}", **options):
        """
        Initialize the API client
        
        Args:
            base_url (str): Base URL for the API
            **options: Configuration options
                - timeout (int): Request timeout in seconds (default: 10)
                - cache (bool): Enable caching (default: True)
                - cache_timeout (int): Cache timeout in seconds (default: 3600)
                - user_agent (str): Custom user agent string
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = options.get('timeout', 10)
        self.cache_enabled = options.get('cache', True)
        self.cache_timeout = options.get('cache_timeout', 3600)
        
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._session = requests.Session()
        self._session.headers.update({
            'Accept': 'application/json',
            'User-Agent': options.get('user_agent', 'JW-Meeting-API-Client-Python/1.0.0')
        })
    
    def _request(self, endpoint: str) -> Dict[str, Any]:
        """
        Make a request to the API
        
        Args:
            endpoint (str): API endpoint
            
        Returns:
            Dict[str, Any]: API response data
            
        Raises:
            JWMeetingAPIError: If the request fails
        """
        url = f"{self.base_url}/{endpoint}"
        
        # Check cache
        if self.cache_enabled and url in self._cache:
            cached = self._cache[url]
            if time.time() - cached['timestamp'] < self.cache_timeout:
                return cached['data']
        
        try:
            response = self._session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            
            # Store in cache
            if self.cache_enabled:
                self._cache[url] = {
                    'data': data,
                    'timestamp': time.time()
                }
            
            return data
            
        except requests.exceptions.RequestException as error:
            raise JWMeetingAPIError(f"Request failed for {url}: {error}")
        except json.JSONDecodeError as error:
            raise JWMeetingAPIError(f"Invalid JSON response from {url}: {error}")
    
    def get_index(self) -> Dict[str, Any]:
        """
        Get API metadata and information
        
        Returns:
            Dict[str, Any]: API metadata
        """
        return self._request('index.json')
    
    def get_latest(self) -> Dict[str, Any]:
        """
        Get the latest week's meeting data
        
        Returns:
            Dict[str, Any]: Latest week data
        """
        return self._request('latest.json')
    
    def get_weeks(self) -> Dict[str, Any]:
        """
        Get list of all available weeks
        
        Returns:
            Dict[str, Any]: Weeks list with metadata
        """
        return self._request('weeks.json')
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive API statistics
        
        Returns:
            Dict[str, Any]: API statistics
        """
        return self._request('stats.json')
    
    def get_week_data(self, year: int, week_number: int) -> Dict[str, Any]:
        """
        Get specific week data
        
        Args:
            year (int): Year (e.g., 2025)
            week_number (int): Week number (1-53)
            
        Returns:
            Dict[str, Any]: Week data
        """
        padded_week = str(week_number).zfill(2)
        return self._request(f'data/{year}/week-{padded_week}.json')
    
    def get_weeks_by_date_range(self, start_date: Union[str, datetime], 
                              end_date: Union[str, datetime]) -> List[Dict[str, Any]]:
        """
        Search for weeks within a date range
        
        Args:
            start_date (Union[str, datetime]): Start date
            end_date (Union[str, datetime]): End date
            
        Returns:
            List[Dict[str, Any]]: Filtered weeks
        """
        weeks_data = self.get_weeks()
        
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        filtered_weeks = []
        for week in weeks_data['weeks']:
            week_start = datetime.fromisoformat(week['weekStartDate'].replace('Z', '+00:00'))
            if start_date <= week_start <= end_date:
                filtered_weeks.append(week)
        
        return filtered_weeks
    
    def get_all_materials(self, material_type: str = 'videos') -> List[Dict[str, Any]]:
        """
        Get all materials of a specific type across all weeks
        
        Args:
            material_type (str): Type of materials ('videos', 'images', 'audio', 'songs')
            
        Returns:
            List[Dict[str, Any]]: All materials of the specified type
        """
        weeks_data = self.get_weeks()
        all_materials = []
        
        for week_summary in weeks_data['weeks']:
            try:
                week_data = self.get_week_data(week_summary['year'], week_summary['weekNumber'])
                
                for meeting in week_data['meetings']:
                    materials = meeting['materials'].get(material_type, [])
                    for material in materials:
                        material_with_context = {
                            **material,
                            'weekId': week_data['id'],
                            'meetingType': meeting['type'],
                            'weekOf': week_data['weekOf']
                        }
                        all_materials.append(material_with_context)
                        
            except Exception as error:
                print(f"Warning: Failed to fetch week {week_summary['id']}: {error}")
        
        return all_materials
    
    def search_materials(self, query: str, material_type: str = 'videos') -> List[Dict[str, Any]]:
        """
        Search for materials by title or description
        
        Args:
            query (str): Search query
            material_type (str): Type of materials to search
            
        Returns:
            List[Dict[str, Any]]: Matching materials
        """
        all_materials = self.get_all_materials(material_type)
        query_lower = query.lower()
        
        return [
            material for material in all_materials
            if query_lower in material.get('title', '').lower() or
               query_lower in material.get('description', '').lower()
        ]
    
    def get_meeting_statistics(self) -> Dict[str, Any]:
        """
        Get detailed meeting statistics with additional analysis
        
        Returns:
            Dict[str, Any]: Enhanced statistics
        """
        stats = self.get_stats()
        weeks_data = self.get_weeks()
        
        # Add enhanced statistics
        enhanced_stats = {
            **stats,
            'enhanced': {
                'totalWeeksAnalyzed': len(weeks_data['weeks']),
                'avgMeetingsPerWeek': stats['overview']['totalMeetings'] / max(stats['overview']['totalWeeks'], 1),
                'avgDurationPerMeeting': stats['overview']['totalDuration'] / max(stats['overview']['totalMeetings'], 1),
                'materialDistribution': {}
            }
        }
        
        # Calculate material distribution
        total_materials = stats['overview']['totalMaterials']
        if total_materials > 0:
            for material_type, count in stats['byMaterialType'].items():
                enhanced_stats['enhanced']['materialDistribution'][material_type] = {
                    'count': count,
                    'percentage': round((count / total_materials) * 100, 2)
                }
        
        return enhanced_stats
    
    def clear_cache(self) -> None:
        """Clear the cache"""
        self._cache.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        
        Returns:
            Dict[str, Any]: Cache stats
        """
        return {
            'size': len(self._cache),
            'entries': list(self._cache.keys()),
            'cache_enabled': self.cache_enabled,
            'cache_timeout': self.cache_timeout
        }
    
    def close(self) -> None:
        """Close the session"""
        self._session.close()
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


# Example usage
if __name__ == "__main__":
    # Basic usage
    api = JWMeetingAPI()
    
    try:
        # Get latest week
        latest = api.get_latest()
        print(f"Latest week: {latest['weekOf']}")
        print(f"Meetings: {len(latest['meetings'])}")
        
        # Get statistics
        stats = api.get_stats()
        print(f"Total materials: {stats['overview']['totalMaterials']}")
        
        # Search for videos
        videos = api.get_all_materials('videos')
        print(f"Total videos: {len(videos)}")
        
    except JWMeetingAPIError as error:
        print(f"API Error: {error}")
    
    # Context manager usage
    with JWMeetingAPI() as api:
        weeks = api.get_weeks()
        print(f"Total weeks available: {weeks['meta']['totalWeeks']}")
`;

        writeFileSync(join(this.outputDir, 'python', 'jw_meeting_api.py'), pythonClient);

        // Create Python package files
        const setupPy = `from setuptools import setup, find_packages

setup(
    name="jw-meeting-api",
    version="1.0.0",
    description="Python client for the JW Meeting Content API",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Auto-generated",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    python_requires=">=3.7",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)`;

        const initPy = `"""
JW Meeting Content API Python Client Package
"""

from .jw_meeting_api import JWMeetingAPI, JWMeetingAPIError

__version__ = "1.0.0"
__all__ = ["JWMeetingAPI", "JWMeetingAPIError"]`;

        const requirementsTxt = `requests>=2.25.0`;

        writeFileSync(join(this.outputDir, 'python', 'setup.py'), setupPy);
        writeFileSync(join(this.outputDir, 'python', '__init__.py'), initPy);
        writeFileSync(join(this.outputDir, 'python', 'requirements.txt'), requirementsTxt);

        console.log(chalk.green('✅ Python client generated'));
    }

    generateJavaClient() {
        console.log(chalk.blue('☕ Generating Java client...'));

        const javaClient = `package org.jwmeeting.api;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.IOException;
import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * JW Meeting Content API Java Client
 * 
 * Auto-generated Java client for the JW.org Meeting Content API
 * 
 * @version 1.0.0
 * @author Auto-generated
 */
public class JWMeetingAPI {
    
    private final String baseUrl;
    private final HttpClient httpClient;
    private final Gson gson;
    private final boolean cacheEnabled;
    private final long cacheTimeoutMs;
    private final Map<String, CacheEntry> cache;
    
    private static class CacheEntry {
        private final String data;
        private final long timestamp;
        
        public CacheEntry(String data, long timestamp) {
            this.data = data;
            this.timestamp = timestamp;
        }
        
        public String getData() { return data; }
        public long getTimestamp() { return timestamp; }
    }
    
    /**
     * Constructor with default configuration
     */
    public JWMeetingAPI() {
        this("${this.apiBaseUrl}");
    }
    
    /**
     * Constructor with custom base URL
     * 
     * @param baseUrl Base URL for the API
     */
    public JWMeetingAPI(String baseUrl) {
        this(baseUrl, Duration.ofSeconds(10), true, Duration.ofHours(1));
    }
    
    /**
     * Constructor with full configuration
     * 
     * @param baseUrl Base URL for the API
     * @param timeout Request timeout
     * @param cacheEnabled Whether to enable caching
     * @param cacheTimeout Cache timeout duration
     */
    public JWMeetingAPI(String baseUrl, Duration timeout, boolean cacheEnabled, Duration cacheTimeout) {
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(timeout)
            .build();
        this.gson = new Gson();
        this.cacheEnabled = cacheEnabled;
        this.cacheTimeoutMs = cacheTimeout.toMillis();
        this.cache = new ConcurrentHashMap<>();
    }
    
    /**
     * Make a request to the API
     * 
     * @param endpoint API endpoint
     * @param responseType Type of response expected
     * @return API response
     * @throws JWMeetingAPIException If the request fails
     */
    private <T> T request(String endpoint, Type responseType) throws JWMeetingAPIException {
        String url = baseUrl + "/" + endpoint;
        
        // Check cache
        if (cacheEnabled && cache.containsKey(url)) {
            CacheEntry cached = cache.get(url);
            if (System.currentTimeMillis() - cached.getTimestamp() < cacheTimeoutMs) {
                return gson.fromJson(cached.getData(), responseType);
            }
        }
        
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .header("User-Agent", "JW-Meeting-API-Client-Java/1.0.0")
                .GET()
                .build();
            
            HttpResponse<String> response = httpClient.send(request, 
                HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() != 200) {
                throw new JWMeetingAPIException(
                    "HTTP " + response.statusCode() + ": " + response.body());
            }
            
            String responseBody = response.body();
            
            // Store in cache
            if (cacheEnabled) {
                cache.put(url, new CacheEntry(responseBody, System.currentTimeMillis()));
            }
            
            return gson.fromJson(responseBody, responseType);
            
        } catch (IOException | InterruptedException e) {
            throw new JWMeetingAPIException("Request failed for " + url + ": " + e.getMessage(), e);
        }
    }
    
    /**
     * Get API metadata and information
     * 
     * @return API metadata
     * @throws JWMeetingAPIException If the request fails
     */
    public Map<String, Object> getIndex() throws JWMeetingAPIException {
        Type type = new TypeToken<Map<String, Object>>(){}.getType();
        return request("index.json", type);
    }
    
    /**
     * Get the latest week's meeting data
     * 
     * @return Latest week data
     * @throws JWMeetingAPIException If the request fails
     */
    public Map<String, Object> getLatest() throws JWMeetingAPIException {
        Type type = new TypeToken<Map<String, Object>>(){}.getType();
        return request("latest.json", type);
    }
    
    /**
     * Get list of all available weeks
     * 
     * @return Weeks list
     * @throws JWMeetingAPIException If the request fails
     */
    public Map<String, Object> getWeeks() throws JWMeetingAPIException {
        Type type = new TypeToken<Map<String, Object>>(){}.getType();
        return request("weeks.json", type);
    }
    
    /**
     * Get comprehensive API statistics
     * 
     * @return API statistics
     * @throws JWMeetingAPIException If the request fails
     */
    public Map<String, Object> getStats() throws JWMeetingAPIException {
        Type type = new TypeToken<Map<String, Object>>(){}.getType();
        return request("stats.json", type);
    }
    
    /**
     * Get specific week data
     * 
     * @param year Year (e.g., 2025)
     * @param weekNumber Week number (1-53)
     * @return Week data
     * @throws JWMeetingAPIException If the request fails
     */
    public Map<String, Object> getWeekData(int year, int weekNumber) throws JWMeetingAPIException {
        String paddedWeek = String.format("%02d", weekNumber);
        String endpoint = String.format("data/%d/week-%s.json", year, paddedWeek);
        Type type = new TypeToken<Map<String, Object>>(){}.getType();
        return request(endpoint, type);
    }
    
    /**
     * Get all materials of a specific type
     * 
     * @param materialType Type of materials ('videos', 'images', 'audio', 'songs')
     * @return List of materials
     * @throws JWMeetingAPIException If the request fails
     */
    public List<Map<String, Object>> getAllMaterials(String materialType) throws JWMeetingAPIException {
        Map<String, Object> weeksResponse = getWeeks();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> weeks = (List<Map<String, Object>>) weeksResponse.get("weeks");
        
        List<Map<String, Object>> allMaterials = new ArrayList<>();
        
        for (Map<String, Object> weekSummary : weeks) {
            try {
                int year = ((Double) weekSummary.get("year")).intValue();
                int weekNumber = ((Double) weekSummary.get("weekNumber")).intValue();
                
                Map<String, Object> weekData = getWeekData(year, weekNumber);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> meetings = (List<Map<String, Object>>) weekData.get("meetings");
                
                for (Map<String, Object> meeting : meetings) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> materials = (Map<String, Object>) meeting.get("materials");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> typedMaterials = 
                        (List<Map<String, Object>>) materials.get(materialType);
                    
                    if (typedMaterials != null) {
                        for (Map<String, Object> material : typedMaterials) {
                            Map<String, Object> enrichedMaterial = new HashMap<>(material);
                            enrichedMaterial.put("weekId", weekData.get("id"));
                            enrichedMaterial.put("meetingType", meeting.get("type"));
                            enrichedMaterial.put("weekOf", weekData.get("weekOf"));
                            allMaterials.add(enrichedMaterial);
                        }
                    }
                }
                
            } catch (Exception e) {
                System.err.println("Warning: Failed to fetch week " + 
                    weekSummary.get("id") + ": " + e.getMessage());
            }
        }
        
        return allMaterials;
    }
    
    /**
     * Clear the cache
     */
    public void clearCache() {
        cache.clear();
    }
    
    /**
     * Get cache statistics
     * 
     * @return Cache statistics
     */
    public Map<String, Object> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("size", cache.size());
        stats.put("entries", new ArrayList<>(cache.keySet()));
        stats.put("cacheEnabled", cacheEnabled);
        stats.put("cacheTimeoutMs", cacheTimeoutMs);
        return stats;
    }
    
    /**
     * Custom exception for API errors
     */
    public static class JWMeetingAPIException extends Exception {
        public JWMeetingAPIException(String message) {
            super(message);
        }
        
        public JWMeetingAPIException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}`;

        const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>org.jwmeeting</groupId>
    <artifactId>jw-meeting-api-client</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <name>JW Meeting API Client</name>
    <description>Java client for the JW Meeting Content API</description>
    <url>https://github.com/neri-gut/jw-scraping</url>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>com.google.code.gson</groupId>
            <artifactId>gson</artifactId>
            <version>2.10.1</version>
        </dependency>
        
        <!-- Test dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.9.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>11</source>
                    <target>11</target>
                </configuration>
            </plugin>
            
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0-M9</version>
            </plugin>
        </plugins>
    </build>
</project>`;

        // Create directory structure
        mkdirSync(join(this.outputDir, 'java', 'src', 'main', 'java', 'org', 'jwmeeting', 'api'), { recursive: true });
        
        writeFileSync(join(this.outputDir, 'java', 'src', 'main', 'java', 'org', 'jwmeeting', 'api', 'JWMeetingAPI.java'), javaClient);
        writeFileSync(join(this.outputDir, 'java', 'pom.xml'), pomXml);

        console.log(chalk.green('✅ Java client generated'));
    }

    generateREADME() {
        console.log(chalk.blue('📝 Generating client documentation...'));

        const readme = `# JW Meeting Content API Clients

Auto-generated client libraries for the JW Meeting Content API in multiple programming languages.

## Available Clients

### JavaScript/Node.js
- **File**: \`javascript/jw-meeting-api.js\`
- **Compatible with**: Browser, Node.js, React, Vue, Angular
- **Features**: Caching, timeout handling, Promise-based

**Quick Start:**
\`\`\`javascript
const api = new JWMeetingAPI();

// Get latest week
api.getLatest().then(data => {
    console.log('Latest week:', data.weekOf);
});
\`\`\`

### TypeScript
- **File**: \`typescript/jw-meeting-api.ts\`
- **Features**: Full type definitions, IntelliSense support
- **Dependencies**: None (uses native fetch)

**Quick Start:**
\`\`\`typescript
import { JWMeetingAPI } from './jw-meeting-api';

const api = new JWMeetingAPI();
const latest = await api.getLatest();
console.log(\`Week: \${latest.weekOf}\`);
\`\`\`

### Python
- **File**: \`python/jw_meeting_api.py\`
- **Dependencies**: \`requests\`
- **Features**: Context manager support, enhanced error handling

**Installation:**
\`\`\`bash
cd python
pip install -r requirements.txt
\`\`\`

**Quick Start:**
\`\`\`python
from jw_meeting_api import JWMeetingAPI

api = JWMeetingAPI()
latest = api.get_latest()
print(f"Latest week: {latest['weekOf']}")
\`\`\`

### Java
- **File**: \`java/src/main/java/org/jwmeeting/api/JWMeetingAPI.java\`
- **Dependencies**: Gson for JSON parsing
- **Features**: Maven project structure, comprehensive error handling

**Build:**
\`\`\`bash
cd java
mvn compile
\`\`\`

**Quick Start:**
\`\`\`java
JWMeetingAPI api = new JWMeetingAPI();
try {
    Map<String, Object> latest = api.getLatest();
    System.out.println("Latest week: " + latest.get("weekOf"));
} catch (JWMeetingAPIException e) {
    e.printStackTrace();
}
\`\`\`

## Common Features

All clients provide these core methods:

- \`getIndex()\` - API metadata
- \`getLatest()\` - Latest week data
- \`getWeeks()\` - List all available weeks  
- \`getStats()\` - API statistics
- \`getWeekData(year, weekNumber)\` - Specific week data
- \`getAllMaterials(type)\` - Get all materials of a type

## Configuration Options

### Caching
All clients support caching to improve performance:
- **Default**: Enabled with 1-hour timeout
- **Benefits**: Reduces API calls, faster response times
- **Control**: Can be disabled or timeout adjusted

### Timeout
- **Default**: 10 seconds
- **Customizable**: Set appropriate timeout for your use case

### User Agent
All clients identify themselves with a proper User-Agent header.

## Error Handling

Each client includes robust error handling:
- **Network errors**: Connection timeouts, DNS failures
- **HTTP errors**: 404, 500, etc. with descriptive messages  
- **JSON parsing errors**: Invalid response data
- **Custom exceptions**: Language-specific error types

## Examples

### Get All Videos
\`\`\`javascript
// JavaScript
const videos = await api.getAllMaterials('videos');
console.log(\`Found \${videos.length} videos\`);
\`\`\`

\`\`\`python
# Python
videos = api.get_all_materials('videos')
print(f"Found {len(videos)} videos")
\`\`\`

### Filter by Date Range
\`\`\`javascript
// JavaScript
const weeks = await api.getWeeksByDateRange('2025-01-01', '2025-03-31');
\`\`\`

\`\`\`python
# Python
weeks = api.get_weeks_by_date_range('2025-01-01', '2025-03-31')
\`\`\`

### Cache Management
\`\`\`javascript
// JavaScript
api.clearCache();
const stats = api.getCacheStats();
\`\`\`

\`\`\`python
# Python
api.clear_cache()
stats = api.get_cache_stats()
\`\`\`

## Performance Tips

1. **Enable caching** for better performance
2. **Reuse client instances** instead of creating new ones
3. **Handle errors gracefully** with try-catch blocks
4. **Use appropriate timeouts** for your network conditions

## Support

- **Base URL**: \`${this.apiBaseUrl}\`
- **API Documentation**: [OpenAPI Specification](../openapi.yaml)
- **Interactive Docs**: [Swagger UI](../docs.html)

## License

Generated clients are provided under the same license as the main project (MIT).

---

*Auto-generated on ${new Date().toISOString()}*`;

        writeFileSync(join(this.outputDir, 'README.md'), readme);
        console.log(chalk.green('✅ Client documentation generated'));
    }

    async generateAll() {
        console.log(chalk.bold.blue('🏗️ Generating API clients for all languages...\n'));

        try {
            this.ensureOutputDir();
            
            // Generate clients for each language
            this.generateJavaScriptClient();
            this.generateTypeScriptClient();
            this.generatePythonClient();
            this.generateJavaClient();
            this.generateREADME();

            console.log('\n' + chalk.bold.green('🎉 All API clients generated successfully!'));
            console.log(chalk.gray(`Output directory: ${this.outputDir}`));
            
            return true;

        } catch (error) {
            console.error(chalk.red('💥 Client generation failed:'), error);
            return false;
        }
    }
}

// CLI execution
async function main() {
    const generator = new ClientGenerator();
    
    const language = process.argv[2];
    
    switch (language) {
        case 'javascript':
        case 'js':
            generator.ensureOutputDir();
            generator.generateJavaScriptClient();
            break;
        case 'typescript':
        case 'ts':
            generator.ensureOutputDir();
            generator.generateTypeScriptClient();
            break;
        case 'python':
        case 'py':
            generator.ensureOutputDir();
            generator.generatePythonClient();
            break;
        case 'java':
            generator.ensureOutputDir();
            generator.generateJavaClient();
            break;
        case 'docs':
            generator.ensureOutputDir();
            generator.generateREADME();
            break;
        case 'all':
        default:
            await generator.generateAll();
            break;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(chalk.red('💥 Generation failed:'), error);
        process.exit(1);
    });
}

export default ClientGenerator;