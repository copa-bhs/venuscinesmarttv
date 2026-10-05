const ALLOWED_ACTIONS = new Set([
    'get_vod_categories',
    'get_vod_streams',
    'get_series_categories',
    'get_series',
    'get_series_info'
]);

function getConfiguration() {
    const baseUrl = process.env.XTREAM_BASE_URL;
    const username = process.env.XTREAM_USERNAME;
    const password = process.env.XTREAM_PASSWORD;

    if (!baseUrl || !username || !password) return null;

    try {
        const parsedUrl = new URL(baseUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;
        return { baseUrl: parsedUrl.origin, username, password };
    } catch {
        return null;
    }
}

function respondJson(response, status, data) {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify(data));
}

module.exports = async function handler(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        return respondJson(response, 405, { error: 'Method not allowed' });
    }

    const credentials = getConfiguration();
    if (!credentials) {
        return respondJson(response, 503, { error: 'Xtream connection is not configured in Vercel.' });
    }

    const action = String(request.query.action || '');
    const isMovieStream = action === 'stream_movie';
    const isSeriesStream = action === 'stream_series';
    const isStream = isMovieStream || isSeriesStream;

    if (!isStream && !ALLOWED_ACTIONS.has(action)) {
        return respondJson(response, 400, { error: 'Unsupported Xtream action.' });
    }

    const upstreamUrl = new URL(credentials.baseUrl);
    const username = encodeURIComponent(credentials.username);
    const password = encodeURIComponent(credentials.password);

    if (isStream) {
        const id = String(request.query.id || '');
        const extension = String(request.query.ext || 'mp4');
        if (!/^\d+$/.test(id) || !/^[a-z\d]{2,5}$/i.test(extension)) {
            return respondJson(response, 400, { error: 'Invalid stream identifier.' });
        }
        upstreamUrl.pathname = `/${isMovieStream ? 'movie' : 'series'}/${username}/${password}/${id}.${extension}`;
    } else {
        upstreamUrl.pathname = '/player_api.php';
        upstreamUrl.searchParams.set('username', credentials.username);
        upstreamUrl.searchParams.set('password', credentials.password);
        upstreamUrl.searchParams.set('action', action);
        if (action === 'get_series_info') {
            const seriesId = String(request.query.series_id || '');
            if (!/^\d+$/.test(seriesId)) return respondJson(response, 400, { error: 'Invalid series identifier.' });
            upstreamUrl.searchParams.set('series_id', seriesId);
        }
    }

    try {
        const headers = new Headers();
        if (request.headers.range) headers.set('Range', request.headers.range);
        const upstream = await fetch(upstreamUrl, { method: request.method, headers });

        if (isStream) {
            response.statusCode = upstream.status;
            for (const headerName of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
                const value = upstream.headers.get(headerName);
                if (value) response.setHeader(headerName, value);
            }
            response.setHeader('Cache-Control', 'private, no-store');
            if (request.method === 'HEAD' || !upstream.body) return response.end();
            const { Readable } = require('node:stream');
            Readable.fromWeb(upstream.body).pipe(response);
            return;
        }

        const body = await upstream.text();
        response.statusCode = upstream.status;
        response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'private, max-age=60');
        response.end(body);
    } catch {
        respondJson(response, 502, { error: 'Unable to reach the Xtream provider.' });
    }
};