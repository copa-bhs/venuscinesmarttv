(function () {
    const ROTATION_MS = 8000;
    const CROSSFADE_MS = 600;
    const INTERACTION_PAUSE_MS = 15000;
    let slides = [];
    let activeIndex = 0;
    let activeLayer = null;
    let rotationTimer = 0;
    let resumeTimer = 0;
    let callbacks = {};
    let visibilityListenerAdded = false;

    function setMetadata(item) {
        const metadata = document.getElementById('heroMeta');
        metadata.replaceChildren();
        const fields = [
            { value: item.maturityRating, className: `badge-classificacao badge-${String(item.maturityRating || '').replace(/[^a-z\d-]/gi, '')}` },
            { value: item.rating !== '' && item.rating !== null && item.rating !== undefined ? `★ ${item.rating}` : '' },
            { value: item.year },
            { value: item.genre }
        ].filter(field => field.value !== '' && field.value !== null && field.value !== undefined);
        fields.forEach((field, index) => {
            if (index) {
                const separator = document.createElement('span');
                separator.className = 'hero-meta-separator';
                separator.textContent = '·';
                metadata.appendChild(separator);
            }
            const value = document.createElement('span');
            if (field.className) value.className = field.className;
            value.textContent = String(field.value);
            metadata.appendChild(value);
        });
    }

    function renderDots() {
        const dots = document.getElementById('heroDots');
        dots.replaceChildren();
        slides.forEach((item, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'home-hero__dot';
            dot.tabIndex = -1;
            dot.setAttribute('aria-label', `Destaque ${index + 1}: ${item.name}`);
            dot.addEventListener('click', () => {
                show(index);
                pause();
            });
            dots.appendChild(dot);
        });
    }

    function setLogo(item) {
        const wrapper = document.getElementById('heroLogoWrap');
        const image = document.getElementById('heroLogo');
        const title = document.getElementById('heroTitle');
        wrapper.classList.toggle('is-loading', Boolean(item.titleLogo));
        image.classList.remove('is-loaded');
        image.onload = () => {
            wrapper.classList.remove('is-loading');
            image.classList.add('is-loaded');
            title.hidden = true;
            wrapper.hidden = false;
        };
        image.onerror = () => {
            wrapper.classList.remove('is-loading');
            wrapper.hidden = true;
            title.hidden = false;
        };
        if (item.titleLogo) {
            wrapper.hidden = false;
            title.hidden = true;
            image.src = item.titleLogo;
            image.alt = item.name;
            image.loading = 'eager';
            if (image.complete && image.naturalWidth) image.onload();
        } else {
            image.removeAttribute('src');
            wrapper.hidden = true;
            title.hidden = false;
        }
        title.textContent = item.name;
    }

    // Troca o destaque com crossfade e atualiza todos os metadados.
    function show(index) {
        if (!slides.length) return;
        activeIndex = (index + slides.length) % slides.length;
        const item = slides[activeIndex];
        const nextLayer = activeLayer === 'a' ? 'b' : 'a';
        const incoming = document.getElementById(`heroImage${nextLayer.toUpperCase()}`);
        const outgoing = activeLayer ? document.getElementById(`heroImage${activeLayer.toUpperCase()}`) : null;
        const imageUrl = item.backdrop || item.logo || '';
        incoming.classList.remove('is-visible');
        const revealLayer = () => requestAnimationFrame(() => {
            incoming.classList.add('is-visible');
            if (outgoing) outgoing.classList.remove('is-visible');
        });
        incoming.loading = 'eager';
        if (imageUrl) {
            incoming.onload = revealLayer;
            incoming.onerror = revealLayer;
            incoming.src = imageUrl;
            if (incoming.complete && incoming.naturalWidth) incoming.onload();
        } else {
            incoming.removeAttribute('src');
            incoming.onload = null;
            incoming.onerror = null;
            revealLayer();
        }
        activeLayer = nextLayer;

        setLogo(item);
        setMetadata(item);
        document.getElementById('heroDesc').textContent = item.plot || '';
        document.getElementById('heroPlayBtn').onclick = () => {
            pause();
            callbacks.onPlay?.(item);
        };
        document.getElementById('heroInfoBtn').onclick = () => {
            pause();
            callbacks.onList?.(item);
        };
        document.querySelectorAll('#heroDots button').forEach((dot, dotIndex) => {
            dot.classList.toggle('is-active', dotIndex === activeIndex);
            dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
        });
        callbacks.onSlide?.(item, activeIndex);
        scheduleRotation();
    }

    function scheduleRotation() {
        clearTimeout(rotationTimer);
        if (slides.length < 2 || document.hidden) return;
        rotationTimer = setTimeout(() => show(activeIndex + 1), ROTATION_MS);
    }

    // Pausa o autoplay após interação e agenda a retomada.
    function pause(duration = INTERACTION_PAUSE_MS) {
        clearTimeout(rotationTimer);
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(scheduleRotation, duration);
    }

    // Inicializa slides, indicadores e rotação automática.
    function init(items, options = {}) {
        slides = items || [];
        activeIndex = 0;
        activeLayer = null;
        callbacks = options;
        clearTimeout(rotationTimer);
        clearTimeout(resumeTimer);
        renderDots();
        if (slides.length) show(0);
        if (!visibilityListenerAdded) {
            visibilityListenerAdded = true;
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) clearTimeout(rotationTimer);
                else scheduleRotation();
            });
        }
    }

    window.VenusSlider = { init, show, pause };
})();