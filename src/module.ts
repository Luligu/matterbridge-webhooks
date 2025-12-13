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
  CommandHandlerData,
  MatterbridgeDynamicPlatform,
  MatterbridgeEndpoint,
  onOffLight,
  onOffOutlet,
  onOffSwitch,
  PlatformConfig,
  PlatformMatterbridge,
} from 'matterbridge';
import { isValidNumber, isValidObject } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';
import { LevelControl } from 'matterbridge/matter/clusters';

import { fetch } from './fetch.js';

export interface WebhookConfig {
  method: 'POST' | 'GET';
  httpUrl: string;
  test: boolean;
}
export interface OutletConfig {
  onUrl: string;
  offUrl: string;
}

export interface LightConfig {
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
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.4.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.4.0". Please update Matterbridge to the latest version in the frontend.`);
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
          this.log.info(`Webhook ${webhookName} triggered.`);
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
          this.log.info(`Webhook outlet ${outletName} on triggered.`);
          const parsed = this.parseUrl(webhook.onUrl, data);
          this.log.debug(`Fetching ${parsed.url} with ${parsed.method}...`);
          fetch(parsed.url, parsed.method)
            .then(() => this.log.notice(`Webhook outlet ${outletName} on successful!`))
            .catch((err) => {
              this.log.error(`Webhook outlet ${outletName} on failed: ${err instanceof Error ? err.message : err}`);
            });
        })
        .addCommandHandler('off', async (data) => {
          this.log.info(`Webhook outlet ${outletName} off triggered.`);
          const parsed = this.parseUrl(webhook.offUrl, data);
          this.log.debug(`Fetching ${parsed.url} with ${parsed.method}...`);
          fetch(parsed.url, parsed.method)
            .then(() => this.log.notice(`Webhook outlet ${outletName} off successful!`))
            .catch((err) => {
              this.log.error(`Webhook outlet ${outletName} off failed: ${err instanceof Error ? err.message : err}`);
            });
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
   * @param {string} url - The URL to parse.
   * @param {CommandHandlerData} [data] - The command handler data.
   * @returns {{ method: 'POST' | 'GET'; url: string }} - The parsed method and URL.
   */
  parseUrl(url: string, data: CommandHandlerData): { method: 'POST' | 'GET'; url: string } {
    let method: 'POST' | 'GET' = 'GET';
    let parsedUrl = url;
    if (url.startsWith('GET#:')) {
      method = 'GET';
      parsedUrl = url.replace('GET#:', '');
    } else if (url.startsWith('POST#:')) {
      method = 'POST';
      parsedUrl = url.replace('POST#:', '');
    }
    if (url.includes('${BRIGHTNESS}') && isValidNumber(data.request.level)) {
      parsedUrl = url.replace('${BRIGHTNESS}', (data.request as LevelControl.MoveToLevelRequest).level.toString());
    }
    if (url.includes('${BRIGHTNESS100}') && isValidNumber(data.request.level)) {
      parsedUrl = url.replace('${BRIGHTNESS100}', Math.round(((data.request as LevelControl.MoveToLevelRequest).level / 254) * 100).toString());
    }
    return { method, url: parsedUrl };
  }
}
