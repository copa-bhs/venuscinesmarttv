// Details page logic

// Function to load details page content
function loadDetailsPage() {
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
                <div class="text-white text-2xl font-bold mb-4">Details</div>
                <div class="w-full h-96 bg-venus-cardbg rounded">
                    <!-- Details will be loaded here -->
                </div>
            </div>
        </div>
    `;
}