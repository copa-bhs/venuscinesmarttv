(function () {
    const selector = '.tv-focusable:not(.home-hero__dot), .card, .btn, .nav-link, .hero-btn, [data-focusable]';
    let focusedElement = null;
    let queuedDirection = null;
    let framePending = false;
    let scrollFrame = 0;
    let lastNavbarElement = null;
    let focusablesDirty = true;
    let visibleElementsCache = [];
    let catalogRowsCache = [];
    let onBack = () => false;
    let onInteraction = () => {};
    let onFocus = () => {};
    let onReachEnd = () => {};

    function clearFocusStyle(element) {
        element.classList.remove('focused');
    }

    function applyFocusStyle(element) {
        element.classList.add('focused');
    }

    function revealFocusedElement(element) {
        if (scrollFrame) cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => {
            scrollFrame = 0;
            if (!element.isConnected) return;
            const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
            try {
                element.scrollIntoView({ behavior, block: 'nearest', inline: 'center' });
            } catch {
                element.scrollIntoView();
            }
        });
    }

    function containsFocusable(node) {
        return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
    }

    function getVisibleElements(force = false) {
        if (!force && !focusablesDirty) return visibleElementsCache;

        const exitDialog = document.getElementById('exitDialog');
        const dialogIsActive = exitDialog && !exitDialog.hidden && exitDialog.classList.contains('is-open');
        const rows = new Map();
        const focusableNodes = dialogIsActive
            ? exitDialog.querySelectorAll(selector)
            : document.querySelectorAll(selector);
        visibleElementsCache = Array.from(focusableNodes).filter(element => {
            if (element.matches(':disabled') || element.closest('[hidden], .hidden, [aria-hidden="true"]')) return false;
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || element.getClientRects().length === 0) return false;
            if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '0');
            const rowId = element.dataset.row;
            if (rowId && rowId !== 'hero' && element.closest('#catalogContainer')) {
                if (!rows.has(rowId)) rows.set(rowId, []);
                rows.get(rowId).push(element);
            }
            return true;
        });
        catalogRowsCache = Array.from(rows.values());
        focusablesDirty = false;

        const elements = visibleElementsCache;
        const active = elements.includes(document.activeElement) ? document.activeElement : null;
        const selected = active || (elements.includes(focusedElement) ? focusedElement : null) ||
            elements.find(element => element.classList.contains('focused')) || null;
        document.querySelectorAll('.focused').forEach(element => {
            if (element !== selected && element.classList.contains('focused')) clearFocusStyle(element);
        });
        focusedElement = selected;
        if (focusedElement && !focusedElement.classList.contains('focused')) applyFocusStyle(focusedElement);
        return elements;
    }

    function refresh() {
        focusablesDirty = true;
        return getVisibleElements(true);
    }

    function setFocus(element, scroll = true, visibleElements = null) {
        let elements = visibleElements || getVisibleElements();
        if (!element || !elements.includes(element)) {
            elements = getVisibleElements(true);
            if (!element || !elements.includes(element)) return false;
        }
        // Sincroniza o foco visual e o foco nativo do WebView sem reler toda a lista.
        if (focusedElement && focusedElement !== element) clearFocusStyle(focusedElement);
        focusedElement = element;
        if (element.closest('#navbar')) lastNavbarElement = element;
        if (!focusedElement.classList.contains('focused')) applyFocusStyle(focusedElement);
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
        return elements === visibleElementsCache ? catalogRowsCache : buildCatalogRows(elements);
    }

    function getSpatialCandidates(current, direction, elements) {
        if (direction !== 'left' && direction !== 'right') return elements;
        const navbar = current.closest('#navbar');
        if (navbar) return elements.filter(element => navbar.contains(element));
        const carouselViewport = current.closest('[data-carousel-viewport]');
        if (carouselViewport) return elements.filter(element => carouselViewport.contains(element));
        if (current.closest('#catalogContainer') && current.dataset.row) {
            const row = getCatalogRows(elements).find(items => items.includes(current));
            if (row) return row.filter(element => element === current || !element.dataset.navId?.startsWith('more-'));
        }
        return elements;
    }

    function buildCatalogRows(elements) {
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

    function getHeroActions(elements) {
        return ['hero-play', 'hero-list', 'hero-info']
            .map(navId => elements.find(element => element.dataset.navId === navId))
            .filter(Boolean);
    }

    function moveBetweenSections(current, direction, elements) {
        const navbar = document.getElementById('navbar');
        const heroSection = document.getElementById('heroSection');
        if (!navbar || !heroSection) return false;

        if (direction === 'down' && navbar.contains(current)) {
            const target = getHeroActions(elements)[0] || getCatalogRows(elements)[0]?.[0];
            if (target) setFocus(target, true, elements);
            return Boolean(target);
        }

        if (heroSection.contains(current) && direction === 'up') {
            const target = elements.find(element => element.dataset.navId === 'tab-home') ||
                (lastNavbarElement && elements.includes(lastNavbarElement) ? lastNavbarElement : null) ||
                elements.find(element => element.closest('#navbar'));
            if (target) setFocus(target, true, elements);
            return true;
        }

        if (heroSection.contains(current) && direction === 'down') {
            const firstRow = getCatalogRows(elements)[0];
            if (firstRow?.length) setFocus(firstRow[0], true, elements);
            return true;
        }

        return false;
    }

    function moveWithinHero(current, direction, elements) {
        const heroSection = document.getElementById('heroSection');
        const actions = getHeroActions(elements);
        if (!heroSection || !heroSection.contains(current)) return false;
        const actionIndex = actions.indexOf(current);
        if (actionIndex >= 0) {
            if (direction === 'left' && actionIndex > 0) setFocus(actions[actionIndex - 1], true, elements);
            else if (direction === 'right' && actionIndex < actions.length - 1) setFocus(actions[actionIndex + 1], true, elements);
            return true;
        }
        return false;
    }

    function moveBetweenRows(current, direction, elements) {
        const heroSection = document.getElementById('heroSection');
        const rows = getCatalogRows(elements);
        if (heroSection?.contains(current)) return false;

        const currentRowIndex = rows.findIndex(row => row.includes(current));
        if (currentRowIndex < 0) return false;
        if (direction === 'up') {
            const targetRow = currentRowIndex === 0 ? getHeroActions(elements) : rows[currentRowIndex - 1];
            const target = closestByHorizontalPosition(targetRow, current);
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

    function moveWithinCarousel(current, direction, elements) {
        if (direction !== 'left' && direction !== 'right') return false;
        const viewport = current.closest('[data-carousel-viewport]');
        if (!viewport) return false;

        const rowItems = getSpatialCandidates(current, direction, elements);
        const currentIndex = rowItems.indexOf(current);
        if (currentIndex < 0) return false;
        const step = direction === 'right' ? 1 : -1;
        const next = rowItems[currentIndex + step];
        if (next) {
            setFocus(next, true, elements);
            return true;
        }

        if (direction === 'left' || viewport.dataset.topTen === 'true') {
            const wrapped = direction === 'right' ? rowItems[0] : rowItems[rowItems.length - 1];
            if (wrapped) setFocus(wrapped, true, elements);
            return true;
        }

        Promise.resolve(onReachEnd(current.dataset.row, current)).then(loaded => {
            if (loaded) return;
            const refreshed = getVisibleElements(true);
            const updatedItems = getSpatialCandidates(current, direction, refreshed);
            if (updatedItems.length && updatedItems[updatedItems.length - 1] === current) {
                setFocus(updatedItems[0], true, refreshed);
            }
        });
        return true;
    }

    // Escolhe o vizinho visível mais próximo na direção solicitada.
    function move(direction) {
        const elements = getVisibleElements();
        if (!elements.length) return;
        const current = elements.includes(document.activeElement)
            ? document.activeElement
            : (elements.includes(focusedElement) ? focusedElement : null);
        if (!elements.includes(current)) {
            setFocus(elements[0]);
            return;
        }

        const exitDialog = document.getElementById('exitDialog');
        if (exitDialog && !exitDialog.hidden && exitDialog.classList.contains('is-open')) {
            const dialogElements = elements.filter(element => exitDialog.contains(element));
            const currentIndex = dialogElements.indexOf(current);
            if (dialogElements.length) {
                const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % dialogElements.length;
                setFocus(dialogElements[nextIndex], false, elements);
            }
            return;
        }

        if (moveBetweenSections(current, direction, elements)) return;
        if ((direction === 'left' || direction === 'right') && moveWithinHero(current, direction, elements)) return;
        if ((direction === 'left' || direction === 'right') && moveWithinCarousel(current, direction, elements)) return;
        if ((direction === 'up' || direction === 'down') && moveBetweenRows(current, direction, elements)) return;

        const currentRect = current.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        const currentCenterY = currentRect.top + currentRect.height / 2;
        const candidates = getSpatialCandidates(current, direction, elements);
        let best = null;

        candidates.forEach(candidate => {
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
        else if (direction === 'right' && current.closest('#catalogContainer') && current.dataset.row) {
            const rowItems = getSpatialCandidates(current, direction, elements);
            const itemIndex = rowItems.indexOf(current);
            const viewport = current.closest('[data-carousel-viewport]');
            const isFixedTopTen = viewport?.dataset.topTen === 'true';
            const wrapTo = direction === 'left'
                ? rowItems[rowItems.length - 1]
                : isFixedTopTen ? rowItems[0] : null;
            if (wrapTo) {
                setFocus(wrapTo, true, elements);
                return;
            }
            Promise.resolve(onReachEnd(current.dataset.row, current)).then(loaded => {
                if (loaded) return;
                const refreshed = getVisibleElements(true);
                const refreshedItems = getSpatialCandidates(current, direction, refreshed);
                const firstItem = refreshedItems.find(item => item.dataset.row === current.dataset.row);
                if (firstItem && itemIndex >= refreshedItems.length - 1) setFocus(firstItem, true, refreshed);
            });
        } else if (direction === 'left' && current.closest('#catalogContainer') && current.dataset.row) {
            const rowItems = getSpatialCandidates(current, direction, elements);
            if (rowItems.length && rowItems[0] === current) setFocus(rowItems[rowItems.length - 1], true, elements);
        }
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
            queuedDirection = direction;
            if (!framePending) {
                framePending = true;
                requestAnimationFrame(() => {
                    framePending = false;
                    const nextDirection = queuedDirection;
                    queuedDirection = null;
                    if (nextDirection) move(nextDirection);
                });
            }
            return;
        }

        const exitDialog = document.getElementById('exitDialog');
        const exitDialogOpen = exitDialog && !exitDialog.hidden && exitDialog.classList.contains('is-open');
        if (exitDialogOpen && event.key === 'Tab') {
            event.preventDefault();
            event.stopPropagation();
            move(event.shiftKey ? 'left' : 'right');
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

        if (event.key === 'Backspace' || event.keyCode === 8 || event.key === 'Escape' ||
            event.key === 'GoBack' || event.key === 'BrowserBack' || event.keyCode === 4) {
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
        onReachEnd = options.onReachEnd || onReachEnd;
        refresh();
        document.addEventListener('keydown', handleKeydown, true);
        document.addEventListener('focusin', event => {
            const element = event.target.closest(selector);
            if (element && element !== focusedElement && getVisibleElements().includes(element)) setFocus(element, false);
        });
        document.addEventListener('mouseover', event => {
            const element = event.target.closest(selector);
            if (element?.closest('[data-carousel-viewport]')) return;
            if (element && element !== focusedElement && getVisibleElements().includes(element)) setFocus(element, false);
        });
        const observer = new MutationObserver(records => {
            if (records.some(record =>
                Array.from(record.addedNodes).some(containsFocusable) ||
                Array.from(record.removedNodes).some(containsFocusable)
            )) focusablesDirty = true;
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.VenusSpatialNav = { init, refresh, focus: setFocus, move };
})();