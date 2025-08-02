/**
 * Error handling module for the JW.org Meeting Content API
 * Provides standardized error responses and language validation
 */

import { getSupportedLanguages, isLanguageSupported, DEFAULT_LANGUAGE } from './language-config.js';

/**
 * Standard API error class
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, errorType = 'InternalServerError', details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: this.errorType,
      message: this.message,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * Language-specific error for unsupported languages
 */
export class UnsupportedLanguageError extends APIError {
  constructor(language, requestedEndpoint = null) {
    const supportedLangs = getSupportedLanguages().map(l => l.code).join(', ');
    const message = `Language '${language}' is not supported. Supported languages: ${supportedLangs}`;
    
    const details = {
      requestedLanguage: language,
      supportedLanguages: getSupportedLanguages().map(l => ({
        code: l.code,
        name: l.name,
        nativeName: l.nativeName
      })),
      fallbackLanguage: DEFAULT_LANGUAGE,
      ...(requestedEndpoint && { requestedEndpoint })
    };

    super(message, 400, 'UnsupportedLanguage', details);
  }
}

/**
 * Error for when no data is found for a specific language
 */
export class NoDataForLanguageError extends APIError {
  constructor(language, dataType = 'week data') {
    const message = `No ${dataType} available for language '${language}'`;
    
    const details = {
      language,
      dataType,
      suggestion: `Try using the default language '${DEFAULT_LANGUAGE}' or check available languages at /languages.json`
    };

    super(message, 404, 'NoDataForLanguage', details);
  }
}

/**
 * Validate language parameter and provide helpful error
 */
export function validateLanguage(language, endpoint = null) {
  if (!language) {
    return { isValid: true, language: DEFAULT_LANGUAGE }; // Use default if not provided
  }

  const normalizedLang = language.toLowerCase();
  
  if (!isLanguageSupported(normalizedLang)) {
    throw new UnsupportedLanguageError(language, endpoint);
  }

  return { isValid: true, language: normalizedLang };
}

/**
 * Validate and normalize language with fallback
 */
export function validateLanguageWithFallback(language, endpoint = null) {
  if (!language) {
    return { 
      language: DEFAULT_LANGUAGE, 
      usedFallback: false 
    };
  }

  const normalizedLang = language.toLowerCase();
  
  if (!isLanguageSupported(normalizedLang)) {
    console.warn(`Unsupported language '${language}' for ${endpoint || 'request'}, falling back to '${DEFAULT_LANGUAGE}'`);
    return { 
      language: DEFAULT_LANGUAGE, 
      usedFallback: true,
      originalLanguage: language
    };
  }

  return { 
    language: normalizedLang, 
    usedFallback: false 
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error, request = null) {
  if (error instanceof APIError) {
    return {
      ...error.toJSON(),
      ...(request && { path: request.path || request.url })
    };
  }

  // Handle generic errors
  return {
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    ...(request && { path: request.path || request.url }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      originalError: error.message 
    })
  };
}

/**
 * Language validation middleware for Express-like applications
 */
export function languageValidationMiddleware(req, res, next) {
  try {
    const requestedLang = req.query?.lang || req.params?.language;
    const endpoint = req.path;

    if (requestedLang) {
      const validation = validateLanguage(requestedLang, endpoint);
      req.validatedLanguage = validation.language;
    } else {
      req.validatedLanguage = DEFAULT_LANGUAGE;
    }

    next();
  } catch (error) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).json(createErrorResponse(error, req));
    }
    return res.status(500).json(createErrorResponse(error, req));
  }
}

/**
 * Global error handler for Express-like applications
 */
export function globalErrorHandler(error, req, res, next) {
  console.error('API Error:', error);

  const errorResponse = createErrorResponse(error, req);
  const statusCode = error instanceof APIError ? error.statusCode : 500;

  res.status(statusCode).json(errorResponse);
}

/**
 * Check if data exists for a specific language
 */
export function validateDataForLanguage(data, language, dataType = 'data') {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new NoDataForLanguageError(language, dataType);
  }

  // For arrays, check if any item matches the language
  if (Array.isArray(data)) {
    const hasLanguageData = data.some(item => 
      item.metadata?.language === language ||
      item.language === language ||
      item.meetings?.some(meeting => meeting.language === language)
    );

    if (!hasLanguageData) {
      throw new NoDataForLanguageError(language, dataType);
    }
  }

  return true;
}

/**
 * Generate language suggestions for error responses
 */
export function generateLanguageSuggestions(requestedLanguage) {
  const supported = getSupportedLanguages();
  
  // Try to find similar languages
  const suggestions = supported.filter(lang => 
    lang.code.startsWith(requestedLanguage?.substring(0, 2)) ||
    lang.name.toLowerCase().includes(requestedLanguage?.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(requestedLanguage?.toLowerCase())
  );

  return {
    suggestions: suggestions.length > 0 ? suggestions : supported.slice(0, 3),
    defaultFallback: DEFAULT_LANGUAGE,
    allSupported: supported.map(l => ({ code: l.code, name: l.name }))
  };
}

export default {
  APIError,
  UnsupportedLanguageError,
  NoDataForLanguageError,
  validateLanguage,
  validateLanguageWithFallback,
  createErrorResponse,
  languageValidationMiddleware,
  globalErrorHandler,
  validateDataForLanguage,
  generateLanguageSuggestions
};