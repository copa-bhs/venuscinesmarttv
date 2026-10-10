(function () {
    const API_BASE = 'https://cine.venusdev.xyz';
    const PAGE_SIZE = 30;

    async function request(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            headers: { Accept: 'application/json' },
            ...options
        });
        if (!response.ok) throw new Error(`Falha da API (${response.status}).`);
        return response.json();
    }

    function optimizeImage(url, type) {
        if (!url || typeof url !== 'string') return '';
        if (type === 'card') {
            return url.replace('/w600_and_h900_bestv2/', '/w342/').replace('/w500/', '/w342/');
        }
        if (type === 'hero') {
            return url.replace('/w1280/', '/w780/').replace('/original/', '/w1280/');
        }
        return url;
    }

    function mapItem(item) {
        const type = item.tipo === 'serie' || item.type === 'series' ? 'series' : 'movies';
        return {
            id: String(item.id ?? ''),
            type,
            name: item.titulo || item.name || 'Título indisponível',
            logo: optimizeImage(item.capa || item.stream_icon || '', 'card') || item.logo || '',
            titleLogo: item.logo || item.titleLogo || '',
            backdrop: optimizeImage(item.banner || item.backdrop || '', 'hero'),
            maturityRating: item.classificacao || item.maturityRating || '',
            rating: item.score ?? item.rating ?? '',
            year: String(item.ano || item.year || '').slice(0, 4),
            genre: Array.isArray(item.generos) ? item.generos.join(', ') : (item.genero || item.genre || ''),
            plot: item.sinopse || item.plot || '',
            cast: item.elenco || item.cast || '',
            group: item.categoria || item.group || (type === 'series' ? 'Séries' : 'Filmes'),
            duration: item.duracao || item.duration || '',
            streamExtension: item.container || item.container_extension || 'mp4',
            url_stream: item.url_stream || null,
            url: item.url_stream || null,
            apiItem: item
        };
    }

    async function list(type, page = 1, size = PAGE_SIZE, category = '') {
        const endpoint = type === 'series' ? '/series' : '/filmes';
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (category) params.set('categoria', category);
        const data = await request(`${endpoint}?${params}`);
        return {
            ...data,
            items: (data.items || []).map(item => ({
                ...mapItem(item),
                group: item.categoria || category || (type === 'series' ? 'Séries' : 'Filmes')
            }))
        };
    }

    async function search(query, type, page = 1, size = PAGE_SIZE) {
        const params = new URLSearchParams({ q: query, page: String(page), size: String(size) });
        if (type) params.set('tipo', type === 'series' ? 'serie' : 'filme');
        const data = await request(`/buscar?${params}`);
        return { ...data, items: (data.items || []).map(mapItem) };
    }

    async function details(item) {
        const endpoint = item.type === 'series' ? 'serie' : 'filme';
        return { ...mapItem(await request(`/info/${endpoint}/${encodeURIComponent(item.id)}`)), detailLoaded: true };
    }

    window.VenusCatalog = {
        mapItem,
        optimizeImage,
        list,
        search,
        details,
        categories: () => request('/categorias'),
    };
})();