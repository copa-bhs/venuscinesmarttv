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

    window.VenusTopbar = { setActive };
})();
