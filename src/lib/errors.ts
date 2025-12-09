/**
 * User-friendly error message utility
 * Converts technical HTTP errors and exceptions to user-friendly messages
 */

// HTTP status code to user-friendly message mapping
const HTTP_ERROR_MESSAGES: Record<number, string> = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Invalid email or password. Please try again.',
    403: "You don't have permission to perform this action.",
    404: 'The requested resource was not found.',
    409: 'This record already exists.',
    422: 'Please check your input and try again.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Something went wrong. Please try again later.',
    502: 'Server is temporarily unavailable. Please try again later.',
    503: 'Server is temporarily unavailable. Please try again later.',
    504: 'Server took too long to respond. Please try again later.',
}

// Context-specific error messages for login
const LOGIN_ERROR_MESSAGES: Record<number, string> = {
    401: 'Invalid email or password. Please try again.',
    403: 'Your account has been disabled. Please contact support.',
    404: 'Account not found. Please check your email address.',
    429: 'Too many login attempts. Please wait a few minutes and try again.',
}

// Context-specific error messages for data operations
const DATA_ERROR_MESSAGES: Record<number, string> = {
    400: 'Invalid data provided. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: "You don't have permission to access this data.",
    404: 'The requested data was not found.',
    409: 'A record with this information already exists.',
    422: 'Some required fields are missing or invalid.',
}

/**
 * Error context types for more specific error messages
 */
export type ErrorContext = 'login' | 'data' | 'general'

/**
 * Check if an error is a network error
 */
function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return true
    }
    if (error instanceof Error) {
        const message = error.message.toLowerCase()
        return (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('connection') ||
            message.includes('offline') ||
            message.includes('internet')
        )
    }
    return false
}

/**
 * Extract HTTP status code from error message
 */
function extractStatusCode(error: unknown): number | null {
    if (error instanceof Error) {
        // Match patterns like "HTTP 500:" or "HTTP 401" or "status: 500"
        const httpMatch = error.message.match(/HTTP\s*(\d{3})/i)
        if (httpMatch) {
            return parseInt(httpMatch[1], 10)
        }
        const statusMatch = error.message.match(/status[:\s]*(\d{3})/i)
        if (statusMatch) {
            return parseInt(statusMatch[1], 10)
        }
    }
    return null
}

/**
 * Get user-friendly error message from any error
 * @param error - The error to convert
 * @param context - The context of the error for more specific messages
 * @returns A user-friendly error message
 */
export function getErrorMessage(error: unknown, context: ErrorContext = 'general'): string {
    // Handle network errors first
    if (isNetworkError(error)) {
        return 'Network error. Please check your internet connection and try again.'
    }

    // Try to extract HTTP status code
    const statusCode = extractStatusCode(error)

    if (statusCode) {
        // Get context-specific message first
        let contextMessages: Record<number, string>
        switch (context) {
            case 'login':
                contextMessages = LOGIN_ERROR_MESSAGES
                break
            case 'data':
                contextMessages = DATA_ERROR_MESSAGES
                break
            default:
                contextMessages = HTTP_ERROR_MESSAGES
        }

        // Return context-specific message if available, otherwise fall back to general
        if (contextMessages[statusCode]) {
            return contextMessages[statusCode]
        }
        if (HTTP_ERROR_MESSAGES[statusCode]) {
            return HTTP_ERROR_MESSAGES[statusCode]
        }
    }

    // Handle Error objects with messages that might already be user-friendly
    if (error instanceof Error) {
        const message = error.message

        // If the message contains HTTP error code patterns, replace with friendly message
        if (/HTTP\s*\d{3}/i.test(message)) {
            return 'Something went wrong. Please try again later.'
        }

        // If message is already user-friendly (no technical jargon), return it
        if (!message.toLowerCase().includes('http') &&
            !message.toLowerCase().includes('fetch') &&
            !message.toLowerCase().includes('status') &&
            !message.toLowerCase().includes('undefined') &&
            !message.toLowerCase().includes('null') &&
            message.length < 200) {
            return message
        }
    }

    // Default fallback message
    return 'Something went wrong. Please try again later.'
}

/**
 * Get user-friendly error message specifically for login errors
 */
export function getLoginErrorMessage(error: unknown): string {
    return getErrorMessage(error, 'login')
}

/**
 * Get user-friendly error message specifically for data operation errors
 */
export function getDataErrorMessage(error: unknown): string {
    return getErrorMessage(error, 'data')
}

/**
 * Create a user-friendly error from HTTP response
 * This can be used in API request handlers
 */
export function createFriendlyError(status: number, serverMessage?: string, context: ErrorContext = 'general'): Error {
    // If server provides a user-friendly message, prefer it
    if (serverMessage &&
        !serverMessage.toLowerCase().includes('http') &&
        !serverMessage.toLowerCase().includes('internal') &&
        serverMessage.length < 200) {
        return new Error(serverMessage)
    }

    // Get context-specific message
    let contextMessages: Record<number, string>
    switch (context) {
        case 'login':
            contextMessages = LOGIN_ERROR_MESSAGES
            break
        case 'data':
            contextMessages = DATA_ERROR_MESSAGES
            break
        default:
            contextMessages = HTTP_ERROR_MESSAGES
    }

    const message = contextMessages[status] ||
        HTTP_ERROR_MESSAGES[status] ||
        'Something went wrong. Please try again later.'

    return new Error(message)
}
