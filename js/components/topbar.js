(() => {
    const routeByTab = {
        home: 'home',
        series: 'series',
        movies: 'movies',
        watchlist: 'watchlist'
    };

    function setActive(tab) {
        const activeRoute = routeByTab[tab] || 'home';
        document.querySelectorAll('.topbar-link[data-route]').forEach(link => {
            const active = link.dataset.route === activeRoute;
            link.classList.toggle('active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    function setVisible(visible) {
        const topbar = document.getElementById('navbar');
        if (!topbar) return;
        topbar.classList.toggle('topbar-hidden', !visible);
        topbar.setAttribute('aria-hidden', String(!visible));
        topbar.inert = !visible;
    }

    function syncVisibility() {
        const overlays = ['searchModal', 'detailsPage', 'playerModal'];
        const overlayOpen = overlays.some(id => {
            const element = document.getElementById(id);
            return element && !element.classList.contains('hidden');
        });
        setVisible(!overlayOpen);
    }

    window.VenusTopbar = { setActive, setVisible, syncVisibility };
})();
