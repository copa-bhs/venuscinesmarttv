(function () {
    // Desenha placeholders enquanto a API da Home está sendo consultada.
    function renderHome(hero, container) {
        hero.classList.add('skeleton', 'is-loading');
        hero.setAttribute('aria-busy', 'true');
        const logoWrap = document.getElementById('heroLogoWrap');
        if (logoWrap) logoWrap.classList.add('is-loading');
        document.getElementById('heroLogo')?.removeAttribute('src');
        document.getElementById('heroTitle').textContent = '';
        document.getElementById('heroMeta').replaceChildren();
        document.getElementById('heroDesc').textContent = '';

        const fragment = document.createDocumentFragment();
        for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
            const row = document.createElement('section');
            row.className = 'skeleton-row';
            row.setAttribute('aria-hidden', 'true');
            const title = document.createElement('div');
            title.className = 'skeleton-heading';
            const cards = document.createElement('div');
            cards.className = 'skeleton-card-track';
            for (let cardIndex = 0; cardIndex < 6; cardIndex++) {
                const card = document.createElement('div');
                card.className = 'skeleton-card';
                cards.appendChild(card);
            }
            row.append(title, cards);
            fragment.appendChild(row);
        }
        container.replaceChildren(fragment);
    }

    function finishHome(hero) {
        hero.classList.remove('skeleton', 'is-loading');
        hero.removeAttribute('aria-busy');
        document.getElementById('heroLogoWrap')?.classList.remove('is-loading');
    }

    window.VenusSkeleton = { renderHome, finishHome };
})();