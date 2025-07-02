import { bridgedNode, Matterbridge, MatterbridgeDynamicPlatform, MatterbridgeEndpoint, onOffLight, onOffOutlet, onOffSwitch, PlatformConfig } from 'matterbridge';
import { isValidObject } from 'matterbridge/utils';
import { AnsiLogger } from 'matterbridge/logger';

import { fetch } from './fetch.js';

interface WebhookConfig {
  method: 'POST' | 'GET';
  httpUrl: string;
  test: boolean;
}

export class Platform extends MatterbridgeDynamicPlatform {
  private webhooks: Record<string, WebhookConfig>;
  readonly bridgedDevices = new Map<string, MatterbridgeEndpoint>();

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('3.0.0')) {
      throw new Error(`This plugin requires Matterbridge version >= "3.0.0". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info('Initializing platform:', this.config.name);

    this.webhooks = this.config.webhooks as Record<string, WebhookConfig>;

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
        { uniqueStorageKey: webhookName },
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
