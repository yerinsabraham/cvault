import { ErrorCode, CVaultError as ICVaultError } from './types';

/**
 * Custom error class for CVault SDK
 */
export class CVaultError extends Error implements ICVaultError {
  code: string;
  statusCode?: number;
  details?: any;

  constructor(code: string, message: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'CVaultError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CVaultError);
    }
  }

  /**
   * Parse API error response and return CVaultError
   */
  static fromResponse(statusCode: number, body: any): CVaultError {
    const message = body?.message || body?.error || 'Unknown error occurred';
    const code = body?.code || this.getErrorCodeFromStatus(statusCode);
    const details = body?.details;

    return new CVaultError(code, message, statusCode, details);
  }

  /**
   * Create a network error
   */
  static networkError(message: string = 'Network request failed'): CVaultError {
    return new CVaultError(ErrorCode.NETWORK_ERROR, message);
  }

  /**
   * Map HTTP status code to error code
   */
  private static getErrorCodeFromStatus(statusCode: number): string {
    switch (statusCode) {
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.INVALID_API_KEY;
      case 404:
        return ErrorCode.NOT_FOUND;
      case 429:
        return ErrorCode.BANDWIDTH_LIMIT_EXCEEDED;
      case 503:
        return ErrorCode.SERVER_UNAVAILABLE;
      default:
        return ErrorCode.UNKNOWN_ERROR;
    }
  }

  /**
   * Convert error to JSON
   */
  toJSON(): ICVaultError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
