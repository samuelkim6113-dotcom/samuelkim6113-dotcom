from vnstock import Vnstock
import pandas as pd
from datetime import datetime, timedelta
from config import Config
import traceback

def get_stock_data(ticker):
    """
    vnstock을 통해 베트남 주식 데이터 조회
    """
    try:
        # vnstock 인스턴스 생성
        vn = Vnstock()
        stock = vn.stock(symbol=ticker, source='KBS')
        
        # 현재가 정보
        quote_data = stock.quote.get()
        
        # 최근 5일 데이터 (변동률 계산용)
        history = stock.quote.history(length='5', interval='d')
        
        if quote_data is None or quote_data.empty:
            return None
        
        current_price = float(quote_data.iloc[0]['c']) if 'c' in quote_data.columns else 0
        
        # 변동률 계산
        if len(history) > 1:
            prev_close = float(history.iloc[-1]['c'])
            change_percent = ((current_price - prev_close) / prev_close * 100)
        else:
            change_percent = 0
        
        return {
            'ticker': ticker,
            'price': round(current_price, 0),
            'change_percent': round(change_percent, 2),
            'volume': int(quote_data.iloc[0]['vo']) if 'vo' in quote_data.columns else 0,
            'timestamp': datetime.now(Config.VIETNAM_TZ).isoformat()
        }
    
    except Exception as e:
        print(f"❌ {ticker} 데이터 조회 오류: {e}")
        traceback.print_exc()
        return None

def get_stock_data_batch(tickers):
    """여러 종목 데이터 한번에 조회"""
    results = {}
    for ticker in tickers:
        data = get_stock_data(ticker)
        if data:
            results[ticker] = data
    return results

def get_stock_chart(ticker, days=30):
    """차트 데이터 (최근 N일)"""
    try:
        vn = Vnstock()
        stock = vn.stock(symbol=ticker, source='KBS')
        
        # 기간 계산
        end_date = datetime.now(Config.VIETNAM_TZ).date()
        start_date = end_date - timedelta(days=days)
        
        history = stock.quote.history(
            start=start_date.isoformat(),
            end=end_date.isoformat(),
            interval='d'
        )
        
        if history is None or history.empty:
            return None
        
        chart_data = {
            'dates': [str(d) for d in history.index],
            'closes': [float(v) for v in history['c']],
            'highs': [float(v) for v in history['h']],
            'lows': [float(v) for v in history['l']],
            'volumes': [int(v) for v in history['vo']]
        }
        
        return chart_data
    
    except Exception as e:
        print(f"❌ {ticker} 차트 조회 오류: {e}")
        return None
