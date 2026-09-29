const Config = (typeof globalThis !== 'undefined' && globalThis.Config)
    ? globalThis.Config
    : require('./config.js');

let isOpen = false;
let cache = { online: [] };
let pendingOpen = false;
let cursorOn = false;

function openBoard() {
    if (isOpen) return;
    isOpen = true;
    cursorOn = false;
    SetNuiFocus(false, false);
    requestData(true);
    refreshLoop();
    if (Config.ThinkEmote && Config.ThinkEmote.enabled) playThinkEmote();
}

function closeBoard() {
    if (!isOpen) return;
    isOpen = false;
    cursorOn = false;
    SetNuiFocusKeepInput(false);
    SetNuiFocus(false, false);
    SendNUIMessage({ action: 'close' });
    if (Config.ThinkEmote && Config.ThinkEmote.enabled) ClearPedTasks(PlayerPedId());
}

if (Config.ToggleMode !== false) {
    RegisterCommand('jinn_toggle_scoreboard', () => {
        if (isOpen) closeBoard(); else openBoard();
    }, false);
    RegisterKeyMapping('jinn_toggle_scoreboard', 'Toggle Scoreboard', 'keyboard', Config.Keybind || 'U');
} else {
    RegisterCommand('+jinnScoreboard', () => openBoard(), false);
    RegisterCommand('-jinnScoreboard', () => closeBoard(), false);
    RegisterKeyMapping('+jinnScoreboard', 'Hold Scoreboard', 'keyboard', Config.Keybind || 'U');
}

function requestData(initial) {
    emitNet('jinn_sb:request');
    pendingOpen = !!initial;
}

onNet('jinn_sb:receive', (payload) => {
    cache = payload || { online: [] };
    cache.nearby = countNearby();
    SendNUIMessage({ action: pendingOpen ? 'open' : 'update', data: cache });
    pendingOpen = false;
});

function refreshLoop() {
    if (!isOpen) return;
    setTimeout(() => {
        if (!isOpen) return;
        requestData(false);
        refreshLoop();
    }, Config.RefreshInterval || 2000);
}

function countNearby() {
    const myCoords = GetEntityCoords(PlayerPedId());
    const radius = (Config.NearbyRadius != null ? Config.NearbyRadius
        : (Config.OverHead && Config.OverHead.distance) || 300.0);
    let count = 0;
    for (const pl of GetActivePlayers()) {
        if (pl === PlayerId()) continue;
        const c = GetEntityCoords(GetPlayerPed(pl));
        const dx = c[0] - myCoords[0], dy = c[1] - myCoords[1], dz = c[2] - myCoords[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius) count++;
    }
    return count;
}

setTick(() => {
    if (!isOpen || !Config.OverHead || !Config.OverHead.enabled) return;
    const myCoords = GetEntityCoords(PlayerPedId());
    const dist = Config.OverHead.distance || 25.0;
    for (const pl of GetActivePlayers()) {
        const c = GetEntityCoords(GetPlayerPed(pl));
        const dx = c[0] - myCoords[0], dy = c[1] - myCoords[1], dz = c[2] - myCoords[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) > dist) continue;
        drawText3D(c[0], c[1], c[2] + 1.0, overheadText(GetPlayerServerId(pl)));
    }
});

setTick(() => {
    if (!isOpen) return;

    DisableControlAction(0, 200, true);
    DisableControlAction(0, 322, true);
    if (IsDisabledControlJustPressed(0, 200) || IsDisabledControlJustPressed(0, 322)) {
        closeBoard();
        return;
    }

    const lockCtrl = (Config.LockControl != null) ? Config.LockControl : 19;
    DisableControlAction(0, lockCtrl, true);
    if (IsDisabledControlJustPressed(0, lockCtrl)) {
        cursorOn = !cursorOn;
        if (cursorOn) {
            SetNuiFocus(true, true);
            SetNuiFocusKeepInput(true);
        } else {
            SetNuiFocusKeepInput(false);
            SetNuiFocus(false, false);
        }
    }

    if (cursorOn && Config.FreezeCameraWhileCursor !== false) {
        DisableControlAction(0, 1, true);
        DisableControlAction(0, 2, true);
        DisableControlAction(0, 106, true);
        DisableControlAction(0, 24, true);
        DisableControlAction(0, 25, true);
        DisableControlAction(0, 257, true);
        DisableControlAction(0, 263, true);
        DisableControlAction(0, 264, true);
        DisableControlAction(0, 140, true);
        DisableControlAction(0, 141, true);
        DisableControlAction(0, 142, true);
        DisableControlAction(0, 68, true);
        DisableControlAction(0, 69, true);
        DisableControlAction(0, 70, true);
        DisableControlAction(0, 92, true);
        DisableControlAction(0, 114, true);
    }
});

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function playThinkEmote() {
    const cfg = Config.ThinkEmote || {};
    const ped = PlayerPedId();
    ClearPedTasks(ped);

    if (cfg.dict && cfg.name) {
        RequestAnimDict(cfg.dict);
        let tries = 0;
        while (!HasAnimDictLoaded(cfg.dict) && tries < 60) { await delay(16); tries++; }
        if (HasAnimDictLoaded(cfg.dict)) {
            TaskPlayAnim(ped, cfg.dict, cfg.name, 8.0, -8.0, -1, 49, 0, false, false, false);
            return;
        }
    }

    TaskStartScenarioInPlace(ped, cfg.scenario || 'WORLD_HUMAN_STAND_IMPATIENT', 0, true);
}

function overheadText(sid) {
    const fmt = Config.TextOverHeadFormat || 'id';
    const p = (cache.online || []).find((x) => String(x.id) === String(sid));
    if (!p) return String(sid);
    switch (fmt) {
        case 'identifier':      return p.identifier || String(sid);
        case 'name_identifier': return `${p.name} (${p.identifier || sid})`;
        case 'name_ping':       return `${p.name} (${p.ping || 0})`;
        case 'name':            return p.name || String(sid);
        case 'citizenid':       return p.citizenid || String(sid);
        case 'id':
        default:                return String(sid);
    }
}

function drawText3D(x, y, z, text) {
    const scale = (Config.OverHead && Config.OverHead.scale) || 0.35;
    SetTextScale(scale, scale);
    SetTextFont(4);
    SetTextProportional(true);
    SetTextColour(255, 255, 255, 215);
    SetTextOutline();
    SetTextCentre(true);
    SetDrawOrigin(x, y, z, 0);
    BeginTextCommandDisplayText('STRING');
    AddTextComponentSubstringPlayerName(text);
    EndTextCommandDisplayText(0.0, 0.0);
    ClearDrawOrigin();
}

RegisterNuiCallbackType('close');
on('__cfx_nui:close', (_, cb) => { closeBoard(); cb('ok'); });

RegisterNuiCallbackType('copy');
on('__cfx_nui:copy', (data, cb) => {
    if (data && data.text) emit('chat:addMessage', { args: ['Scoreboard', `Copied: ${data.text}`] });
    cb('ok');
});

exports('Open', () => openBoard());
exports('Close', () => closeBoard());
exports('Toggle', () => (isOpen ? closeBoard() : openBoard()));
exports('IsOpen', () => isOpen);
exports('GetNearbyCount', () => countNearby());
exports('GetData', () => cache);
