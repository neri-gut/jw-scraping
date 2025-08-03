# JW Meeting Content API Clients

Auto-generated client libraries for the JW Meeting Content API in multiple programming languages.

## Available Clients

### JavaScript/Node.js
- **File**: `javascript/jw-meeting-api.js`
- **Compatible with**: Browser, Node.js, React, Vue, Angular
- **Features**: Caching, timeout handling, Promise-based

**Quick Start:**
```javascript
const api = new JWMeetingAPI();

// Get latest week
api.getLatest().then(data => {
    console.log('Latest week:', data.weekOf);
});
```

### TypeScript
- **File**: `typescript/jw-meeting-api.ts`
- **Features**: Full type definitions, IntelliSense support
- **Dependencies**: None (uses native fetch)

**Quick Start:**
```typescript
import { JWMeetingAPI } from './jw-meeting-api';

const api = new JWMeetingAPI();
const latest = await api.getLatest();
console.log(`Week: ${latest.weekOf}`);
```

### Python
- **File**: `python/jw_meeting_api.py`
- **Dependencies**: `requests`
- **Features**: Context manager support, enhanced error handling

**Installation:**
```bash
cd python
pip install -r requirements.txt
```

**Quick Start:**
```python
from jw_meeting_api import JWMeetingAPI

api = JWMeetingAPI()
latest = api.get_latest()
print(f"Latest week: {latest['weekOf']}")
```

### Java
- **File**: `java/src/main/java/org/jwmeeting/api/JWMeetingAPI.java`
- **Dependencies**: Gson for JSON parsing
- **Features**: Maven project structure, comprehensive error handling

**Build:**
```bash
cd java
mvn compile
```

**Quick Start:**
```java
JWMeetingAPI api = new JWMeetingAPI();
try {
    Map<String, Object> latest = api.getLatest();
    System.out.println("Latest week: " + latest.get("weekOf"));
} catch (JWMeetingAPIException e) {
    e.printStackTrace();
}
```

## Common Features

All clients provide these core methods:

- `getIndex()` - API metadata
- `getLatest()` - Latest week data
- `getWeeks()` - List all available weeks  
- `getStats()` - API statistics
- `getWeekData(year, weekNumber)` - Specific week data
- `getAllMaterials(type)` - Get all materials of a type

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
```javascript
// JavaScript
const videos = await api.getAllMaterials('videos');
console.log(`Found ${videos.length} videos`);
```

```python
# Python
videos = api.get_all_materials('videos')
print(f"Found {len(videos)} videos")
```

### Filter by Date Range
```javascript
// JavaScript
const weeks = await api.getWeeksByDateRange('2025-01-01', '2025-03-31');
```

```python
# Python
weeks = api.get_weeks_by_date_range('2025-01-01', '2025-03-31')
```

### Cache Management
```javascript
// JavaScript
api.clearCache();
const stats = api.getCacheStats();
```

```python
# Python
api.clear_cache()
stats = api.get_cache_stats()
```

## Performance Tips

1. **Enable caching** for better performance
2. **Reuse client instances** instead of creating new ones
3. **Handle errors gracefully** with try-catch blocks
4. **Use appropriate timeouts** for your network conditions

## Support

- **Base URL**: `https://neri-gut.github.io/jw-scraping`
- **API Documentation**: [OpenAPI Specification](../openapi.yaml)
- **Interactive Docs**: [Swagger UI](../docs.html)

## License

Generated clients are provided under the same license as the main project (MIT).

---

*Auto-generated on 2025-08-03T06:32:33.471Z*