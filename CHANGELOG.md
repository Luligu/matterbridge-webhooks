# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge webhooks plugin changelog

[![npm version](https://img.shields.io/npm/v/matterbridge-webhooks.svg)](https://www.npmjs.com/package/matterbridge-webhooks)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-webhooks.svg)](https://www.npmjs.com/package/matterbridge-webhooks)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge?label=docker%20pulls)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-webhooks/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/matterbridge-webhooks/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-webhooks/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/mmatterbridge-webhooks)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://github.com/prettier/prettier)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://github.com/eslint/eslint)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/api/esm.html)
[![matterbridge.io](https://img.shields.io/badge/matterbridge.io-online-brightgreen)](https://matterbridge.io)

[![powered by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![powered by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![powered by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![powered by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

All notable changes to this project will be documented in this file.

If you like this project and find it useful, please consider giving it a star on GitHub at https://github.com/Luligu/matterbridge-webhooks and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="120"></a>

## [1.1.2] - 2026-02-07

### Changed

- [package]: Updated dependencies.
- [package]: Bumped package to automator v.3.0.6.
- [package]: Bumped node-ansi-logger to v.3.2.0.
- [vite]: Added cache under .cache/vite.
- [workflow]: Migrated to trusted publishing / OIDC. Since you can authorize only one workflow with OIDC, publish.yml now does both the publishing with tag latest (on release) and with tag dev (on schedule or manual trigger).

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.1.1] - 2026-01-20

### Added

- [matter]: Conformance to Matter 1.4.2 and matterbridge 3.5.x.

### Changed

- [package]: Updated dependencies.
- [package]: Bumped package to automator v.3.0.0.
- [package]: Refactored Dev Container to use Matterbridge mDNS reflector.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.1.0] - 2025-12-16

### Added Webhook devices

It allows to create a device based on webhooks.

Features:

- It is possible to choose the device type from the config.
- It is possible to set the method with a prefix 'GET#' or 'POST# in the urls. Default if omitted is GET.
- It is possible to use converters in the url.

### Supported device types:

| Device type    | Urls                                 |
| -------------- | ------------------------------------ |
| outlet         | on off                               |
| onOffLight     | on off                               |
| dimmerLight    | on off brightness                    |
| colorTempLight | on off brightness colorTemp          |
| extendedLight  | on off brightness colorTemp colorRgb |

If there is interest, let me know and I will add all other device types.

### Supported request converters:

| Converter     | Return value        |
| ------------- | ------------------- |
| ${LEVEL}      | matter 1-254        |
| ${LEVEL100}   | percentage 0-100    |
| ${MIRED}      | colorTemp in mired  |
| ${KELVIN}     | colorTemp in kelvin |
| ${HUE}        | hue 0-360           |
| ${SATURATION} | saturation 0-100    |
| ${COLORX}     | colorX 0-1          |
| ${COLORY}     | colorX 0-1          |

### Supported cluster attributes:

| Attributes    | Return value        |
| ------------- | ------------------- |
| ${level}      | matter 1-254        |
| ${level100}   | percentage 0-100    |
| ${mired}      | colorTemp in mired  |
| ${kelvin}     | colorTemp in kelvin |
| ${hue}        | hue 0-360           |
| ${saturation} | saturation 0-100    |
| ${colorX}     | colorX 0-1          |
| ${colorY}     | colorX 0-1          |
| ${red}        | red 0-255           |
| ${gree}       | green 0-255         |
| ${blue}       | blue 0-255          |

### Changed

- [package]: Updated dependencies.
- [package]: Bumped package to automator v.2.1.1.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.0.2] - 2025-12-12

### Changed

- [package]: Updated dependencies.
- [package]: Updated to the current Matterbridge signatures.
- [package]: Required matterbridge v.3.4.0.
- [package]: Updated to the Matterbridge Jest module.
- [package]: Bumped package to automator v.2.1.0.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.0.1] - 2025-11-14

### Changed

- [package]: Updated dependencies.
- [package]: Bumped package to automator v.2.0.12.
- [package]: Updated to the current Matterbridge signatures.
- [jest]: Updated jestHelpers to v.1.0.12.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [1.0.0] - 2025-10-28

### Changed

- [package]: Updated dependencies.
- [package]: Bumped platform to v.1.0.0.
- [package]: Bumped package to automator v.2.0.10
- [jest]: Bumped jestHelpers to v.1.0.10.
- [package]: Require matterbridge v.3.3.0.
- [package]: Added default config.
- [platform]: Updated to new signature PlatformMatterbridge.
- [workflows]: Ignore any .md in build.yaml.
- [workflows]: Ignore any .md in codeql.yaml.
- [workflows]: Ignore any .md in codecov.yaml.
- [workflows]: Improved speed on Node CI.
- [devcontainer]: Added the plugin name to the container.
- [devcontainer]: Improved performance of first build with shallow clone.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [0.0.5] - 2025-07-02

### Added

- [DevContainer]: Added support for the **Matterbridge Plugin Dev Container** with an optimized named volume for `node_modules`.
- [GitHub]: Added GitHub issue templates for bug reports and feature requests.
- [ESLint]: Refactored the flat config.
- [ESLint]: Added the plugins `eslint-plugin-promise`, `eslint-plugin-jsdoc`, and `@vitest/eslint-plugin`.
- [Jest]: Refactored the flat config.
- [Vitest]: Added Vitest for TypeScript project testing. It will replace Jest, which does not work correctly with ESM module mocks.
- [JSDoc]: Added missing JSDoc comments, including `@param` and `@returns` tags.
- [CodeQL]: Added CodeQL badge in the readme.
- [Codecov]: Added Codecov badge in the readme.

### Changed

- [package]: Updated package to Automator v. 2.0.1.
- [package]: Updated dependencies.
- [storage]: Bumped `node-storage-manager` to 2.0.0.
- [logger]: Bumped `node-ansi-logger` to 3.1.1.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [0.0.4] - 2025-05-05

### Changed

- [package]: Updated package.
- [package]: Updated dependencies.

### Fixed

- [platform]: Fixed bug on unselected webhooks.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [0.0.3] - 2025-05-01

### Added

- [readme]: Added the possibility to test the hook before confirming the changes in the config editor.

### Changed

- [package]: Require matterbridge 3.0.0.
- [package]: Updated package.
- [package]: Updated dependencies.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [0.0.2] - 2025-03-30

### Added

- [readme]: Added some examples for Shelly Trv gen 1.

### Fixed

- [select]: Fixed missing clearSelect on start.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [0.0.1] - 2025-03-19

First published release.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

<!-- Commented out section
## [1.1.2] - 2024-03-08

### Added

- [Feature 1]: Description of the feature.
- [Feature 2]: Description of the feature.

### Changed

- [Feature 3]: Description of the change.
- [Feature 4]: Description of the change.

### Deprecated

- [Feature 5]: Description of the deprecation.

### Removed

- [Feature 6]: Description of the removal.

### Fixed

- [Bug 1]: Description of the bug fix.
- [Bug 2]: Description of the bug fix.

### Security

- [Security 1]: Description of the security improvement.
-->
