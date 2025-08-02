package org.jwmeeting.api;

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
        this("https://neri-gut.github.io/jw-scraping");
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
}