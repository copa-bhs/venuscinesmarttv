// Search page logic

// Function to load search page content
function loadSearchPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="h-full w-full flex flex-col">
            <div class="h-16 w-full flex items-center justify-between px-4 bg-venus-black">
                <div class="text-venus-red text-2xl font-bold">Vênus Cine</div>
                <div class="flex space-x-4">
                    <button class="text-white" onclick="loadHomePage()">Home</button>
                    <button class="text-white" onclick="loadMoviesPage()">Movies</button>
                    <button class="text-white" onclick="loadSeriesPage()">Series</button>
                    <button class="text-white" onclick="loadWatchlistPage()">Watchlist</button>
                    <button class="text-white" onclick="loadSearchPage()">Search</button>
                    <button class="text-white" onclick="loadSettingsPage()">Settings</button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
                <div class="text-white text-2xl font-bold mb-4">Search</div>
                <div class="mb-4">
                    <input type="text" id="searchInput" class="w-full p-2 rounded bg-venus-cardbg text-white" placeholder="Search for movies, series, etc.">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <!-- Search results will be loaded here -->
                </div>
            </div>
        </div>
    `;
}