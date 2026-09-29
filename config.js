/* =====================================================================
   Jinn Scoreboard / Playerlist
   ---------------------------------------------------------------------
   FULL CONFIGURATION FILE
   This single config is shared by the server script, the client script
   and the NUI (the UI reads it through a window.CONFIG injection).
   Edit everything here. No need to touch any other file.
   ===================================================================== */

(function () {

const Config = {};

/* ------------------------------------------------------------------ *
 * 1. FRAMEWORK / CORE
 * ------------------------------------------------------------------ *
 *  Choose which core the server runs. Job / citizenid / duty data is
 *  fetched automatically from the selected core.
 *
 *  Supported values:
 *    'auto'       -> detect the running framework automatically
 *    'esx'        -> es_extended
 *    'qbcore'     -> qb-core
 *    'qbox'       -> qbx_core
 *    'standalone' -> no framework (only native player data)
 *    'custom'     -> define your own getters in Config.CustomCore below
 * ------------------------------------------------------------------ */
Config.Core = 'auto';

/*  Only used when Config.Core === 'custom'.
 *  Each function receives the server-side player source (number)
 *  and must return the requested value (or null).
 *  These run on the SERVER side. */
Config.CustomCore = {
    // return the player's job name, e.g. "police"
    getJob: (src) => {
        return null;
    },
    // return the player's character id (citizenid / identifier / charId)
    getCitizenId: (src) => {
        return null;
    },
    // return true if the player counts as "on duty" for their job
    getOnDuty: (src) => {
        return true;
    },
    // OPTIONAL: return a hex color string to override the row color
    getRoleColor: (src) => {
        return null;
    },
};

/* ------------------------------------------------------------------ *
 * 2. IDENTITY / PROFILE IMAGES
 * ------------------------------------------------------------------ *
 *    'steam'   -> needs Config.SteamAPIKey   (https://steamcommunity.com/dev)
 *    'discord' -> needs Config.DiscordBotToken (https://discord.com/developers/applications)
 *    'license' / 'fivem' -> no avatar, falls back to default icon
 * ------------------------------------------------------------------ */
Config.UseIdentifier   = 'discord';
Config.SteamAPIKey     = 'YOUR_API_KEY';      // only if UseIdentifier === 'steam'
Config.DiscordBotToken = 'YOUR_BOT_TOKEN';    // only if UseIdentifier === 'discord'
Config.DefaultAvatar   = '';                  // empty = use built-in person icon

/* ------------------------------------------------------------------ *
 * 3. GENERAL
 * ------------------------------------------------------------------ */
Config.Keybind         = 'U';                 // key to open the scoreboard
Config.ToggleMode      = true;                // true  = press key to open, press again to close
                                              // false = hold key to view, release to close
Config.MaxPlayers      = 128;                 // shown as "30 / 128"
Config.PingDisplay     = true;                // show "Latency: 24ms"
Config.RefreshInterval = 2000;                // ms between live data refreshes
Config.NearbyRadius    = 300.0;               // radius (meters) for the Nearby count

/* ------------------------------------------------------------------ *
 * 4. TEXT FORMAT
 * ------------------------------------------------------------------ *
 *  'identifier'       -> discord:123456789
 *  'name_identifier'  -> PlayerName (discord:123456789)
 *  'name_ping'        -> PlayerName (45)
 *  'name'             -> PlayerName
 *  'id'               -> 1
 *  'citizenid'        -> framework character id
 * ------------------------------------------------------------------ */
Config.TextFormat         = 'name';   // text copied when you click a row
Config.TextOverHeadFormat = 'id';     // text drawn above the player's head in-world

/* ------------------------------------------------------------------ *
 * 5. OVERHEAD WORLD ID
 * ------------------------------------------------------------------ */
Config.OverHead = {
    enabled: true,        // draw the ID above players while scoreboard is open
    distance: 25.0,       // max draw distance (meters)
    scale: 0.35,
};

/* ------------------------------------------------------------------ *
 * 5b. THINK EMOTE  (press the key below to play a thinking animation
 *      while the scoreboard is open)
 * ------------------------------------------------------------------ */
Config.ThinkEmote = {
    enabled: true,
    control: 44,          // control id of the key (44 = Q)
    scenario: 'WORLD_HUMAN_STAND_IMPATIENT',  // played by default (always works)
    dict: '',             // optional: set dict + name to use a custom animation instead
    name: '',
};

/* ------------------------------------------------------------------ *
 * 5c. CAMERA LOCK
 * ------------------------------------------------------------------ *
 *  When the cursor is shown the camera is frozen so the screen does not
 *  move. Hold Config.LockKey to unlock the cursor and look around again.
 * ------------------------------------------------------------------ */
Config.FreezeCameraWhileCursor = true;   // freeze the screen while the cursor is visible
Config.LockControl = 19;                 // control id used to toggle look mode (19 = Left Alt)

/* ------------------------------------------------------------------ *
 * 6. QUICK COPY
 * ------------------------------------------------------------------ */
Config.Copy = {
    onName: true,         // click a name to copy
    onIdentifier: true,   // click the Id badge to copy
};

/* ------------------------------------------------------------------ *
 * 7. CONDITIONAL / ROLE STYLING
 * ------------------------------------------------------------------ *
 *  Rows get a colored left-bar + faint background tint.
 *  `acePermission` admins are highlighted in red.
 *  Otherwise rows are coloured by job (Config.Jobs color) when available.
 * ------------------------------------------------------------------ */
Config.Styling = {
    admin: {
        enabled: true,
        color: '#ef4444',
        acePermission: 'group.admin',
    },
    colorByJob: true,
    defaultColor: '#6366f1',
};

/* ------------------------------------------------------------------ *
 * 8. JOBS PANEL
 * ------------------------------------------------------------------ *
 *  job_name = { label, icon, image, color }
 *    icon  : fontawesome free icon name (https://fontawesome.com/search?ic=free)
 *    image : optional image url (overrides icon when set)
 *    color : hex color for icon + left bar
 *  The "Active duty" counter sums every player on these jobs.
 * ------------------------------------------------------------------ */
Config.Jobs = {
    police:     { label: 'Police',      icon: 'shield-halved', image: '', color: '#3b82f6' },
    ambulance:  { label: 'Ambulance',   icon: 'user-doctor',   image: '', color: '#ef4444' },
    taxi:       { label: 'Taxi',        icon: 'taxi',          image: '', color: '#eab308' },
    realestate: { label: 'Real estate', icon: 'house',         image: '', color: '#9ca3af' },
    cardealer:  { label: 'Cardealer',   icon: 'car',           image: '', color: '#a855f7' },
};

/* ------------------------------------------------------------------ *
 * 9. UI / THEME (everything visual is configurable here)
 * ------------------------------------------------------------------ */
Config.UI = {
    brand: {
        primary: 'JINN',         // white part of the logo
        accent: 'SCOREBOARD',    // colored part of the logo
        subtitle: 'Playerlist',
    },
    // panel placement + size on screen
    position: {
        anchor: 'top-right',     // 'top-left' | 'top-right' | 'center-left' |
                                 // 'center-right' | 'bottom-left' | 'bottom-right'
        offsetX: 25,             // distance from the left/right screen edge (px)
        offsetY: 25,             // distance from the top/bottom screen edge (px)
        width: 360,              // panel width in px (smaller = more compact)
        scale: 0.92,             // overall UI scale (1 = normal, 0.9 = smaller)
    },
    theme: {
        accent:      '#3b6fe0',  // main blue (tabs, logo accent, bars)
        accent2:     '#2f59c4',  // darker shade of the SAME blue (subtle depth, no purple)
        background:  '#0a0a0c',  // panel background
        surface:     '#141418',  // card background
        surfaceAlt:  '#1b1b21',  // footer / nested card background
        border:      '#26262e',
        text:        '#f5f5f7',
        textMuted:   '#8a8a93',
    },
    tabs: {
        online: true,
        recent: true,
        nearby: true,
        jobs:   true,
    },
    recent: {
        maxEntries: 10,         // how many disconnected players to remember
        keepMinutes: 120,       // forget disconnects older than this
    },
    footer: {
        showTotal: true,
        showNearby: true,
    },
    hint: {
        enabled: true,                              // show the small hint at the bottom
        text: 'Press Alt to lock / unlock cursor',  // hint text (underlined)
    },
    statusDots: {
        online: '#22c55e',
        idle:   '#eab308',
        admin:  '#3b82f6',
    },
};

/* ------------------------------------------------------------------ *
 * 10. EXPORT (works in both browser preview and FiveM JS runtime)
 * ------------------------------------------------------------------ */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;          // node / bundler require()
}
if (typeof globalThis !== 'undefined') {
    globalThis.Config = Config;       // shared across FiveM client & server JS runtimes
}
if (typeof window !== 'undefined') {
    window.CONFIG = Config;           // NUI / browser preview
}

})();
