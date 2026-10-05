const DEFAULT_URL = '';

let config = { host: '', username: '', password: '', playerApi: '', movieBase: '', seriesBase: '' };
let currentTab = 'home';
let catalogData = { movies: [], series: [] };
let seriesInfoCache = {};
let watchlist = JSON.parse(localStorage.getItem('venus_watchlist_tv') || '[]');
let currentSelectedItem = null;
let currentHls = null;
let batchSize = 20;
let currentSearchQuery = '';
let searchTimeout = null; // Variável para o Debounce
let currentPlatformFilter = null;
const platformFilters = [
    { id: 'netflix', label: 'Netflix', image: 'img/NETFLIX_NV.jpg', match: /NETFLIX/i },
    { id: 'prime', label: 'Prime Video', image: 'img/Amazon-prime-video.jpg', match: /PRIME/i },
    { id: 'disney', label: 'Disney+', image: 'img/disney.png', match: /DISNEY/i },
    { id: 'apple-tv', label: 'Apple TV+', image: 'img/apple-tv.png', match: /APPLE\s?TV/i },
    { id: 'hbo-max', label: 'HBO Max', image: 'img/hbomax.png', match: /HBO\s?MAX/i },
    { id: 'paramount', label: 'Paramount+', image: 'img/paramount.jpg', match: /PARAMOUNT/i },
    { id: 'globoplay', label: 'Globoplay', image: 'img/globoplay.png', match: /GLOBOPLAY/i },
    { id: 'anime', label: 'Animes', image: 'img/animes_nv.png', match: /ANIME/i },
    { id: 'dorama', label: 'Doramas', image: 'img/doramas_nv.png', match: /DORAMA/i }
];

let focusableElements = [];
let currentFocusIndex = 0;

window.addEventListener('DOMContentLoaded', () => {
    let saved = localStorage.getItem('venus_url_tv') || DEFAULT_URL;
    document.getElementById('xtreamUrlInput').value = saved;
    parseUrl(saved);
    initApp();

    window.addEventListener('keydown', handleRemoteControl);
});

function parseUrl(urlStr) {
    try {
        const urlObj = new URL(urlStr);
        const host = urlObj.origin;
        const params = new URLSearchParams(urlObj.search);
        const username = params.get('username') || '';
        const password = params.get('password') || '';

        config = {
            host, username, password,
            playerApi: `${host}/player_api.php?username=${username}&password=${password}`,
            movieBase: `${host}/movie/${username}/${password}/`,
            seriesBase: `${host}/series/${username}/${password}/`
        };
    } catch (e) {
        config = {
            host: '', username: '', password: '',
            playerApi: '',
            movieBase: '',
            seriesBase: ''
        };
    }
}

async function initApp() {
    const urlInput = document.getElementById('xtreamUrlInput').value.trim() || DEFAULT_URL;
    if (!urlInput) {
        parseUrl('');
        document.getElementById('catalogContainer').innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <p class="text-sm mb-4">Configure sua conexão para carregar filmes e séries.</p>
                <button data-nav-id="configure-connection" onclick="openSettingsModal()" class="tv-focusable bg-venus-red hover:bg-venus-darkred px-5 py-2.5 rounded-lg text-sm font-bold text-white">Configurar conexão</button>
            </div>
        `;
        openSettingsModal();
        updateFocusables();
        return;
    }
    localStorage.setItem('venus_url_tv', urlInput);
    parseUrl(urlInput);
    renderSkeletonState();

    try {
        await Promise.all([loadMoviesEndpoint(), loadSeriesEndpoint()]);
        switchTab(currentTab);
        setupHero();
        updateFocusables();
    } catch (err) {
        loadFallbackOrProxyData(urlInput);
    }
}

function renderSkeletonState() {
    const hero = document.getElementById('heroSection');
    hero.classList.add('skeleton');
    document.getElementById('heroTitle').innerText = '';
    document.getElementById('heroDesc').innerText = '';
    document.getElementById('heroYearBadge').innerText = '';

    const container = document.getElementById('catalogContainer');
    container.innerHTML = `
        <div class="space-y-2.5">
            <div class="h-4 w-44 skeleton rounded"></div>
            <div class="flex space-x-3.5 overflow-x-auto no-scrollbar pb-2">
                <div class="flex-none w-40 h-60 skeleton rounded-xl"></div>
                <div class="flex-none w-40 h-60 skeleton rounded-xl"></div>
                <div class="flex-none w-40 h-60 skeleton rounded-xl"></div>
                <div class="flex-none w-40 h-60 skeleton rounded-xl"></div>
                <div class="flex-none w-40 h-60 skeleton rounded-xl"></div>
            </div>
        </div>
    `;
}

async function loadMoviesEndpoint() {
    try {
        const catRes = await fetch(`${config.playerApi}&action=get_vod_categories`);
        const catData = await catRes.json();
        let catMap = {};
        if (Array.isArray(catData)) catData.forEach(c => { catMap[c.category_id] = c.category_name; });

        const streamRes = await fetch(`${config.playerApi}&action=get_vod_streams`);
        const streamData = await streamRes.json();

        if (Array.isArray(streamData)) {
            catalogData.movies = streamData.map(item => ({
                id: item.stream_id || item.num,
                name: item.name || 'Filme sem Título',
                group: catMap[item.category_id] || 'Filmes em Destaque',
                logo: item.stream_icon || 'https://placehold.co/200x300/222/fff?text=VênusCine',
                rating: item.rating || '8.2',
                year: item.year || '2025',
                plot: item.plot || 'Sinopse oficial indisponível para este filme.',
                cast: item.cast || 'Elenco padrão',
                type: 'movies',
                url: `${config.movieBase}${item.stream_id}.${item.container_extension || 'mp4'}`
            }));
        }
    } catch (e) {
        catalogData.movies = [];
    }
}

async function loadSeriesEndpoint() {
    try {
        const catRes = await fetch(`${config.playerApi}&action=get_series_categories`);
        const catData = await catRes.json();
        let catMap = {};
        if (Array.isArray(catData)) catData.forEach(c => { catMap[c.category_id] = c.category_name; });

        const streamRes = await fetch(`${config.playerApi}&action=get_series`);
        const streamData = await streamRes.json();

        if (Array.isArray(streamData)) {
            catalogData.series = streamData.map(item => ({
                id: item.series_id || item.num,
                name: item.name || 'Série sem Título',
                group: catMap[item.category_id] || 'Séries Populares',
                logo: item.cover || 'https://placehold.co/200x300/222/fff?text=VênusCine',
                rating: item.rating || '8.5',
                year: item.releaseDate || item.year || '2025',
                plot: item.plot || 'Sinopse oficial da série.',
                cast: item.cast || 'Elenco principal',
                type: 'series',
                url: null
            }));
        }
    } catch (e) {
        catalogData.series = [];
    }
}

async function loadFallbackOrProxyData(url) {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const text = await res.text();
        parseM3UText(text);
        switchTab(currentTab);
        setupHero();
        updateFocusables();
    } catch (e) {}
}

function parseM3UText(text) {
    const lines = text.split('\n');
    let movies = [], series = [];
    let current = null;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
            current = {};
            let logoMatch = line.match(/tvg-logo="([^"]*)"/);
            current.logo = logoMatch && logoMatch[1] ? logoMatch[1] : 'https://placehold.co/200x300/222/fff?text=VênusCine';
            let groupMatch = line.match(/group-title="([^"]*)"/);
            current.group = groupMatch && groupMatch[1] ? groupMatch[1] : 'Geral';
            let commaIdx = line.lastIndexOf(',');
            current.name = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'Filme ou Série';
        } else if (line && !line.startsWith('#') && current) {
            current.url = line;
            current.id = Math.random().toString(36).substr(2, 9);
            current.plot = `Conteúdo ${current.group} via M3U Stream.`;
            current.year = '2025';
            current.rating = '8.0';

            let upperGroup = current.group.toUpperCase();
            if (upperGroup.includes('LIVE') || upperGroup.includes('AO VIVO') || upperGroup.includes('CANAIS')) {
                current = null;
                continue;
            }

            if (upperGroup.includes('SERIE') || upperGroup.includes('TEMPORADA')) {
                current.type = 'series';
                series.push(current);
            } else {
                current.type = 'movies';
                movies.push(current);
            }
            current = null;
        }
    }
    catalogData.movies = movies;
    catalogData.series = series;
}

function setupHero() {
    renderPlatformFilters();
    let pool = [...catalogData.movies, ...catalogData.series];
    if (pool.length === 0) return;

    const item = pool[Math.floor(Math.random() * Math.min(pool.length, 30))];

    const hero = document.getElementById('heroSection');
    hero.classList.remove('skeleton');
    hero.style.backgroundImage = `url('${item.logo}')`;
    document.getElementById('heroTitle').innerText = item.name;
    document.getElementById('heroDesc').innerText = item.plot || "Assista agora em alta definição no Vênus Cine.";
    document.getElementById('heroYearBadge').innerText = item.year || '2026';
    document.getElementById('heroCardImg').src = item.logo;

    document.getElementById('heroPlayBtn').onclick = () => playItem(item);
    document.getElementById('heroInfoBtn').onclick = () => openDetailsModal(item);
}

function switchTab(tab, preservePlatformFilter = false) {
    if (!preservePlatformFilter) {
        currentPlatformFilter = null;
        renderPlatformFilters();
    }
    currentTab = tab;

    ['home', 'movies', 'series', 'watchlist'].forEach(t => {
        const btn = document.getElementById(`nav-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = "tv-focusable px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer text-white bg-venus-red shadow";
            } else {
                btn.className = "tv-focusable px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer text-gray-300 hover:text-white";
            }
        }
    });

    renderCurrentCatalog();
    updateFocusables();
}

function renderPlatformFilters() {
    const container = document.getElementById('platformFilterList');
    if (!container) return;

    const allItems = [...catalogData.movies, ...catalogData.series];
    container.innerHTML = platformFilters.map(platform => {
        const count = allItems.filter(item => platform.match.test(item.group || '')).length;
        const selected = currentPlatformFilter === platform.id;
        return `
            <button data-nav-id="platform-${platform.id}" data-platform-id="${platform.id}" onclick="filterByPlatform('${platform.id}')" aria-label="${platform.label}, ${count} títulos" aria-pressed="${selected}" class="tv-focusable flex-none w-28 h-[92px] p-2 rounded-xl border ${selected ? 'border-venus-red bg-venus-red/15' : 'border-gray-800 bg-[#111] hover:bg-[#1a1a1a]'} transition flex flex-col items-center justify-center gap-1.5">
                <img src="${platform.image}" alt="${platform.label}" loading="lazy" class="w-full h-12 object-contain rounded-md">
                <span class="text-[9px] text-gray-400">${count} títulos</span>
            </button>
        `;
    }).join('');
}

function filterByPlatform(platformId) {
    currentPlatformFilter = currentPlatformFilter === platformId ? null : platformId;
    switchTab('home', true);
    document.querySelectorAll('#platformFilterList [data-platform-id]').forEach(button => {
        const selected = button.dataset.platformId === currentPlatformFilter;
        button.setAttribute('aria-pressed', selected);
        button.className = `tv-focusable flex-none w-28 h-[92px] p-2 rounded-xl border ${selected ? 'border-venus-red bg-venus-red/15' : 'border-gray-800 bg-[#111] hover:bg-[#1a1a1a]'} transition flex flex-col items-center justify-center gap-1.5`;
    });
    document.getElementById('catalogContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCurrentCatalog() {
    const container = document.getElementById('catalogContainer');
    container.innerHTML = '';

    let itemsToRender = [];
    if (currentPlatformFilter) {
        const platform = platformFilters.find(entry => entry.id === currentPlatformFilter);
        itemsToRender = [...catalogData.movies, ...catalogData.series].filter(item => platform?.match.test(item.group || ''));
    } else if (currentTab === 'home') itemsToRender = [...catalogData.movies, ...catalogData.series];
    else if (currentTab === 'movies') itemsToRender = catalogData.movies;
    else if (currentTab === 'series') itemsToRender = catalogData.series;
    else if (currentTab === 'watchlist') {
        const all = [...catalogData.movies, ...catalogData.series];
        itemsToRender = all.filter(i => watchlist.includes(i.id.toString()));
    }

    if (itemsToRender.length === 0) {
        container.innerHTML = `<div class="text-center py-12 text-gray-400 text-xs">Nenhum conteúdo encontrado nesta seção.</div>`;
        return;
    }

    let grouped = {};
    itemsToRender.forEach(item => {
        let groupName = item.group || (item.type === 'movies' ? 'Filmes Populares' : 'Séries em Destaque');
        if (!grouped[groupName]) grouped[groupName] = [];
        grouped[groupName].push(item);
    });

    Object.keys(grouped).forEach(groupName => {
        const groupItems = grouped[groupName];
        const displayedItems = groupItems.slice(0, batchSize);
        const hasMore = groupItems.length > batchSize;

        const rowDiv = document.createElement('div');
        rowDiv.className = 'space-y-2.5';

        rowDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <h2 class="text-xs lg:text-sm font-bold text-white tracking-wide">${groupName} <span class="text-[10px] font-normal text-gray-400">(${groupItems.length})</span></h2>
            </div>
            <div class="relative">
                <div id="row-${sanitizeId(groupName)}" class="flex space-x-3.5 overflow-x-auto no-scrollbar pb-2 pt-1 scroll-smooth">
                    ${displayedItems.map(item => `
                        <div data-nav-id="card-${item.id}" onclick='openDetailsModalById("${item.id}", "${item.type}")' class="tv-focusable card-item flex-none w-40 bg-[#141414] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 relative group/card border border-gray-800/80">
                            <div class="h-60 w-full bg-[#181818] relative skeleton">
                                <img src="${item.logo}" alt="${item.name}" loading="lazy" class="h-full w-full object-cover opacity-0 transition-opacity duration-500" onload="this.parentElement.classList.remove('skeleton'); this.classList.remove('opacity-0'); this.classList.add('opacity-100');" onerror="this.src='https://placehold.co/200x300/222/fff?text=VênusCine'">
                                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition flex items-center justify-center">
                                    <div class="bg-venus-red text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                                        <i class="fa-solid fa-play text-sm ml-0.5"></i>
                                    </div>
                                </div>
                            </div>
                            <div class="p-2.5 bg-[#141414]">
                                <p class="text-xs font-medium text-gray-200 truncate">${item.name}</p>
                            </div>
                        </div>
                    `).join('')}
                    ${hasMore ? `
                        <div data-nav-id="more-${sanitizeId(groupName)}" onclick="loadMoreRow('${sanitizeId(groupName)}', ${JSON.stringify(groupItems).replace(/\"/g, '&quot;')})" class="tv-focusable card-item flex-none w-40 bg-gray-900/90 rounded-xl overflow-hidden cursor-pointer transition flex flex-col items-center justify-center border border-gray-800 text-center p-3">
                            <i class="fa-solid fa-circle-plus text-xl text-venus-red mb-1"></i>
                            <span class="text-xs font-bold text-gray-200">Mais (+20)</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        container.appendChild(rowDiv);
    });
}

function sanitizeId(str) { return str.replace(/[^a-zA-Z0-9]/g, '_'); }

function loadMoreRow(rowId, allItems) {
    const container = document.getElementById(`row-${rowId}`);
    if (!container) return;
    container.lastElementChild.remove();
    const currentCount = container.children.length;
    const nextBatch = allItems.slice(currentCount, currentCount + batchSize);

    nextBatch.forEach(item => {
        const card = document.createElement('div');
        card.className = "tv-focusable card-item flex-none w-32 bg-[#141414] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 relative group/card border border-gray-800/80";
        card.setAttribute('data-nav-id', `card-${item.id}`);
        card.onclick = () => openDetailsModalById(item.id, item.type);
        card.innerHTML = `
            <div class="h-44 w-full bg-[#181818] relative skeleton">
                <img src="${item.logo}" alt="${item.name}" loading="lazy" class="h-full w-full object-cover opacity-0 transition-opacity duration-500" onload="this.parentElement.classList.remove('skeleton'); this.classList.remove('opacity-0'); this.classList.add('opacity-100');" onerror="this.src='https://placehold.co/200x300/222/fff?text=VênusCine'">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition flex items-center justify-center">
                    <div class="bg-venus-red text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                        <i class="fa-solid fa-play text-sm ml-0.5"></i>
                    </div>
                </div>
            </div>
            <div class="p-2.5 bg-[#141414]">
                <p class="text-xs font-medium text-gray-200 truncate">${item.name}</p>
            </div>
        `;
        container.appendChild(card);
    });

    if (currentCount + batchSize < allItems.length) {
        const moreCard = document.createElement('div');
        moreCard.className = "tv-focusable card-item flex-none w-32 bg-gray-900/90 rounded-xl overflow-hidden cursor-pointer transition flex flex-col items-center justify-center border border-gray-800 text-center p-3";
        moreCard.onclick = () => loadMoreRow(rowId, allItems);
        moreCard.innerHTML = `
            <i class="fa-solid fa-circle-plus text-xl text-venus-red mb-1"></i>
            <span class="text-xs font-bold text-gray-200">Mais (+20)</span>
        `;
        container.appendChild(moreCard);
    }
    updateFocusables();
}

// --- SEARCH MODAL ENGINE (2-COLUMN LAYOUT) ---
function openSearchModal() {
    currentSearchQuery = '';
    document.getElementById('searchQueryDisplay').innerText = 'Digite o título...';
    document.getElementById('searchModal').classList.remove('hidden');
    renderSearchResults([]);
    updateFocusables();
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.add('hidden');
    updateFocusables();
}

// Função para adicionar caracteres com Debounce
function appendSearchChar(char) {
    if (currentSearchQuery === '' || document.getElementById('searchQueryDisplay').innerText === 'Digite o título...') {
        currentSearchQuery = char;
    } else {
        currentSearchQuery += char;
    }
    document.getElementById('searchQueryDisplay').innerText = currentSearchQuery;

    // Debounce: Espera 300ms antes de rodar a busca
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        executeSearch(currentSearchQuery);
    }, 300);
}

// Função para apagar caracteres com Debounce
function backspaceSearchChar() {
    if (currentSearchQuery.length > 0) {
        currentSearchQuery = currentSearchQuery.slice(0, -1);
    }
    document.getElementById('searchQueryDisplay').innerText = currentSearchQuery || 'Digite o título...';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        executeSearch(currentSearchQuery);
    }, 300);
}

function executeSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        renderSearchResults([]);
        return;
    }
    const all = [...catalogData.movies, ...catalogData.series];
    const filtered = all.filter(i => i.name.toLowerCase().includes(q));
    renderSearchResults(filtered);
}

function renderSearchResults(results) {
    const container = document.getElementById('searchResultsContainer');
    if (results.length === 0) {
        container.innerHTML = `<div class="text-gray-500 text-xs col-span-full py-12 text-center">Nenhum resultado correspondente.</div>`;
        return;
    }

    container.innerHTML = results.map(item => `
        <div data-nav-id="search-res-${item.id}" onclick='closeSearchModal(); openDetailsModalById("${item.id}", "${item.type}")' class="tv-focusable card-item bg-[#141414] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border border-gray-800">
            <div class="h-32 w-full bg-[#181818] relative skeleton">
                <img src="${item.logo}" alt="${item.name}" loading="lazy" class="h-full w-full object-cover opacity-0 transition-opacity duration-500" onload="this.parentElement.classList.remove('skeleton'); this.classList.remove('opacity-0'); this.classList.add('opacity-100');" onerror="this.src='https://placehold.co/200x300/222/fff?text=VênusCine'">
            </div>
            <div class="p-2 bg-[#141414]">
                <p class="text-[10px] font-medium text-gray-200 truncate">${item.name}</p>
            </div>
        </div>
    `).join('');
    updateFocusables();
}

async function openDetailsModalById(id, type) {
    const all = [...catalogData.movies, ...catalogData.series];
    const item = all.find(i => i.id.toString() === id.toString());
    if (item) openDetailsModal(item);
}

async function openDetailsModal(item) {
    currentSelectedItem = item;
    document.getElementById('modalTitle').innerText = item.name;
    document.getElementById('modalGroup').innerText = item.group || item.type.toUpperCase();
    document.getElementById('modalDescription').innerText = item.plot;
    document.getElementById('modalCast').innerText = item.cast;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalBackdrop').style.backgroundImage = `url('${item.logo}')`;

    const playBtn = document.getElementById('modalPlayBtn');
    const episodesSec = document.getElementById('seriesEpisodesSection');

    updateWatchlistButtonState(item.id);

    if (item.type === 'series') {
        playBtn.style.display = 'none';
        episodesSec.classList.remove('hidden');
        await loadSeriesEpisodes(item.id);
    } else {
        playBtn.style.display = 'flex';
        document.getElementById('modalPlayText').innerText = 'Assistir';
        playBtn.onclick = () => {
            closeDetailsModal();
            playItem(item);
        };
        episodesSec.classList.add('hidden');
    }

    document.getElementById('catalogPage').classList.add('hidden');
    document.getElementById('detailsPage').classList.remove('hidden');
    updateFocusables();
}

function closeDetailsModal() {
    document.getElementById('detailsPage').classList.add('hidden');
    document.getElementById('catalogPage').classList.remove('hidden');
    updateFocusables();
}

async function loadSeriesEpisodes(seriesId) {
    const seasonContainer = document.getElementById('seasonSelectorContainer');
    const episodesContainer = document.getElementById('episodesListContainer');
    seasonContainer.innerHTML = `<span class="text-xs text-gray-400">Carregando temporadas...</span>`;
    episodesContainer.innerHTML = '';

    try {
        let info = seriesInfoCache[seriesId];
        if (!info) {
            const res = await fetch(`${config.playerApi}&action=get_series_info&series_id=${seriesId}`);
            info = await res.json();
            seriesInfoCache[seriesId] = info;
        }

        if (info && info.episodes) {
            const seasons = Object.keys(info.episodes);
            if (seasons.length === 0) {
                seasonContainer.innerHTML = `<span class="text-xs text-gray-400">Nenhum episódio.</span>`;
                return;
            }

            seasonContainer.innerHTML = '';
            seasons.forEach((seasonNum, idx) => {
                const btn = document.createElement('button');
                btn.className = `tv-focusable px-3.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${idx === 0 ? 'bg-venus-red text-white' : 'bg-gray-800 text-gray-300'}`;
                btn.setAttribute('data-nav-id', `season-${seasonNum}`);
                btn.innerText = `Temp ${seasonNum}`;
                btn.onclick = () => {
                    seasonContainer.querySelectorAll('button').forEach(b => b.className = 'tv-focusable px-3.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer bg-gray-800 text-gray-300');
                    btn.className = 'tv-focusable px-3.5 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer bg-venus-red text-white';
                    renderEpisodesList(info.episodes[seasonNum]);
                };
                seasonContainer.appendChild(btn);
            });

            renderEpisodesList(info.episodes[seasons[0]]);
        } else {
            seasonContainer.innerHTML = `<span class="text-xs text-gray-400">Indisponível.</span>`;
        }
    } catch (e) {
        seasonContainer.innerHTML = `<span class="text-xs text-red-400">Erro.</span>`;
    }
    updateFocusables();
}

function renderEpisodesList(episodes) {
    const container = document.getElementById('episodesListContainer');
    container.innerHTML = '';

    episodes.forEach(ep => {
        const epDiv = document.createElement('div');
        epDiv.className = 'tv-focusable flex items-center justify-between bg-black/50 hover:bg-gray-800 p-2.5 rounded-xl transition cursor-pointer border border-gray-800/60';
        epDiv.setAttribute('data-nav-id', `ep-${ep.id}`);
        const epUrl = `${config.host}/series/${config.username}/${config.password}/${ep.id}.${ep.container_extension || 'mp4'}`;

        epDiv.innerHTML = `
            <div class="flex items-center space-x-2.5">
                <div class="bg-venus-red/20 text-venus-red w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px]">
                    ${ep.episode_num || '#'}
                </div>
                <div>
                    <p class="text-xs font-bold text-white">${ep.title || `Episódio ${ep.episode_num}`}</p>
                    <p class="text-[9px] text-gray-400">Duração: ${ep.info?.duration || '45m'}</p>
                </div>
            </div>
            <button class="bg-venus-red text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1">
                <i class="fa-solid fa-play text-[8px]"></i>
                <span>Assistir</span>
            </button>
        `;

        epDiv.onclick = () => {
            closeDetailsModal();
            playItem({ name: `${currentSelectedItem.name} - Ep ${ep.episode_num}`, url: epUrl });
        };

        container.appendChild(epDiv);
    });
    updateFocusables();
}

function playItem(item) {
    const modal = document.getElementById('playerModal');
    const video = document.getElementById('videoElement');
    const errorDiv = document.getElementById('playerError');
    const titleSpan = document.getElementById('playerTitle');

    titleSpan.innerText = item.name;
    modal.classList.remove('hidden');
    errorDiv.style.display = 'none';
    video.style.display = 'block';

    if (currentHls) { currentHls.destroy(); currentHls = null; }

    const streamUrl = item.url;
    if (Hls.isSupported() && (streamUrl.includes('.m3u8') || streamUrl.includes('.ts'))) {
        const hls = new Hls();
        currentHls = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(e => {}); });
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                video.style.display = 'none';
                errorDiv.style.display = 'block';
                document.getElementById('externalPlayerLink').href = streamUrl;
            }
        });
    } else {
        video.src = streamUrl;
        video.play().catch(e => {
            video.style.display = 'none';
            errorDiv.style.display = 'block';
            document.getElementById('externalPlayerLink').href = streamUrl;
        });
    }
    updateFocusables();
}

function closePlayer() {
    const modal = document.getElementById('playerModal');
    const video = document.getElementById('videoElement');
    video.pause();
    video.src = '';
    if (currentHls) { currentHls.destroy(); currentHls = null; }
    modal.classList.add('hidden');
    updateFocusables();
}

function toggleWatchlist(id) {
    const strId = id.toString();
    const index = watchlist.indexOf(strId);
    if (index > -1) watchlist.splice(index, 1);
    else watchlist.push(strId);
    localStorage.setItem('venus_watchlist_tv', JSON.stringify(watchlist));
    updateWatchlistButtonState(id);
}

function updateWatchlistButtonState(id) {
    const isSaved = watchlist.includes(id.toString());
    const icon = document.getElementById('modalWatchlistIcon');
    const text = document.getElementById('modalWatchlistText');
    if (icon && text) {
        icon.className = isSaved ? "fa-solid fa-check text-xs" : "fa-solid fa-plus text-xs";
        text.innerText = isSaved ? "Na Lista" : "Minha Lista";
    }
}

function toggleWatchlistFromModal() {
    if (currentSelectedItem) toggleWatchlist(currentSelectedItem.id);
}

function openSettingsModal() { document.getElementById('settingsModal').classList.remove('hidden'); updateFocusables(); }
function closeSettingsModal() { document.getElementById('settingsModal').classList.add('hidden'); updateFocusables(); }
function saveAndReload() { closeSettingsModal(); initApp(); }

// --- TV REMOTE CONTROL NAVIGATION ENGINE (D-PAD) ---
function updateFocusables() {
    const all = Array.from(document.querySelectorAll('.tv-focusable')).filter(el => {
        return el.offsetParent !== null && !el.closest('.hidden');
    });
    focusableElements = all;
    if (focusableElements.length > 0) {
        if (currentFocusIndex >= focusableElements.length) currentFocusIndex = 0;
        setFocus(currentFocusIndex);
    }
}

function setFocus(index) {
    focusableElements.forEach(el => el.classList.remove('focused'));
    if (focusableElements[index]) {
        currentFocusIndex = index;
        const el = focusableElements[index];
        el.classList.add('focused');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

function handleRemoteControl(e) {
    if (focusableElements.length === 0) updateFocusables();
    if (focusableElements.length === 0) return;

    let key = e.key;
    let handled = false;

    if (key === 'ArrowRight') {
        currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
        setFocus(currentFocusIndex);
        handled = true;
    } else if (key === 'ArrowLeft') {
        currentFocusIndex = (currentFocusIndex - 1 + focusableElements.length) % focusableElements.length;
        setFocus(currentFocusIndex);
        handled = true;
    } else if (key === 'ArrowDown') {
        currentFocusIndex = Math.min(currentFocusIndex + 5, focusableElements.length - 1); // Ajustado para 5 colunas
        setFocus(currentFocusIndex);
        handled = true;
    } else if (key === 'ArrowUp') {
        currentFocusIndex = Math.max(currentFocusIndex - 5, 0); // Ajustado para 5 colunas
        setFocus(currentFocusIndex);
        handled = true;
    } else if (key === 'Enter') {
        const el = focusableElements[currentFocusIndex];
        if (el) el.click();
        handled = true;
    } else if (key === 'Escape' || key === 'Backspace') {
        if (!document.getElementById('searchModal').classList.contains('hidden')) {
            closeSearchModal();
            handled = true;
        } else if (!document.getElementById('detailsPage').classList.contains('hidden')) {
            closeDetailsModal();
            handled = true;
        } else if (!document.getElementById('playerModal').classList.contains('hidden')) {
            closePlayer();
            handled = true;
        } else if (!document.getElementById('settingsModal').classList.contains('hidden')) {
            closeSettingsModal();
            handled = true;
        }
    }

    if (handled) e.preventDefault();
}