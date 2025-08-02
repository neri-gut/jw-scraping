"""
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
    
    def __init__(self, base_url: str = "https://neri-gut.github.io/jw-scraping", **options):
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
