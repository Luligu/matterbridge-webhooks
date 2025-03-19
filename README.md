# <img src="matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge webhooks plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-webhooks.svg)](https://www.npmjs.com/package/matterbridge-webhooks)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-webhooks.svg)](https://www.npmjs.com/package/matterbridge-webhooks)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge?label=docker%20version&sort=semver)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge.svg)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-webhooks/actions/workflows/build-matterbridge-plugin.yml/badge.svg)
![Jest coverage](https://img.shields.io/badge/Jest%20coverage-100%25-brightgreen)

[![power by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![power by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![power by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![power by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

This plugin allows you to expose any webhooks to Matter.

Features:

- The webhooks parameters can easily be entered in the frontend.
- It is possible to choose the method: GET or POST.
- The webhook can be tested in the frontend.

If you like this project and find it useful, please consider giving it a star on GitHub at https://github.com/Luligu/matterbridge-webhooks and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="bmc-button.svg" alt="Buy me a coffee" width="120">
</a>

## Sponsors

I'm looking for sponsors and some help to test the plugin with different platform.

It would be nice to add here a few example of webhooks with different eco systems.

## Prerequisites

### Matterbridge

Follow these steps to install or update Matterbridge if it is not already installed and up to date:

```
npm install -g matterbridge --omit=dev
```

on Linux you may need the necessary permissions:

```
sudo npm install -g matterbridge --omit=dev
```

See the complete guidelines on [Matterbridge](https://github.com/Luligu/matterbridge/blob/main/README.md) for more information.

## How to add a webhook

In the frontend open the plugin config: add a new webhook, enter the webhook name in the first field (replace newKey with the name you want to give to the webhook), select GET or POST and enter the webhook url. The webhook name will be the device name on the controller. The webhook will be exposed like a switch or like a plug, when you turn it on the webhook is called and in a few seconds the switch or the plug will revert to off.

It is possible to test directly the webhook from the config editor.

## Examples

## Shelly webhooks

For example to turn on a shelly gen 1 device with ip 192.168.1.155 the url is http://192.168.1.155/light/0?turn=on.
