/**
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
}

/**
 * JW Meeting Content API TypeScript Client
 */
export class JWMeetingAPI {
    private baseUrl: string;
    private options: Required<ClientOptions>;
    private cache: Map<string, { data: any; timestamp: number }> = new Map();

    constructor(baseUrl = 'https://neri-gut.github.io/jw-scraping', options: ClientOptions = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.options = {
            timeout: 10000,
            cache: true,
            cacheTimeout: 60 * 60 * 1000,
            ...options
        };
    }

    private async _request<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}/${endpoint}`;
        
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (this.options.cache) {
                this.cache.set(url, { data, timestamp: Date.now() });
            }

            return data;

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.options.timeout}ms`);
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
        return this._request<WeeklyMeeting>(`data/${year}/week-${paddedWeek}.json`);
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
                console.warn(`Failed to fetch week ${weekSummary.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

export default JWMeetingAPI;