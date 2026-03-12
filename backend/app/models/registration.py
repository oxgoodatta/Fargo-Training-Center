from datetime import datetime
from app import db

class Registration(db.Model):
    """Student course registration model"""
    __tablename__ = 'registrations'
    
    id = db.Column(db.Integer, primary_key=True)
    registration_number = db.Column(db.String(30), unique=True, nullable=False)
    
    # Foreign Keys
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=True)
    
    # Course details
    course_name = db.Column(db.String(100), nullable=False)
    course_duration = db.Column(db.String(50))
    course_fee = db.Column(db.Float, nullable=False, default=0.0)
    
    # Branch information
    branch = db.Column(db.String(50), nullable=False)
    
    # Payment information
    registration_fee = db.Column(db.Float, default=0.0)
    tuition_fee_paid = db.Column(db.Float, default=0.0)
    total_fee = db.Column(db.Float, nullable=False, default=0.0)
    outstanding_balance = db.Column(db.Float, default=0.0)
    
    # Payment location
    payment_location = db.Column(db.String(20), nullable=False, default='online')
    
    # Registration status
    status = db.Column(db.String(20), default='active')
    
    # Registration date (important requirement)
    registration_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    # Staff who processed (for accountability)
    processed_by_staff_id = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=True)
    
    # Student signature (NEW FIELD)
    signature = db.Column(db.Text, nullable=True)  # Store as base64 string
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = db.relationship('Course', backref='course_registrations', lazy=True)
    processed_by_staff = db.relationship('Staff', backref='staff_registrations', lazy=True)
    
    def __repr__(self):
        return f'<Registration {self.registration_number}>'
    
    def to_dict(self):
        """Convert registration object to dictionary"""
        # Access student through the backref from Student model
        student = self.student  # This comes from Student.registrations backref
        return {
            'id': self.id,
            'registration_number': self.registration_number,
            'student_id': self.student_id,
            'student_name': f"{student.first_name} {student.last_name}" if student else None,
            'course_id': self.course_id,
            'course_name': self.course_name,
            'course_duration': self.course_duration,
            'course_fee': self.course_fee,
            'branch': self.branch,
            'registration_fee': self.registration_fee,
            'tuition_fee_paid': self.tuition_fee_paid,
            'total_fee': self.total_fee,
            'outstanding_balance': self.outstanding_balance,
            'payment_location': self.payment_location,
            'status': self.status,
            'registration_date': self.registration_date.isoformat() if self.registration_date else None,
            'processed_by_staff_id': self.processed_by_staff_id,
            'signature': self.signature,  # ADD THIS
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def calculate_balance(self):
        """Calculate outstanding balance"""
        self.outstanding_balance = self.total_fee - (self.registration_fee + self.tuition_fee_paid)
        return self.outstanding_balance