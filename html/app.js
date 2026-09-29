(function () {
    'use strict';

    const CFG = window.CONFIG || {};
    const UI  = CFG.UI || {};
    const root = document.documentElement;

    const IN_GAME = typeof window.GetParentResourceName === 'function';
    const RES = IN_GAME ? window.GetParentResourceName() : 'jinn-playerlist';

    let DATA = {
        serverId: 1,
        online: [],
        recent: [],
        nearby: 0,
        jobs: {},
        activeDuty: 0,
        maxPlayers: CFG.MaxPlayers || 128,
    };

    function applyTheme() {
        const t = UI.theme || {};
        const map = {
            '--accent': t.accent, '--accent2': t.accent2, '--bg': t.background,
            '--surface': t.surface, '--surface-alt': t.surfaceAlt, '--border': t.border,
            '--text': t.text, '--muted': t.textMuted,
        };
        for (const k in map) if (map[k]) root.style.setProperty(k, map[k]);

        const b = UI.brand || {};
        if (b.primary)  document.getElementById('brandPrimary').textContent  = b.primary;
        if (b.accent)   document.getElementById('brandAccent').textContent   = b.accent;
        if (b.subtitle) document.getElementById('brandSubtitle').textContent = b.subtitle;

        applyLayout();

        if (CFG.MaxPlayers) {
            DATA.maxPlayers = CFG.MaxPlayers;
            document.getElementById('totalMax').textContent = CFG.MaxPlayers;
        }

        const tabs = UI.tabs || {};
        if (tabs.recent === false) hide('.sub-tab[data-sub="recent"]');
        if (tabs.nearby === false) hide('.sub-tab[data-sub="nearby"]');
        if (tabs.jobs   === false) hide('.main-tab[data-view="jobs"]');
        const f = UI.footer || {};
        if (f.showTotal  === false) document.getElementById('footerTotal').style.display = 'none';
        if (f.showNearby === false) document.getElementById('footerNearby').style.display = 'none';

        const hintEl = document.getElementById('sbHint');
        const hint = UI.hint || {};
        if (hint.enabled === false) hintEl.style.display = 'none';
        else if (hint.text) hintEl.textContent = hint.text;
    }

    function hide(sel) { const e = document.querySelector(sel); if (e) e.style.display = 'none'; }

    function applyLayout() {
        const sb = document.getElementById('scoreboard');
        const P = (UI.position) || {};
        const anchor = P.anchor || 'top-right';
        const ox = (P.offsetX != null ? P.offsetX : 25) + 'px';
        const oy = (P.offsetY != null ? P.offsetY : 25) + 'px';
        const [v, h] = anchor.split('-');

        sb.style.top = sb.style.bottom = sb.style.left = sb.style.right = 'auto';
        sb.style.transform = 'none';

        if (v === 'top')         { sb.style.top = oy; }
        else if (v === 'bottom') { sb.style.bottom = oy; }
        else { sb.style.top = '50%'; sb.style.transform = 'translateY(-50%)'; }

        if (h === 'right') sb.style.right = ox; else sb.style.left = ox;
        sb.style.transformOrigin = `${v === 'bottom' ? 'bottom' : 'top'} ${h}`;

        if (P.width)  sb.style.width = P.width + 'px';
        if (P.scale)  sb.style.zoom  = P.scale;
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function pad2(n) { return String(n).padStart(2, '0'); }

    function avatarHTML(p) {
        if (p.avatar) {
            return `<img src="${esc(p.avatar)}" ` +
                `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />` +
                `<i class="fa-solid fa-user ph" style="display:none"></i>`;
        }
        return `<i class="fa-solid fa-user ph"></i>`;
    }

    function renderOnline() {
        const wrap = document.getElementById('onlineList');
        const list = DATA.online || [];
        document.getElementById('countOnline').textContent = list.length;

        if (!list.length) {
            wrap.innerHTML = `<div class="row"><div class="row-info"><div class="row-sub">No players online</div></div></div>`;
            return;
        }
        wrap.innerHTML = list.map((p) => {
            const color = p.color || (UI.theme && UI.theme.accent) || '#3b6fe0';
            const dot = p.statusColor || (UI.statusDots && UI.statusDots.online) || '#22c55e';
            const sub = CFG.PingDisplay && p.ping != null ? `Latency: ${p.ping}ms` : (p.sub || '');
            return `
            <div class="row" style="--row-color:${esc(color)}" data-id="${esc(p.id)}">
                <div class="avatar">
                    ${avatarHTML(p)}
                    <span class="status" style="background:${esc(dot)}"></span>
                </div>
                <div class="row-info">
                    <div class="row-name" data-copy="name" title="Copy">${esc(p.name)}</div>
                    ${sub ? `<div class="row-sub">${esc(sub)}</div>` : ''}
                </div>
                <div class="row-id" data-copy="id" title="Copy"><span class="lbl">Id</span>${esc(p.id)}</div>
            </div>`;
        }).join('');

        wrap.querySelectorAll('.row').forEach((row) => {
            const id = row.getAttribute('data-id');
            const player = list.find((x) => String(x.id) === String(id));
            if (CFG.Copy && CFG.Copy.onName) {
                const n = row.querySelector('[data-copy="name"]');
                if (n) n.addEventListener('click', () => copyPlayer(player, 'name'));
            }
            if (CFG.Copy && CFG.Copy.onIdentifier) {
                const i = row.querySelector('[data-copy="id"]');
                if (i) i.addEventListener('click', () => copyPlayer(player, 'identifier'));
            }
        });
    }

    function renderRecent() {
        const wrap = document.getElementById('recentList');
        const list = DATA.recent || [];
        document.getElementById('countRecent').textContent = list.length;

        if (!list.length) {
            wrap.innerHTML = `<div class="row recent"><div class="row-info"><div class="row-sub">No recent disconnects</div></div></div>`;
            return;
        }
        wrap.innerHTML = list.map((p) => `
            <div class="row recent" style="--row-color:${esc(p.color || '#3a3a44')}">
                <div class="avatar">${avatarHTML(p)}</div>
                <div class="row-info">
                    <div class="row-name">${esc(p.name)}</div>
                    <div class="row-sub">Disconnected ${esc(p.ago)}</div>
                </div>
                <div class="row-id"><span class="lbl">Id</span>${esc(p.id)}</div>
            </div>`).join('');
    }

    function renderNearby() {
        const n = DATA.nearby || 0;
        document.getElementById('countNearby').textContent = n;
        document.getElementById('nearbyBig').textContent = pad2(n);
        document.getElementById('footerNearbyVal').textContent = n;
        const max = Math.max(DATA.online.length, 1);
        document.getElementById('nearbyBar').style.width = Math.min(100, (n / max) * 100) + '%';
    }

    function renderJobs() {
        const wrap = document.getElementById('jobsList');
        const defs = CFG.Jobs || {};
        const counts = DATA.jobs || {};
        let total = 0;

        wrap.innerHTML = Object.keys(defs).map((key) => {
            const j = defs[key];
            const count = counts[key] || 0;
            total += count;
            const icon = j.image
                ? `<img src="${esc(j.image)}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block'" />` +
                  `<i class="fa-solid fa-${esc(j.icon)}" style="display:none"></i>`
                : `<i class="fa-solid fa-${esc(j.icon)}"></i>`;
            return `
            <div class="job-row ${count === 0 ? 'empty' : ''}" style="--job-color:${esc(j.color)}">
                <div class="job-icon">${icon}</div>
                <div class="job-info">
                    <div class="job-name">${esc(j.label)}</div>
                    <div class="job-sub">${count === 0 ? 'No personnel' : 'Active personnel'}</div>
                </div>
                <div class="job-count"><i class="fa-solid fa-user"></i>${count}</div>
            </div>`;
        }).join('');

        const dutyTotal = DATA.activeDuty != null ? DATA.activeDuty : total;
        document.getElementById('activeDuty').textContent = dutyTotal;
    }

    function renderFooter() {
        document.getElementById('serverId').textContent = DATA.serverId;
        document.getElementById('totalOnline').textContent = DATA.online.length;
        document.getElementById('totalMax').textContent = DATA.maxPlayers;
        const pct = Math.min(100, (DATA.online.length / Math.max(DATA.maxPlayers, 1)) * 100);
        document.getElementById('totalBar').style.width = pct + '%';
    }

    function renderAll() {
        renderOnline();
        renderRecent();
        renderNearby();
        renderJobs();
        renderFooter();
    }

    function copyPlayer(player, kind) {
        if (!player) return;
        const fmt = kind === 'identifier' ? 'identifier' : (CFG.TextFormat || 'name');
        const text = formatText(player, fmt);
        if (IN_GAME) post('copy', { text });
        else if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
        toast(`Copied: ${text}`);
    }

    function formatText(p, fmt) {
        switch (fmt) {
            case 'identifier':      return p.identifier || ('id:' + p.id);
            case 'name_identifier': return `${p.name} (${p.identifier || 'id:' + p.id})`;
            case 'name_ping':       return `${p.name} (${p.ping != null ? p.ping : 0})`;
            case 'id':              return String(p.id);
            case 'citizenid':       return p.citizenid || String(p.id);
            case 'name':
            default:                return p.name || '';
        }
    }

    let toastTimer;
    function toast(msg) {
        let el = document.getElementById('sb-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sb-toast';
            el.style.cssText = 'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);' +
                'background:#1b1b21;border:1px solid #26262e;color:#f5f5f7;padding:10px 18px;' +
                'border-radius:12px;font:600 13px Inter,sans-serif;z-index:99;box-shadow:0 10px 30px rgba(0,0,0,.5);' +
                'opacity:0;transition:.2s;';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
    }

    function initTabs() {
        document.querySelectorAll('.main-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.main-tab').forEach((t) => t.classList.remove('active'));
                document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(`.view[data-view="${tab.dataset.view}"]`).classList.add('active');
            });
        });
        document.querySelectorAll('.sub-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sub-tab').forEach((t) => t.classList.remove('active'));
                document.querySelectorAll('.sub-view').forEach((v) => v.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(`.sub-view[data-sub="${tab.dataset.sub}"]`).classList.add('active');
            });
        });
    }

    const board = document.getElementById('scoreboard');

    function open()  { board.classList.remove('hidden'); }

    function close() { board.classList.add('hidden'); if (IN_GAME) post('close', {}); }

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') close();
    });

    document.addEventListener('keydown', (e) => {
        if (board.classList.contains('hidden')) return;
        const key = (CFG.Keybind || 'U').toLowerCase();
        if (e.key && e.key.toLowerCase() === key) close();
    });

    window.addEventListener('message', (ev) => {
        const d = ev.data || {};
        switch (d.action) {
            case 'open':   if (d.data) updateData(d.data); open(); break;
            case 'close':  close(); break;
            case 'update': updateData(d.data || {}); break;
        }
    });

    function updateData(d) {
        DATA = Object.assign(DATA, d);
        if (CFG.MaxPlayers) DATA.maxPlayers = CFG.MaxPlayers;
        else if (DATA.maxPlayers == null) DATA.maxPlayers = 128;
        renderAll();
    }

    function post(name, body) {
        fetch(`https://${RES}/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(body || {}),
        }).catch(() => {});
    }

    function demo() {
        updateData({
            serverId: 1,
            maxPlayers: 128,
            nearby: 3,
            activeDuty: 22,
            online: [
                { id: 1,   name: 'John doe',         ping: 24,  color: '#ef4444', avatar: '' },
                { id: 24,  name: 'Jane smith',       ping: 55,  color: '#eab308', avatar: '' },
                { id: 102, name: 'Officer tenpenny', ping: 12,  color: '#3b82f6', avatar: '' },
                { id: 404, name: 'Cj johnson',       ping: 150, color: '#22c55e', avatar: '' },
                { id: 99,  name: 'Big smoke',        ping: 45,  color: '#a855f7', avatar: '' },
                { id: 88,  name: 'Ryder',            ping: 32,  color: '#3b6fe0', avatar: '' },
                { id: 12,  name: 'Sweet',            ping: 28,  color: '#ef4444', avatar: '' },
            ],
            recent: [
                { id: 555, name: 'Disconnected user', ago: '2min ago' },
                { id: 666, name: 'Rage quitter',      ago: '15min ago' },
                { id: 123, name: 'Legacy player',     ago: '1hr ago' },
            ],
            jobs: { police: 12, ambulance: 5, taxi: 2, realestate: 0, cardealer: 3 },
        });
        open();
    }

    applyTheme();
    initTabs();
    renderAll();

    if (!IN_GAME) demo();
})();
