/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fetchModule from './fetch'; // adjust the module path as needed
import { Matterbridge, MatterbridgeEndpoint, PlatformConfig } from 'matterbridge';
import { wait } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';
import { Platform } from './platform';

import { jest } from '@jest/globals';

describe('TestPlatform', () => {
  let platform: Platform;

  let loggerLogSpy: jest.SpiedFunction<typeof AnsiLogger.prototype.log>;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleDebugSpy: jest.SpiedFunction<typeof console.log>;
  let consoleInfoSpy: jest.SpiedFunction<typeof console.log>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.log>;
  const debug = false;

  /*
  const fetchSpy = jest.spyOn(fetchModule, 'fetch').mockImplementation(async (url: string, method?: 'POST' | 'GET', data?: any, timeout?: number) => {
    return {} as any;
  });
  */

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
    matterbridgeVersion: '2.2.5',
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
    'name': 'matterbridge-webhooks',
    'type': 'DynamicPlatform',
    'version': '0.0.1',
    'whiteList': [],
    'blackList': [],
    'webhooks': {
      'Turn on shelly bulb': {
        'enabled': true,
        'method': 'POST',
        'httpUrl': 'http://192.168.1.155/light/0?turn=on',
        'test': false,
      },
      'Turn off shelly bulb': {
        'enabled': true,
        'method': 'GET',
        'httpUrl': 'http://192.168.1.155/light/0?turn=off',
        'test': false,
      },
    },
    'debug': true,
    'unregisterOnShutdown': false,
  } as PlatformConfig;

  beforeAll(() => {
    //
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
      'This plugin requires Matterbridge version >= "2.2.5". Please update Matterbridge to the latest version in the frontend.',
    );
    mockMatterbridge.matterbridgeVersion = '2.2.5';
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
  });

  it('should execute command handler', async () => {
    platform.bridgedDevices.forEach(async (device) => {
      await device.executeCommandHandler('on');
      expect(mockLog.info).toHaveBeenCalledWith(`Webhook ${device.deviceName} triggered.`);
    });
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

  it('should call onAction and fail', async () => {
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith('onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Testing webhook'));
    await wait(1000);
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining(`failed:`));
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(mockLog.info).toHaveBeenCalledWith('onShutdown called with reason:', 'Test reason');
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  /*
  it('should fetch shelly', async () => {
    const response = await platform.fetch('http://192.168.1.155/shelly');
    expect(response).toBeDefined();
    expect(response).toEqual({
      'auth': false,
      'discoverable': false,
      'fw': '20230913-111548/v1.14.0-gcb84623',
      'longid': 1,
      'mac': '485519EE12A7',
      'num_outputs': 1,
      'type': 'SHCB-1',
    });
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('should turn on shelly', async () => {
    const response = await platform.fetch('http://192.168.1.155/light/0', 'GET', { turn: 'on', gain: 100, brightness: 100 });
    expect(response).toBeDefined();
    expect(response).toEqual({
      'blue': 0,
      'brightness': 100,
      'effect': 0,
      'gain': 100,
      'green': 255,
      'has_timer': false,
      'ison': true,
      'mode': 'color',
      'red': 17,
      'source': 'http',
      'temp': 3000,
      'timer_duration': 0,
      'timer_remaining': 0,
      'timer_started': 0,
      'transition': 0,
      'white': 0,
    });
    expect(mockLog.error).not.toHaveBeenCalled();
  });
  */
});
