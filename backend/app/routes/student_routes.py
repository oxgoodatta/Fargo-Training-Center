from flask import Blueprint, request, jsonify
from app import db
from app.models import Student, Registration, Staff
from datetime import datetime
import re
import time  # Add this for timestamp fallback

bp = Blueprint('students', __name__)

def generate_student_id():
    """Generate unique student ID: STU-YYYY-XXXXXX (unlimited)"""
    year = datetime.now().year
    
    # Try up to 10 times to generate a unique reference
    for attempt in range(10):
        # Get the latest student overall (not just for this year)
        last_student = Student.query.order_by(Student.id.desc()).first()
        
        if last_student and last_student.student_id:
            # Try to extract number from any format
            match = re.search(r'(\d+)$', last_student.student_id)
            if match:
                # Get the last number and increment
                last_number = int(match.group(1))
                sequence = last_number + 1
            else:
                # Fallback to ID if pattern not found
                sequence = last_student.id + 1
        else:
            # First student ever
            sequence = 1
        
        # Format with 6 digits (000001 to 999999 - practically unlimited)
        student_id = f"STU-{year}-{sequence:06d}"
        
        # Check if this ID already exists (extra safety)
        existing = Student.query.filter_by(student_id=student_id).first()
        if not existing:
            return student_id
    
    # If all attempts fail, use timestamp as fallback
    timestamp = int(time.time())
    return f"STU-{year}-{timestamp}"

@bp.route('/', methods=['POST'])
def create_student():
    """Register a new student"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if phone already exists in STUDENTS
        existing_student = Student.query.filter_by(phone=data['phone']).first()
        if existing_student:
            return jsonify({'error': 'Phone number already registered as a student'}), 400
        
        # Check if phone already exists in STAFF (including admins)
        existing_staff = Staff.query.filter_by(phone=data['phone']).first()
        if existing_staff:
            return jsonify({'error': 'Phone number already registered as staff'}), 400
        
        # Check if email already exists in STUDENTS (if provided)
        if 'email' in data and data['email']:
            existing_student_email = Student.query.filter_by(email=data['email']).first()
            if existing_student_email:
                return jsonify({'error': 'Email already registered as a student'}), 400
            
            # Check if email already exists in STAFF
            existing_staff_email = Staff.query.filter_by(email=data['email']).first()
            if existing_staff_email:
                return jsonify({'error': 'Email already registered as staff'}), 400
        
        # Generate student ID (now unlimited)
        student_id = generate_student_id()
        
        # Convert date string to date object
        try:
            dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Get password from request or use default
        password = data.get('password', 'password123')
        
        # Create new student
        new_student = Student(
            student_id=student_id,
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            date_of_birth=dob,
            gender=data['gender'],
            phone=data['phone'].strip(),
            email=data.get('email', '').strip() or None,
            password=password  # This will be hashed by the password setter
        )
        
        db.session.add(new_student)
        db.session.commit()
        
        return jsonify({
            'message': 'Student registered successfully',
            'student': new_student.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating student: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['GET'])
@bp.route('', methods=['GET'])
def get_students():
    """Get all students with optional filtering"""
    try:
        # Get query parameters for filtering
        search = request.args.get('search', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Base query
        query = Student.query
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Student.first_name.ilike(search_term)) |
                (Student.last_name.ilike(search_term)) |
                (Student.student_id.ilike(search_term)) |
                (Student.phone.ilike(search_term)) |
                (Student.email.ilike(search_term))
            )
        
        # Order by latest first
        query = query.order_by(Student.created_at.desc())
        
        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Get students with their registrations
        students = []
        for student in pagination.items:
            student_dict = student.to_dict()
            # Get registrations for this student
            registrations = Registration.query.filter_by(student_id=student.id).all()
            student_dict['registrations'] = [reg.to_dict() for reg in registrations]
            students.append(student_dict)
        
        return jsonify({
            'students': students,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        print(f"Error in get_students: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/count', methods=['GET'])
def get_student_count():
    """Get total number of students"""
    try:
        count = Student.query.count()
        return jsonify({'count': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:student_id>', methods=['GET'])
def get_student(student_id):
    """Get student by ID with their registrations"""
    try:
        student = Student.query.get_or_404(student_id)
        
        # Get student's registrations
        registrations = Registration.query.filter_by(student_id=student.id).all()
        
        student_data = student.to_dict()
        student_data['registrations'] = [reg.to_dict() for reg in registrations]
        
        return jsonify({'student': student_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@bp.route('/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    """Update student information"""
    try:
        student = Student.query.get_or_404(student_id)
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'email']
        
        for field in updatable_fields:
            if field in data:
                if field == 'date_of_birth' and data[field]:
                    try:
                        setattr(student, field, datetime.strptime(data[field], '%Y-%m-%d').date())
                    except ValueError:
                        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
                else:
                    setattr(student, field, data[field])
        
        # Phone update requires uniqueness check across ALL users
        if 'phone' in data and data['phone'] != student.phone:
            # Check students
            existing_student = Student.query.filter_by(phone=data['phone']).first()
            if existing_student and existing_student.id != student.id:
                return jsonify({'error': 'Phone number already registered by another student'}), 400
            
            # Check staff
            existing_staff = Staff.query.filter_by(phone=data['phone']).first()
            if existing_staff:
                return jsonify({'error': 'Phone number already registered as staff'}), 400
            
            student.phone = data['phone']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Student updated successfully',
            'student': student.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    """Delete student"""
    try:
        student = Student.query.get_or_404(student_id)
        
        # Check if student has active registrations
        active_registrations = Registration.query.filter_by(
            student_id=student.id, 
            status='active'
        ).first()
        
        if active_registrations:
            return jsonify({
                'error': 'Cannot delete student with active registrations'
            }), 400
        
        db.session.delete(student)
        db.session.commit()
        
        return jsonify({
            'message': 'Student deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/by-phone/<phone>', methods=['GET'])
def get_student_by_phone(phone):
    """Get student by phone number (useful for quick lookup)"""
    try:
        student = Student.query.filter_by(phone=phone).first()
        
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        return jsonify({'student': student.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ CROSS-USER CHECK ENDPOINTS ============

@bp.route('/check-phone/<phone>', methods=['GET'])
def check_phone(phone):
    """Check if phone number already exists in ANY user type"""
    try:
        # Check in students
        student = Student.query.filter_by(phone=phone).first()
        if student:
            return jsonify({
                'exists': True,
                'user_type': 'student',
                'message': 'Phone number already registered as a student'
            }), 200
        
        # Check in staff (includes admins)
        staff = Staff.query.filter_by(phone=phone).first()
        if staff:
            user_type = 'admin' if staff.role == 'admin' else 'staff'
            return jsonify({
                'exists': True,
                'user_type': user_type,
                'message': f'Phone number already registered as {staff.role}'
            }), 200
        
        return jsonify({
            'exists': False,
            'message': 'Phone number available'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/check-email/<email>', methods=['GET'])
def check_email(email):
    """Check if email already exists in ANY user type"""
    try:
        # Check in students
        student = Student.query.filter_by(email=email).first()
        if student:
            return jsonify({
                'exists': True,
                'user_type': 'student',
                'message': 'Email already registered as a student'
            }), 200
        
        # Check in staff (includes admins)
        staff = Staff.query.filter_by(email=email).first()
        if staff:
            user_type = 'admin' if staff.role == 'admin' else 'staff'
            return jsonify({
                'exists': True,
                'user_type': user_type,
                'message': f'Email already registered as {staff.role}'
            }), 200
        
        return jsonify({
            'exists': False,
            'message': 'Email available'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500