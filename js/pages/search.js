(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const debounceDelay = 400;
    const recommendationLimit = 24;
    const preferredCategories = /terror|com[eé]dia|document[aá]rio|anima[cç][aã]o|a[cç][aã]o|suspense|romance|anime|dorama|halloween/i;
    const state = {
        query: '',
        requestId: 0,
        debounceTimer: 0,
        page: 0,
        hasNext: false,
        loading: false,
        items: [],
        categories: null,
        recommendations: null,
        returnFocus: null
    };

    function getElement(id) {
        return document.getElementById(id);
    }

    function renderShell() {
        getElement('searchApp').innerHTML = `
            <div class="page-search">
                <aside class="search-sidebar" aria-label="Teclado e categorias de busca">
                    <input type="text" id="search-input-hidden" class="search-input-hidden" readonly aria-label="Busca atual">
                    <div class="search-query" aria-live="polite">
                        <span class="search-query__label">BUSCA ATUAL</span>
                        <span id="search-query-value" class="search-query__value">Digite um título</span>
                    </div>
                    <div class="virtual-keyboard" id="virtual-keyboard" aria-label="Teclado virtual"></div>
                    <div class="keyboard-actions">
                        <button type="button" id="search-backspace" class="kb-btn" data-action="backspace" data-nav-id="search-backspace" aria-label="Apagar última letra"><i class="fa-solid fa-delete-left" aria-hidden="true"></i><span>Apagar</span></button>
                        <button type="button" id="search-space" class="kb-btn" data-action="space" data-nav-id="search-space" aria-label="Inserir espaço"><i class="fa-solid fa-minus" aria-hidden="true"></i><span>Espaço</span></button>
                        <button type="button" id="search-clear" class="kb-btn" data-action="clear" data-nav-id="search-clear" aria-label="Limpar busca"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Limpar</span></button>
                        <button type="button" id="search-submit" class="kb-btn kb-btn-search" data-action="search" data-nav-id="search-submit"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Buscar</span></button>
                    </div>
                    <section class="search-shortcuts" aria-labelledby="shortcuts-title">
                        <h3 class="shortcuts-title" id="shortcuts-title">Buscas populares</h3>
                        <div class="shortcuts-list" id="shortcuts-list"><span class="search-shortcuts__loading">Carregando categorias...</span></div>
                    </section>
                </aside>
                <section class="search-results" aria-live="polite">
                    <div class="search-results__heading">
                        <div>
                            <p class="search-results__eyebrow">VÊNUS CINE</p>
                            <h2 class="search-title" id="search-title">Recomendações a partir das suas buscas</h2>
                        </div>
                        <button type="button" id="search-close" class="search-close tv-focusable" data-nav-id="search-close" aria-label="Fechar busca" title="Fechar busca"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                    </div>
                    <div class="search-grid" id="search-grid"></div>
                    <div class="search-empty" id="search-empty" hidden>
                        <i class="fa-solid fa-film" aria-hidden="true"></i>
                        <p>Nenhum resultado encontrado</p>
                        <p class="search-empty-hint">Tente buscar por outro título.</p>
                    </div>
                    <div class="search-loading" id="search-loading" hidden role="status" aria-label="Buscando títulos"><span class="spinner"></span></div>
                </section>
            </div>
        `;

        renderKeyboard();
        getElement('search-close').addEventListener('click', close);
        getElement('search-backspace').addEventListener('click', removeCharacter);
        getElement('search-space').addEventListener('click', () => appendCharacter(' '));
        getElement('search-clear').addEventListener('click', clearQuery);
        getElement('search-submit').addEventListener('click', () => search(state.query));
    }

    function renderKeyboard() {
        const keyboard = getElement('virtual-keyboard');
        const fragment = document.createDocumentFragment();
        letters.forEach((letter, index) => {
            const key = document.createElement('button');
            key.type = 'button';
            key.className = 'keyboard-key tv-focusable';
            key.textContent = letter;
            key.dataset.navId = `search-key-${letter}`;
            key.dataset.key = letter;
            key.dataset.row = `keyboard-row-${Math.floor(index / 6)}`;
            key.setAttribute('aria-label', letter);
            key.addEventListener('click', () => appendCharacter(letter));
            fragment.appendChild(key);
        });
        keyboard.replaceChildren(fragment);
    }

    function updateQueryDisplay() {
        getElement('search-input-hidden').value = state.query;
        getElement('search-query-value').textContent = state.query || 'Digite um título';
        getElement('search-title').textContent = state.query
            ? `Resultados para "${state.query}"`
            : 'Recomendações a partir das suas buscas';
    }

    function scheduleSearch() {
        clearTimeout(state.debounceTimer);
        if (!state.query.trim()) {
            state.requestId++;
            state.loading = false;
            state.page = 0;
            state.hasNext = false;
            state.items = [];
            void showRecommendations();
            return;
        }
        state.debounceTimer = setTimeout(() => search(state.query), debounceDelay);
    }

    function appendCharacter(character) {
        state.query += character;
        updateQueryDisplay();
        scheduleSearch();
    }

    function removeCharacter() {
        state.query = state.query.slice(0, -1);
        updateQueryDisplay();
        scheduleSearch();
    }

    function clearQuery() {
        clearTimeout(state.debounceTimer);
        state.query = '';
        updateQueryDisplay();
        scheduleSearch();
    }

    function setLoading(loading) {
        state.loading = loading;
        getElement('search-loading').hidden = !loading;
        const submit = getElement('search-submit');
        if (submit) submit.disabled = loading;
    }

    function createCard(item, index) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'search-card tv-focusable';
        card.dataset.navId = `search-result-${item.type}-${item.id}`;
        card.dataset.row = `search-card-row-${Math.floor(index / 5)}`;
        card.setAttribute('aria-label', `${item.name}${item.year ? `, ${item.year}` : ''}`);

        const poster = document.createElement('span');
        poster.className = 'search-card__poster';
        const image = document.createElement('img');
        image.src = item.logo || 'https://placehold.co/300x450/181818/777?text=V%C3%AAnus+Cine';
        image.alt = item.name;
        image.loading = index > 9 ? 'lazy' : 'eager';
        image.decoding = 'async';
        image.addEventListener('error', () => {
            image.onerror = null;
            image.src = 'https://placehold.co/300x450/181818/777?text=V%C3%AAnus+Cine';
        }, { once: true });
        poster.appendChild(image);

        card.appendChild(poster);
        card.addEventListener('click', () => {
            close();
            openDetailsModalById(item.id, item.type);
        });
        return card;
    }

    function renderResults(append = false) {
        const grid = getElement('search-grid');
        const empty = getElement('search-empty');
        if (!append) grid.replaceChildren();
        const start = append ? grid.querySelectorAll('.search-card').length : 0;
        const end = Math.min(state.items.length, start + 30);
        for (let index = start; index < end; index++) grid.appendChild(createCard(state.items[index], index));
        empty.hidden = state.items.length !== 0 || state.loading;

        grid.querySelector('[data-nav-id="search-more"]')?.remove();
        if (end < state.items.length || state.hasNext) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'search-more tv-focusable';
            more.dataset.navId = 'search-more';
            more.textContent = 'Mostrar mais resultados';
            more.disabled = state.loading;
            more.addEventListener('click', loadMore);
            grid.appendChild(more);
        }
        window.VenusSpatialNav?.refresh();
    }

    async function search(query, page = 1, append = false) {
        const value = query.trim();
        clearTimeout(state.debounceTimer);
        if (!value) return showRecommendations();
        const requestId = ++state.requestId;
        if (!append) {
            state.page = 0;
            state.hasNext = false;
            state.items = [];
            renderResults();
        }
        setLoading(true);
        try {
            const response = await window.VenusCatalog.search(value, undefined, page, 30);
            if (requestId !== state.requestId) return;
            const incoming = response.items || [];
            if (append) {
                const ids = new Set(state.items.map(item => `${item.type}:${item.id}`));
                state.items.push(...incoming.filter(item => !ids.has(`${item.type}:${item.id}`)));
            } else {
                state.items = incoming;
            }
            state.page = response.page || page;
            state.hasNext = Boolean(response.has_next);
            setLoading(false);
            renderResults(append);
        } catch (error) {
            if (requestId !== state.requestId) return;
            console.error('[Search] API request failed:', error);
            state.items = [];
            state.hasNext = false;
            setLoading(false);
            renderResults();
        }
    }

    function loadMore() {
        if (state.items.length > 0 && state.hasNext && !state.loading) {
            void search(state.query, state.page + 1, true);
            return;
        }
        if (state.items.length > 30) renderResults(true);
    }

    async function showRecommendations() {
        const requestId = ++state.requestId;
        state.page = 0;
        state.hasNext = false;
        state.items = [];
        setLoading(true);
        try {
            if (!state.recommendations) {
                const data = await window.VenusHome.fetchDashboard();
                const unique = new Map();
                [...(data.hero || []), ...(data.colecoes || []).flatMap(collection => collection.items || [])]
                    .forEach(rawItem => {
                        const item = window.VenusCatalog.mapItem(rawItem);
                        if (item.id) unique.set(`${item.type}:${item.id}`, item);
                    });
                state.recommendations = [...unique.values()].slice(0, recommendationLimit);
            }
            if (requestId !== state.requestId) return;
            state.items = state.recommendations;
            setLoading(false);
            renderResults();
        } catch (error) {
            if (requestId !== state.requestId) return;
            console.error('[Search] recommendations unavailable:', error);
            setLoading(false);
            renderResults();
        }
    }

    async function loadShortcuts() {
        const list = getElement('shortcuts-list');
        try {
            if (!state.categories) state.categories = await window.VenusCatalog.categories();
            const allCategories = [...(state.categories.filmes || []), ...(state.categories.series || [])];
            const seen = new Set();
            const categories = allCategories
                .filter(category => preferredCategories.test(category) && !seen.has(category.toLocaleLowerCase('pt-BR')) && seen.add(category.toLocaleLowerCase('pt-BR')))
                .slice(0, 10);
            list.replaceChildren();
            categories.forEach((category, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'shortcut-item tv-focusable';
                button.dataset.navId = `search-shortcut-${index}`;
                button.dataset.row = 'search-shortcuts';
                button.textContent = category;
                button.addEventListener('click', () => {
                    state.query = category;
                    updateQueryDisplay();
                    void search(state.query);
                });
                list.appendChild(button);
            });
            if (!categories.length) list.textContent = 'As categorias populares não estão disponíveis.';
        } catch (error) {
            console.error('[Search] categories unavailable:', error);
            list.textContent = 'As categorias populares não estão disponíveis.';
        }
        window.VenusSpatialNav?.refresh();
    }

    function open() {
        const modal = document.getElementById('searchModal');
        if (!modal) return;
        state.returnFocus = document.activeElement;
        state.query = '';
        state.items = [];
        state.page = 0;
        state.hasNext = false;
        state.requestId++;
        renderShell();
        updateQueryDisplay();
        modal.classList.remove('hidden');
        void loadShortcuts();
        void showRecommendations();
        window.VenusSpatialNav?.refresh();
        const firstKey = getElement('virtual-keyboard').querySelector('.keyboard-key');
        if (firstKey) window.VenusSpatialNav?.focus(firstKey);
    }

    function close() {
        clearTimeout(state.debounceTimer);
        state.requestId++;
        document.getElementById('searchModal')?.classList.add('hidden');
        window.VenusSpatialNav?.refresh();
        if (state.returnFocus?.isConnected) window.VenusSpatialNav?.focus(state.returnFocus, false);
        state.returnFocus = null;
    }

    window.VenusSearch = { open, close };
})();