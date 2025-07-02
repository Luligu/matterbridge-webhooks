# <img src="matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge webhooks plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-webhooks.svg)](https://www.npmjs.com/package/matterbridge-webhooks)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-webhooks.svg)](https://www.npmjs.com/package/matterbridge-webhooks)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge?label=docker%20version&sort=semver)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge.svg)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-webhooks/actions/workflows/build-matterbridge-plugin.yml/badge.svg)
![CodeQL](https://github.com/Luligu/matterbridge-webhooks/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-webhooks/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/mmatterbridge-webhooks)

[![power by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![power by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![power by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![power by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

This plugin allows you to expose any webhooks to Matter.

Features:

- The webhooks parameters can easily be entered in the frontend.
- It is possible to choose how to expose the webhooks: Switch, Outlet or Light.
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

In the frontend open the plugin config: add a new webhook, enter the webhook name in the first field (replace newKey with the name you want to give to the webhook), select GET or POST and enter the webhook url. The webhook name will be the device name on the controller. The webhook will be exposed like a switch, like an outlet or like a light. When you turn it on, the webhook is called and in a few seconds the switch or the outlet or the light will revert to off.

It is possible to test directly the webhook from the config editor.

## Examples

## Shelly webhooks examples

Change 192.168.1.XXX with your device IP address.

### Shelly 1 Gen 1

To turn on a shelly gen 1 device with ip 192.168.1.155 the url is http://192.168.1.XXX/light/0?turn=on.

To turn off a shelly gen 1 device with ip 192.168.1.155 the url is http://192.168.1.XXX/light/0?turn=off.

### Shelly Trv Gen 1

The following examples allows to fully control a Shelly Trv Gen 1, adding Boost, Schedule and Profile (provided by https://github.com/vandan380).

"Boost 30min": method: POST, Url: "http://192.168.1.XXX/thermostats/0?boost_minutes=30"

"Schedule Enable": method: POST, Url: "http://192.168.1.XXX/settings/thermostats/0?schedule=1"

"Schedule Disable": method: POST, Url: "http://192.168.1.XXX/settings/thermostats/0?schedule=0"

"Profile Working Day": method: POST, Url: "http://192.168.1.XXX/settings/thermostats/0?schedule_profile=1"

"Profile Holiday": method: POST, Url: "http://192.168.1.XXX/settings/thermostats/0?schedule_profile=2"
