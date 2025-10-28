/**
 * This file contains the fetch function for WebhooksPlatform.
 *
 * @file fetch.ts
 * @author Luca Liguori
 * @version 1.0.0
 * @license Apache-2.0
 *
 * Copyright 2025, 2026, 2027 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import http, { RequestOptions } from 'node:http';
import https from 'node:https';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface JsonArray extends Array<JsonValue> {}

/**
 * Fetches data from a given URL using the specified method and data.
 *
 * @param {string} url - The URL to fetch data from.
 * @param {'POST' | 'GET'} method - The HTTP method to use for the request. Defaults to 'GET'.
 * @param {Record<string, JsonValue>} data - The data to send with the request, if applicable. Defaults to an empty object.
 * @param {number} timeout - The timeout for the request in milliseconds. Defaults to 5000ms (5 seconds).
 * @returns {Promise<T>} - A promise that resolves to the parsed JSON response.
 */
export async function fetch<T>(url: string, method: 'POST' | 'GET' = 'GET', data: Record<string, JsonValue> = {}, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timed out after ${timeout / 1000} seconds`));
    }, timeout).unref();

    let requestUrl = url;
    const jsonData = JSON.stringify(data);
    // Add the JSON data to the url only if the method is GET
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
        reject(new Error(`Request failed with status code: ${res.statusCode}`));
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
