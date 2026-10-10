// Slider component

// Function to create a slider element
function createSlider() {
    const slider = document.createElement('div');
    slider.className = 'slider skeleton';

    // Create skeleton cards
    for (let i = 0; i < 5; i++) {
        const skeletonCard = createSkeletonCard();
        slider.appendChild(skeletonCard);
    }

    return slider;
}

// Function to update slider with actual cards
function updateSlider(slider, cards) {
    // Clear skeleton cards
    slider.innerHTML = '';

    // Add actual cards
    cards.forEach(card => {
        slider.appendChild(card);
    });
}

window.VenusSlider = (function () {
    let slides = [];
    let activeIndex = 0;
    let timerId = 0;
    let callbacks = {};
    const rotationDelay = 8000;

    function createAgeRatingBadge(value) {
        const rawValue = Array.isArray(value) ? value.find(Boolean) : value;
        const rawLabel = String(rawValue ?? '').trim();
        if (!rawLabel) return null;

        const normalized = rawLabel.toUpperCase();
        const ageMatch = normalized.match(/(?:^|\D)(10|12|14|16|18)(?:\D|$)/);
        const category = /^(L(?:IVRE)?|0{1,2})(?:$|\s|[+/-])/.test(normalized)
            ? 'L'
            : ageMatch?.[1] || '';
        const label = category === 'L' ? 'L' : category || rawLabel;
        const badge = document.createElement('span');
        badge.className = `badge-classificacao${category ? ` badge-${category}` : ''}`;
        badge.textContent = label;
        badge.setAttribute('aria-label', `Classificação indicativa ${label}`);
        return badge;
    }

    function setSlide(index) {
        if (!slides.length) return;
        activeIndex = (index + slides.length) % slides.length;
        const item = slides[activeIndex];
        const images = [document.getElementById('heroImageA'), document.getElementById('heroImageB')];
        const activeImage = images[activeIndex % images.length];
        const inactiveImage = images[(activeIndex + 1) % images.length];
        const nextIndex = (activeIndex + 1) % slides.length;
        const setBackdrop = (image, slide, eager) => {
            const source = slide.backdrop || slide.logo || '';
            image.loading = eager ? 'eager' : 'lazy';
            image.decoding = 'async';
            if (image.src !== source) image.src = source;
        };
        setBackdrop(activeImage, item, activeIndex < 2);
        activeImage.alt = item.name || '';
        activeImage.classList.add('is-visible');
        inactiveImage.classList.remove('is-visible');
        if (slides.length > 1) setBackdrop(inactiveImage, slides[nextIndex], nextIndex < 2);

        const logoWrap = document.getElementById('heroLogoWrap');
        const logo = document.getElementById('heroLogo');
        const title = document.getElementById('heroTitle');
        logo.onload = () => {
            logo.classList.add('is-loaded');
            title.hidden = true;
        };
        logo.onerror = () => {
            logo.classList.remove('is-loaded');
            logoWrap.hidden = true;
            title.hidden = false;
        };
        if (item.titleLogo) {
            logoWrap.hidden = false;
            logo.classList.remove('is-loaded');
            title.hidden = false;
            if (logo.src !== item.titleLogo) logo.src = item.titleLogo;
            if (logo.complete && logo.naturalWidth > 0) {
                logo.classList.add('is-loaded');
                title.hidden = true;
            }
        } else {
            logoWrap.hidden = true;
            logo.classList.remove('is-loaded');
            title.hidden = false;
            logo.removeAttribute('src');
        }
        title.textContent = item.name || '';
        const heroMeta = document.getElementById('heroMeta');
        const metaParts = [
            createAgeRatingBadge(item.maturityRating),
            ...[item.rating ? `★ ${item.rating}` : '', item.year, item.genre]
                .filter(Boolean)
                .map(value => {
                    const part = document.createElement('span');
                    part.textContent = value;
                    return part;
                })
        ].filter(Boolean);
        heroMeta.replaceChildren();
        metaParts.forEach((part, index) => {
            if (index > 0) {
                const separator = document.createElement('span');
                separator.className = 'hero-meta-separator';
                separator.setAttribute('aria-hidden', 'true');
                separator.textContent = '·';
                heroMeta.appendChild(separator);
            }
            heroMeta.appendChild(part);
        });
        document.getElementById('heroDesc').textContent = item.plot || '';
        document.querySelectorAll('#heroDots button').forEach((dot, dotIndex) => {
            const selected = dotIndex === activeIndex;
            dot.classList.toggle('is-active', selected);
            dot.setAttribute('aria-current', String(selected));
        });
        callbacks.onSlide?.(item);
    }

    function scheduleNext() {
        clearTimeout(timerId);
        if (slides.length > 1) timerId = setTimeout(() => {
            setSlide(activeIndex + 1);
            scheduleNext();
        }, rotationDelay);
    }

    function init(nextSlides, nextCallbacks = {}) {
        slides = Array.isArray(nextSlides) ? nextSlides : [];
        callbacks = nextCallbacks;
        activeIndex = 0;
        const dots = document.getElementById('heroDots');
        dots.replaceChildren();
        slides.forEach((item, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'home-hero__dot tv-focusable';
            dot.dataset.navId = `hero-slide-${index + 1}`;
            dot.setAttribute('aria-label', `Destaque ${index + 1}: ${item.name}`);
            dot.addEventListener('click', () => {
                setSlide(index);
                scheduleNext();
            });
            dots.appendChild(dot);
        });
        document.getElementById('heroPlayBtn').onclick = () => callbacks.onPlay?.(slides[activeIndex]);
        document.getElementById('heroInfoBtn').onclick = () => callbacks.onList?.(slides[activeIndex]);
        setSlide(0);
        scheduleNext();
    }

    function pause(duration = 0) {
        clearTimeout(timerId);
        timerId = duration > 0 ? setTimeout(scheduleNext, duration) : 0;
    }

    return { init, pause, createAgeRatingBadge };
})();