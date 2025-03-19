import http, { RequestOptions } from 'node:http';
import https from 'node:https';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface JsonArray extends Array<JsonValue> {
  //
}

export async function fetch<T>(url: string, method: 'POST' | 'GET' = 'GET', data: Record<string, JsonValue> = {}, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeout / 1000} seconds`));
    }, timeout).unref();

    let requestUrl = url;
    const jsonData = JSON.stringify(data);
    if (method === 'GET') {
      const queryParams = new URLSearchParams(
        Object.entries(data).reduce(
          (acc, [key, value]) => {
            if (value === null) {
              acc[key] = '';
            } else if (typeof value === 'object') {
              acc[key] = JSON.stringify(value);
            } else {
              acc[key] = String(value);
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString();
      if (queryParams) {
        const separator = url.includes('?') ? '&' : '?';
        requestUrl = `${url}${separator}${queryParams}`;
      }
    }
    const options: RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(method === 'POST' && { 'Content-Length': Buffer.byteLength(jsonData) }),
      },
      signal: controller.signal,
    };

    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(requestUrl, options, (res) => {
      res.setEncoding('utf8');
      let responseData = '';

      // Check for non-success status codes (e.g., 300+)
      if (res.statusCode && res.statusCode >= 300) {
        clearTimeout(timeoutId);
        res.resume(); // Discard response data to free up memory
        req.destroy(); // Close the request
        return reject(new Error(`Request failed with status code: ${res.statusCode}`));
      }

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeoutId);
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve(jsonResponse as T);
        } catch (err) {
          reject(new Error(`Failed to parse response JSON: ${err instanceof Error ? err.message : err}`));
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Request failed: ${error instanceof Error ? error.message : error}`));
    });

    // Send the JSON data only if the method is POST
    if (method === 'POST') {
      req.write(jsonData);
    }
    req.end();
  });
}
