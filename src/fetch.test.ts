import http, { Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { jest } from '@jest/globals';

import { fetch } from './fetch.ts';

describe('fetch test', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {});

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    return new Promise<void>((resolve) => {
      if (server && server.listening) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  afterAll(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  test('Successful GET request without data', async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    const result = await fetch<{ success: boolean }>(baseUrl, 'GET');
    expect(result).toEqual({ success: true });
  });

  test('Successful GET request with query parameters', async () => {
    // Server echoes back the query parameters as JSON.
    server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request: Missing URL' }));
        return;
      }
      const reqUrl = new URL(req.url, `http://${req.headers.host}`);
      const params = Object.fromEntries(reqUrl.searchParams.entries());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(params));
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Data includes various types. Note: non-string values will be converted.
    const queryData = {
      key: 'value',
      num: 123,
      flag: true,
      obj: { a: 1 },
      nul: null,
    };
    const result = await fetch<Record<string, string>>(baseUrl, 'GET', queryData);
    expect(result).toEqual({
      key: 'value',
      num: '123',
      flag: 'true',
      obj: JSON.stringify({ a: 1 }),
      nul: '',
    });
  });

  test('Successful POST request', async () => {
    // Server echoes back the POSTed JSON.
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(body);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    const postData = { key: 'value', num: 42 };
    const result = await fetch<typeof postData>(baseUrl, 'POST', postData);
    expect(result).toEqual(postData);
  });

  test('Non-success status code should reject', async () => {
    // Server responds with 404.
    server = http.createServer((req, res) => {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    await expect(fetch(baseUrl, 'GET')).rejects.toThrow('Request failed with status code: 404');
  });

  test('Invalid JSON response should reject', async () => {
    // Server returns invalid JSON.
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('invalid json');
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    await expect(fetch(baseUrl, 'GET')).rejects.toThrow('Failed to parse response JSON');
  });

  test('Request timeout should reject', async () => {
    // Server intentionally does not send a response to simulate a hang.
    server = http.createServer((req, res) => {
      // Do nothing; never call res.end()
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Use a very short timeout.
    await expect(fetch(baseUrl, 'GET', {}, 100)).rejects.toThrow(/Request timed out after 0\.1 seconds/);
  });

  test('Network error should reject', async () => {
    // Simulate a network error by mocking http.request.
    const originalRequest = http.request;
    const errorMessage = 'Simulated network error';
    const fakeReq = {
      on: jest.fn((event, callback) => {
        if (event === 'error') {
          setImmediate(() => (callback as (err: Error) => void)(new Error(errorMessage)));
        }
        return fakeReq;
      }),
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    };
    jest.spyOn(http, 'request').mockImplementation((...args: any[]) => {
      // If a callback was provided as the second argument, call it asynchronously
      if (typeof args[1] === 'function') {
        process.nextTick(() =>
          args[1]({
            statusCode: 200,
            on: () => {
              //
            },
          }),
        ); // dummy response; won’t be used
      }
      return fakeReq as any;
    });

    await expect(fetch('http://localhost', 'GET')).rejects.toThrow(`Request failed: ${errorMessage}`);
    (http.request as jest.Mock).mockRestore();
  });
});
