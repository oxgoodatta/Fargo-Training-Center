from datetime import datetime
from app import db
from flask_bcrypt import generate_password_hash, check_password_hash

class Staff(db.Model):
    """Staff/Employee model for accountability"""
    __tablename__ = 'staff'
    
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(20), unique=True, nullable=False)  # e.g., STAFF-001
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(15), unique=True, nullable=False)
    role = db.Column(db.String(50), nullable=False)  # e.g., 'admin', 'registrar', 'field_agent'
    branch = db.Column(db.String(50), nullable=False)  # Which branch they work at
    
    # Authentication fields
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships - UPDATED NAMES
    processed_registrations_list = db.relationship('Registration', backref='processed_by_staff_record', lazy=True, foreign_keys='Registration.processed_by_staff_id')
    fee_collections_list = db.relationship('FeePayment', backref='collected_by_staff_record', lazy=True)  # Will create later
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Staff {self.staff_id}: {self.first_name} {self.last_name}>'
    
    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')
    
    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password).decode('utf-8')
    
    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert staff object to dictionary"""
        return {
            'id': self.id,
            'staff_id': self.staff_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'branch': self.branch,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }