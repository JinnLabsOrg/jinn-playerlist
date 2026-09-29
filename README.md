# Jinn Scoreboard — Advanced Scoreboard / Playerlist

A clean, informative in-game scoreboard for FiveM. UI is built in **vanilla HTML/CSS/JS** and all logic is written in **JavaScript** (the only `.lua` file is `fxmanifest.lua`, which FiveM requires to load any resource — it contains no logic).

Resource folder name: **`jinn-playerlist`** (used in all export calls below).

---

## Features

- Real-time **Online** and **Recent (disconnected)** player tracking
- **Nearby** players counter (entities in proximity)
- **Total Players**, **Nearby**, and your **Server ID** display
- Live **ping / latency** display per player
- **Role / conditional styling** — colored row bars, admins highlighted in red, color-by-job
- **Overhead World ID** drawn above players while the scoreboard is open
- **Quick copy** — click a name or the `Id` badge to copy player details
- **Jobs panel** — active personnel per job + a live global active-duty counter
- **Steam / Discord profile images** (optional API key / bot token)
- Fully **configurable keybind** (default `U`)
- **Multi-core**: ESX, QBCore, QBOX, Standalone, or your own Custom core
- Everything (theme, colors, tabs, text, jobs) configured from a single `config.js`

---

## Installation

1. Place the `jinn-playerlist` folder in your `resources` directory.
2. Add to your `server.cfg`:
   ```cfg
   ensure jinn-playerlist
   ```
3. Open `config.js` and set `Config.Core` to your framework (see below).
4. (Optional) Add a Steam API key or Discord bot token for avatars.
5. Restart the server.

---

## Configuration (`config.js`)

| Setting | Description |
|---|---|
| `Config.Core` | `'esx'`, `'qbcore'`, `'qbox'`, `'standalone'`, or `'custom'` |
| `Config.CustomCore` | Getter functions used when `Core === 'custom'` |
| `Config.UseIdentifier` | `'steam'`, `'discord'`, `'license'`, `'fivem'` |
| `Config.SteamAPIKey` | Steam Web API key (https://steamcommunity.com/dev) |
| `Config.DiscordBotToken` | Discord bot token (https://discord.com/developers/applications) |
| `Config.Keybind` | Key to open the scoreboard (default `U`) |
| `Config.ToggleMode` | `true` = press to open / press again to close · `false` = hold to view |
| `Config.MaxPlayers` | Shown as `30 / 128` |
| `Config.PingDisplay` | Toggle `Latency: 24ms` line |
| `Config.RefreshInterval` | Live refresh rate in ms |
| `Config.UI.position` | Panel placement: `anchor` (top/center/bottom + left/right), `offsetX`, `offsetY`, `width`, `scale` |
| `Config.TextFormat` | Text copied when clicking a row |
| `Config.TextOverHeadFormat` | Overhead world text format |
| `Config.OverHead` | Overhead ID enable / distance / scale |
| `Config.Copy` | Enable copy on name / identifier |
| `Config.Styling` | Admin highlight, color-by-job, default color |
| `Config.Jobs` | Job definitions (label, icon, image, color) |
| `Config.UI` | Brand text, theme colors, tabs, footer, recent settings |

### Text format options
`identifier` · `name_identifier` · `name_ping` · `name` · `id` · `citizenid`

### Custom core example
```js
Config.Core = 'custom';
Config.CustomCore = {
    getJob:       (src) => exports['my_core'].GetJob(src),
    getCitizenId: (src) => exports['my_core'].GetCharId(src),
    getOnDuty:    (src) => exports['my_core'].IsOnDuty(src),
    getRoleColor: (src) => null, // optional hex override, e.g. '#ff0000'
};
```

---

## Exports

> Replace `jinn-playerlist` with your resource folder name if you renamed it.

### Client exports

| Export | Returns | Description |
|---|---|---|
| `Open()` | — | Open the scoreboard |
| `Close()` | — | Close the scoreboard |
| `Toggle()` | — | Toggle open/closed |
| `IsOpen()` | `boolean` | Whether the scoreboard is currently open |
| `GetNearbyCount()` | `number` | Players within `Config.OverHead.distance` |
| `GetData()` | `object` | Last dataset received from the server |

**Lua usage**
```lua
exports['jinn-playerlist']:Open()
exports['jinn-playerlist']:Close()
exports['jinn-playerlist']:Toggle()

local open   = exports['jinn-playerlist']:IsOpen()
local nearby = exports['jinn-playerlist']:GetNearbyCount()
local data   = exports['jinn-playerlist']:GetData()
```

**JavaScript usage (client)**
```js
exports['jinn-playerlist'].Open();
exports['jinn-playerlist'].Close();
exports['jinn-playerlist'].Toggle();

const open   = exports['jinn-playerlist'].IsOpen();
const nearby = exports['jinn-playerlist'].GetNearbyCount();
const data   = exports['jinn-playerlist'].GetData();
```

### Server exports

| Export | Returns | Description |
|---|---|---|
| `GetData()` | `Promise<object>` | Full payload: `serverId`, `maxPlayers`, `online[]`, `recent[]`, `jobs{}`, `activeDuty` |
| `GetJobCounts()` | `Promise<object>` | `{ police: 12, ambulance: 5, ... }` |
| `GetActiveDuty()` | `Promise<number>` | Total players on duty across configured jobs |
| `GetRecent()` | `array` | Recent disconnect list `[{ id, name, ago }]` |
| `GetPlayerColor(src)` | `string` | Resolved row color (hex) for a player |
| `ClearAvatarCache(src?)` | — | Clear cached avatar for a player, or all if omitted |

**Lua usage (server)**
```lua
-- async exports return a promise-like; use a thread + Citizen.Await or await in JS
local jobs = exports['jinn-playerlist']:GetJobCounts()
local duty = exports['jinn-playerlist']:GetActiveDuty()
local recent = exports['jinn-playerlist']:GetRecent()
local color = exports['jinn-playerlist']:GetPlayerColor(playerSrc)
exports['jinn-playerlist']:ClearAvatarCache(playerSrc)
```

**JavaScript usage (server)**
```js
const data   = await exports['jinn-playerlist'].GetData();
const jobs   = await exports['jinn-playerlist'].GetJobCounts();
const duty   = await exports['jinn-playerlist'].GetActiveDuty();
const recent = exports['jinn-playerlist'].GetRecent();
const color  = exports['jinn-playerlist'].GetPlayerColor(source);
exports['jinn-playerlist'].ClearAvatarCache(source);
```

> Server exports that resolve avatars are **async** (they return a Promise). From Lua, call them inside a thread and await the promise, or wrap them with an event if you need the value synchronously.

---

## Player payload shape

```js
{
  serverId: 1,
  maxPlayers: 128,
  online: [
    { id: 1, name: 'John doe', ping: 24, identifier: 'discord:123',
      citizenid: 'ABC12345', job: 'police', color: '#ef4444', avatar: '' }
  ],
  recent: [ { id: 555, name: 'Disconnected user', ago: '2min ago' } ],
  jobs: { police: 12, ambulance: 5, taxi: 2, realestate: 0, cardealer: 3 },
  activeDuty: 22
}
```

---

## Preview the UI in a browser

Serve the folder and open `html/index.html`. It auto-loads demo data matching the screenshots so you can tweak the theme without launching the game.

---

## Notes

- Avatars are fetched only when a real Steam key / Discord token is set, and are **cached per session** to limit API requests.
- The overhead world ID only draws while the scoreboard is open.
- `fxmanifest.lua` is the standard FiveM manifest (required); all actual logic lives in the `.js` files.

---

**Jinn Scoreboard** — 100% standalone capable, works with any framework.
