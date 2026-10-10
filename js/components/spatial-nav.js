(function () {
    const selector = '.tv-focusable:not(.home-hero__dot), .card, .btn, .nav-link, .hero-btn, [data-focusable]';
    let focusedElement = null;
    let moveQueue = [];
    let framePending = false;
    let scrollFrame = 0;
    let lastNavbarElement = null;
    let onBack = () => false;
    let onInteraction = () => {};
    let onFocus = () => {};

    function clearFocusStyle(element) {
        element.classList.remove('focused');
        ['outline', 'outline-offset', 'border-color', 'box-shadow', 'transform', 'z-index']
            .forEach(property => element.style.removeProperty(property));
    }

    function applyFocusStyle(element) {
        element.classList.add('focused');
        element.style.setProperty('outline', '4px solid #ffffff', 'important');
        element.style.setProperty('outline-offset', '2px', 'important');
        element.style.setProperty('border-color', '#ffffff', 'important');
        element.style.setProperty('box-shadow', 'none', 'important');
        element.style.setProperty('transform', 'none', 'important');
        element.style.setProperty('z-index', '10', 'important');
    }

    function revealFocusedElement(element) {
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => {
            scrollFrame = 0;
            if (!element.isConnected) return;
            try { element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' }); }
            catch { element.scrollIntoView(); }
        });
    }

    function getVisibleElements() {
        return Array.from(document.querySelectorAll(selector)).filter(element => {
            if (element.matches(':disabled') || element.closest('[hidden], .hidden, [aria-hidden="true"]')) return false;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
    }

    function refresh() {
        const elements = getVisibleElements();
        elements.forEach(element => {
            if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '0');
        });
        const active = elements.includes(document.activeElement) ? document.activeElement : null;
        const selected = active || elements.find(element => element.classList.contains('focused')) || null;
        document.querySelectorAll('.focused').forEach(element => {
            if (element !== selected) clearFocusStyle(element);
        });
        focusedElement = selected;
        if (focusedElement) applyFocusStyle(focusedElement);
        return elements;
    }

    // Sincroniza o foco visual e o foco nativo do WebView.
    function setFocus(element, scroll = true, visibleElements = null) {
        if (!element || !(visibleElements || getVisibleElements()).includes(element)) return false;
        document.querySelectorAll('.focused').forEach(clearFocusStyle);
        if (focusedElement && !document.querySelector('.focused')) clearFocusStyle(focusedElement);
        focusedElement = element;
        if (element.closest('#navbar')) lastNavbarElement = element;
        applyFocusStyle(focusedElement);
        try { focusedElement.focus({ preventScroll: true }); }
        catch { focusedElement.focus(); }
        if (scroll) revealFocusedElement(focusedElement);
        onFocus(focusedElement);
        return true;
    }

    function overlap(startA, endA, startB, endB) {
        return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
    }

    function getCatalogRows(elements) {
        const rows = new Map();
        elements.forEach(element => {
            const rowId = element.dataset.row;
            if (!rowId || rowId === 'hero' || !element.closest('#catalogContainer')) return;
            if (!rows.has(rowId)) rows.set(rowId, []);
            rows.get(rowId).push(element);
        });
        return Array.from(rows.values());
    }

    function closestByHorizontalPosition(elements, reference) {
        const referenceRect = reference.getBoundingClientRect();
        const referenceX = referenceRect.left + referenceRect.width / 2;
        return elements.reduce((best, element) => {
            const rect = element.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - referenceX);
            return !best || distance < best.distance ? { element, distance } : best;
        }, null)?.element || null;
    }

    function moveBetweenSections(current, direction, elements) {
        const navbar = document.getElementById('navbar');
        const hero = document.getElementById('heroSection');
        if (!navbar || !hero) return false;

        if (direction === 'down' && navbar.contains(current)) {
            setFocus(hero, true, elements);
            return true;
        }

        if (direction === 'up' && current === hero) {
            const target = lastNavbarElement && elements.includes(lastNavbarElement)
                ? lastNavbarElement
                : elements.find(element => element.dataset.navId === 'tab-home') ||
                    elements.find(element => element.closest('#navbar'));
            if (target) setFocus(target, true, elements);
            return true;
        }

        if (direction === 'up' && hero.contains(current) && current !== hero) {
            setFocus(hero, true, elements);
            return true;
        }

        return false;
    }

    function moveWithinHero(current, direction, elements) {
        const hero = document.getElementById('heroSection');
        if (!hero || !hero.contains(current)) return false;
        const actions = [
            elements.find(element => element.dataset.navId === 'hero-play'),
            elements.find(element => element.dataset.navId === 'hero-info')
        ].filter(Boolean);
        if (current === hero) {
            const target = direction === 'right' ? actions[0] : actions[actions.length - 1];
            if (target) setFocus(target, true, elements);
            return true;
        }
        const actionIndex = actions.indexOf(current);
        if (actionIndex >= 0) {
            if (direction === 'up') setFocus(hero, true, elements);
            else if (direction === 'left') setFocus(hero, true, elements);
            else if (direction === 'right') {
                setFocus(actions[actionIndex + 1] || hero, true, elements);
            }
            return true;
        }
        return false;
    }

    function moveBetweenRows(current, direction, elements) {
        const hero = document.getElementById('heroSection');
        const rows = getCatalogRows(elements);
        if (hero?.contains(current)) {
            if (direction === 'down' && rows[0]?.length) setFocus(rows[0][0], true, elements);
            return true;
        }

        const currentRowIndex = rows.findIndex(row => row.includes(current));
        if (currentRowIndex < 0) return false;
        if (direction === 'up') {
            const targetRow = currentRowIndex === 0 ? [hero] : rows[currentRowIndex - 1];
            const target = closestByHorizontalPosition(targetRow.filter(element => elements.includes(element)), current);
            if (target) setFocus(target, true, elements);
            return true;
        }
        if (direction === 'down') {
            const targetRow = rows[currentRowIndex + 1];
            const target = targetRow && closestByHorizontalPosition(targetRow, current);
            if (target) setFocus(target, true, elements);
            return true;
        }
        return false;
    }

    // Escolhe o vizinho visível mais próximo na direção solicitada.
    function move(direction) {
        const elements = refresh();
        if (!elements.length) return;
        const current = elements.includes(document.activeElement)
            ? document.activeElement
            : (elements.includes(focusedElement) ? focusedElement : null);
        if (!elements.includes(current)) {
            setFocus(elements[0]);
            return;
        }

        if (moveBetweenSections(current, direction, elements)) return;
        if ((direction === 'left' || direction === 'right') && moveWithinHero(current, direction, elements)) return;
        if ((direction === 'up' || direction === 'down') && moveBetweenRows(current, direction, elements)) return;

        const currentRect = current.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        const currentCenterY = currentRect.top + currentRect.height / 2;
        let best = null;

        elements.forEach(candidate => {
            if (candidate === current) return;
            const rect = candidate.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = Math.abs(centerX - currentCenterX);
            const dy = Math.abs(centerY - currentCenterY);
            let perpendicularOverlap;

            if (direction === 'right' || direction === 'left') {
                if (direction === 'right' ? centerX <= currentCenterX : centerX >= currentCenterX) return;
                perpendicularOverlap = overlap(currentRect.top, currentRect.bottom, rect.top, rect.bottom);
            } else {
                if (direction === 'down' ? centerY <= currentCenterY : centerY >= currentCenterY) return;
                perpendicularOverlap = overlap(currentRect.left, currentRect.right, rect.left, rect.right);
            }

            const movingVertically = direction === 'up' || direction === 'down';
            const isAdjacentRow = movingVertically && current.dataset.row && candidate.dataset.row &&
                current.dataset.row !== candidate.dataset.row;
            if (perpendicularOverlap <= 0 && !isAdjacentRow) return;
            const horizontal = direction === 'right' || direction === 'left';
            const score = horizontal
                ? dx + dy * 2
                : dy + dx * 2;
            if (!best || score < best.score) best = { element: candidate, score };
        });

        if (best) setFocus(best.element, true, elements);
    }

    function handleKeydown(event) {
        const editing = event.target instanceof HTMLElement &&
            (event.target.matches('input, textarea, select') || event.target.isContentEditable);
        if (editing && event.key !== 'Escape') return;
        const directions = {
            ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
            38: 'up', 40: 'down', 37: 'left', 39: 'right'
        };
        const direction = directions[event.key] || directions[event.keyCode];
        if (direction) {
            event.preventDefault();
            event.stopPropagation();
            onInteraction();
            moveQueue.push(direction);
            if (!framePending) {
                framePending = true;
                requestAnimationFrame(() => {
                    framePending = false;
                    const queuedMoves = moveQueue;
                    moveQueue = [];
                    queuedMoves.forEach(move);
                });
            }
            return;
        }

        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            event.stopPropagation();
            const elements = refresh();
            const current = elements.includes(focusedElement) ? focusedElement : elements[0];
            if (current) current.click();
            onInteraction();
            return;
        }

        if (event.key === 'Backspace' || event.keyCode === 8 || event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            if (!onBack()) history.back();
        }
    }

    // Registra o D-pad, o foco por mouse e as mudanças estruturais da tela.
    function init(options = {}) {
        onBack = options.onBack || onBack;
        onInteraction = options.onInteraction || onInteraction;
        onFocus = options.onFocus || onFocus;
        refresh();
        document.addEventListener('keydown', handleKeydown, true);
        document.addEventListener('focusin', event => {
            const element = event.target.closest(selector);
            if (element && element !== focusedElement && getVisibleElements().includes(element)) setFocus(element, false);
        });
        document.addEventListener('mouseover', event => {
            const element = event.target.closest(selector);
            if (element && element !== focusedElement && getVisibleElements().includes(element)) setFocus(element, false);
        });
        const observer = new MutationObserver(refresh);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.VenusSpatialNav = { init, refresh, focus: setFocus, move };
})();