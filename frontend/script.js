const API_URL = 'http://localhost:3001/api/tokens';
const USER_BALANCE = 0.047665; // Simulated user SOL balance
let tokensCache = []; // Global cache to store token data

function getMarketType(volume24h, priceChange24h = 0) {
    priceChange24h = typeof priceChange24h === 'number' ? priceChange24h : parseFloat(priceChange24h) || 0;
    if (volume24h > 1000000 && priceChange24h > 5) return 'Bull';
    if (volume24h > 1000000 && priceChange24h < -5) return 'Bear';
    return 'Ranging';
}

function getStrategyBreakdown(token) {
    const tokenCopy = { ...token }; // Create a new object to avoid mutation
    let { name, address, price, volume24h, priceChange24h, liquidity } = tokenCopy;
    price = parseFloat(price) || 0; // $192.027345 USD for SOL-USDC
    volume24h = parseFloat(volume24h) || 0;
    priceChange24h = parseFloat(priceChange24h) || 0;
    liquidity = parseFloat(liquidity.replace(/[^0-9.-]+/g, '')) || 0; // Remove locale formatting

    const currentPrice = price; // $192.027345 USD
    const marketType = getMarketType(volume24h, priceChange24h);
    const volatility = Math.abs(priceChange24h) / 100;
    const liquidityUSD = liquidity;
    const transactionCount = Math.floor(volume24h / 10000); // Simulated transactions based on volume

    // Market Narrative
    let marketNarrative = '';
    if (marketType === 'Ranging') {
        marketNarrative = `${name} (${address.slice(0, 10)}...) is a mature token with strong liquidity ($${liquidityUSD.toLocaleString()} pooled) and consistent 24h volume ($${volume24h.toLocaleString()}, balanced buys/sells: ~${Math.floor(transactionCount/2)} buys vs. ~${Math.floor(transactionCount/2)} sells). The price is stable around $${currentPrice.toFixed(6)} USD (${(currentPrice/0.1929).toFixed(6)} SOL), showing no major moves (24h change: ${priceChange24h.toFixed(2)}%)—indicative of a ranging market favoring steady fee capture.`;
    } else if (marketType === 'Bull') {
        marketNarrative = `${name} (${address.slice(0, 10)}...) shows strong momentum with high liquidity ($${liquidityUSD.toLocaleString()} pooled) and surging 24h volume ($${volume24h.toLocaleString()}). The price at $${currentPrice.toFixed(6)} USD (${(currentPrice/0.1929).toFixed(6)} SOL) is up ${priceChange24h.toFixed(2)}%, signaling a bull market for aggressive plays.`;
    } else { // Bear
        marketNarrative = `${name} (${address.slice(0, 10)}...) is experiencing a downturn with solid liquidity ($${liquidityUSD.toLocaleString()} pooled) and 24h volume ($${volume24h.toLocaleString()}). The price at $${currentPrice.toFixed(6)} USD (${(currentPrice/0.1929).toFixed(6)} SOL) is down ${Math.abs(priceChange24h).toFixed(2)}%, indicating a bear market for accumulation strategies.`;
    }

    // Volatility Strategy and Price Range
    const priceBuffer = 0.075; // 7.5% buffer
    const minPrice = currentPrice * (1 - priceBuffer); // 192.027345 * 0.925 = 177.665
    const maxPrice = currentPrice * (1 + priceBuffer); // 192.027345 * 1.075 = 206.389
    const solPerUSD = 1 / 0.1929; // Approximately 5.184 SOL per USD
    const minPriceSOL = minPrice * solPerUSD; // 177.665 * 5.184 ≈ 921.02 SOL
    const maxPriceSOL = maxPrice * solPerUSD; // 206.389 * 5.184 ≈ 1070.05 SOL
    const bestStrategy = marketType === 'Ranging' ? 'Spot' : 'Bid-Ask';
    const strategyFocus = marketType === 'Ranging' ? 'Steady fees around price' :
                         marketType === 'Bull' ? 'Distribute on pumps, capture sell volume' : 'Accumulate on dips, capture buy volume';

    // Number of Bins (scaled with volume)
    let numBins = Math.floor((volume24h / 1000000) * 10) || 10; // Scale with volume, min 10
    numBins = Math.min(Math.max(numBins, 10), 100); // Cap 10-100
    const binStep = ((maxPrice - minPrice) / numBins) * 100; // Percentage step per bin

    // Asset Allocation
    let solAlloc = 0, tokenAlloc = 0;
    if (marketType === 'Ranging') {
        solAlloc = 100; tokenAlloc = 0;
    } else {
        solAlloc = 80; tokenAlloc = 20; // Adjust for Bull/Bear
    }
    const assetAllocation = [
        { asset: 'SOL (Single-Sided)', percent: solAlloc, rationale: `Avoids holding volatile ${name}; earns fees on both buys/sells. DCA into token on dips via bin swaps. Ideal for ${marketType.toLowerCase()} markets per LP community strategies.` },
        { asset: name, percent: tokenAlloc, rationale: `High IL/rug risk in ${marketType.toLowerCase()} conditions; focus on SOL for hedge. Add ${tokenAlloc > 0 ? tokenAlloc : 20}% later if bullish via swap.` }
    ];

    // Expected Hold Time and Risk Level
    const holdTime = marketType === 'Ranging' ? '2-3 days (48-72 hours)' :
                     marketType === 'Bull' ? '1-2 days (24-48 hours)' : '2-4 days (48-96 hours)';
    const riskLevel = marketType === 'Ranging' ? '3-5 (Low-Medium)' :
                      marketType === 'Bull' ? '7-8 (Medium-High)' : '5-6 (Medium)';

    // Actionable Guide (without Recommended Deposit)
    const actionableGuide = `
        <strong>Volatility Strategy:</strong> ${bestStrategy} (uniform distribution around current price for balanced, low-IL fee farming in ${marketType.toLowerCase()} markets).<br>
        <strong>Price Range:</strong> Min $${minPrice.toFixed(6)} USD (${minPriceSOL.toFixed(6)} SOL) (-7.5% buffer for minor dips), Max $${maxPrice.toFixed(6)} USD (${maxPriceSOL.toFixed(6)} SOL) (+7.5% buffer for minor pumps). This ~15% spread centers on $${currentPrice.toFixed(6)} USD (${(currentPrice * solPerUSD).toFixed(6)} SOL), capturing typical 24h fluctuations.<br>
        <strong>Num Bins:</strong> ${numBins} (moderate width: ~${binStep.toFixed(2)}% per bin step; balances fee density with coverage).<br>
        <strong>Enter in Meteora:</strong> Select: ${bestStrategy}. Min Price: ${minPriceSOL.toFixed(6)} (${name}/SOL—adjust if UI shows different base). Max Price: ${maxPriceSOL.toFixed(6)}. Num Bins: ${numBins}.<br>
        <strong>Monitor:</strong> Via app.meteora.ag; rebalance if price breaks range (e.g., add bins downward on dips). Expected fees: 10-20% ROI in ${holdTime.split(' ')[0]} on this volume, compounding via reinvest.
    `;

    return {
        marketNarrative,
        actionableGuide,
        assetAllocation,
        strategyCard: {
            marketType,
            priceRangeSpread: `$${minPrice.toFixed(6)} - $${maxPrice.toFixed(6)} USD (${minPriceSOL.toFixed(6)} - ${maxPriceSOL.toFixed(6)} SOL)`,
            numBins,
            bestStrategy,
            strategyFocus,
            holdTime,
            riskLevel
        }
    };
}

async function fetchPools() {
    const loading = document.getElementById('loading');
    let tableBody = document.getElementById('poolTableBody');
    
    loading.style.display = 'block';
    tableBody.innerHTML = '';
    tokensCache = []; // Reset cache

    try {
        console.log('Fetching pools...');
        const response = await fetch(API_URL, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP error: ${response.status} - ${await response.text()}`);
        const data = await response.json();
        console.log('Fetched data:', data);
        if (data.error) throw new Error(data.error);

        const tokens = Array.isArray(data) ? [...data] : [];
        loading.style.display = 'none';

        if (!tokens.length) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #00B7EB; background: #1A1A1A;">No pools available. Check backend logs or wait for refresh.</td></tr>';
            return;
        }

        tokens.forEach((token, index) => {
            console.log(`Processing token ${index}:`, token);
            const priceValue = typeof token.price === 'string' && token.price !== 'N/A' ? parseFloat(token.price) : null;
            const priceDisplay = priceValue !== null ? `$${priceValue.toFixed(6)}` : token.price;
            const priceChange24h = typeof token.priceChange24h === 'number' ? token.priceChange24h : parseFloat(token.priceChange24h) || 0;
            const breakdown = getStrategyBreakdown({ ...token, price: priceValue });
            const bestStrategy = breakdown.strategyCard.bestStrategy;

            console.log(`Row [${index}] breakdown:`, breakdown);
            let row = document.createElement('tr');
            const tokenData = JSON.stringify({ ...token, price: priceValue });
            row.innerHTML = `
                <td class="pool-info" style="background: #1A1A1A; color: #00B7EB; padding: 10px;">
                    <div>
                        <a href="https://www.meteora.ag/dlmm/${token.address || 'BVRbyLjjfSBcoyiYFuxbgKYnWuiFaF9CSXEa5vdSZ9Hh'}" target="_blank" style="font-weight: 600; color: #FF69B4; text-decoration: underline; text-shadow: 0 0 3px #FF69B4;">${token.name}</a>
                        <div style="font-size: 0.75rem; color: #A9A9A9; word-break: break-all;">${token.address || 'Address not available'}</div>
                    </div>
                </td>
                <td style="background: #1A1A1A; color: #00B7EB; padding: 10px;">
                    ${priceDisplay} 
                    <span class="price-change ${priceChange24h >= 0 ? 'positive' : 'negative'}" style="color: ${priceChange24h >= 0 ? '#00FF7F' : '#FF4500'}; text-shadow: 0 0 3px ${priceChange24h >= 0 ? '#00FF7F' : '#FF4500'};">${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%</span>
                </td>
                <td style="background: #1A1A1A; color: #00B7EB; padding: 10px;">$${token.volume24h.toLocaleString()}</td>
                <td style="background: #1A1A1A; color: #00B7EB; padding: 10px;">$${token.liquidity}</td>
                <td class="strategy-buttons" style="background: #1A1A1A; padding: 10px;" data-token-index="${index}" data-token='${tokenData}'>
                    <button class="strategy-btn ${bestStrategy === bestStrategy ? 'highlight' : ''}" data-strategy="${bestStrategy}" onclick="showStrategyDetails(${index}, '${bestStrategy}')" style="background: #9400D3; color: #00B7EB; border: 2px solid #FF69B4; padding: 5px 10px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 3px #FF69B4; transition: all 0.3s; cursor: pointer;">LP-Strategy</button>
                </td>
            `;
            tableBody.appendChild(row);
            tokensCache[index] = token;
        });

        document.querySelectorAll('.strategy-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = this.closest('.strategy-buttons').dataset.tokenIndex;
                const selectedStrategy = this.dataset.strategy;
                updateStrategyHighlight(index, selectedStrategy);
            });
        });
    } catch (error) {
        loading.style.display = 'none';
        console.error('Fetch error:', error.message, error.stack);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #00B7EB; background: #1A1A1A;">Error loading data. Check console. Details: ' + error.message + '</td></tr>';
    }
}

function updateStrategyHighlight(index, selectedStrategy) {
    const buttons = document.querySelectorAll(`.strategy-buttons[data-token-index="${index}"] .strategy-btn`);
    buttons.forEach(button => {
        button.classList.toggle('highlight', button.dataset.strategy === selectedStrategy);
    });
}

function showStrategyDetails(index, strategy) {
    const tokenElement = document.querySelector(`.strategy-buttons[data-token-index="${index}"]`);
    let token = tokenElement ? JSON.parse(tokenElement.dataset.token) : {};
    console.log('Token element dataset:', tokenElement?.dataset);
    token.price = parseFloat(token.price) || 0;
    token.volume24h = parseFloat(token.volume24h) || 0;
    token.priceChange24h = parseFloat(token.priceChange24h) || 0;
    token.liquidity = token.liquidity || 'N/A';
    token.name = token.name || 'Unknown Token';
    token.address = token.address || 'Address not available';
    const breakdown = getStrategyBreakdown(token);
    const bestStrategy = breakdown.strategyCard.bestStrategy;
    const numBins = breakdown.strategyCard.numBins;

    console.log('Showing strategy details for token:', token);
    document.getElementById('strategyModal').innerHTML = `
        <div class="modal-content" style="background: #1A1A1A; color: #00B7EB; border: 2px solid #FF69B4; border-radius: 10px; padding: 20px; font-family: 'Orbitron', sans-serif; box-shadow: 0 0 10px #9400D3;">
            <span class="modal-close" onclick="document.getElementById('strategyModal').style.display='none'" style="color: #FF69B4; font-size: 24px; cursor: pointer; float: right;">&times;</span>
            <h3 id="modalTitle" style="color: #FF69B4; text-shadow: 0 0 5px #FF69B4;">Strategy Details for ${token.name}</h3>
            <p style="color: #A9A9A9;">${breakdown.marketNarrative}</p>
            <p style="color: #A9A9A9;">${breakdown.actionableGuide}</p>
            <h4 style="color: #00B7EB; text-shadow: 0 0 3px #00B7EB;">Asset Allocation</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem; background: #1A1A1A; color: #00B7EB;">
                <thead><tr><th style="padding: 10px; border: 1px solid #9400D3;">% of Position</th><th style="padding: 10px; border: 1px solid #9400D3;">Rationale</th></tr></thead>
                <tbody>
                    ${breakdown.assetAllocation.map(a => `<tr><td style="padding: 10px; border: 1px solid #9400D3;">${a.percent}% ${a.asset}</td><td style="padding: 10px; border: 1px solid #9400D3;">${a.rationale}</td></tr>`).join('')}
                </tbody>
            </table>
            <h4 style="color: #00B7EB; text-shadow: 0 0 3px #00B7EB;">Strategy Card</h4>
            <table style="width: 100%; border-collapse: collapse; background: #1A1A1A; color: #00B7EB;">
                <tbody>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Market Type:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.marketType}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Price Range Spread:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.priceRangeSpread}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Number of Bins:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.numBins}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Best Strategy:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.bestStrategy}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Strategy Focus:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.strategyFocus}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Expected Hold Time:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.holdTime}</td></tr>
                    <tr><td style="padding: 10px; border: 1px solid #9400D3;"><strong>Risk Level:</strong></td><td style="padding: 10px; border: 1px solid #9400D3;">${breakdown.strategyCard.riskLevel}</td></tr>
                </tbody>
            </table>
            <button onclick="window.location.href='https://www.meteora.ag/dlmm/${token.address}?bins=${numBins}&strategy=${bestStrategy}'" style="background: #9400D3; color: #00B7EB; border: 2px solid #FF69B4; padding: 10px 20px; font-family: 'Orbitron', sans-serif; text-shadow: 0 0 3px #FF69B4; transition: all 0.3s; cursor: pointer; margin-top: 10px;">View Price Chart</button>
        </div>
    `;
    document.getElementById('strategyModal').style.display = 'block';

    updateStrategyHighlight(index, strategy);
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const time = tab.dataset.time;
        document.getElementById('priceTime').textContent = time;
        document.getElementById('volTime').textContent = time;
        fetchPools();
    });
});

async function initFetch() {
    console.log('Initializing fetch...');
    for (let i = 0; i < 10; i++) {
        await fetchPools();
        if (!document.getElementById('poolTableBody').innerHTML.includes('Error loading data')) break;
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

initFetch();
setInterval(fetchPools, 20 * 60 * 1000);