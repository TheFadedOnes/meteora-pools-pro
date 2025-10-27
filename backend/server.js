const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = 3001;

let cachedTokens = [];
let lastUpdate = null;

// Simulate priceChange24h (replace with actual API data if available)
function getPriceChange24h(currentPrice, historicalPrice) {
    if (!currentPrice || !historicalPrice || historicalPrice === 0) return 0;
    return ((currentPrice - historicalPrice) / historicalPrice) * 100;
}

async function fetchAndEnrichPools() {
    try {
        console.log('Fetching Meteora pools at', new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore' }));
        const apiResponse = await fetch('https://dlmm-api.meteora.ag/pair/all', { timeout: 30000 });
        if (!apiResponse.ok) throw new Error(`API error: ${apiResponse.status}`);
        const apiData = await apiResponse.json();
        console.log('Raw API response length:', apiData.length);
        if (apiData.length > 0) {
            console.log('First pool sample:', JSON.stringify(apiData[0], null, 2));
        } else {
            console.log('No pools returned from API');
            cachedTokens = [];
            return;
        }

        const validPools = apiData.filter(pool => pool.address && pool.address.length === 44);
        const topPools = validPools
            .sort((a, b) => (b.trade_volume_24h || 0) - (a.trade_volume_24h || 0))
            .slice(0, 10);

        if (!topPools.length && validPools.length > 0) {
            console.log('No high-volume pools, using first 10 valid pools');
            topPools.push(...validPools.slice(0, 10));
        } else if (!topPools.length) {
            console.log('No valid pools available');
            cachedTokens = [];
            return;
        }

        cachedTokens = topPools.map((pool, index) => {
            const lbPair = pool.address;
            const historicalPrice = pool.current_price ? pool.current_price * (1 - Math.random() * 0.1) : 0;
            const priceChange24h = getPriceChange24h(pool.current_price, historicalPrice);
            console.log(`Generated pool data [${index}]:`, { name: pool.name, address: pool.address, price: pool.current_price, volume24h: pool.trade_volume_24h, liquidity: pool.liquidity, priceChange24h });
            return {
                name: pool.name || `${pool.mint_x}-${pool.mint_y} Pool`,
                address: pool.address || 'Address not available',
                price: pool.current_price !== undefined && pool.current_price !== null ? pool.current_price.toFixed(6) : 'N/A',
                volume24h: pool.trade_volume_24h || 0,
                liquidity: pool.liquidity?.toLocaleString() || 'N/A',
                priceChange24h: isNaN(priceChange24h) ? 0 : priceChange24h
            };
        });

        lastUpdate = new Date();
        console.log('Cached tokens updated at', lastUpdate.toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore' }), ':', cachedTokens.map((t, i) => ({ index: i, name: t.name, address: t.address, price: t.price, volume24h: t.volume24h, liquidity: t.liquidity, priceChange24h: t.priceChange24h })));
    } catch (error) {
        console.error('Fetch error at', new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore' }), ':', error.message);
        cachedTokens = [];
    }
}

// Initial fetch and schedule updates every 20 minutes
fetchAndEnrichPools();
cron.schedule('*/20 * * * *', fetchAndEnrichPools);

// CORS configuration to allow frontend access
app.use(cors({
    origin: ['http://127.0.0.1:8080', 'http://localhost:8080'],
    optionsSuccessStatus: 200
}));

app.get('/api/tokens', (req, res) => {
    if (!cachedTokens.length) {
        res.status(503).json({ error: 'No data available. Last update: ' + (lastUpdate ? lastUpdate.toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore' }) : 'never') });
    } else {
        res.json(cachedTokens);
    }
});

app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT + ' at', new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Singapore' }));
    console.log('Test endpoint response:', JSON.stringify(cachedTokens.slice(0, 2)));
});