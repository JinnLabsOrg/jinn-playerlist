const Config = (typeof globalThis !== 'undefined' && globalThis.Config)
    ? globalThis.Config
    : require('./config.js');

let Core = null;
const RESOLVED_CORE = resolveCore(Config.Core);
const adapter = buildAdapter(RESOLVED_CORE);

function resolveCore(kind) {
    kind = (kind || 'auto').toLowerCase();
    if (kind !== 'auto') return kind;
    if (GetResourceState('qbx_core') === 'started') return 'qbox';
    if (GetResourceState('qb-core') === 'started') return 'qbcore';
    if (GetResourceState('es_extended') === 'started') return 'esx';
    return 'standalone';
}

function buildAdapter(kind) {
    switch ((kind || 'standalone').toLowerCase()) {

        case 'esx':
            return {
                ready: () => {
                    try { Core = exports['es_extended'].getSharedObject(); } catch (e) { Core = null; }
                    return !!Core;
                },
                getJob: (src) => {
                    const x = Core && Core.GetPlayerFromId(src);
                    return x && x.job ? x.job.name : null;
                },
                getCitizenId: (src) => {
                    const x = Core && Core.GetPlayerFromId(src);
                    return x ? x.identifier : null;
                },
                getOnDuty: (src) => {
                    const x = Core && Core.GetPlayerFromId(src);
                    return x && x.job ? (x.job.onDuty !== false) : true;
                },
            };

        case 'qbcore':
            return {
                ready: () => {
                    try { Core = exports['qb-core'].GetCoreObject(); } catch (e) { Core = null; }
                    return !!Core;
                },
                getJob: (src) => {
                    const p = Core && Core.Functions.GetPlayer(src);
                    return p && p.PlayerData.job ? p.PlayerData.job.name : null;
                },
                getCitizenId: (src) => {
                    const p = Core && Core.Functions.GetPlayer(src);
                    return p ? p.PlayerData.citizenid : null;
                },
                getOnDuty: (src) => {
                    const p = Core && Core.Functions.GetPlayer(src);
                    return p && p.PlayerData.job ? !!p.PlayerData.job.onduty : true;
                },
            };

        case 'qbox':
            return {
                ready: () => true,
                getJob: (src) => {
                    try { const p = exports['qbx_core'].GetPlayer(src); return p && p.PlayerData.job ? p.PlayerData.job.name : null; }
                    catch (e) { return null; }
                },
                getCitizenId: (src) => {
                    try { const p = exports['qbx_core'].GetPlayer(src); return p ? p.PlayerData.citizenid : null; }
                    catch (e) { return null; }
                },
                getOnDuty: (src) => {
                    try { const p = exports['qbx_core'].GetPlayer(src); return p && p.PlayerData.job ? !!p.PlayerData.job.onduty : true; }
                    catch (e) { return true; }
                },
            };

        case 'custom':
            return {
                ready: () => true,
                getJob:       (src) => safe(() => Config.CustomCore.getJob(src)),
                getCitizenId: (src) => safe(() => Config.CustomCore.getCitizenId(src)),
                getOnDuty:    (src) => { const v = safe(() => Config.CustomCore.getOnDuty(src)); return v == null ? true : v; },
                getRoleColor: (src) => safe(() => Config.CustomCore.getRoleColor(src)),
            };

        case 'standalone':
        default:
            return {
                ready: () => true,
                getJob: () => null,
                getCitizenId: () => null,
                getOnDuty: () => true,
            };
    }
}

function safe(fn) { try { return fn(); } catch (e) { return null; } }

on('onResourceStart', (res) => {
    if (res !== GetCurrentResourceName()) return;
    setTimeout(() => { if (adapter.ready) adapter.ready(); }, 500);
});

function getIdentifier(src, type) {
    const num = GetNumPlayerIdentifiers(String(src));
    for (let i = 0; i < num; i++) {
        const id = GetPlayerIdentifier(String(src), i);
        if (id && id.startsWith(type + ':')) return id;
    }
    return null;
}

function getDisplayIdentifier(src) {
    const t = (Config.UseIdentifier || 'license').toLowerCase();
    return getIdentifier(src, t) || getIdentifier(src, 'license') || ('id:' + src);
}

const avatarCache = {};

async function resolveAvatar(src) {
    if (avatarCache[src] !== undefined) return avatarCache[src];
    avatarCache[src] = Config.DefaultAvatar || '';

    try {
        if (Config.UseIdentifier === 'steam' && Config.SteamAPIKey && Config.SteamAPIKey !== 'YOUR_API_KEY') {
            const steam = getIdentifier(src, 'steam');
            if (steam) {
                const steamId = BigInt('0x' + steam.replace('steam:', '')).toString();
                const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${Config.SteamAPIKey}&steamids=${steamId}`;
                const res = await fetch(url);
                const j = await res.json();
                const pic = j && j.response && j.response.players && j.response.players[0]
                    ? j.response.players[0].avatarfull : null;
                if (pic) avatarCache[src] = pic;
            }
        } else if (Config.UseIdentifier === 'discord' && Config.DiscordBotToken && Config.DiscordBotToken !== 'YOUR_BOT_TOKEN') {
            const discord = getIdentifier(src, 'discord');
            if (discord) {
                const did = discord.replace('discord:', '');
                const res = await fetch(`https://discord.com/api/v10/users/${did}`, {
                    headers: { Authorization: `Bot ${Config.DiscordBotToken}` },
                });
                const j = await res.json();
                if (j && j.avatar) {
                    const ext = j.avatar.startsWith('a_') ? 'gif' : 'png';
                    avatarCache[src] = `https://cdn.discordapp.com/avatars/${did}/${j.avatar}.${ext}?size=128`;
                }
            }
        }
    } catch (e) { }

    return avatarCache[src];
}

function rowColor(src, job) {
    const S = Config.Styling || {};
    if (S.admin && S.admin.enabled && IsPlayerAceAllowed(String(src), S.admin.acePermission || 'group.admin')) {
        return { color: S.admin.color || '#ef4444', admin: true };
    }
    if (adapter.getRoleColor) {
        const c = adapter.getRoleColor(src);
        if (c) return { color: c, admin: false };
    }
    if (S.colorByJob && job && Config.Jobs[job]) {
        return { color: Config.Jobs[job].color, admin: false };
    }
    return { color: (S.defaultColor || '#6366f1'), admin: false };
}

let recent = [];

on('playerDropped', () => {
    const src = global.source;
    try {
        const name = GetPlayerName(String(src)) || ('Player ' + src);
        recent.unshift({ id: src, name, at: Date.now() });
        const max = (Config.UI && Config.UI.recent && Config.UI.recent.maxEntries) || 10;
        if (recent.length > max) recent = recent.slice(0, max);
    } catch (e) { }
});

function buildRecent() {
    const keepMs = ((Config.UI && Config.UI.recent && Config.UI.recent.keepMinutes) || 120) * 60000;
    const now = Date.now();
    recent = recent.filter((r) => now - r.at < keepMs);
    return recent.map((r) => ({ id: r.id, name: r.name, ago: timeAgo(now - r.at) }));
}

function timeAgo(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'hr ago';
    return Math.floor(h / 24) + 'd ago';
}

async function buildPayload(requester) {
    const players = getPlayers();
    const online = [];
    const jobCounts = {};
    let activeDuty = 0;
    for (const k in Config.Jobs) jobCounts[k] = 0;

    for (const src of players) {
        const job = adapter.getJob(src);
        const onDuty = adapter.getOnDuty(src);
        const { color } = rowColor(src, job);

        if (job && Config.Jobs[job]) {
            jobCounts[job] = (jobCounts[job] || 0) + 1;
            if (onDuty) activeDuty++;
        }

        online.push({
            id: parseInt(src, 10),
            name: GetPlayerName(String(src)) || ('Player ' + src),
            ping: GetPlayerPing(String(src)) || 0,
            identifier: getDisplayIdentifier(src),
            citizenid: adapter.getCitizenId(src) || null,
            job: job || null,
            color,
            avatar: await resolveAvatar(src),
        });
    }

    online.sort((a, b) => a.id - b.id);

    return {
        serverId: requester != null ? parseInt(requester, 10) : 1,
        maxPlayers: Config.MaxPlayers || GetConvarInt('sv_maxclients', 128),
        online,
        recent: buildRecent(),
        jobs: jobCounts,
        activeDuty,
    };
}

function getPlayers() {
    const out = [];
    const num = GetNumPlayerIndices();
    for (let i = 0; i < num; i++) out.push(GetPlayerFromIndex(i));
    return out;
}

onNet('jinn_sb:request', async () => {
    const src = global.source;
    const payload = await buildPayload(src);
    emitNet('jinn_sb:receive', src, payload);
});

console.log('^2[jinn-playerlist]^7 loaded | core: ^5' + RESOLVED_CORE + '^7' + (Config.Core === 'auto' ? ' ^8(auto)^7' : ''));

exports('GetData', async () => buildPayload(null));

exports('GetJobCounts', async () => {
    const p = await buildPayload(null);
    return p.jobs;
});

exports('GetActiveDuty', async () => {
    const p = await buildPayload(null);
    return p.activeDuty;
});

exports('GetRecent', () => buildRecent());

exports('GetPlayerColor', (src) => {
    const job = adapter.getJob(src);
    return rowColor(src, job).color;
});

exports('ClearAvatarCache', (src) => {
    if (src == null) { for (const k in avatarCache) delete avatarCache[k]; }
    else delete avatarCache[src];
});
