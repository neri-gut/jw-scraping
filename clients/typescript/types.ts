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