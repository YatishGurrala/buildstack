import { generateCsrfToken, verifyCsrfToken, getCsrfTokenFromHeader } from '@/lib/csrf';

describe('CSRF Token Utils', () => {
  describe('generateCsrfToken', () => {
    it('should generate a random token', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe('getCsrfTokenFromHeader', () => {
    it('should extract CSRF token from header', () => {
      const token = 'test-token-12345';
      const request = new Request('http://localhost', {
        headers: {
          'x-csrf-token': token,
        },
      });

      const result = getCsrfTokenFromHeader(request);
      expect(result).toBe(token);
    });

    it('should return undefined if header missing', () => {
      const request = new Request('http://localhost', {
        headers: {},
      });

      const result = getCsrfTokenFromHeader(request);
      expect(result).toBeUndefined();
    });
  });

  describe('verifyCsrfToken', () => {
    it('should skip validation for GET requests', () => {
      const request = new Request('http://localhost', {
        method: 'GET',
      });

      const result = verifyCsrfToken(request);
      expect(result).toBe(true);
    });

    it('should fail if tokens do not match for POST', () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'token-from-header',
          'cookie': 'csrf-token=token-from-cookie',
        },
      });

      const result = verifyCsrfToken(request);
      expect(result).toBe(false);
    });

    it('should succeed if tokens match for POST', () => {
      const token = 'matching-token-12345';
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          'x-csrf-token': token,
          'cookie': `csrf-token=${token}`,
        },
      });

      const result = verifyCsrfToken(request);
      expect(result).toBe(true);
    });

    it('should fail if header token missing for POST', () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: {
          'cookie': 'csrf-token=token-from-cookie',
        },
      });

      const result = verifyCsrfToken(request);
      expect(result).toBe(false);
    });
  });
});
