import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

def get_database_uri():
    """Always return absolute path for SQLite to avoid OneDrive issues"""
    db_url = os.environ.get('DATABASE_URL')
    
    if db_url and db_url.startswith('sqlite:///'):
        # Convert relative path to absolute
        rel_path = db_url.replace('sqlite:///', '')
        abs_path = os.path.join(basedir, rel_path)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        
        # Return absolute path
        return f'sqlite:///{abs_path}'.replace('\\', '/')
    
    # Default to absolute path
    return f'sqlite:///{os.path.join(basedir, "instance", "school_system.db")}'.replace('\\', '/')



class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Use instance folder - app will create it if needed
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'sqlite:///{os.path.join(basedir, "instance", "school_system.db")}'.replace('\\', '/')
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # CORS settings for React frontend
    CORS_HEADERS = 'Content-Type'
    
    # JWT settings (for future authentication)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # Application settings
    APP_NAME = "Student Registration System"
    VERSION = "1.0.0"
    
    # File upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.path.join(basedir, "instance", "uploads")
    
    # SMS/Notification settings (will be configured later)
    SMS_API_KEY = os.environ.get('SMS_API_KEY', '')
    SMS_SENDER_ID = os.environ.get('SMS_SENDER_ID', 'SCHOOL')
    
    # Mobile Money settings (will be configured later)
    MOMO_API_KEY = os.environ.get('MOMO_API_KEY', '')
    MOMO_API_SECRET = os.environ.get('MOMO_API_SECRET', '')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True  # Log SQL queries

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    # PostgreSQL in production
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    
    if not SQLALCHEMY_DATABASE_URI:
        # Check if we're in production mode
        if os.environ.get('FLASK_ENV') == 'production':
            raise ValueError("DATABASE_URL environment variable is required for production")
        else:
            # Fallback to SQLite for development
            SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "instance", "school_system.db")}'.replace('\\', '/')

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}