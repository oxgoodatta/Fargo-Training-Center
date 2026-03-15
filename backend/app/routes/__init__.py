# Import and expose route blueprints
from .student_routes import bp as student_bp
from .registration_routes import bp as registration_bp
from .staff_routes import bp as staff_bp
from .auth_routes import bp as auth_bp
from .course_routes import bp as course_bp
from .payment_routes import bp as payment_bp
from .notification_routes import bp as notification_bp  # ADD THIS LINE

__all__ = [
    'student_bp', 
    'registration_bp', 
    'staff_bp', 
    'auth_bp',
    'course_bp',
    'payment_bp',
    'notification_bp'  # ADD THIS LINE
]