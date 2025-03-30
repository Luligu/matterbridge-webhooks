import { bridgedNode, Matterbridge, MatterbridgeDynamicPlatform, MatterbridgeEndpoint, onOffLight, onOffOutlet, onOffSwitch, PlatformConfig } from 'matterbridge';
import { AnsiLogger } from 'matterbridge/logger';
import { fetch } from './fetch.js';

export class Platform extends MatterbridgeDynamicPlatform {
  webhooks;
  readonly bridgedDevices = new Map<string, MatterbridgeEndpoint>();

  constructor(matterbridge: Matterbridge, log: AnsiLogger, config: PlatformConfig) {
    super(matterbridge, log, config);

    // Verify that Matterbridge is the correct version
    if (this.verifyMatterbridgeVersion === undefined || typeof this.verifyMatterbridgeVersion !== 'function' || !this.verifyMatterbridgeVersion('2.2.5')) {
      throw new Error(`This plugin requires Matterbridge version >= "2.2.5". Please update Matterbridge to the latest version in the frontend.`);
    }

    this.log.info('Initializing platform:', this.config.name);

    this.webhooks = this.config.webhooks as Record<string, { method: 'POST' | 'GET'; httpUrl: string; test: boolean }>;

    this.log.info('Finished initializing platform:', this.config.name);
  }

  override async onStart(reason?: string): Promise<void> {
    this.log.info('onStart called with reason:', reason ?? 'none');

    // Clear all devices select
    await this.ready;
    await this.clearSelect();

    // Register devices
    let i = 1;
    for (const webhookName in this.webhooks) {
      if (Object.prototype.hasOwnProperty.call(this.webhooks, webhookName)) {
        const webhook = this.webhooks[webhookName];
        this.setSelectDevice('webhook' + i, webhookName, webhook.httpUrl, 'webhook');
        if (!this.validateDevice(['webhook' + i, webhookName])) return;
        this.log.info(`Registering device: ${webhookName}`, webhook.method, webhook.httpUrl);
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
  }

  override async onConfigure(): Promise<void> {
    await super.onConfigure();
    this.log.info('onConfigure called');
    this.bridgedDevices.forEach(async (device) => {
      this.log.info(`Configuring device: ${device.deviceName}`);
      await device.setAttribute('onOff', 'onOff', false, device.log);
    });
  }

  override async onAction(action: string, value?: string, id?: string): Promise<void> {
    this.log.info('onAction called with action:', action, 'and value:', value ?? 'none', 'and id:', id ?? 'none');
    if (action === 'test') {
      for (const webhookName in this.webhooks) {
        if (Object.prototype.hasOwnProperty.call(this.webhooks, webhookName)) {
          const webhook = this.webhooks[webhookName];
          if (id?.includes(webhookName)) {
            this.log.info(`Testing webhook ${webhookName} method ${webhook.method} url ${webhook.httpUrl}`);
            fetch(webhook.httpUrl, webhook.method)
              .then(() => {
                this.log.notice(`Webhook test ${webhookName} successful!`);
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
