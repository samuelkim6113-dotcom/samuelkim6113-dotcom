import os
from dotenv import load_dotenv
import pytz

load_dotenv()

class Config:
    DEBUG = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'samuel-stock-dashboard-secret-key')
    VIETNAM_TZ = pytz.timezone('Asia/Ho_Chi_Minh')
    SCHEDULE_HOUR = 8
    SCHEDULE_MINUTE = 0
    PORTFOLIO_FILE = 'data/user_portfolio.json'
    CACHE_FILE = 'data/cached_data.json'
    NEWS_DAYS = 7
