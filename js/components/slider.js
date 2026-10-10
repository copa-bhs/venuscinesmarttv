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

    function setSlide(index) {
        if (!slides.length) return;
        activeIndex = (index + slides.length) % slides.length;
        const item = slides[activeIndex];
        const images = [document.getElementById('heroImageA'), document.getElementById('heroImageB')];
        const activeImage = images[activeIndex % images.length];
        const inactiveImage = images[(activeIndex + 1) % images.length];
        activeImage.src = item.backdrop || item.logo || '';
        activeImage.alt = item.name || '';
        activeImage.classList.add('is-visible');
        inactiveImage.classList.remove('is-visible');

        const logoWrap = document.getElementById('heroLogoWrap');
        const logo = document.getElementById('heroLogo');
        logoWrap.hidden = !item.titleLogo;
        if (item.titleLogo) logo.src = item.titleLogo;
        document.getElementById('heroTitle').textContent = item.name || '';
        document.getElementById('heroMeta').textContent = [
            item.maturityRating,
            item.rating ? `★ ${item.rating}` : '',
            item.year,
            item.genre
        ].filter(Boolean).join(' · ');
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

    return { init, pause };
})();