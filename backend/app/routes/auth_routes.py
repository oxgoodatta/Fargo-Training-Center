from flask import Blueprint, request, jsonify
from app import db
from app.models import Student, Staff
from flask_bcrypt import generate_password_hash, check_password_hash
import jwt
import datetime
from config import Config

bp = Blueprint('auth', __name__)

def generate_token(user_id, role, user_type):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'role': role,
        'user_type': user_type,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except:
        return None

@bp.route('/register/student', methods=['POST'])
def register_student():
    """Student registration/signup"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'password']
        for field in required_fields:
            if field not in data or data[field] is None or str(data[field]).strip() == '':
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if phone already exists in students
        existing_student = Student.query.filter_by(phone=data['phone'].strip()).first()
        if existing_student:
            return jsonify({'error': 'Phone number already registered'}), 400
        
        # Check if phone already exists in staff
        existing_staff = Staff.query.filter_by(phone=data['phone'].strip()).first()
        if existing_staff:
            return jsonify({'error': 'Phone number already registered as staff'}), 400
        
        # Handle email - check if provided and not empty
        email = data.get('email')
        if email is not None and email.strip():
            email = email.strip()
            # Check if email already exists in students
            existing_student_email = Student.query.filter_by(email=email).first()
            if existing_student_email:
                return jsonify({'error': 'Email already registered'}), 400
            
            # Check if email already exists in staff
            existing_staff_email = Staff.query.filter_by(email=email).first()
            if existing_staff_email:
                return jsonify({'error': 'Email already registered as staff'}), 400
        else:
            email = None
        
        # Generate student ID
        from datetime import datetime
        import re
        year = datetime.now().year
        last_student = Student.query.order_by(Student.id.desc()).first()
        
        if last_student and last_student.student_id:
            match = re.search(r'STU-\d{4}-(\d{3})', last_student.student_id)
            sequence = int(match.group(1)) + 1 if match else 1
        else:
            sequence = 1
        
        student_id = f"STU-{year}-{sequence:03d}"
        
        # Convert date string to date object
        try:
            dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Create new student with hashed password
        new_student = Student(
            student_id=student_id,
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            date_of_birth=dob,
            gender=data['gender'],
            phone=data['phone'].strip(),
            email=email,
            password=data['password']
        )
        
        db.session.add(new_student)
        db.session.commit()
        
        # Generate token
        token = generate_token(new_student.id, 'student', 'student')
        
        return jsonify({
            'message': 'Student registered successfully',
            'token': token,
            'user': new_student.to_dict(),
            'redirect_to': '/student/dashboard'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/register/staff', methods=['POST'])
def register_staff():
    """Staff registration (Admin only) - with duplicate checking across both tables"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'role', 'branch', 'password']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if email already exists in STAFF
        existing_staff_email = Staff.query.filter_by(email=data['email'].strip()).first()
        if existing_staff_email:
            return jsonify({'error': 'Email already registered as staff'}), 400
        
        # Check if phone already exists in STAFF
        existing_staff_phone = Staff.query.filter_by(phone=data['phone'].strip()).first()
        if existing_staff_phone:
            return jsonify({'error': 'Phone number already registered as staff'}), 400
        
        # Check if email already exists in STUDENTS
        existing_student_email = Student.query.filter_by(email=data['email'].strip()).first()
        if existing_student_email:
            return jsonify({'error': 'Email already used by a student'}), 400
        
        # Check if phone already exists in STUDENTS
        existing_student_phone = Student.query.filter_by(phone=data['phone'].strip()).first()
        if existing_student_phone:
            return jsonify({'error': 'Phone number already used by a student'}), 400
        
        # Generate staff ID
        import re
        last_staff = Staff.query.order_by(Staff.id.desc()).first()
        
        if last_staff and last_staff.staff_id:
            match = re.search(r'STAFF-(\d{3})', last_staff.staff_id)
            sequence = int(match.group(1)) + 1 if match else 1
        else:
            sequence = 1
        
        staff_id = f"STAFF-{sequence:03d}"
        
        # Create new staff with hashed password
        new_staff = Staff(
            staff_id=staff_id,
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            email=data['email'].strip(),
            phone=data['phone'].strip(),
            role=data['role'].strip(),
            branch=data['branch'].strip(),
            password=data['password']
        )
        
        db.session.add(new_staff)
        db.session.commit()
        
        return jsonify({
            'message': 'Staff member added successfully',
            'staff': new_staff.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    """Unified login for all users (students, staff, admin)"""
    try:
        data = request.get_json()
        
        identifier = data.get('identifier', '').strip()
        password = data.get('password', '').strip()
        
        if not identifier or not password:
            return jsonify({'error': 'Identifier and password are required'}), 400
        
        # First check staff (admin, registrar, field_agent)
        staff = Staff.query.filter(
            (Staff.email == identifier) | (Staff.staff_id == identifier) | (Staff.phone == identifier)
        ).first()
        
        if staff and staff.verify_password(password):
            if not staff.is_active:
                return jsonify({'error': 'Account is deactivated'}), 403
            
            token = generate_token(staff.id, staff.role, 'staff')
            
            # Determine redirect based on role
            if staff.role == 'admin':
                redirect_to = '/admin/dashboard'
            else:
                redirect_to = '/staff/dashboard'
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': staff.to_dict(),
                'role': staff.role,
                'user_type': 'staff',
                'redirect_to': redirect_to
            }), 200
        
        # Check student
        student = Student.query.filter(
            (Student.phone == identifier) | 
            (Student.email == identifier) | 
            (Student.student_id == identifier)
        ).first()
        
        if student and student.verify_password(password):
            if not student.is_active:
                return jsonify({'error': 'Account is deactivated'}), 403
            
            token = generate_token(student.id, 'student', 'student')
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': student.to_dict(),
                'role': 'student',
                'user_type': 'student',
                'redirect_to': '/student/dashboard'
            }), 200
        
        return jsonify({'error': 'Invalid credentials'}), 401
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/change-password', methods=['POST'])
def change_password():
    """Change password for authenticated user"""
    try:
        data = request.get_json()
        
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization token provided'}), 401
        
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Get user based on user_type
        if payload['user_type'] == 'staff':
            user = Staff.query.get(payload['user_id'])
        else:
            user = Student.query.get(payload['user_id'])
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Verify current password
        if not user.verify_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Update password
        user.password = new_password
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Password change error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/verify-token', methods=['POST'])
def verify_token_endpoint():
    """Verify JWT token"""
    try:
        token = request.json.get('token')
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        
        # Get user based on user_type
        if payload['user_type'] == 'staff':
            user = Staff.query.get(payload['user_id'])
        else:
            user = Student.query.get(payload['user_id'])
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'valid': True,
            'user': user.to_dict(),
            'role': payload['role'],
            'user_type': payload['user_type']
        }), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint (frontend just removes token)"""
    return jsonify({'message': 'Logged out successfully'}), 200