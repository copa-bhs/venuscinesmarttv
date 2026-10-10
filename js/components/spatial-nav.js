(function () {
    const selector = '.tv-focusable, .card, .btn, .nav-link, .hero-btn, [data-focusable]';
    let focusedElement = null;
    let moveQueue = [];
    let framePending = false;
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
        element.style.setProperty('outline', 'none', 'important');
        element.style.setProperty('border-color', '#ffffff', 'important');
        element.style.setProperty('box-shadow', '0 0 0 3px #ffffff, 0 8px 24px rgba(0,0,0,.8)', 'important');
        element.style.setProperty('transform', 'scale(1.06)', 'important');
        element.style.setProperty('z-index', '10', 'important');
    }

    function revealFocusedElement(element) {
        let parent = element.parentElement;
        let scrolled = false;
        while (parent && parent !== document.body) {
            const style = getComputedStyle(parent);
            const canScrollX = parent.scrollWidth > parent.clientWidth && /auto|scroll/.test(style.overflowX);
            const canScrollY = parent.scrollHeight > parent.clientHeight && /auto|scroll/.test(style.overflowY);
            if (canScrollX) {
                const parentRect = parent.getBoundingClientRect();
                let elementRect = element.getBoundingClientRect();
                const inset = Math.max(12, (parent.clientWidth - elementRect.width) / 2);
                let nextLeft = parent.scrollLeft;
                if (elementRect.left < parentRect.left + inset) nextLeft += elementRect.left - parentRect.left - inset;
                else if (elementRect.right > parentRect.right - inset) nextLeft += elementRect.right - parentRect.right + inset;
                if (Math.abs(nextLeft - parent.scrollLeft) > 1) {
                    scroll(parent, nextLeft, parent.scrollTop);
                    scrolled = true;
                }
            }
            if (canScrollY) {
                const parentRect = parent.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                let nextTop = parent.scrollTop;
                if (elementRect.top < parentRect.top + 8) nextTop += elementRect.top - parentRect.top - 8;
                else if (elementRect.bottom > parentRect.bottom - 8) nextTop += elementRect.bottom - parentRect.bottom + 8;
                if (Math.abs(nextTop - parent.scrollTop) > 1) {
                    scroll(parent, parent.scrollLeft, nextTop);
                    scrolled = true;
                }
            }
            parent = parent.parentElement;
        }
        if (!scrolled) element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    function scroll(element, left, top) {
        try { element.scrollTo({ left, top, behavior: 'smooth' }); }
        catch {
            element.scrollLeft = left;
            element.scrollTop = top;
        }
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
    function setFocus(element, scroll = true) {
        if (!element || !getVisibleElements().includes(element)) return false;
        document.querySelectorAll('.focused').forEach(clearFocusStyle);
        if (focusedElement && !document.querySelector('.focused')) clearFocusStyle(focusedElement);
        focusedElement = element;
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

        if (best && setFocus(best.element)) {
            console.log(`[SpatialNav] moved ${direction} from ${current.dataset.navId || current.id || current.tagName} to ${best.element.dataset.navId || best.element.id || best.element.tagName}`);
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
            if (element && getVisibleElements().includes(element)) setFocus(element, false);
        });
        document.addEventListener('mouseover', event => {
            const element = event.target.closest(selector);
            if (element && getVisibleElements().includes(element)) setFocus(element, false);
        });
        const observer = new MutationObserver(refresh);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.VenusSpatialNav = { init, refresh, focus: setFocus, move };
})();