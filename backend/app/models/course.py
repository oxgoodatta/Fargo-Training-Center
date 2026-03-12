from datetime import datetime
from app import db

class Course(db.Model):
    """Course model managed by admin"""
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(20), unique=True, nullable=False)  # e.g., FORK-001
    name = db.Column(db.String(100), unique=True, nullable=False)  # e.g., "Forklift Training"
    description = db.Column(db.Text)
    duration = db.Column(db.String(50))  # e.g., "3 months", "6 weeks"
    registration_fee = db.Column(db.Float, nullable=False, default=0.0)
    tuition_fee = db.Column(db.Float, nullable=False, default=0.0)
    total_fee = db.Column(db.Float, nullable=False)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __init__(self, **kwargs):
        super(Course, self).__init__(**kwargs)
        self.total_fee = self.registration_fee + self.tuition_fee
    
    def __repr__(self):
        return f'<Course {self.course_code}: {self.name}>'
    
    def to_dict(self):
        """Convert course object to dictionary"""
        return {
            'id': self.id,
            'course_code': self.course_code,
            'name': self.name,
            'description': self.description,
            'duration': self.duration,
            'registration_fee': self.registration_fee,
            'tuition_fee': self.tuition_fee,
            'total_fee': self.total_fee,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }