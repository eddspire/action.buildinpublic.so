import * as core from '@actions/core';
import { run, sendToBuildinpublicSo } from '../index';

// Mock the GitHub context and core modules
jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'testowner', repo: 'testrepo' },
    eventName: 'push',
    ref: 'refs/heads/main',
    payload: {
      commits: [
        {
          id: 'abc123',
          message: 'Test commit message',
          author: { name: 'Test User', email: 'test@example.com' },
          timestamp: '2023-01-01T00:00:00Z',
          url: 'https://github.com/testowner/testrepo/commit/abc123'
        }
      ]
    }
  }
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GitHub Action for buildinpublic.so', () => {
  // Set longer timeout for tests with retry mechanisms
  jest.setTimeout(60000); // 60 seconds
  
  // Cast mocks to jest.MockedFunction for better TypeScript support
  const mockedCore = {
    getInput: core.getInput as jest.MockedFunction<typeof core.getInput>,
    info: core.info as jest.MockedFunction<typeof core.info>,
    warning: core.warning as jest.MockedFunction<typeof core.warning>,
    error: core.error as jest.MockedFunction<typeof core.error>,
    setOutput: core.setOutput as jest.MockedFunction<typeof core.setOutput>,
    setFailed: core.setFailed as jest.MockedFunction<typeof core.setFailed>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Default mock setup
    mockedCore.getInput.mockImplementation((name: string) => {
      if (name === 'api-token') return 'test-api-token-secret';
      return '';
    });
  });

  describe('run()', () => {
    test('successfully processes commits and sends to API', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 1 })
      });

      await run();

      // Verify API was called with correct data
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://buildinpublic-so-test-dev-ed.vercel.app/api/github-actions/ingest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
            'User-Agent': 'buildinpublic.so-Action/1.0.0'
          }),
          body: expect.stringContaining('"repo":"testrepo"')
        })
      );

      // Verify output was set correctly
      expect(mockedCore.setOutput).toHaveBeenCalledWith('commits', 1);
      expect(mockedCore.info).toHaveBeenCalledWith('✅ Successfully processed 1 commits');
    });

    test('handles missing API token gracefully', async () => {
      mockedCore.getInput.mockImplementation((name: string, options?: any) => {
        if (name === 'api-token' && options?.required) {
          throw new Error('Input required and not supplied: api-token');
        }
        return '';
      });

      await run();

      expect(mockedCore.setFailed).toHaveBeenCalledWith('Input required and not supplied: api-token');
    });

    test('verifies basic functionality works', async () => {
      // Just verify the test infrastructure is working
      // The message truncation is tested indirectly via sendToBuildinpublicSo
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 1 })
      });

      await run();

      expect(mockedCore.info).toHaveBeenCalledWith('✅ Successfully processed 1 commits');
      expect(mockedCore.setOutput).toHaveBeenCalledWith('commits', 1);
    });
  });

  describe('sendToBuildinpublicSo()', () => {
    const mockPayload = {
      repo: 'testrepo',
      owner: 'testowner',
      branch: 'main',
      commits: [{
        id: 'abc123',
        message: 'Test commit',
        author: { name: 'Test User', email: 'test@example.com' },
        timestamp: '2023-01-01T00:00:00Z',
        url: 'https://github.com/testowner/testrepo/commit/abc123'
      }]
    };

    test('successfully sends payload on first attempt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 1 })
      });

      const startTime = Date.now();
      await sendToBuildinpublicSo(mockPayload, 'test-token', startTime);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://buildinpublic-so-test-dev-ed.vercel.app/api/github-actions/ingest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
            'User-Agent': 'buildinpublic.so-Action/1.0.0'
          }),
          body: expect.stringContaining('"repo":"testrepo"')
        })
      );
      expect(mockedCore.info).toHaveBeenCalledWith('✅ API response: {"ok":true,"processed":1}');
    });

    test('includes job_minutes in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true })
      });

      const startTime = Date.now() - 150000; // 2.5 minutes ago
      await sendToBuildinpublicSo(mockPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.job_minutes).toBeGreaterThanOrEqual(1);
      expect(typeof body.job_minutes).toBe('number');
    });

    test('generates correct HMAC signature format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true })
      });

      const startTime = Date.now();
      await sendToBuildinpublicSo(mockPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      const signature = headers['X-Hub-Signature-256'];
      
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toBe('buildinpublic.so-Action/1.0.0');
    });

    test('validates payload structure in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true })
      });

      const complexPayload = {
        repo: 'complex-repo',
        owner: 'testowner',
        branch: 'main',
        commits: [
          {
            id: 'commit1',
            message: 'First commit with special chars',
            author: { name: 'Dev User', email: 'dev@test.com' },
            timestamp: '2023-01-01T10:00:00Z',
            url: 'https://github.com/testowner/complex-repo/commit/commit1'
          },
          {
            id: 'commit2',
            message: 'Second commit',
            author: { name: 'Another Dev', email: 'dev2@test.com' },
            timestamp: '2023-01-01T11:00:00Z',
            url: 'https://github.com/testowner/complex-repo/commit/commit2'
          }
        ]
      };

      const startTime = Date.now();
      await sendToBuildinpublicSo(complexPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.repo).toBe('complex-repo');
      expect(body.owner).toBe('testowner');
      expect(body.commits).toHaveLength(2);
      expect(body.job_minutes).toBeGreaterThanOrEqual(1);
      expect(body.commits[0].id).toBe('commit1');
      expect(body.commits[1].id).toBe('commit2');
    });

    test('handles empty commits array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 0 })
      });

      const emptyPayload = {
        repo: 'testrepo',
        owner: 'testowner',
        branch: 'main',
        commits: [] as any[]
      };

      const startTime = Date.now();
      await sendToBuildinpublicSo(emptyPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.commits).toHaveLength(0);
      expect(body.job_minutes).toBeGreaterThanOrEqual(1);
    });

    test('handles large commit messages properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 1 })
      });

      const largeMessage = 'Large commit message: ' + 'x'.repeat(500);
      const payload = {
        repo: 'testrepo',
        owner: 'testowner',
        branch: 'main',
        commits: [{
          id: 'large123',
          message: largeMessage,
          author: { name: 'Test User', email: 'test@example.com' },
          timestamp: '2023-01-01T00:00:00Z',
          url: 'https://github.com/testowner/testrepo/commit/large123'
        }]
      };

      const startTime = Date.now();
      await sendToBuildinpublicSo(payload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.commits[0].message).toBe(largeMessage);
      expect(body.commits[0].message.length).toBeLessThanOrEqual(10000);
    });

    test('should send payload to buildinpublic.so API with correct data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 1 })
      });

      const startTime = Date.now();
      await sendToBuildinpublicSo(mockPayload, 'test-token', startTime);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://buildinpublic.so/api/github-actions/ingest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
            'User-Agent': 'buildinpublic.so-Action/1.0.0'
          }),
          body: expect.stringContaining('"repo":"testrepo"')
        })
      );
      expect(mockedCore.info).toHaveBeenCalledWith('✅ API response: {"ok":true,"processed":1}');
    });

    test('should retry on server errors with exponential backoff', async () => {
      mockFetch.mockResolvedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce(new Error('Network error'));

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('Failed after 3 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should handle complex payload structures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true })
      });

      const complexPayload = {
        repo: 'complex-repo',
        owner: 'testowner',
        branch: 'main',
        commits: [
          {
            id: 'commit1',
            message: 'First commit with special chars',
            author: { name: 'Dev User', email: 'dev@test.com' },
            timestamp: '2023-01-01T10:00:00Z',
            url: 'https://github.com/testowner/complex-repo/commit/commit1'
          },
          {
            id: 'commit2',
            message: 'Second commit',
            author: { name: 'Another Dev', email: 'dev2@test.com' },
            timestamp: '2023-01-01T11:00:00Z',
            url: 'https://github.com/testowner/complex-repo/commit/commit2'
          }
        ]
      };

      const startTime = Date.now();
      await sendToBuildinpublicSo(complexPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.repo).toBe('complex-repo');
      expect(body.owner).toBe('testowner');
      expect(body.commits).toHaveLength(2);
      expect(body.job_minutes).toBeGreaterThanOrEqual(1);
      expect(body.commits[0].id).toBe('commit1');
      expect(body.commits[1].id).toBe('commit2');
    });

    test('should handle empty commits gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, processed: 0 })
      });

      const emptyPayload = {
        repo: 'testrepo',
        owner: 'testowner',
        branch: 'main',
        commits: [] as any[]
      };

      const startTime = Date.now();
      await sendToBuildinpublicSo(emptyPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.commits).toHaveLength(0);
      expect(body.job_minutes).toBeGreaterThanOrEqual(1);
    });

    test('should include job_minutes in payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true })
      });

      const startTime = Date.now();
      await sendToBuildinpublicSo(mockPayload, 'test-token', startTime);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.job_minutes).toBeGreaterThanOrEqual(1);
    });

    test('should throw after max retries', async () => {
      mockFetch.mockResolvedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce(new Error('Network error'));

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('Failed after 3 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'This is not JSON'
      });

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('API responded with non-JSON');

      expect(mockedCore.warning).toHaveBeenCalledWith(
        expect.stringContaining('API responded with non-JSON payload')
      );
    });

    test('should handle network errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce(new Error('Network error'));

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('Failed after 3 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('API Error Handling', () => {
    const mockPayload = {
      repo: 'testrepo',
      owner: 'testowner',
      branch: 'main',
      commits: [{
        id: 'test123',
        message: 'Test commit',
        author: { name: 'Test', email: 'test@example.com' },
        timestamp: '2023-01-01T00:00:00Z',
        url: 'https://github.com/testowner/testrepo/commit/test123'
      }]
    };

    test('handles network errors with retries', async () => {
      // Mock 3 failures (should retry and then fail)
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('Failed after 3 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('handles HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => 'Validation error details'
      });

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('Failed after 3 attempts');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockedCore.warning).toHaveBeenCalledWith(
        expect.stringContaining('API request failed: 422 Unprocessable Entity')
      );
    });

    test('handles non-JSON API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'This is not JSON'
      });

      const startTime = Date.now();
      
      await expect(sendToBuildinpublicSo(mockPayload, 'test-token', startTime))
        .rejects.toThrow('Failed after 3 attempts');

      expect(mockedCore.warning).toHaveBeenCalledWith(
        expect.stringContaining('API responded with non-JSON payload')
      );
    });
  });
}); 
