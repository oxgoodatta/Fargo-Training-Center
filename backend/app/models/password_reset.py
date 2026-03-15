from datetime import datetime, timedelta
from app import db
import secrets

class PasswordResetToken(db.Model):
    """Model for storing password reset tokens"""
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    user_type = db.Column(db.String(20), nullable=False)  # 'staff' or 'student'
    user_id = db.Column(db.Integer, nullable=False)  # ID of the user
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    is_used = db.Column(db.Boolean, default=False)
    
    def __init__(self, email, user_id, user_type, expiry_hours=24):
        self.email = email
        self.user_id = user_id
        self.user_type = user_type
        self.token = secrets.token_urlsafe(32)  # Generate secure random token
        self.expires_at = datetime.utcnow() + timedelta(hours=expiry_hours)
    
    def is_valid(self):
        """Check if token is valid and not expired"""
        return (not self.is_used and 
                self.expires_at > datetime.utcnow() and 
                self.used_at is None)
    
    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'token': self.token,
            'user_type': self.user_type,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_used': self.is_used
        }