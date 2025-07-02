// Mock the fetch module
import http, { Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { jest } from '@jest/globals';
import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { wait } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';

import { Platform } from './platform.ts';

describe('TestPlatform', () => {
  let server: Server;
  let port: number;
  let baseUrl: string;

  let platform: Platform;

  let loggerLogSpy: jest.SpiedFunction<typeof AnsiLogger.prototype.log>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleDebugSpy: jest.SpiedFunction<typeof console.log>;
  let consoleInfoSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.log>;
  const debug = false;

  if (!debug) {
    loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation((...args: any[]) => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation((...args: any[]) => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {});
  } else {
    loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log');
    consoleLogSpy = jest.spyOn(console, 'log');
    consoleDebugSpy = jest.spyOn(console, 'debug');
    consoleInfoSpy = jest.spyOn(console, 'info');
    consoleWarnSpy = jest.spyOn(console, 'warn');
    consoleErrorSpy = jest.spyOn(console, 'error');
  }

  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {}),
    error: jest.fn((message: string, ...parameters: any[]) => {}),
    warn: jest.fn((message: string, ...parameters: any[]) => {}),
    notice: jest.fn((message: string, ...parameters: any[]) => {}),
    info: jest.fn((message: string, ...parameters: any[]) => {}),
    debug: jest.fn((message: string, ...parameters: any[]) => {}),
  } as unknown as AnsiLogger;

  const mockMatterbridge = {
    matterbridgeDirectory: './jest/matterbridge',
    matterbridgePluginDirectory: './jest/plugins',
    systemInformation: { ipv4Address: undefined, ipv6Address: undefined, osRelease: 'xx.xx.xx.xx.xx.xx', nodeVersion: '22.1.10' },
    matterbridgeVersion: '3.0.0',
    log: mockLog,
    getDevices: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    getPlugins: jest.fn(() => {
      // console.log('getDevices called');
      return [];
    }),
    addBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('addBridgedEndpoint called');
    }),
    removeBridgedEndpoint: jest.fn(async (pluginName: string, device: MatterbridgeEndpoint) => {
      // console.log('removeBridgedEndpoint called');
    }),
    removeAllBridgedEndpoints: jest.fn(async (pluginName: string) => {
      // console.log('removeAllBridgedEndpoints called');
    }),
  } as unknown as Matterbridge;

  const mockConfig = {
    name: 'matterbridge-webhooks',
    type: 'DynamicPlatform',
    version: '0.0.1',
    whiteList: [],
    blackList: [],
    webhooks: {
      'Turn on shelly bulb': {
        enabled: true,
        method: 'POST',
        httpUrl: '',
        test: false,
      },
      'Turn off shelly bulb': {
        enabled: true,
        method: 'GET',
        httpUrl: '',
        test: false,
      },
    },
    debug: true,
    unregisterOnShutdown: false,
  } as PlatformConfig;

  beforeAll(async () => {
    // Create server
    // This server will be used to mock the HTTP requests made by the webhooks
    server = http.createServer((req, res) => {
      if (req.url?.includes('fail')) {
        res.writeHead(300, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
    (mockConfig as any).webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/light/0?turn=on';
    (mockConfig as any).webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/light/0?turn=off';
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  afterAll(async () => {
    // Close server
    await new Promise<void>((resolve) => {
      if (server && server.listening) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });

    // Restore all mocks
    jest.restoreAllMocks();
  });

  it('should throw error in load when version is not valid', () => {
    mockMatterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new Platform(mockMatterbridge, mockLog, mockConfig)).toThrow(
      'This plugin requires Matterbridge version >= "3.0.0". Please update Matterbridge to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '3.0.0';
  });

  it('should initialize platform with config name', () => {
    platform = new Platform(mockMatterbridge, mockLog, mockConfig);
    expect(mockLog.info).toHaveBeenCalledWith('Initializing platform:', mockConfig.name);
    expect(mockLog.info).toHaveBeenCalledWith('Finished initializing platform:', mockConfig.name);
  });

  it('should call onStart with reason', async () => {
    await platform.onStart('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onStart called with reason:', 'Test reason');
  }, 30000);

  it('should call onConfigure', async () => {
    await platform.onConfigure();
    expect(mockLog.info).toHaveBeenCalledWith('onConfigure called');
  });

  it('should call onAction', async () => {
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing webhook'));
    await wait(1000);
  });

  it('should execute command handler', async () => {
    platform.bridgedDevices.forEach(async (device) => {
      await device.executeCommandHandler('on');
      expect(mockLog.info).toHaveBeenCalledWith(`Webhook ${device.deviceName} triggered.`);
    });
    await wait(1000);
    expect(mockLog.notice).toHaveBeenCalledWith(expect.stringContaining(`successful!`));
  });

  it('should execute command handler and fail', async () => {
    (mockConfig.webhooks as any)['Turn on shelly bulb'].httpUrl = 'http://';
    (mockConfig.webhooks as any)['Turn off shelly bulb'].httpUrl = 'http://';
    platform.bridgedDevices.forEach(async (device) => {
      await device.executeCommandHandler('on');
      expect(mockLog.info).toHaveBeenCalledWith(`Webhook ${device.deviceName} triggered.`);
    });
    await wait(1000);
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed`));
    (mockConfig as any).webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/light/0?turn=on';
    (mockConfig as any).webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/light/0?turn=off';
  });

  it('should call onAction with formData and succeed', async () => {
    await platform.onAction('test', undefined, 'root_webhooks_newKey_test', {
      name: 'matterbridge-webhooks',
      type: 'DynamicPlatform',
      version: '0.0.3',
      whiteList: [],
      blackList: [],
      deviceType: 'Switch',
      webhooks: {
        newKey: {
          method: 'GET',
          httpUrl: baseUrl + '/light/0?turn=on',
          test: false,
        },
      },
      debug: true,
      unregisterOnShutdown: false,
    });
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'root_webhooks_newKey_test');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing new webhook'));
    await wait(1000);
    expect(mockLog.notice).toHaveBeenCalledWith(expect.stringContaining(`successful!`));
  });

  it('should call onAction and succeed', async () => {
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing webhook'));
    await wait(1000);
    expect(mockLog.notice).toHaveBeenCalledWith(expect.stringContaining(`successful!`));
  });

  it('should call onAction with formData and fail', async () => {
    (mockConfig as any).webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/fail';
    (mockConfig as any).webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/fail';
    await platform.onAction('test', undefined, 'root_webhooks_newKey_test', {
      name: 'matterbridge-webhooks',
      type: 'DynamicPlatform',
      version: '0.0.3',
      whiteList: [],
      blackList: [],
      deviceType: 'Switch',
      webhooks: {
        newKey: {
          method: 'GET',
          httpUrl: baseUrl + '/fail',
          test: false,
        },
      },
      debug: true,
      unregisterOnShutdown: false,
    });
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'root_webhooks_newKey_test');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing new webhook'));
    await wait(1000);
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed`));
  });

  it('should call onAction and fail', async () => {
    (mockConfig as any).webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/fail';
    (mockConfig as any).webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/fail';
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing webhook'));
    await wait(1000);
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed`));
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
