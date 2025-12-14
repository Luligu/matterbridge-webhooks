const MATTER_PORT = 6000;
const NAME = 'Platform';
const HOMEDIR = path.join('jest', NAME);

// Mock the fetch module
import http, { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import path from 'node:path';

import { jest } from '@jest/globals';
import { wait } from 'matterbridge/utils';
import { LogLevel } from 'matterbridge/logger';
import {
  addBridgedEndpointSpy,
  addMatterbridgePlatform,
  createMatterbridgeEnvironment,
  destroyMatterbridgeEnvironment,
  log,
  loggerLogSpy,
  matterbridge,
  setDebug,
  setupTest,
  startMatterbridgeEnvironment,
  stopMatterbridgeEnvironment,
} from 'matterbridge/jestutils';
import { colorTemperatureLight, CommandHandlerData, dimmableLight, extendedColorLight, onOffLight, onOffOutlet, onOffSwitch } from 'matterbridge';

import initializePlugin, { WebhooksPlatform, WebhooksPlatformConfig } from './module.js';

// Setup the test environment
await setupTest(NAME, false);

describe('TestPlatform', () => {
  let platform: WebhooksPlatform;

  // Test http server
  let httpServer: Server;
  let port: number;
  let baseUrl: string;

  const config: WebhooksPlatformConfig = {
    name: 'matterbridge-webhooks',
    type: 'DynamicPlatform',
    version: '0.0.1',
    whiteList: [],
    blackList: [],
    deviceType: 'Switch',
    webhooks: {
      'Turn on shelly bulb': {
        method: 'POST',
        httpUrl: 'http://127.0.0.1:8585/light/0?turn=on',
        test: false,
      },
      'Turn off shelly bulb': {
        method: 'GET',
        httpUrl: 'http://127.0.0.1:8585/light/0?turn=off',
        test: false,
      },
    },
    outlets: {
      Outlet1: { onUrl: 'http://127.0.0.1:8585/light/0?turn=on', offUrl: 'http://127.0.0.1:8585/light/0?turn=off' },
    },
    lights: {
      LightOnOff: { onUrl: 'http://127.0.0.1:8585/light/0?turn=on', offUrl: 'http://127.0.0.1:8585/light/0?turn=off', brightnessUrl: '', colorTempUrl: '', rgbUrl: '' },
      LightDimmer: {
        onUrl: 'http://127.0.0.1:8585/light/0?turn=on',
        offUrl: 'http://127.0.0.1:8585/light/0?turn=off',
        brightnessUrl: 'http://127.0.0.1:8585/light/0?gain=${BRIGHTNESS100}',
        colorTempUrl: '',
        rgbUrl: '',
      },
      LightColorTemp: {
        onUrl: 'http://127.0.0.1:8585/light/0?turn=on',
        offUrl: 'http://127.0.0.1:8585/light/0?turn=off',
        brightnessUrl: 'http://127.0.0.1:8585/light/0?gain=${BRIGHTNESS100}',
        colorTempUrl: 'http://127.0.0.1:8585/light/0?temp=${KELVIN}',
        rgbUrl: '',
      },
      LightRgb: {
        onUrl: 'http://127.0.0.1:8585/light/0?turn=on',
        offUrl: 'http://127.0.0.1:8585/light/0?turn=off',
        brightnessUrl: 'http://127.0.0.1:8585/light/0?gain=${BRIGHTNESS100}',
        colorTempUrl: 'http://127.0.0.1:8585/light/0?colorTemp=${KELVIN}',
        rgbUrl: 'http://127.0.0.1:8585/light/0?red=${RED}&green=${GREEN}&blue=${BLUE}',
      },
    },
    debug: true,
    unregisterOnShutdown: false,
  };

  beforeAll(async () => {
    // Create Matterbridge environment
    await createMatterbridgeEnvironment(NAME);
    await startMatterbridgeEnvironment(MATTER_PORT);

    // Create the http server. This server is used to mock the HTTP requests made by the webhooks.
    httpServer = http.createServer((req, res) => {
      if (req.url?.includes('fail')) {
        res.writeHead(300, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    await new Promise<void>((resolve) => httpServer.listen(8585, () => resolve()));
    port = (httpServer.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  beforeEach(() => {
    // Reset the mock calls before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Disable debug after each test
    await setDebug(false);
  });

  afterAll(async () => {
    // Close server
    await new Promise<void>((resolve) => {
      if (httpServer && httpServer.listening) {
        httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });

    // Destroy Matterbridge environment
    await stopMatterbridgeEnvironment();
    await destroyMatterbridgeEnvironment();

    // Restore all mocks
    jest.restoreAllMocks();
  });

  it('should return an instance of Platform', async () => {
    platform = initializePlugin(matterbridge, log, config);
    expect(platform).toBeInstanceOf(WebhooksPlatform);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Initializing platform:', config.name);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Finished initializing platform:', config.name);
    await platform.onShutdown();
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onShutdown called with reason:', 'none');
  });

  it('should throw error in load when version is not valid', () => {
    matterbridge.matterbridgeVersion = '1.5.0';
    expect(() => new WebhooksPlatform(matterbridge, log, config)).toThrow(
      'This plugin requires Matterbridge version >= "3.4.0". Please update Matterbridge to the latest version in the frontend.',
    );
    matterbridge.matterbridgeVersion = '3.4.0';
  });

  it('should initialize platform with config name', () => {
    platform = new WebhooksPlatform(matterbridge, log, config);
    // Add the platform to the Matterbridge environment
    addMatterbridgePlatform(platform);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Initializing platform:', config.name);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'Finished initializing platform:', config.name);
  });

  it('should parse url', async () => {
    // await setDebug(true);
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', 'POST#' + baseUrl + '/api', {} as CommandHandlerData)).toEqual({ method: 'POST', url: baseUrl + '/api' });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', 'GET#' + baseUrl + '/api', {} as CommandHandlerData)).toEqual({ method: 'GET', url: baseUrl + '/api' });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api', {} as CommandHandlerData)).toEqual({ method: 'GET', url: baseUrl + '/api' });

    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${LEVEL}/${LEVEL100}', { request: { level: 1 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/1/0',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${LEVEL}/${LEVEL100}', { request: { level: 128 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/128/50',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${LEVEL}/${LEVEL100}', { request: { level: 254 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/254/100',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${KELVIN}/${MIRED}', { request: { colorTemperatureMireds: 300 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/3333/300',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${COLORX}/${COLORY}', { request: { colorX: 24939, colorY: 24701 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/0.3805/0.3769',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${HUE}/${SATURATION}', { request: { hue: 180, saturation: 50 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/255/20',
    });
    expect(
      await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${level}/${level100}', {
        attributes: { currentLevel: 128 },
      } as any),
    ).toEqual({
      method: 'GET',
      url: baseUrl + '/api/128/50',
    });
    expect(
      await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${mired}/${kelvin}', {
        attributes: { colorTemperatureMireds: 300, colorTempPhysicalMinMireds: 147, colorTempPhysicalMaxMireds: 500 },
      } as any),
    ).toEqual({
      method: 'GET',
      url: baseUrl + '/api/300/3333',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${hue}/${saturation}', { attributes: { currentHue: 128, currentSaturation: 128 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/181/50',
    });
    expect(
      await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${red}/${green}/${blue}', { attributes: { currentHue: 128, currentSaturation: 128 } } as any),
    ).toEqual({
      method: 'GET',
      url: baseUrl + '/api/64/189/192',
    });
    expect(await platform.parseUrl('outlet', 'Outlet1', 'on', baseUrl + '/api/${colorX}/${colorY}', { attributes: { currentX: 24939, currentY: 24701 } } as any)).toEqual({
      method: 'GET',
      url: baseUrl + '/api/0.3805/0.3769',
    });
  });

  it('should call onStart with reason', async () => {
    await platform.onStart('Test reason');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onStart called with reason:', 'Test reason');
    expect(addBridgedEndpointSpy).toHaveBeenCalledTimes(Object.keys(config.webhooks).length + Object.keys(config.outlets).length + Object.keys(config.lights).length);
    expect(platform.getDevices()).toHaveLength(7);
    expect(platform.getDevices()[0].serialNumber).toBe('webhook1');
    expect(platform.getDevices()[0].deviceType).toBe(onOffSwitch.code);
    expect(platform.getDevices()[1].serialNumber).toBe('webhook2');
    expect(platform.getDevices()[1].deviceType).toBe(onOffSwitch.code);
    expect(platform.getDevices()[2].serialNumber).toBe('outlet1');
    expect(platform.getDevices()[2].deviceType).toBe(onOffOutlet.code);
    expect(platform.getDevices()[3].serialNumber).toBe('light1');
    expect(platform.getDevices()[3].deviceType).toBe(onOffLight.code);
    expect(platform.getDevices()[4].serialNumber).toBe('light2');
    expect(platform.getDevices()[4].deviceType).toBe(dimmableLight.code);
    expect(platform.getDevices()[5].serialNumber).toBe('light3');
    expect(platform.getDevices()[5].deviceType).toBe(colorTemperatureLight.code);
    expect(platform.getDevices()[6].serialNumber).toBe('light4');
    expect(platform.getDevices()[6].deviceType).toBe(extendedColorLight.code);
  });

  it('should call onConfigure', async () => {
    await platform.onConfigure();
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onConfigure called');
  });

  it('should call onAction', async () => {
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Testing webhook'));
  });

  it('should execute command handler on webhooks', async () => {
    platform
      .getDevices()
      .filter((device) => device.serialNumber?.startsWith('webhook'))
      .forEach(async (device) => {
        await device.executeCommandHandler('on');
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook ${device.deviceName} triggered.`);
      });
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.NOTICE, expect.stringContaining(`successful!`));
  });

  it('should execute command handler on webhooks and fail', async () => {
    config.webhooks['Turn on shelly bulb'].httpUrl = 'http://';
    config.webhooks['Turn off shelly bulb'].httpUrl = 'http://';
    platform
      .getDevices()
      .filter((device) => device.serialNumber?.startsWith('webhook'))
      .forEach(async (device) => {
        await device.executeCommandHandler('on');
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook ${device.deviceName} triggered.`);
      });
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.ERROR, expect.stringContaining(`failed`));
    config.webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/light/0?turn=on';
    config.webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/light/0?turn=off';
  });

  it('should execute command handler on outlets', async () => {
    platform
      .getDevices()
      .filter((device) => device.serialNumber?.startsWith('outlet'))
      .forEach(async (device) => {
        await device.executeCommandHandler('on');
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook outlet ${device.deviceName} on triggered.`);
        await device.executeCommandHandler('off');
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook outlet ${device.deviceName} off triggered.`);
      });
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.NOTICE, expect.stringContaining(`successful!`));
  });

  it('should execute command handler on outlets and fail', async () => {
    config.outlets['Outlet1'].onUrl = 'http://';
    config.outlets['Outlet1'].offUrl = 'http://';
    platform
      .getDevices()
      .filter((device) => device.serialNumber?.startsWith('outlet'))
      .forEach(async (device) => {
        await device.executeCommandHandler('on');
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook outlet ${device.deviceName} on triggered.`);
        await device.executeCommandHandler('off');
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook outlet ${device.deviceName} off triggered.`);
      });
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.ERROR, expect.stringContaining(`failed`));
    config.outlets['Outlet1'].onUrl = baseUrl + '/light/0?turn=on';
    config.outlets['Outlet1'].offUrl = baseUrl + '/light/0?turn=off';
  });

  it('should execute command handler on lights', async () => {
    platform
      .getDevices()
      .filter((device) => device.serialNumber?.startsWith('light'))
      .forEach(async (device) => {
        await device.executeCommandHandler('on', {}, 'onOff', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} on triggered.`);
        await device.executeCommandHandler('off', {}, 'onOff', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} off triggered.`);
        await device.executeCommandHandler('moveToLevel', { level: 128 }, 'levelControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToLevel triggered.`);
        await device.executeCommandHandler('moveToLevelWithOnOff', { level: 128 }, 'levelControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToLevelWithOnOff triggered.`);
        await device.executeCommandHandler('moveToColorTemperature', { colorTemperature: 4000 }, 'colorControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToColorTemperature triggered.`);
        await device.executeCommandHandler('moveToColor', { red: 128, green: 128, blue: 128 }, 'colorControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToColor triggered.`);
        await device.executeCommandHandler('moveToHueAndSaturation', { hue: 128, saturation: 128 }, 'colorControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToHueAndSaturation triggered.`);
        await device.executeCommandHandler('moveToHue', { hue: 128 }, 'colorControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToHue triggered.`);
        await device.executeCommandHandler('moveToSaturation', { saturation: 128 }, 'colorControl', {}, device);
        expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, `Webhook light ${device.deviceName} moveToSaturation triggered.`);
      });
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.NOTICE, expect.stringContaining(`successful!`));
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
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'root_webhooks_newKey_test');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Testing new webhook'));
    await wait(500);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.NOTICE, expect.stringContaining(`successful!`));
  });

  it('should call onAction and succeed', async () => {
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Testing webhook'));
    await wait(500);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.NOTICE, expect.stringContaining(`successful!`));
  });

  it('should call onAction with formData and fail', async () => {
    config.webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/fail';
    config.webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/fail';
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
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'root_webhooks_newKey_test');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Testing new webhook'));
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.ERROR, expect.stringContaining(`failed`));
  });

  it('should call onAction and fail', async () => {
    config.webhooks['Turn on shelly bulb'].httpUrl = baseUrl + '/fail';
    config.webhooks['Turn off shelly bulb'].httpUrl = baseUrl + '/fail';
    await platform.onAction('test', undefined, 'Turn off shelly bulb');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onAction called with action:', 'test', 'and value:', 'none', 'and id:', 'Turn off shelly bulb');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, expect.stringContaining('Testing webhook'));
    await wait(100);
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.ERROR, expect.stringContaining(`failed`));
  });

  it('should call onShutdown with reason', async () => {
    await platform.onShutdown('Test reason');
    expect(loggerLogSpy).toHaveBeenCalledWith(LogLevel.INFO, 'onShutdown called with reason:', 'Test reason');
  });
});
