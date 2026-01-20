/**
 * This file contains the class WebhooksPlatform.
 *
 * @file module.ts
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

import {
  bridgedNode,
  colorTemperatureLight,
  CommandHandlerData,
  dimmableLight,
  extendedColorLight,
  MatterbridgeColorControlServer,
  MatterbridgeDynamicPlatform,
  MatterbridgeEndpoint,
  MatterbridgeLevelControlServer,
  onOffLight,
  onOffOutlet,
  onOffSwitch,
  PlatformConfig,
  PlatformMatterbridge,
} from 'matterbridge';
import { hslColorToRgbColor, isValidNumber, isValidObject, isValidString, miredToKelvin, wait } from 'matterbridge/utils';
import { AnsiLogger, rs } from 'matterbridge/logger';
import { ColorControl, LevelControl } from 'matterbridge/matter/clusters';

import { fetch } from './fetch.js';

export interface WebhookConfig {
  method: 'POST' | 'GET' | 'PUT';
  httpUrl: string;
  test: boolean;
}
export interface OutletConfig {
  onUrl: string;
  offUrl: string;
}

export interface LightConfig {
  minMireds: number;
  maxMireds: number;
  onUrl: string;
  offUrl: string;
  brightnessUrl: string;
  colorTempUrl: string;
  rgbUrl: string;
}

export type WebhooksPlatformConfig = PlatformConfig & {
  whiteList: string[];
  blackList: string[];
  // Normal webhooks device type
  deviceType: 'Outlet' | 'Switch' | 'Light';
  webhooks: Record<string, WebhookConfig>;
  // Devices configurations
  outlets: Record<string, OutletConfig>;
  lights: Record<string, LightConfig>;
};

/**
 * This is the standard interface for Matterbridge plugins.
 * Each plugin should export a default function that follows this signature.
 *
 * @param {PlatformMatterbridge} matterbridge - An instance of MatterBridge. This is the main interface for interacting with the MatterBridge system.
 * @param {AnsiLogger} log - An instance of AnsiLogger. This is used for logging messages in a format that can be displayed with ANSI color codes.
 * @param {PlatformConfig} config - The platform configuration.
 * @returns {Platform} - An instance of the SomfyTahomaPlatform. This is the main interface for interacting with the Somfy Tahoma system.
 */
export default function initializePlugin(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: WebhooksPlatformConfig): WebhooksPlatform {
  return new WebhooksPlatform(matterbridge, log, config);
}

export class WebhooksPlatform extends MatterbridgeDynamicPlatform {
  constructor(
    matterbridge: PlatformMatterbridge,
    log: AnsiLogger,
    override config: WebhooksPlatformConfig,
  ) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.5.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.5.0". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info('Initializing platform:', this.config.name);

    this.log.info('Finished initializing platform:', this.config.name);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Clear all devices select
    await this.ready;
    await this.clearSelect();

    // Register webhooks devices (deviceName: webhookName, serialNumber: webhook+i)
    let i = 1;
    for (const webhookName in this.config.webhooks) {
      this.log.debug(`Loading webhook ${i} ${webhookName} with method ${this.config.webhooks[webhookName].method} and url ${this.config.webhooks[webhookName].httpUrl}`);

      const webhook = this.config.webhooks[webhookName];
      this.setSelectDevice('webhook' + i, webhookName, undefined, 'hub');
      if (!this.validateDevice(['webhook' + i, webhookName], true)) continue;
      this.log.info(`Registering device: ${webhookName} with method ${webhook.method} and url ${webhook.httpUrl}`);
      const device = new MatterbridgeEndpoint(
        [this.config.deviceType === 'Outlet' ? onOffOutlet : this.config.deviceType === 'Light' ? onOffLight : onOffSwitch, bridgedNode],
        { id: webhookName },
        this.config.debug,
      )
        .createDefaultBridgedDeviceBasicInformationClusterServer(
          webhookName,
          'webhook' + i++,
          this.matterbridge.aggregatorVendorId,
          'Matterbridge',
          'Matterbridge Webhook',
          0,
          this.config.version,
        )
        .createOnOffClusterServer(false)
        .addRequiredClusterServers()
        .addCommandHandler('on', async () => {
          this.log.info(`Webhook ${webhookName} triggered`);
          await device.setAttribute('onOff', 'onOff', false, device.log);
          this.log.debug(`Fetching ${webhook.httpUrl} with ${webhook.method}...`);
          fetch(webhook.httpUrl, webhook.method)
            .then(() => this.log.notice(`Webhook ${webhookName} successful!`))
            .catch((err) => {
              this.log.error(`Webhook ${webhookName} failed: ${err instanceof Error ? err.message : err}`);
            });
        });
      await this.registerDevice(device);
    }

    // Register outlet devices (deviceName: outletName, serialNumber: outlet+i)
    i = 1;
    for (const outletName in this.config.outlets) {
      this.log.debug(`Loading outlet ${i} ${outletName}...`);

      const webhook = this.config.outlets[outletName];
      this.setSelectDevice('outlet' + i, outletName, undefined, 'hub');
      if (!this.validateDevice(['outlet' + i, outletName], true)) continue;
      this.log.info(`Registering outlet: ${outletName}...`);
      const device = new MatterbridgeEndpoint([onOffOutlet, bridgedNode], { id: outletName }, this.config.debug)
        .createDefaultBridgedDeviceBasicInformationClusterServer(
          outletName,
          'outlet' + i++,
          this.matterbridge.aggregatorVendorId,
          'Matterbridge',
          'Matterbridge Webhook Outlet',
          0,
          this.config.version,
        )
        .createOnOffClusterServer(false)
        .addRequiredClusterServers()
        .addCommandHandler('on', async (data) => {
          this.parseUrl('outlet', outletName, 'on', webhook.onUrl, data);
        })
        .addCommandHandler('off', async (data) => {
          this.parseUrl('outlet', outletName, 'off', webhook.offUrl, data);
        });
      await this.registerDevice(device);
    }

    // Register light devices (deviceName: lightName, serialNumber: light+i)
    i = 1;
    for (const lightName in this.config.lights) {
      this.log.debug(`Loading light ${i} ${lightName}...`);

      const webhook = this.config.lights[lightName];
      this.setSelectDevice('light' + i, lightName, undefined, 'hub');
      if (!this.validateDevice(['light' + i, lightName], true)) continue;
      this.log.info(`Registering light: ${lightName}...`);
      let deviceType = onOffLight;
      if (isValidString(webhook.brightnessUrl, 1)) deviceType = dimmableLight;
      if (isValidString(webhook.colorTempUrl, 1)) deviceType = colorTemperatureLight;
      if (isValidString(webhook.rgbUrl, 1)) deviceType = extendedColorLight;
      const device = new MatterbridgeEndpoint([deviceType, bridgedNode], { id: lightName }, this.config.debug)
        .createDefaultBridgedDeviceBasicInformationClusterServer(
          lightName,
          'light' + i++,
          this.matterbridge.aggregatorVendorId,
          'Matterbridge',
          'Matterbridge Webhook Light',
          0,
          this.config.version,
        )
        .createOnOffClusterServer(false)
        .createDefaultColorControlClusterServer(undefined, undefined, undefined, undefined, 250, webhook.minMireds, webhook.maxMireds)
        .createDefaultLevelControlClusterServer()
        .addRequiredClusterServers()
        .addCommandHandler('on', async (data) => {
          this.parseUrl('light', lightName, 'on', webhook.onUrl, data);
        })
        .addCommandHandler('off', async (data) => {
          this.parseUrl('light', lightName, 'off', webhook.offUrl, data);
        })
        .addCommandHandler('moveToLevel', async (data) => {
          this.parseUrl('light', lightName, 'moveToLevel', webhook.brightnessUrl, data);
        })
        .addCommandHandler('moveToLevelWithOnOff', async (data) => {
          this.parseUrl('light', lightName, 'moveToLevelWithOnOff', webhook.brightnessUrl, data);
        })
        .addCommandHandler('moveToColorTemperature', async (data) => {
          this.parseUrl('light', lightName, 'moveToColorTemperature', webhook.colorTempUrl, data);
        })
        .addCommandHandler('moveToHueAndSaturation', async (data) => {
          this.parseUrl('light', lightName, 'moveToHueAndSaturation', webhook.rgbUrl, data);
        })
        .addCommandHandler('moveToHue', async (data) => {
          this.parseUrl('light', lightName, 'moveToHue', webhook.rgbUrl, data);
        })
        .addCommandHandler('moveToSaturation', async (data) => {
          this.parseUrl('light', lightName, 'moveToSaturation', webhook.rgbUrl, data);
        })
        .addCommandHandler('moveToColor', async (data) => {
          this.parseUrl('light', lightName, 'moveToColor', webhook.rgbUrl, data);
        });
      await this.registerDevice(device);
    }
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('onConfigure called');
    for (const device of this.getDevices()) {
      // Turn off the normal webhook devices to avoid confusion. For the other devices leave them as is in the matter storage cause the main attributes persist.
      if (device.deviceName && device.deviceName in this.config.webhooks) {
        this.log.info(`Configuring device: ${device.deviceName}`);
        await device.setAttribute('onOff', 'onOff', false, device.log);
      }
    }
  }

  override async onAction(action: string, value?: string, id?: string, formData?: PlatformConfig): Promise<void> {
    this.log.info('onAction called with action:', action, 'and value:', value ?? 'none', 'and id:', id ?? 'none');
    this.log.debug('onAction called with formData:', formData ?? 'none');
    if (id?.startsWith('root_webhooks_')) id = id.replace('root_webhooks_', '');
    if (id?.endsWith('_test')) id = id.replace('_test', '');
    if (action === 'test') {
      // Test the webhook before is confirmed
      if (isValidObject(formData, 1) && isValidObject(formData.webhooks, 1)) {
        const webhooks = formData.webhooks as Record<string, WebhookConfig>;
        for (const webhookName in webhooks) {
          if (Object.prototype.hasOwnProperty.call(webhooks, webhookName)) {
            const webhook = webhooks[webhookName];
            if (id?.includes(webhookName)) {
              this.log.info(`Testing new webhook ${webhookName} method ${webhook.method} url ${webhook.httpUrl}`);
              fetch(webhook.httpUrl, webhook.method)
                .then(() => {
                  this.log.notice(`Webhook test ${webhookName} successful!`);
                  return;
                })
                .catch((err) => {
                  this.log.error(`Webhook test ${webhookName} failed: ${err instanceof Error ? err.message : err}`);
                });
            }
          }
        }
        return;
      }
      // Test the webhook already confirmed
      for (const webhookName in this.config.webhooks) {
        if (Object.prototype.hasOwnProperty.call(this.config.webhooks, webhookName)) {
          const webhook = this.config.webhooks[webhookName];
          if (id?.includes(webhookName)) {
            this.log.info(`Testing webhook ${webhookName} method ${webhook.method} url ${webhook.httpUrl}`);
            fetch(webhook.httpUrl, webhook.method)
              .then(() => {
                this.log.notice(`Webhook test ${webhookName} successful!`);
                return;
              })
              .catch((err) => {
                this.log.error(`Webhook test ${webhookName} failed: ${err instanceof Error ? err.message : err}`);
              });
          }
        }
      }
    }
  }

  override async onShutdown(reason?: string): Promise<void> {
    await super.onShutdown(reason);
    this.log.info('onShutdown called with reason:', reason ?? 'none');
    if (this.config.unregisterOnShutdown === true) await this.unregisterAllDevices();
  }

  /**
   * Parse the URL to extract method and URL.
   *
   * @param {string} deviceType - The type of the device.
   * @param {string} deviceName - The name of the device.
   * @param {string} command - The command to parse.
   * @param {string} url - The URL to parse.
   * @param {CommandHandlerData} [data] - The command handler data.
   * @returns {Promise<{ method: 'POST' | 'GET' | 'PUT'; url: string }>} - The parsed method and URL.
   */
  async parseUrl(deviceType: string, deviceName: string, command: string, url: string, data: CommandHandlerData): Promise<{ method: 'POST' | 'GET' | 'PUT'; url: string }> {
    this.log.info(`Webhook ${deviceType} ${deviceName} ${command} triggered`);
    const endpoint = data.endpoint;
    this.log.debug(`Webhook ${deviceType} ${deviceName} ${command} triggered on endpoint ${endpoint?.deviceName}`);

    // Determine method
    let method: 'POST' | 'GET' | 'PUT' = 'GET';
    let parsedUrl = url;
    if (url.startsWith('GET#')) {
      method = 'GET';
      parsedUrl = url.replace('GET#', '');
    } else if (url.startsWith('POST#')) {
      method = 'POST';
      parsedUrl = url.replace('POST#', '');
    } else if (url.startsWith('PUT#')) {
      method = 'PUT';
      parsedUrl = url.replace('PUT#', '');
    }

    // Request based replacements
    if (parsedUrl.includes('${LEVEL}') && isValidNumber(data.request.level)) {
      parsedUrl = parsedUrl.replace('${LEVEL}', (data.request as LevelControl.MoveToLevelRequest).level.toString());
    }
    if (url.includes('${LEVEL100}') && isValidNumber(data.request.level)) {
      parsedUrl = parsedUrl.replace('${LEVEL100}', Math.round(((data.request as LevelControl.MoveToLevelRequest).level / 254) * 100).toString());
    }
    if (parsedUrl.includes('${KELVIN}') && isValidNumber(data.request.colorTemperatureMireds)) {
      parsedUrl = parsedUrl.replace('${KELVIN}', Math.round(miredToKelvin((data.request as ColorControl.MoveToColorTemperatureRequest).colorTemperatureMireds)).toString());
    }
    if (parsedUrl.includes('${MIRED}') && isValidNumber(data.request.colorTemperatureMireds)) {
      parsedUrl = parsedUrl.replace('${MIRED}', Math.round((data.request as ColorControl.MoveToColorTemperatureRequest).colorTemperatureMireds).toString());
    }
    if (parsedUrl.includes('${COLORX}') && isValidNumber(data.request.colorX, 0, 65279)) {
      parsedUrl = parsedUrl.replace('${COLORX}', this.roundTo((data.request as ColorControl.MoveToColorRequest).colorX / 65536, 4).toString());
    }
    if (parsedUrl.includes('${COLORY}') && isValidNumber(data.request.colorY, 0, 65279)) {
      parsedUrl = parsedUrl.replace('${COLORY}', this.roundTo((data.request as ColorControl.MoveToColorRequest).colorY / 65536, 4).toString());
    }
    if (parsedUrl.includes('${HUE}') && isValidNumber(data.request.hue, 0, 254)) {
      parsedUrl = parsedUrl.replace('${HUE}', Math.round(((data.request as ColorControl.MoveToHueAndSaturationRequest).hue * 360) / 254).toString());
    }
    if (parsedUrl.includes('${SATURATION}') && isValidNumber(data.request.saturation, 0, 254)) {
      parsedUrl = parsedUrl.replace('${SATURATION}', Math.round(((data.request as ColorControl.MoveToHueAndSaturationRequest).saturation * 100) / 254).toString());
    }

    // Attributes based replacements
    if ((parsedUrl.includes('${level}') || parsedUrl.includes('${level100}')) && isValidNumber(data.attributes.currentLevel, 1, 254)) {
      await wait(100); // Wait a bit to ensure the latest values are written by the command handlers. After the wait the attributes should be updated and the context be closed.
      data.attributes = endpoint.stateOf(MatterbridgeLevelControlServer);
      if (isValidNumber(data.attributes.currentLevel, 1, 254)) {
        if (url.includes('${level}')) parsedUrl = parsedUrl.replace('${level}', data.attributes.currentLevel.toString());
        if (url.includes('${level100}')) parsedUrl = parsedUrl.replace('${level100}', Math.round((data.attributes.currentLevel / 254) * 100).toString());
      }
    }
    if (
      (parsedUrl.includes('${mired}') || parsedUrl.includes('${kelvin}')) &&
      isValidNumber(data.attributes.colorTemperatureMireds, data.attributes.colorTempPhysicalMinMireds as number, data.attributes.colorTempPhysicalMaxMireds as number)
    ) {
      await wait(100); // Wait a bit to ensure the latest values are written by the command handlers. After the wait the attributes should be updated and the context be closed.
      data.attributes = endpoint.stateOf(MatterbridgeColorControlServer);
      if (isValidNumber(data.attributes.colorTemperatureMireds)) {
        const kelvin = miredToKelvin(data.attributes.colorTemperatureMireds);
        this.log.debug(`Attribute colorTemperatureMireds is ${data.attributes.colorTemperatureMireds}, which is ${kelvin}K`);
        if (url.includes('${mired}')) parsedUrl = parsedUrl.replace('${mired}', data.attributes.colorTemperatureMireds.toString());
        if (url.includes('${kelvin}')) parsedUrl = parsedUrl.replace('${kelvin}', kelvin.toString());
      }
    }
    if (
      (parsedUrl.includes('${hue}') || parsedUrl.includes('${saturation}') || parsedUrl.includes('${red}') || parsedUrl.includes('${green}') || parsedUrl.includes('${blue}')) &&
      isValidNumber(data.attributes.currentHue, 0, 254) &&
      isValidNumber(data.attributes.currentSaturation, 0, 254)
    ) {
      await wait(100); // Wait a bit to ensure the latest values are written by the command handlers. After the wait the attributes should be updated and the context be closed.
      data.attributes = endpoint.stateOf(MatterbridgeColorControlServer);
      if (isValidNumber(data.attributes.currentHue, 0, 254) && isValidNumber(data.attributes.currentSaturation, 0, 254)) {
        const rgb = hslColorToRgbColor((data.attributes.currentHue * 360) / 254, (data.attributes.currentSaturation * 100) / 254, 50);
        this.log.debug(`Converted hue ${data.attributes.currentHue} and saturation ${data.attributes.currentSaturation} to RGB r: ${rgb.r} g: ${rgb.g} b: ${rgb.b}`);
        if (url.includes('${hue}')) parsedUrl = parsedUrl.replace('${hue}', Math.round((data.attributes.currentHue * 360) / 254).toString());
        if (url.includes('${saturation}')) parsedUrl = parsedUrl.replace('${saturation}', Math.round((data.attributes.currentSaturation * 100) / 254).toString());
        if (url.includes('${red}') && rgb) parsedUrl = parsedUrl.replace('${red}', rgb.r.toString());
        if (url.includes('${green}') && rgb) parsedUrl = parsedUrl.replace('${green}', rgb.g.toString());
        if (url.includes('${blue}') && rgb) parsedUrl = parsedUrl.replace('${blue}', rgb.b.toString());
      }
    }
    if (
      (parsedUrl.includes('${colorX}') || parsedUrl.includes('${colorY}')) &&
      isValidNumber(data.attributes.currentX, 0, 65279) &&
      isValidNumber(data.attributes.currentY, 0, 65279)
    ) {
      await wait(100); // Wait a bit to ensure the latest values are written by the command handlers. After the wait the attributes should be updated and the context be closed.
      data.attributes = endpoint.stateOf(MatterbridgeColorControlServer);
      if (isValidNumber(data.attributes.currentX, 0, 65279) && isValidNumber(data.attributes.currentY, 0, 65279)) {
        if (url.includes('${colorX}')) parsedUrl = parsedUrl.replace('${colorX}', this.roundTo(data.attributes.currentX / 65536, 4).toString());
        if (url.includes('${colorY}')) parsedUrl = parsedUrl.replace('${colorY}', this.roundTo(data.attributes.currentY / 65536, 4).toString());
      }
    }

    // Execute the fetch
    this.log.debug(`Fetching ${parsedUrl} with ${method}...`);
    fetch(parsedUrl, method)
      .then((response) => {
        this.log.notice(`Webhook ${deviceType} ${deviceName} ${command} successful!`);
        this.log.debug(`Webhook ${deviceType} ${deviceName} ${command} response:${rs}\n`, response);
        return;
      })
      .catch((err) => {
        this.log.error(`Webhook ${deviceType} ${deviceName} ${command} failed: ${err instanceof Error ? err.message : err}`);
      });
    return { method, url: parsedUrl };
  }

  /**
   * Round a number to the number of digits specified
   *
   * @param {number} value - The number to round
   * @param {number} digits - The number of digits to round to
   * @returns {number} The rounded number
   */
  private roundTo(value: number, digits: number): number {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }
}
