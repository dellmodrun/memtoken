(() => {
  const SUPABASE_URL = 'https://oqibxccbybdnwsbvbivh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_c0LmGH9O3mIY4N5gIyMn5g_SACN8Kda';
  const OFFICIAL_CA = 'HZqbPkg931FqWcVoYuxUD8U9CL4d9v2WybiuwUTMpump';
  let config = null;
  let checked = false;
  let officialMarket = null;

  async function loadConfig() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/config?select=key,value`, {
        headers: { apikey: SUPABASE_KEY }
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const rows = await response.json();
      config = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
    } catch (error) {
      config = { error: error.message };
    } finally {
      checked = true;
      enhance();
    }
  }

  function hasPrograms() {
    return Boolean(config?.registry_program && config?.bond_program && config?.relay_signer);
  }

  async function loadOfficialMarket() {
    if (OFFICIAL_CA === 'TBA') return;
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${OFFICIAL_CA}`);
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = await response.json();
      officialMarket = (data.pairs || []).find((pair) => pair.chainId === 'solana' && pair.dexId === 'pumpfun') || data.pairs?.[0] || null;
    } catch (error) {
      console.warn('[memtoken] official market data unavailable', error);
    } finally {
      enhance();
    }
  }

  function usd(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    return number < 1000 ? `$${number.toFixed(2)}` : `$${Math.round(number).toLocaleString('en-US')}`;
  }

  function currentPath() {
    let path = location.pathname.replace(/\/$/, '') || '/';
    if (location.hostname.endsWith('github.io')) {
      path = path.replace(/^\/memtoken(?=\/|$)/, '') || '/';
    }
    return path;
  }

  function enhanceBanner() {
    if (document.querySelector('.ca-banner')) return;
    const banner = document.createElement('aside');
    banner.className = 'ca-banner';
    banner.setAttribute('aria-label', 'Official Memtoken contract address');
    const available = OFFICIAL_CA !== 'TBA';
    banner.innerHTML = `
      <div class="ca-banner-inner">
        <button class="ca-banner-address" type="button" ${available ? '' : 'disabled'}>
          <strong class="ca-ticker">$MEMTOKEN</strong><span>· CA:</span><strong class="ca-value">${OFFICIAL_CA}</strong>
        </button>
      </div>`;
    document.body.appendChild(banner);
    if (available) banner.querySelector('button')?.addEventListener('click', async (event) => {
      await navigator.clipboard.writeText(OFFICIAL_CA);
      const value = event.currentTarget.querySelector('.ca-value');
      const original = value.textContent;
      value.textContent = 'COPIED';
      setTimeout(() => { value.textContent = original; }, 1400);
    });
  }

  function setupForm(form) {
    const fields = [...form.querySelectorAll('input, textarea')];
    const definitions = [
      ['Name your coin', 'token-name', 'name'],
      ['TICKER', 'token-symbol', 'symbol'],
      ['', 'token-description', 'description']
    ];
    fields.forEach((field) => {
      const placeholder = field.getAttribute('placeholder') || '';
      const match = definitions.find(([needle]) => needle && placeholder === needle);
      if (match) {
        field.id ||= match[1]; field.name ||= match[2]; field.autocomplete = 'off';
      }
      if (field.tagName === 'TEXTAREA') {
        field.id ||= 'token-description'; field.name ||= 'description';
      }
      if (field.type === 'file') {
        field.id ||= 'token-media'; field.name ||= 'media';
        field.setAttribute('aria-label', 'Token image or video');
      }
    });
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.setAttribute('aria-describedby', 'launch-signing-note');
  }

  function enhanceLaunch() {
    if (currentPath() !== '/launch') return;
    const content = document.querySelector('main.content');
    const formSection = content?.querySelector('section.lockwrap');
    if (!content || !formSection) return;

    const topRight = content.querySelector('.topline > :last-child');
    if (topRight && topRight.textContent !== 'mainnet / Pump.fun direct') topRight.textContent = 'mainnet / Pump.fun direct';

    let runtime = content.querySelector('.launch-runtime');
    if (!runtime) {
      runtime = document.createElement('section');
      runtime.className = 'section launch-runtime';
      formSection.before(runtime);
    }

    const programsReady = hasPrograms();
    const state = !checked ? 'checking' : config?.error ? 'unreachable' : programsReady ? 'ready' : 'pending';
    if (runtime.dataset.state !== state) runtime.innerHTML = `
      <div class="runtime-heading"><div><span class="t-label ink-3">OPERATIONAL PATH</span><h2 class="t-heading">Direct Pump.fun launch</h2></div><span class="runtime-network">SOLANA MAINNET</span></div>
      <p class="detail-lede">Create a coin directly on Pump.fun from this page. Complete the metadata, connect a compatible Solana wallet, review the wallet transaction and sign. An optional creator buy is sent only after the create transaction lands.</p>
      <div class="runtime-grid">
        <div><span>PUMP CREATE</span><strong class="state-ready">READY</strong><small>metadata + mint transaction</small></div>
        <div><span>WALLET SIGNING</span><strong class="state-ready">READY</strong><small>Phantom, Solflare and Wallet Standard</small></div>
        <div><span>PUBLIC GENESIS</span><strong class="state-${state}">${state.toUpperCase()}</strong><small>${programsReady ? 'registry and genesis programs configured' : 'awaiting Memtoken program addresses'}</small></div>
      </div>
      <div id="launch-signing-note" class="runtime-note"><strong>Before signing:</strong> verify the mint creation, SOL amount and fee payer inside your wallet. Memtoken never asks for a seed phrase or private key.</div>`;
    runtime.dataset.state = state;

    const form = formSection.querySelector('form');
    if (form) setupForm(form);

    const futureIntro = content.querySelector('.memtoken-extra > section:first-child');
    const futureHeading = futureIntro?.querySelector('h2');
    const futureLede = futureIntro?.querySelector('p');
    if (futureHeading && futureHeading.textContent !== 'What the Memtoken layer adds') {
      futureHeading.textContent = 'What the Memtoken layer adds';
    }
    const futureCopy = 'The sections below describe the public-genesis extension that activates after the registry and genesis programs are deployed. They are kept separate from the operational direct Pump.fun form above.';
    if (futureLede && futureLede.textContent !== futureCopy) futureLede.textContent = futureCopy;

    const policySection = [...content.querySelectorAll('section.section')].find((section) => section.querySelector('h2')?.textContent.trim() === 'Launch policy');
    const genesisButton = [...(policySection?.querySelectorAll('button') || [])].find((button) => button.textContent.trim().toLowerCase().includes('prepare genesis'));
    if (genesisButton && !programsReady) {
      genesisButton.disabled = true;
      genesisButton.title = 'Public genesis activates after the Memtoken registry and genesis programs are deployed.';
      let note = policySection.querySelector('.genesis-state-note');
      if (!note) {
        note = document.createElement('p'); note.className = 'genesis-state-note'; genesisButton.parentElement.appendChild(note);
      }
      const message = 'Public-genesis preparation is intentionally locked until the registry, genesis vault and relay addresses are configured. Direct Pump.fun creation below remains available.';
      if (note.textContent !== message) note.textContent = message;
    }
  }

  function enhanceSidebar() {
    const xLink = document.querySelector('.sidebar a.xbtn');
    if (xLink && !xLink.querySelector('svg')) {
      xLink.setAttribute('aria-label', 'Memtoken Labs on X');
      xLink.setAttribute('title', 'Memtoken Labs on X');
      xLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>';
    }
    const live = document.querySelector('.sidebar .live');
    if (!live || !checked) return;
    const label = [...live.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    const text = hasPrograms() ? 'live' : 'direct ready';
    if (label && label.textContent !== text) label.textContent = text;
    live.title = hasPrograms() ? 'All Memtoken programs configured' : 'Direct Pump.fun launch is available; Memtoken programs are pending';
  }

  function addEmptyRow(table, message) {
    const body = table?.querySelector('tbody');
    if (!body) return;
    const populated = [...body.children].some((row) => !row.classList.contains('empty-state-row'));
    if (populated) {
      body.querySelector('.empty-state-row')?.remove();
      return;
    }
    if (body.querySelector('.empty-state-row')) return;
    const columns = table.querySelectorAll('thead th').length || 1;
    const row = document.createElement('tr');
    row.className = 'empty-state-row';
    row.innerHTML = `<td colspan="${columns}">${message}</td>`;
    body.appendChild(row);
  }

  function enhanceEmptyStates() {
    if (!checked) return;
    const content = document.querySelector('main.content');
    if (!content) return;
    const path = currentPath();

    if (path === '/') {
      const officialCard = content.querySelector('.board-top > div:last-child');
      if (officialCard && !officialCard.querySelector('.official-token-state')) {
        const state = document.createElement('p');
        state.className = 'official-token-state';
        if (OFFICIAL_CA === 'TBA') {
          state.textContent = 'Official token pending · CA will appear here after publication.';
        } else {
          state.innerHTML = `Official CA published · <a href="https://pump.fun/coin/${OFFICIAL_CA}" target="_blank" rel="noreferrer">view on Pump.fun</a>`;
        }
        officialCard.appendChild(state);
      }
      addEmptyRow(content.querySelector('.scrollx table.tbl'), 'No verified Memtoken launches yet. Live records will appear after the first public launch.');
    }

    if (path === '/registry') {
      const tables = content.querySelectorAll('section table.tbl');
      addEmptyRow(tables[1], 'No verified provenance records yet.');
      addEmptyRow(tables[2], 'No source conflicts recorded.');
    }

    if (path === '/bonds') {
      const tables = content.querySelectorAll('section table.tbl');
      addEmptyRow(tables[0], 'No immutable fee policies published yet.');
      addEmptyRow(tables[1], 'No community routes published yet.');
      addEmptyRow(tables[2], 'No fee distributions recorded yet.');
    }

    if (path === '/docs') {
      const rows = content.querySelectorAll('#programs-and-accounts + p + table tbody tr');
      rows.forEach((row) => {
        const value = row.cells[1];
        if (value && !value.textContent.trim()) value.innerHTML = '<span class="pending-value">pending deployment</span>';
      });
    }
  }

  function enhanceOfficialMarket() {
    if (currentPath() !== '/') return;
    const content = document.querySelector('main.content');
    const table = content?.querySelector('.scrollx table.tbl');
    const body = table?.querySelector('tbody');
    if (!content || !body) return;

    const existingAppRow = [...body.querySelectorAll('tr:not(.official-market-row):not(.empty-state-row)')]
      .some((row) => row.textContent.includes('MEMTOKEN') || row.querySelector(`a[href*="${OFFICIAL_CA}"]`));
    if (existingAppRow) {
      body.querySelector('.official-market-row')?.remove();
      return;
    }

    body.querySelector('.empty-state-row')?.remove();
    let row = body.querySelector('.official-market-row');
    if (!row) {
      row = document.createElement('tr');
      row.className = 'official-market-row';
      body.appendChild(row);
    }
    const change = Number(officialMarket?.priceChange?.h24);
    const changeText = Number.isFinite(change) ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}% 24h` : 'syncing live data';
    const value = officialMarket ? usd(officialMarket.marketCap ?? officialMarket.fdv) : 'syncing…';
    const marketUrl = officialMarket?.url || `https://dexscreener.com/solana/${OFFICIAL_CA}`;
    row.innerHTML = `
      <td><span class="official-market-dot"></span></td>
      <td><a class="official-market-name" href="https://pump.fun/coin/${OFFICIAL_CA}" target="_blank" rel="noreferrer">Memtoken Coin <small>[MEMTOKEN]</small></a></td>
      <td class="official-market-value">${value}</td>
      <td class="${change >= 0 ? 'official-market-up' : 'official-market-down'}">${changeText}</td>
      <td>official CA</td>
      <td>${hasPrograms() ? 'published' : 'pending'}</td>
      <td><a class="official-market-link" href="${marketUrl}" target="_blank" rel="noreferrer">live on Pump.fun ↗</a></td>`;

    const count = content.querySelector('h2.t-heading + .t-mono .slot');
    if (count) count.textContent = '1';
    const statCells = content.querySelectorAll('.strip .cell');
    if (statCells[0]?.querySelector('.t-label')?.textContent === 'COINS') statCells[0].querySelector('.t-value').textContent = '1';
    if (statCells[1]?.querySelector('.t-label')?.textContent === 'LIVE CURVES') statCells[1].querySelector('.t-value').textContent = '1';

    const officialCard = content.querySelector('.board-top > div:last-child');
    const slots = officialCard?.querySelectorAll('.slot');
    if (slots?.[1]) slots[1].textContent = value;
    const details = officialCard?.querySelector('.t-mono.ink-3');
    if (details) details.textContent = officialMarket
      ? `price ${usd(officialMarket.priceUsd)}   volume 24h ${usd(officialMarket.volume?.h24)}   market live`
      : 'price syncing   volume syncing   market live';
  }

  function enhance() { enhanceBanner(); enhanceLaunch(); enhanceSidebar(); enhanceOfficialMarket(); enhanceEmptyStates(); }
  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(enhance, 500);
  enhance(); loadConfig(); loadOfficialMarket(); setInterval(loadOfficialMarket, 30000);
})();
