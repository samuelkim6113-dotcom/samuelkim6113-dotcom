import json
import os
from datetime import datetime
from config import Config

def load_portfolio():
    """포트폴리오 로드"""
    if os.path.exists(Config.PORTFOLIO_FILE):
        with open(Config.PORTFOLIO_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        return {
            'user': 'Samuel',
            'created_date': datetime.now(Config.VIETNAM_TZ).isoformat(),
            'stocks': []
        }

def save_portfolio(portfolio):
    """포트폴리오 저장"""
    os.makedirs('data', exist_ok=True)
    with open(Config.PORTFOLIO_FILE, 'w', encoding='utf-8') as f:
        json.dump(portfolio, f, ensure_ascii=False, indent=2)

def add_stock(ticker, quantity=0, buy_price=0):
    """종목 추가"""
    portfolio = load_portfolio()
    
    if not any(s['ticker'] == ticker.upper() for s in portfolio['stocks']):
        portfolio['stocks'].append({
            'ticker': ticker.upper(),
            'added_date': datetime.now(Config.VIETNAM_TZ).isoformat(),
            'quantity': quantity,
            'buy_price': buy_price
        })
        save_portfolio(portfolio)
        return True
    return False

def remove_stock(ticker):
    """종목 제거"""
    portfolio = load_portfolio()
    portfolio['stocks'] = [s for s in portfolio['stocks'] if s['ticker'] != ticker.upper()]
    save_portfolio(portfolio)
