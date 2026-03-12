# Import all models here for easy access
from .student import Student
from .registration import Registration
from .staff import Staff
from .fee_payment import FeePayment
from .course import Course

__all__ = ['Student', 'Registration', 'Staff', 'FeePayment', 'Course']