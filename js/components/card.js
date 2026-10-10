(function () {
    // Cria um poster acessível, lazy-loaded e opcionalmente numerado.
    function createCard(title, description, imageUrl, options = {}) {
        const card = document.createElement('article');
        card.className = `tv-focusable card-item catalog-poster ${options.className || ''}`.trim();
        card.dataset.navId = options.navId || `card-${options.id || title}`;
        if (options.rowId) card.dataset.row = options.rowId;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', title);
        if (options.onClick) card.addEventListener('click', options.onClick);

        const media = document.createElement('div');
        media.className = 'catalog-poster__media skeleton';
        if (!imageUrl) media.classList.remove('skeleton');
        const image = document.createElement('img');
        image.className = 'catalog-poster__image opacity-0';
        if (imageUrl) image.dataset.src = imageUrl;
        image.alt = title;
        image.loading = 'lazy';
        image.decoding = 'async';
        media.appendChild(image);

        const name = document.createElement('p');
        name.className = 'catalog-poster__title';
        name.textContent = title;
        card.append(media, name);

        if (!options.rank) return card;

        const slot = document.createElement('div');
        slot.className = 'top10-card-slot';
        if (options.rowId) slot.dataset.row = options.rowId;
        const rank = document.createElement('span');
        rank.className = 'top-number';
        rank.textContent = String(options.rank);
        rank.setAttribute('aria-hidden', 'true');
        slot.append(rank, card);
        return slot;
    }

    function createSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        card.setAttribute('aria-hidden', 'true');
        return card;
    }

    window.VenusCard = { createCard, createSkeletonCard };
})();