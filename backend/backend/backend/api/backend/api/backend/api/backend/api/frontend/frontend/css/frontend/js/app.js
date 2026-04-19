const API_BASE = '/api';
let chartInstance = null;

window.addEventListener('load', () => {
    console.log('Dashboard loaded');
    refreshDashboard();
    setInterval(refreshDashboard, 5 * 60 * 1000);
});

async function refreshDashboard() {
    const btn = document.querySelector('.btn-refresh');
    btn.disabled = true;
    btn.style.animation = 'spin 1s linear infinite';

    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        const data = await response.json();

        const updateTime = new Date(data.timestamp).toLocaleString('ko-KR');
        document.getElementById('last-update').textContent = `마지막 업데이트: ${updateTime}`;

        const portfolio = data.portfolio || {};
        const stocks = Object.values(data.stocks || {});
        document.getElementById('stock-count').textContent = stocks.length;

        let totalValue = 0;
        stocks.forEach(stock => {
            const quantity = portfolio.stocks?.find(s => s.ticker === stock.ticker)?.quantity || 0;
            totalValue += (stock.price || 0) * quantity;
        });
        document.getElementById('total-value').textContent = formatNumber(totalValue) + ' VND';

        renderStocks(data);

    } catch (error) {
        console.error('Error:', error);
        showError('대시보드 로드 실패');
    } finally {
        btn.disabled = false;
        btn.style.animation = 'none';
    }
}

function renderStocks(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    const portfolio = data.portfolio || {};
    const stocks = data.stocks || {};

    portfolio.stocks?.forEach(stock => {
        const ticker = stock.ticker;
        const stockData = stocks[ticker];

        if (!stockData) return;

        const card = createStockCard(stock, stockData);
        dashboard.appendChild(card);
    });
}

function createStockCard(portfolio_stock, stock_data) {
    const card = document.createElement('div');
    card.className = 'stock-card';

    const changeClass = stock_data.change_percent >= 0 ? 'change-positive' : 'change-negative';
    const changeSymbol = stock_data.change_percent >= 0 ? '▲' : '▼';
    const currentValue = (stock_data.price || 0) * (portfolio_stock.quantity || 0);
    const profit = currentValue - (portfolio_stock.buy_price * portfolio_stock.quantity || 0);
    const profitPercent = portfolio_stock.quantity && portfolio_stock.buy_price
        ? ((profit / (portfolio_stock.buy_price * portfolio_stock.quantity)) * 100).toFixed(2)
        : 0;

    card.innerHTML = `
        <div class="stock-card-header">
            <div>
                <div class="stock-ticker">${portfolio_stock.ticker}</div>
            </div>
            <div class="change-badge ${changeClass}">
                ${changeSymbol} ${Math.abs(stock_data.change_percent || 0).toFixed(2)}%
            </div>
        </div>

        <div class="stock-price">
            ${formatNumber(stock_data.price || 0)}<span class="stock-price-unit"> VND</span>
        </div>

        <div class="stock-stats">
            <div class="stat-item">
                <div class="stat-label">보유 수량</div>
                <div class="stat-value">${portfolio_stock.quantity || 0}주</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">평가액</div>
                <div class="stat-value">${formatNumber(currentValue)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">매수가</div>
                <div class="stat-value">${formatNumber(portfolio_stock.buy_price || 0)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">손익</div>
                <div class="stat-value" style="color: ${profit >= 0 ? '#10b981' : '#ef4444'}">
                    ${formatNumber(profit)} (${profitPercent}%)
                </div>
            </div>
        </div>

        <div class="card-footer">
            <button class="btn-detail" onclick="showDetail('${portfolio_stock.ticker}')">상세보기</button>
            <button class="btn-remove" onclick="removeStock('${portfolio_stock.ticker}')">제거</button>
        </div>
    `;

    return card;
}

async function showDetail(ticker) {
    try {
        const response = await fetch(`${API_BASE}/stock/${ticker}`);
        const data = await response.json();

        const modal = document.getElementById('detail-modal');
        modal.style.display = 'flex';
        document.getElementById('modal-ticker').textContent = ticker;

        if (data.chart) {
            drawChart(data.chart);
        }

        const newsList = document.getElementById('news-list');
        newsList.innerHTML = '';

        if (data.news && data.news.length > 0) {
            data.news.forEach(article => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';
                newsItem.innerHTML = `
                    <div class="news-item-title">${article.title}</div>
                    <div class="news-item-meta">
                        <span>${article.published}</span>
                        <a href="${article.link}" target="_blank" class="news-item-link">원문 보기 →</a>
                    </div>
                `;
                newsList.appendChild(newsItem);
            });
        } else {
            newsList.innerHTML = '<div class="error-message">관련 뉴스가 없습니다.</div>';
        }

    } catch (error) {
        console.error('Error:', error);
        showError('상세 정보 로드 실패');
    }
}

function drawChart(chartData) {
    const ctx = document.getElementById('detail-chart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.dates,
            datasets: [
                {
                    label: '종가',
                    data: chartData.closes,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9', font: { size: 12 } }
                }
            },
            scales: {
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function closeModal() {
    document.getElementById('detail-modal').style.display = 'none';
}

async function addStock() {
    const ticker = document.getElementById('ticker-input').value.toUpperCase();
    const quantity = parseFloat(document.getElementById('quantity-input').value) || 0;
    const buyPrice = parseFloat(document.getElementById('buy-price-input').value) || 0;

    if (!ticker) {
        showError('종목 코드를 입력하세요');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/portfolio/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, quantity, buy_price: buyPrice })
        });

        if (response.ok) {
            document.getElementById('ticker-input').value = '';
            document.getElementById('quantity-input').value = '';
            document.getElementById('buy-price-input').value = '';
            refreshDashboard();
        } else {
            const error = await response.json();
            showError(error.message || '추가 실패');
        }
    } catch (error) {
        showError('오류: ' + error.message);
    }
}

async function removeStock(ticker) {
    if (!confirm(`${ticker}을(를) 제거하시겠습니까?`)) return;

    try {
        const response = await fetch(`${API_BASE}/portfolio/remove/${ticker}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            refreshDashboard();
        } else {
            showError('제거 실패');
        }
    } catch (error) {
        showError('오류: ' + error.message);
    }
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.round(num).toString();
}

function showError(message) {
    alert(message);
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('detail-modal');
    if (e.target === modal) {
        closeModal();
    }
});
