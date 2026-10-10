(function () {
    // Exibe o estado inicial e carrega a Home organizada pela API.
    // Busca e valida os destaques e as coleções da API.
    async function fetchDashboard() {
        const hero = document.getElementById('heroSection');
        const container = document.getElementById('catalogContainer');
        window.VenusSkeleton?.renderHome(hero, container);
        try {
            const response = await fetch('https://cine.venusdev.xyz/home', {
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error(`Falha ao carregar a Home (${response.status}).`);
            const data = await response.json();
            if (!data || !Array.isArray(data.hero) || !Array.isArray(data.colecoes)) {
                throw new Error('A API retornou dados incompletos para a Home.');
            }
            console.log(`[Home] loaded ${data.hero.length} hero slides and ${data.colecoes.length} collections`);
            return data;
        } catch (error) {
            console.error('[Home] failed to load dashboard:', error);
            throw error;
        }
    }

    window.VenusHome = { fetchDashboard };
})();