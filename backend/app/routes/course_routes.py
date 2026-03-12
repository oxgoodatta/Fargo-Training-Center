from flask import Blueprint, request, jsonify
from app import db
from app.models import Course, Registration
import re

bp = Blueprint('courses', __name__)

def generate_course_code(name):
    """Generate course code from name"""
    # Take first 4 letters of first word or use acronym
    words = name.split()
    if len(words) == 1:
        code = words[0][:4].upper()
    else:
        code = ''.join(word[0] for word in words[:3]).upper()
    
    # Add sequence number
    last_course = Course.query.order_by(Course.id.desc()).first()
    if last_course and last_course.course_code:
        match = re.search(r'(\D+)-(\d{3})', last_course.course_code)
        if match:
            prefix = match.group(1)
            sequence = int(match.group(2)) + 1
            return f"{prefix}-{sequence:03d}"
    
    return f"{code}-001"

@bp.route('/', methods=['POST'])
def create_course():
    """Create a new course (Admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'registration_fee', 'tuition_fee']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if course name already exists
        existing_course = Course.query.filter_by(name=data['name']).first()
        if existing_course:
            return jsonify({'error': 'Course name already exists'}), 400
        
        # Generate course code
        course_code = generate_course_code(data['name'])
        
        # Create new course
        new_course = Course(
            course_code=course_code,
            name=data['name'].strip(),
            description=data.get('description', '').strip(),
            duration=data.get('duration', '').strip(),
            registration_fee=float(data['registration_fee']),
            tuition_fee=float(data['tuition_fee'])
        )
        
        db.session.add(new_course)
        db.session.commit()
        
        return jsonify({
            'message': 'Course created successfully',
            'course': new_course.to_dict()
        }), 201
        
    except ValueError:
        db.session.rollback()
        return jsonify({'error': 'Invalid fee values'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['GET'])
def get_courses():
    """Get all courses (for students and admin)"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Base query
        query = Course.query
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        # Order by name
        query = query.order_by(Course.name)
        
        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Get courses with registration counts
        courses = []
        for course in pagination.items:
            course_dict = course.to_dict()
            # Count active registrations for this course
            active_registrations = Registration.query.filter_by(
                course_id=course.id, 
                status='active'
            ).count()
            course_dict['active_registrations'] = active_registrations
            courses.append(course_dict)
        
        return jsonify({
            'courses': courses,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/count', methods=['GET'])
def get_course_count():
    """Get total number of courses"""
    try:
        count = Course.query.count()
        return jsonify({'count': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/available/<int:student_id>', methods=['GET'])
def get_available_courses(student_id):
    """Get all courses that a student hasn't registered for yet"""
    try:
        # Get all active courses
        all_courses = Course.query.filter_by(is_active=True).all()
        print(f"All active courses: {[{'id': c.id, 'name': c.name} for c in all_courses]}")
        
        # Get ALL courses the student is registered for (regardless of status)
        registered_courses = db.session.query(Registration.course_id).filter(
            Registration.student_id == student_id
        ).all()
        
        # Extract registered course IDs (filter out None values)
        registered_ids = [r[0] for r in registered_courses if r[0] is not None]
        print(f"Student {student_id} registered for course IDs: {registered_ids}")
        
        # Filter out registered courses
        available_courses = []
        for course in all_courses:
            if course.id not in registered_ids:
                available_courses.append(course)
                print(f"Course {course.id} - {course.name}: AVAILABLE")
            else:
                print(f"Course {course.id} - {course.name}: REGISTERED - EXCLUDED")
        
        print(f"Available courses count: {len(available_courses)}")
        
        return jsonify({
            'available_courses': [course.to_dict() for course in available_courses],
            'total': len(available_courses),
            'registered_ids': registered_ids
        }), 200
        
    except Exception as e:
        print(f"Error in get_available_courses: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:course_id>', methods=['GET'])
def get_course(course_id):
    """Get specific course by ID"""
    try:
        course = Course.query.get_or_404(course_id)
        return jsonify({'course': course.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@bp.route('/<int:course_id>', methods=['PUT'])
def update_course(course_id):
    """Update course details (Admin only)"""
    try:
        course = Course.query.get_or_404(course_id)
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['name', 'description', 'duration', 'registration_fee', 'tuition_fee', 'is_active']
        
        for field in updatable_fields:
            if field in data:
                if field in ['registration_fee', 'tuition_fee']:
                    try:
                        setattr(course, field, float(data[field]))
                    except ValueError:
                        return jsonify({'error': f'Invalid value for {field}'}), 400
                else:
                    setattr(course, field, data[field])
        
        # Recalculate total fee
        course.total_fee = course.registration_fee + course.tuition_fee
        
        db.session.commit()
        
        return jsonify({
            'message': 'Course updated successfully',
            'course': course.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:course_id>', methods=['DELETE'])
def delete_course(course_id):
    """Delete course (Admin only - soft delete)"""
    try:
        course = Course.query.get_or_404(course_id)
        
        # Check if course has active registrations by querying Registration table directly
        active_registration = Registration.query.filter_by(
            course_id=course.id, 
            status='active'
        ).first()
        
        if active_registration:
            return jsonify({
                'error': 'Cannot delete course with active students'
            }), 400
        
        db.session.delete(course)
        db.session.commit()
        
        return jsonify({'message': 'Course deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500