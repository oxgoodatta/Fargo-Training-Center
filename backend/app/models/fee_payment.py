from datetime import datetime
from app import db

class FeePayment(db.Model):
    """Fee payment tracking model"""
    __tablename__ = 'fee_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_reference = db.Column(db.String(50), unique=True, nullable=False)  # PAY-2024-001
    registration_id = db.Column(db.Integer, db.ForeignKey('registrations.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    
    # Payment details
    amount = db.Column(db.Float, nullable=False)
    payment_type = db.Column(db.String(20), nullable=False)  # 'registration', 'tuition', 'other'
    payment_method = db.Column(db.String(20), nullable=False)  # 'cash', 'mobile_money', 'bank_transfer'
    
    # Mobile Money details (if applicable)
    momo_transaction_id = db.Column(db.String(50), unique=True)
    momo_phone_number = db.Column(db.String(15))
    momo_provider = db.Column(db.String(20))  # MTN, Airtel, Vodafone, etc.
    
    # NEW: Transaction ID fields (for MoMo payments)
    transaction_id = db.Column(db.String(100), nullable=True)  # Store the transaction ID entered by user
    confirm_transaction_id = db.Column(db.String(100), nullable=True)  # Store confirmation transaction ID
    
    # Payment location (important requirement)
    payment_location = db.Column(db.String(20), nullable=False)  # 'office' or 'field'
    
    # Staff accountability (important requirement)
    collected_by_staff_id = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=True)
    
    # Payment status
    status = db.Column(db.String(20), default='completed')  # 'pending', 'completed', 'failed', 'refunded'
    
    # Date
    payment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    registration = db.relationship('Registration', backref='payments', lazy=True)
    student = db.relationship('Student', backref='payments', lazy=True)
    collected_by = db.relationship('Staff', backref='payments_collected', lazy=True)
    
    def __repr__(self):
        return f'<FeePayment {self.payment_reference}: ${self.amount}>'
    
    def to_dict(self):
        """Convert payment object to dictionary"""
        return {
            'id': self.id,
            'payment_reference': self.payment_reference,
            'registration_id': self.registration_id,
            'registration_number': self.registration.registration_number if self.registration else None,
            'student_id': self.student_id,
            'student_name': f"{self.student.first_name} {self.student.last_name}" if self.student else None,
            'amount': self.amount,
            'payment_type': self.payment_type,
            'payment_method': self.payment_method,
            'momo_transaction_id': self.momo_transaction_id,
            'momo_phone_number': self.momo_phone_number,
            'momo_provider': self.momo_provider,
            # NEW: Add transaction_id and confirm_transaction_id to the dictionary
            'transaction_id': self.transaction_id,
            'confirm_transaction_id': self.confirm_transaction_id,
            'payment_location': self.payment_location,
            'collected_by_staff_id': self.collected_by_staff_id,
            'collected_by_staff_name': f"{self.collected_by.first_name} {self.collected_by.last_name}" if self.collected_by else None,
            'status': self.status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }