import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from config import Config
import feedparser
import traceback

def get_stock_news(ticker, days=7):
    """
    베트남 주식 뉴스 수집 (최근 N일)
    """
    news_list = []
    
    # Google News RSS
    try:
        url = f"https://news.google.com/rss/search?q={ticker}+베트남&hl=ko&gl=KR&ceid=KR:ko"
        feed = feedparser.parse(url)
        
        cutoff_date = datetime.now(Config.VIETNAM_TZ) - timedelta(days=days)
        
        for entry in feed.entries[:10]:
            try:
                pub_date = datetime(*entry.published_parsed[:6]).replace(tzinfo=Config.VIETNAM_TZ)
                
                if pub_date < cutoff_date:
                    continue
                
                news_list.append({
                    'title': entry.get('title', ''),
                    'link': entry.get('link', ''),
                    'published': pub_date.strftime('%Y-%m-%d %H:%M'),
                    'source': 'Google News'
                })
            except:
                continue
    
    except Exception as e:
        print(f"⚠️ Google News 조회 실패: {e}")
    
    # VNexpress 크롤링
    try:
        search_url = f"https://vnexpress.net/tim-kiem?q={ticker}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(search_url, headers=headers, timeout=5)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles = soup.find_all('a', class_='thumb-link')[:5]
        
        for article in articles:
            try:
                title = article.get('title', '')
                link = article.get('href', '')
                
                if title and link:
                    if not link.startswith('http'):
                        link = 'https://vnexpress.net' + link
                    
                    news_list.append({
                        'title': title,
                        'link': link,
                        'published': datetime.now(Config.VIETNAM_TZ).strftime('%Y-%m-%d'),
                        'source': 'VNexpress'
                    })
            except:
                continue
    
    except Exception as e:
        print(f"⚠️ VNexpress 크롤링 실패: {e}")
    
    # 중복 제거
    seen = set()
    unique_news = []
    for item in news_list:
        key = item['title']
        if key not in seen:
            seen.add(key)
            unique_news.append(item)
    
    return unique_news[:5]

def get_news_batch(tickers):
    """여러 종목의 뉴스를 한번에 조회"""
    results = {}
    for ticker in tickers:
        print(f"  📰 {ticker} 뉴스 수집 중...")
        news = get_stock_news(ticker, days=Config.NEWS_DAYS)
        results[ticker] = news
    return results
