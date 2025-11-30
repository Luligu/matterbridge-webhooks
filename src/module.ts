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

import { bridgedNode, MatterbridgeDynamicPlatform, MatterbridgeEndpoint, onOffLight, onOffOutlet, onOffSwitch, PlatformConfig, PlatformMatterbridge } from 'matterbridge';
import { isValidObject } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';

import { fetch } from './fetch.js';

export interface WebhookConfig {
  method: 'POST' | 'GET';
  httpUrl: string;
  test: boolean;
}

export type WebhooksPlatformConfig = PlatformConfig & {
  whiteList: string[];
  blackList: string[];
  deviceType: 'Outlet' | 'Switch' | 'Light';
  webhooks: Record<string, WebhookConfig>;
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
  private webhooks: Record<string, WebhookConfig>;
  readonly bridgedDevices = new Map<string, MatterbridgeEndpoint>();

  constructor(matterbridge: PlatformMatterbridge, log: AnsiLogger, config: WebhooksPlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.4.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.4.0". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info('Initializing platform:', this.config.name);

    this.webhooks = config.webhooks;

    this.log.info('Finished initializing platform:', this.config.name);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Clear all devices select
    await this.ready;
    await this.clearSelect();

    // Register devices
    let i = 0;
    for (const webhookName in this.webhooks) {
      this.log.debug(`Loading webhook ${++i} ${webhookName} with method ${this.webhooks[webhookName].method} and url ${this.webhooks[webhookName].httpUrl}`);

      const webhook = this.webhooks[webhookName];
      this.setSelectDevice('webhook' + i, webhookName, undefined, 'hub');
      if (!this.validateDevice(['webhook' + i, webhookName], true)) continue;
      this.log.info(`Registering device: ${webhookName} with method ${webhook.method} and url ${webhook.httpUrl}`);
      const device = new MatterbridgeEndpoint(
        [this.config.deviceType === 'Outlet' ? onOffOutlet : this.config.deviceType === 'Light' ? onOffLight : onOffSwitch, bridgedNode],
        { id: webhookName },
        this.config.debug as boolean,
      )
        .createDefaultBridgedDeviceBasicInformationClusterServer(
          webhookName,
          'webhook' + i++,
          this.matterbridge.aggregatorVendorId,
          'Matterbridge',
          'Matterbridge Webhook',
          0,
          this.config.version as string,
        )
        .createOnOffClusterServer(false)
        .addRequiredClusterServers()
        .addCommandHandler('on', async () => {
          this.log.info(`Webhook ${webhookName} triggered.`);
          await device.setAttribute('onOff', 'onOff', false, device.log);
          fetch(webhook.httpUrl, webhook.method)
            .then(() => this.log.notice(`Webhook ${webhookName} successful!`))
            .catch((err) => {
              this.log.error(`Webhook ${webhookName} failed: ${err instanceof Error ? err.message : err}`);
            });
        });
      await this.registerDevice(device);
      this.bridgedDevices.set(webhookName, device);
    }
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('onConfigure called');
    this.bridgedDevices.forEach(async (device) => {
      this.log.info(`Configuring device: ${device.deviceName}`);
      await device.setAttribute('onOff', 'onOff', false, device.log);
    });
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
      for (const webhookName in this.webhooks) {
        if (Object.prototype.hasOwnProperty.call(this.webhooks, webhookName)) {
          const webhook = this.webhooks[webhookName];
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
    this.bridgedDevices.clear();
  }
}
