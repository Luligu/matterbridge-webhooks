/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock the fetch module
import { jest } from '@jest/globals';
import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { wait } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';
import { Platform } from './platform';

describe('TestPlatform', () => {
  let platform: Platform;

  let loggerLogSpy: jest.SpiedFunction<typeof AnsiLogger.prototype.log>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleDebugSpy: jest.SpiedFunction<typeof console.log>;
  let consoleInfoSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.log>;
  const debug = false;

  if (!debug) {
    // Spy on and mock AnsiLogger.log
    loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log').mockImplementation((level: string, message: string, ...parameters: any[]) => {
      //
    });
    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      //
    });
    // Spy on and mock console.debug
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation((...args: any[]) => {
      //
    });
    // Spy on and mock console.info
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation((...args: any[]) => {
      //
    });
    // Spy on and mock console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
      //
    });
    // Spy on and mock console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      //
    });
  } else {
    // Spy on AnsiLogger.log
    loggerLogSpy = jest.spyOn(AnsiLogger.prototype, 'log');
    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log');
    // Spy on console.debug
    consoleDebugSpy = jest.spyOn(console, 'debug');
    // Spy on console.info
    consoleInfoSpy = jest.spyOn(console, 'info');
    // Spy on console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn');
    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error');
  }

  const mockLog = {
    fatal: jest.fn((message: string, ...parameters: any[]) => {
      // console.error('mockLog.fatal', message, parameters);
    }),
    error: jest.fn((message: string, ...parameters: any[]) => {
      // console.error('mockLog.error', message, parameters);
    }),
    warn: jest.fn((message: string, ...parameters: any[]) => {
      // console.error('mockLog.warn', message, parameters);
    }),
    notice: jest.fn((message: string, ...parameters: any[]) => {
      // console.error('mockLog.notice', message, parameters);
    }),
    info: jest.fn((message: string, ...parameters: any[]) => {
      // console.error('mockLog.info', message, parameters);
    }),
    debug: jest.fn((message: string, ...parameters: any[]) => {
      // console.error('mockLog.debug', message, parameters);
    }),
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
        httpUrl: 'http://192.168.1.155/light/0?turn=on',
        test: false,
      },
      'Turn off shelly bulb': {
        enabled: true,
        method: 'GET',
        httpUrl: 'http://192.168.1.155/light/0?turn=off',
        test: false,
      },
    },
    debug: true,
    unregisterOnShutdown: false,
  } as PlatformConfig;

  beforeAll(() => {
    // Setup before all tests
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  afterAll(() => {
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
    jest.useFakeTimers();
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing webhook'));
    jest.runAllTimers();
    jest.useRealTimers();
    await wait(1000);
  });

  it('should execute command handler', async () => {
    jest.useFakeTimers();
    platform.bridgedDevices.forEach(async (device) => {
      await device.executeCommandHandler('on');
      expect(mockLog.info).toHaveBeenCalledWith(`Webhook ${device.deviceName} triggered.`);
    });
    jest.runAllTimers();
    jest.useRealTimers();
    await wait(1000);
  });

  it('should execute command handler and fail', async () => {
    (mockConfig.webhooks as any)['Turn on shelly bulb'].httpUrl = 'http://';
    (mockConfig.webhooks as any)['Turn off shelly bulb'].httpUrl = 'http://';
    platform.bridgedDevices.forEach(async (device) => {
      await device.executeCommandHandler('on');
      expect(mockLog.info).toHaveBeenCalledWith(`Webhook ${device.deviceName} triggered.`);
    });
    await wait(1000);
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed:`));
  });

  it('should call onAction with formData and fail', async () => {
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
          httpUrl: 'http://192.168.1.155/light/0?turn=on',
          test: false,
        },
      },
      debug: true,
      unregisterOnShutdown: false,
    });
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'root_webhooks_newKey_test');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing new webhook'));
    // await wait(1000);
    // expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed:`));
  });

  it('should call onAction and fail', async () => {
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing webhook'));
    // await wait(1000);
    // expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed:`));
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });
});
