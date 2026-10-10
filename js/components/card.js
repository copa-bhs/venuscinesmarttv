// Card component

// Function to create a card element
function createCard(title, description, imageUrl) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card tv-focusable';
    card.setAttribute('aria-label', title);
    const img = document.createElement('img');
    img.className = 'card-img';
    img.src = imageUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    card.appendChild(img);
    card.addEventListener('click', () => {
        loadDetailsPage();
    });

    return card;
}

// Function to create a skeleton card
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'card skeleton-card';
    return card;
}

window.VenusCard = {
    createCard(title, description, imageUrl, options = {}) {
        const isTopTen = Boolean(options.isTopTen && options.rank);
        const wrapper = isTopTen ? document.createElement('div') : null;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `${isTopTen ? 'tv-focusable top10-card' : 'tv-focusable card-item catalog-poster flex-none overflow-hidden cursor-pointer border border-gray-800 bg-[#141414]'} ${options.className || ''}`;
        card.dataset.navId = options.navId || `card-${options.id || title}`;
        if (options.rowId) card.dataset.row = options.rowId;
        card.setAttribute('aria-label', `${options.rank ? `Top 10, posição ${options.rank}. ` : ''}${title}`);
        card.addEventListener('click', options.onClick || (() => {}));

        if (isTopTen) {
            wrapper.className = 'top10-item';
            if (options.rowId) wrapper.dataset.row = options.rowId;
            const rank = document.createElement('span');
            rank.className = 'top10-number';
            rank.setAttribute('aria-hidden', 'true');
            rank.textContent = String(options.rank);
            wrapper.appendChild(rank);
        }

        const image = document.createElement('img');
        image.dataset.src = imageUrl || 'https://placehold.co/200x300/222/fff?text=V%C3%AAnusCine';
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.className = `catalog-poster__image h-full w-full object-cover opacity-0`;
        if (isTopTen) {
            card.classList.add('skeleton');
            card.appendChild(image);
            wrapper.appendChild(card);
            return wrapper;
        }

        const media = document.createElement('div');
        media.className = 'catalog-poster__media card-media relative w-full overflow-hidden skeleton';
        media.appendChild(image);
        card.appendChild(media);
        return card;
    }
};