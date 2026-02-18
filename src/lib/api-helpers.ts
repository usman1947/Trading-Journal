import { NextResponse } from 'next/server';

/**
 * Handle API errors with consistent logging and response format.
 * Logs the error with context and returns a standardized error response.
 *
 * @param error - The error object
 * @param context - Description of what operation failed
 * @param status - HTTP status code (default: 500)
 * @returns NextResponse with error message
 */
export function handleApiError(
  error: unknown,
  context: string,
  status: number = 500
): NextResponse {
  console.error(`Error ${context}:`, error);

  const message =
    process.env.NODE_ENV === 'production'
      ? `Failed to ${context}`
      : error instanceof Error
        ? error.message
        : `Failed to ${context}`;

  return NextResponse.json({ error: message }, { status });
}

/**
 * Create a standardized JSON response.
 * Wrapper around NextResponse.json for consistency.
 *
 * @param data - Data to return in response body
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with JSON data
 */
export function createJsonResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a success response with optional message.
 *
 * @param data - Optional data to include in response
 * @param message - Optional success message
 * @returns NextResponse with success indicator
 */
export function successResponse(data?: unknown, message?: string): NextResponse {
  const response: Record<string, unknown> = { success: true };

  if (message) {
    response.message = message;
  }
  if (data !== undefined) {
    response.data = data;
  }

  return NextResponse.json(response);
}

/**
 * Create an error response with custom message.
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with error message
 */
export function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Create a not found response.
 *
 * @param resource - The resource that was not found (e.g., "Trade", "Strategy")
 * @returns NextResponse with 404 status
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

/**
 * Create a bad request response for validation errors.
 *
 * @param message - Validation error message
 * @returns NextResponse with 400 status
 */
export function validationError(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Validate required fields in request body.
 * Throws an error if any required field is missing or empty.
 *
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @throws Error if validation fails
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}
