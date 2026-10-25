const ROUND_2_ENDPOINT = 'https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json';
const ROUND_1_ENDPOINT = 'https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json';
const DEFAULT_INTERVAL_MS = 30000;

const DEMO_DATASET = {
  pst: '100,00',
  dg: '25/10/2026',
  hg: '23:59:00',
  s: {
    ts: '499248',
    st: '499248',
    pst: '100,00',
    snt: '0',
    psnt: '0,00'
  },
  v: {
    vv: '122500000'
  },
  cand: [
    {
      n: '13',
      nm: 'Lula',
      pvap: '50,45',
      vap: '61801250',
      e: 's'
    },
    {
      n: '22',
      nm: 'Flavio Bolsonaro',
      pvap: '49,55',
      vap: '60698750',
      e: 'n'
    }
  ]
};

const dom = {
  statusMessage: document.getElementById('statusMessage'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnRound2: document.getElementById('btnRound2'),
  btnRound1: document.getElementById('btnRound1'),
  totalSectionsPercent: document.getElementById('totalSectionsPercent'),
  remainingSectionsPercent: document.getElementById('remainingSectionsPercent'),
  lastUpdateText: document.getElementById('lastUpdateText'),
  progressBar: document.getElementById('progressBar'),
  tseStatusText: document.getElementById('tseStatusText'),
  sectionsCountText: document.getElementById('sectionsCountText'),
  remainingCountText: document.getElementById('remainingCountText'),
  validVotesText: document.getElementById('validVotesText'),
  noticeBox: document.getElementById('noticeBox'),
  noticeText: document.getElementById('noticeText'),
  candidatesList: document.getElementById('candidatesList'),
  totalCandidatesCount: document.getElementById('totalCandidatesCount'),
  selectSourceMode: document.getElementById('selectSourceMode'),
  selectRefreshInterval: document.getElementById('selectRefreshInterval'),
  btnApplySettings: document.getElementById('btnApplySettings'),
  btnResetEndpoint: document.getElementById('btnResetEndpoint')
};

let currentEndpoint = ROUND_2_ENDPOINT;
let currentMode = 'auto';
let refreshIntervalMs = DEFAULT_INTERVAL_MS;
let timerId = null;
let isFetching = false;

function parsePtBrNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const clean = String(value).replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(clean);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatPtBrInteger(value) {
  const number = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, ''), 10);
  if (Number.isNaN(number)) return '0';
  return number.toLocaleString('pt-BR');
}

function formatPtBrPercent(value) {
  const number = parsePtBrNumber(value);
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + '%';
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function setNotice(message) {
  if (!message) {
    dom.noticeBox.classList.add('hidden');
    dom.noticeText.textContent = '';
    return;
  }
  dom.noticeText.textContent = message;
  dom.noticeBox.classList.remove('hidden');
}

function setStatus(text) {
  dom.statusMessage.textContent = text;
}

function renderSkeleton(count = 2) {
  const cardsHtml = Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-stat"></div>
      </div>
      <div class="skeleton-line skeleton-bar"></div>
    </div>
  `).join('');
  dom.candidatesList.innerHTML = cardsHtml;
}

function updateRoundTabs(activeUrl) {
  const isRound2 = activeUrl.includes('6258');
  const isRound1 = activeUrl.includes('6257');

  dom.btnRound2.classList.toggle('active', isRound2);
  dom.btnRound2.setAttribute('aria-selected', String(isRound2));

  dom.btnRound1.classList.toggle('active', isRound1);
  dom.btnRound1.setAttribute('aria-selected', String(isRound1));
}

function extractCandidates(data) {
  if (!data) return [];

  if (Array.isArray(data.cand) && data.cand.length > 0) {
    return data.cand;
  }

  const list = [];
  if (Array.isArray(data.carg)) {
    for (const carg of data.carg) {
      if (Array.isArray(carg.cand)) {
        list.push(...carg.cand);
      }
      if (Array.isArray(carg.agr)) {
        for (const agr of carg.agr) {
          if (Array.isArray(agr.par)) {
            for (const par of agr.par) {
              if (Array.isArray(par.cand)) {
                list.push(...par.cand);
              }
            }
          }
        }
      }
    }
  }

  return list;
}

function renderOverview(data) {
  const percentStr = (data.s && typeof data.s === 'object' && data.s.pst) ? data.s.pst : (data.pst || '0,00');
  const percentNumeric = Math.min(Math.max(parsePtBrNumber(percentStr), 0), 100);

  let remainingPercentStr = '';
  if (data.s && typeof data.s === 'object' && data.s.psnt) {
    remainingPercentStr = data.s.psnt;
  } else {
    const remainingNum = Math.max(0, 100 - percentNumeric);
    remainingPercentStr = remainingNum.toFixed(2).replace('.', ',');
  }

  dom.totalSectionsPercent.textContent = formatPtBrPercent(percentStr);
  dom.remainingSectionsPercent.textContent = formatPtBrPercent(remainingPercentStr);
  dom.progressBar.style.width = `${percentNumeric}%`;
  dom.progressBar.parentElement.setAttribute('aria-valuenow', String(percentNumeric));

  let totalNum = 0;
  let talliedNum = 0;
  let remainingNum = 0;

  if (data.s && typeof data.s === 'object') {
    totalNum = parseInt(String(data.s.ts || 0).replace(/\D/g, ''), 10) || 0;
    talliedNum = parseInt(String(data.s.st || 0).replace(/\D/g, ''), 10) || 0;
    remainingNum = data.s.snt ? parseInt(String(data.s.snt).replace(/\D/g, ''), 10) : Math.max(0, totalNum - talliedNum);
  } else {
    totalNum = parseInt(String(data.s || 0).replace(/\D/g, ''), 10) || 0;
    talliedNum = parseInt(String(data.st || 0).replace(/\D/g, ''), 10) || 0;
    remainingNum = Math.max(0, totalNum - talliedNum);
  }

  if (totalNum > 0 && talliedNum > 0) {
    dom.sectionsCountText.textContent = `${formatPtBrInteger(talliedNum)} de ${formatPtBrInteger(totalNum)}`;
    dom.remainingCountText.textContent = `${formatPtBrInteger(remainingNum)} urnas`;
  } else if (talliedNum > 0) {
    dom.sectionsCountText.textContent = formatPtBrInteger(talliedNum);
    dom.remainingCountText.textContent = remainingNum > 0 ? `${formatPtBrInteger(remainingNum)} urnas` : '-';
  } else {
    dom.sectionsCountText.textContent = `${formatPtBrPercent(percentStr)} apurado`;
    dom.remainingCountText.textContent = `${formatPtBrPercent(remainingPercentStr)} restante`;
  }

  let validVotes = null;
  if (data.v && typeof data.v === 'object') {
    validVotes = data.v.vv || data.v.tvv || data.v.vnom;
  } else if (data.vv) {
    validVotes = data.vv;
  }

  if (validVotes) {
    dom.validVotesText.textContent = formatPtBrInteger(validVotes);
  } else {
    dom.validVotesText.textContent = '-';
  }

  const isCompleted = String(data.tf || '').toLowerCase() === 's' || String(data.and || '').toLowerCase() === 'f' || percentNumeric >= 100;
  if (isCompleted) {
    dom.tseStatusText.textContent = 'Apuração finalizada';
  } else if (percentNumeric > 0) {
    dom.tseStatusText.textContent = 'Em andamento';
  } else {
    dom.tseStatusText.textContent = 'Não iniciada';
  }

  const generatedTime = (data.dg && data.hg) ? ` (TSE: ${data.dg} às ${data.hg})` : '';
  dom.lastUpdateText.textContent = `Última atualização: ${formatTime(new Date())}${generatedTime}`;
}

function renderCandidates(rawCandidates) {
  const candidates = Array.isArray(rawCandidates) ? rawCandidates : [];

  if (candidates.length === 0) {
    dom.candidatesList.innerHTML = '<div class="empty-state">Nenhum candidato listado.</div>';
    dom.totalCandidatesCount.textContent = '0 candidatos';
    return;
  }

  const sorted = [...candidates].sort((a, b) => {
    const votesA = parsePtBrNumber(a.vap ?? a.pvap);
    const votesB = parsePtBrNumber(b.vap ?? b.pvap);
    return votesB - votesA;
  });

  const countLabel = sorted.length === 1 ? '1 candidato' : `${sorted.length} candidatos`;
  dom.totalCandidatesCount.textContent = countLabel;

  const maxPercent = Math.max(...sorted.map(c => parsePtBrNumber(c.pvap || 0)), 1);

  dom.candidatesList.innerHTML = sorted.map((cand, index) => {
    const candidateName = cand.nmu || cand.nm || 'Candidato';
    const isElected = String(cand.e || '').toLowerCase() === 's' || String(cand.st || '').toLowerCase() === 'eleito';
    const isLeader = index === 0 && parsePtBrNumber(cand.pvap) > 0;
    const votesCount = formatPtBrInteger(cand.vap || 0);
    const percentFormatted = formatPtBrPercent(cand.pvap || 0);
    const numericPercent = Math.min(Math.max(parsePtBrNumber(cand.pvap || 0), 0), 100);
    const relativeBarWidth = (numericPercent / maxPercent) * 100;

    let badgeHtml = '';
    if (isElected) {
      badgeHtml = '<span class="badge-tag tag-elected">eleito</span>';
    } else if (isLeader) {
      badgeHtml = '<span class="badge-tag">liderando</span>';
    }

    const cardClass = isLeader || isElected ? 'candidate-card is-leader' : 'candidate-card';

    return `
      <article class="${cardClass}">
        <div class="candidate-header">
          <div class="candidate-identity">
            <span class="candidate-number">${cand.n || '-'}</span>
            <span class="candidate-name">${candidateName}</span>
            ${badgeHtml}
          </div>
          <div class="candidate-stats">
            <span class="candidate-percent">${percentFormatted}</span>
            <span class="candidate-votes">${votesCount} votos</span>
          </div>
        </div>
        <div class="candidate-bar-track">
          <div class="candidate-bar-fill" style="width: ${relativeBarWidth}%;"></div>
        </div>
      </article>
    `;
  }).join('');
}

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`Código ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function requestJson(targetUrl) {
  if (currentMode === 'demo') {
    return DEMO_DATASET;
  }

  const isHttp = window.location.protocol.startsWith('http');
  const isTseOfficial = targetUrl.includes('resultados.tse.jus.br/oficial/');

  if (currentMode === 'auto' && isHttp && isTseOfficial) {
    const relativeTsePath = targetUrl.replace('https://resultados.tse.jus.br/oficial/', '');
    const reverseProxyUrl = `/api/tse/${relativeTsePath}`;
    try {
      return await fetchWithTimeout(reverseProxyUrl, 4000);
    } catch (e) {
    }
  }

  try {
    return await fetchWithTimeout(targetUrl, 4000);
  } catch (e) {
  }

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      return await fetchWithTimeout(proxyUrl, 5000);
    } catch (e) {
    }
  }

  throw new Error('Servidor temporariamente indisponível');
}

async function loadData() {
  if (isFetching) return;
  isFetching = true;
  dom.btnRefresh.disabled = true;
  setStatus('Carregando...');
  updateRoundTabs(currentEndpoint);

  try {
    const result = await requestJson(currentEndpoint);

    if (!result || typeof result !== 'object') {
      throw new Error('Resposta incompleta');
    }

    const candidateList = extractCandidates(result);
    renderOverview(result);
    renderCandidates(candidateList);
    setNotice('');
    setStatus('Atualizado');
  } catch (error) {
    setStatus('Tentando atualizar...');
    setNotice('Não foi possível obter novos dados no momento. Uma nova tentativa será feita em instantes.');

    if (!dom.candidatesList.querySelector('.candidate-card')) {
      dom.candidatesList.innerHTML = `
        <div class="error-state">
          Aguardando conexão com os dados oficiais.<br>
          Se preferir, ative o modo de teste nos ajustes abaixo.
        </div>
      `;
    }
  } finally {
    isFetching = false;
    dom.btnRefresh.disabled = false;
  }
}

function setupTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (refreshIntervalMs > 0) {
    timerId = setInterval(() => {
      loadData();
    }, refreshIntervalMs);
  }
}

function selectRound(endpointUrl) {
  currentEndpoint = endpointUrl;
  const isRound1 = endpointUrl.includes('6257');
  renderSkeleton(isRound1 ? 4 : 2);
  updateRoundTabs(endpointUrl);
  loadData();
}

function applySettings() {
  currentMode = dom.selectSourceMode.value;
  refreshIntervalMs = parseInt(dom.selectRefreshInterval.value, 10);

  updateRoundTabs(currentEndpoint);
  setupTimer();
  loadData();
}

function resetEndpoint() {
  currentEndpoint = ROUND_2_ENDPOINT;
  dom.selectSourceMode.value = 'auto';
  currentMode = 'auto';
  dom.selectRefreshInterval.value = String(DEFAULT_INTERVAL_MS);
  refreshIntervalMs = DEFAULT_INTERVAL_MS;

  renderSkeleton(2);
  updateRoundTabs(currentEndpoint);
  setupTimer();
  loadData();
}

dom.btnRound2.addEventListener('click', () => {
  selectRound(ROUND_2_ENDPOINT);
});

dom.btnRound1.addEventListener('click', () => {
  selectRound(ROUND_1_ENDPOINT);
});

dom.btnRefresh.addEventListener('click', () => {
  loadData();
});

dom.btnApplySettings.addEventListener('click', () => {
  applySettings();
});

dom.btnResetEndpoint.addEventListener('click', () => {
  resetEndpoint();
});

updateRoundTabs(currentEndpoint);
setupTimer();
loadData();
