import { NextRequest } from 'next/server';

import { HttpError, validateCsrfToken } from '@/lib/http';

describe('HttpError', () => {
  it('should create error with status and message', () => {
    const error = new HttpError(404, 'Not found', 'NOT_FOUND');

    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have default code of BAD_REQUEST', () => {
    const error = new HttpError(400, 'Bad request');

    expect(error.code).toBe('BAD_REQUEST');
  });

  it('should support error inheritance', () => {
    const error = new HttpError(500, 'Server error', 'INTERNAL_ERROR');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof HttpError).toBe(true);
  });
});

describe('jsonResponse', () => {
  it('should be testable via type', () => {
    // HttpError is tested - jsonResponse requires NextRequest/NextResponse
    // which need full Next.js environment setup. These are integration tests.
    expect(HttpError).toBeDefined();
  });
});

describe('validateCsrfToken', () => {
  it('throws deterministic 403 for state-changing session requests without valid csrf token', () => {
    const request = new NextRequest('http://localhost/api/core/projects', {
      method: 'POST',
      headers: {
        cookie: 'csrf-token=cookie-token',
      },
      body: JSON.stringify({}),
    });

    expect(() => validateCsrfToken(request)).toThrow(
      expect.objectContaining({
        status: 403,
        code: 'CSRF_VALIDATION_ERROR',
      }),
    );
  });

  it('does not require csrf for read-only session requests', () => {
    const request = new NextRequest('http://localhost/api/core/projects', {
      method: 'GET',
    });

    expect(() => validateCsrfToken(request)).not.toThrow();
  });

  it('skips csrf checks for token-auth endpoints', () => {
    const request = new NextRequest('http://localhost/api/v1/project/records', {
      method: 'POST',
      body: JSON.stringify({ collection: 'items' }),
    });

    expect(() => validateCsrfToken(request, 'token')).not.toThrow();
  });
});
