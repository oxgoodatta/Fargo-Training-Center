from flask import Blueprint, request, jsonify
from app import db
from app.models import Staff, Registration, FeePayment
from datetime import datetime
import re

bp = Blueprint('staff', __name__)

def generate_staff_id():
    """Generate unique staff ID: STAFF-XXX"""
    last_staff = Staff.query.order_by(Staff.id.desc()).first()
    
    if last_staff and last_staff.staff_id:
        # Extract sequence number from existing ID
        match = re.search(r'STAFF-(\d{3})', last_staff.staff_id)
        if match:
            sequence = int(match.group(1)) + 1
        else:
            sequence = 1
    else:
        sequence = 1
    
    return f"STAFF-{sequence:03d}"

@bp.route('/', methods=['POST'])
def create_staff():
    """Add a new staff member"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'role', 'branch']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if email already exists
        existing_email = Staff.query.filter_by(email=data['email']).first()
        if existing_email:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Check if phone already exists
        existing_phone = Staff.query.filter_by(phone=data['phone']).first()
        if existing_phone:
            return jsonify({'error': 'Phone number already registered'}), 400
        
        # Generate staff ID
        staff_id = generate_staff_id()
        
        # Create new staff
        new_staff = Staff(
            staff_id=staff_id,
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            email=data['email'].strip(),
            phone=data['phone'].strip(),
            role=data['role'].strip(),
            branch=data['branch'].strip(),
            username=data.get('username', '').strip(),
            is_active=data.get('is_active', True)
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

@bp.route('/', methods=['GET'])
@bp.route('', methods=['GET'])
def get_all_staff():
    """Get all staff members"""
    try:
        # Get query parameters
        search = request.args.get('search', '')
        role = request.args.get('role', '')
        branch = request.args.get('branch', '')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Base query
        query = Staff.query
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Staff.first_name.ilike(search_term)) |
                (Staff.last_name.ilike(search_term)) |
                (Staff.staff_id.ilike(search_term)) |
                (Staff.email.ilike(search_term)) |
                (Staff.phone.ilike(search_term))
            )
        
        if role:
            query = query.filter(Staff.role == role)
        
        if branch:
            query = query.filter(Staff.branch == branch)
        
        if active_only:
            query = query.filter(Staff.is_active == True)
        
        # Order by name
        query = query.order_by(Staff.first_name, Staff.last_name)
        
        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        staff_list = [staff.to_dict() for staff in pagination.items]
        
        # Get unique roles and branches for filters
        roles = db.session.query(Staff.role).distinct().all()
        branches = db.session.query(Staff.branch).distinct().all()
        
        return jsonify({
            'staff': staff_list,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'filters': {
                'roles': [r[0] for r in roles if r[0]],
                'branches': [b[0] for b in branches if b[0]]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:staff_id>', methods=['DELETE'])
def delete_staff(staff_id):
    """Permanently delete a staff member"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        
        # Check if staff has any registrations or payments
        has_registrations = Registration.query.filter_by(processed_by_staff_id=staff.id).first()
        has_payments = FeePayment.query.filter_by(collected_by_staff_id=staff.id).first()
        
        if has_registrations or has_payments:
            return jsonify({
                'error': 'Cannot delete staff with existing registrations or payments. Deactivate instead.'
            }), 400
        
        db.session.delete(staff)
        db.session.commit()
        
        return jsonify({
            'message': 'Staff member deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500       

@bp.route('/dropdown', methods=['GET'])
def get_staff_dropdown():
    """Get staff list for dropdown selection (for registration forms)"""
    try:
        # Get active staff only for dropdown
        staff = Staff.query.filter_by(is_active=True)\
            .order_by(Staff.first_name, Staff.last_name)\
            .all()
        
        dropdown_list = [{
            'id': s.id,
            'staff_id': s.staff_id,
            'name': f"{s.first_name} {s.last_name}",
            'role': s.role,
            'branch': s.branch
        } for s in staff]
        
        return jsonify({'staff': dropdown_list}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:staff_id>', methods=['GET'])
def get_staff(staff_id):
    """Get staff details with their activities"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        
        # Get staff's recent registrations - UPDATED RELATIONSHIP
        recent_registrations = Registration.query\
            .filter_by(processed_by_staff_id=staff.id)\
            .order_by(Registration.created_at.desc())\
            .limit(10)\
            .all()
        
        # Get staff's recent fee collections
        recent_payments = FeePayment.query\
            .filter_by(collected_by_staff_id=staff.id)\
            .order_by(FeePayment.created_at.desc())\
            .limit(10)\
            .all()
        
        staff_data = staff.to_dict()
        
        # Add activity summary
        total_registrations = Registration.query.filter_by(processed_by_staff_id=staff.id).count()
        total_payments = FeePayment.query.filter_by(collected_by_staff_id=staff.id).count()
        
        staff_data['activity_summary'] = {
            'total_registrations_processed': total_registrations,
            'total_payments_collected': total_payments,
            'recent_registrations': [reg.to_dict() for reg in recent_registrations],
            'recent_payments': [payment.to_dict() for payment in recent_payments]
        }
        
        return jsonify({'staff': staff_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@bp.route('/<int:staff_id>', methods=['PUT'])
def update_staff(staff_id):
    """Update staff member details"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        data = request.get_json()
        
        # Update fields if provided
        if data.get('first_name'):
            staff.first_name = data['first_name'].strip()
        
        if data.get('last_name'):
            staff.last_name = data['last_name'].strip()
        
        if data.get('email'):
            # Check if email already exists for another staff
            existing_email = Staff.query.filter(
                Staff.email == data['email'].strip(),
                Staff.id != staff_id
            ).first()
            if existing_email:
                return jsonify({'error': 'Email already registered'}), 400
            staff.email = data['email'].strip()
        
        if data.get('phone'):
            # Check if phone already exists for another staff
            existing_phone = Staff.query.filter(
                Staff.phone == data['phone'].strip(),
                Staff.id != staff_id
            ).first()
            if existing_phone:
                return jsonify({'error': 'Phone number already registered'}), 400
            staff.phone = data['phone'].strip()
        
        # Role and branch might be updatable depending on your permissions
        if data.get('role'):
            staff.role = data['role'].strip()
        
        if data.get('branch'):
            staff.branch = data['branch'].strip()
        
        staff.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Staff updated successfully',
            'staff': staff.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@bp.route('/<int:staff_id>/password', methods=['PUT'])
def change_staff_password(staff_id):
    """Change staff password"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        data = request.get_json()
        
        # Verify current password
        if not staff.verify_password(data.get('current_password', '')):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        new_password = data.get('new_password', '')
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Update password
        staff.password = new_password
        staff.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:staff_id>/deactivate', methods=['PUT'])
def deactivate_staff(staff_id):
    """Deactivate staff member (soft delete)"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        
        # Check if staff has recent activities
        recent_registrations = Registration.query\
            .filter_by(processed_by_staff_id=staff.id)\
            .filter(Registration.created_at >= datetime.utcnow().replace(day=1))\
            .first()
        
        if recent_registrations:
            return jsonify({
                'error': 'Cannot deactivate staff with recent registrations'
            }), 400
        
        staff.is_active = False
        db.session.commit()
        
        return jsonify({
            'message': 'Staff deactivated successfully',
            'staff': staff.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:staff_id>/activate', methods=['PUT'])
def activate_staff(staff_id):
    """Activate staff member"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        
        staff.is_active = True
        db.session.commit()
        
        return jsonify({
            'message': 'Staff activated successfully',
            'staff': staff.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:staff_id>/activities', methods=['GET'])
def get_staff_activities(staff_id):
    """Get detailed activities of a staff member"""
    try:
        staff = Staff.query.get_or_404(staff_id)
        
        # Get date range from query params
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Base queries
        registrations_query = Registration.query.filter_by(processed_by_staff_id=staff.id)
        payments_query = FeePayment.query.filter_by(collected_by_staff_id=staff.id)
        
        # Apply date filters
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d')
                registrations_query = registrations_query.filter(Registration.created_at >= start)
                payments_query = payments_query.filter(FeePayment.created_at >= start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d')
                registrations_query = registrations_query.filter(Registration.created_at <= end)
                payments_query = payments_query.filter(FeePayment.created_at <= end)
            except ValueError:
                pass
        
        # Get results
        registrations = registrations_query.order_by(Registration.created_at.desc()).all()
        payments = payments_query.order_by(FeePayment.created_at.desc()).all()
        
        # Calculate totals
        total_registration_fees = sum(reg.registration_fee for reg in registrations)
        total_payments_collected = sum(payment.amount for payment in payments)
        
        return jsonify({
            'staff': {
                'id': staff.id,
                'name': f"{staff.first_name} {staff.last_name}",
                'staff_id': staff.staff_id,
                'role': staff.role,
                'branch': staff.branch
            },
            'activities': {
                'registrations': [reg.to_dict() for reg in registrations],
                'payments': [payment.to_dict() for payment in payments]
            },
            'summary': {
                'total_registrations': len(registrations),
                'total_registration_fees': total_registration_fees,
                'total_payments_collected': total_payments_collected,
                'total_activities': len(registrations) + len(payments)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/summary', methods=['GET'])
def get_staff_summary():
    """Get summary of all staff activities"""
    try:
        from sqlalchemy import func
        
        # Get staff with their activity counts
        results = db.session.query(
            Staff.id,
            Staff.staff_id,
            Staff.first_name,
            Staff.last_name,
            Staff.role,
            Staff.branch,
            func.count(Registration.id).label('registration_count'),
            func.count(FeePayment.id).label('payment_count')
        ).outerjoin(Registration, Staff.id == Registration.processed_by_staff_id)\
         .outerjoin(FeePayment, Staff.id == FeePayment.collected_by_staff_id)\
         .group_by(Staff.id)\
         .order_by(Staff.first_name)\
         .all()
        
        summary = []
        for staff_id, staff_code, first_name, last_name, role, branch, reg_count, pay_count in results:
            summary.append({
                'id': staff_id,
                'staff_id': staff_code,
                'name': f"{first_name} {last_name}",
                'role': role,
                'branch': branch,
                'registration_count': reg_count or 0,
                'payment_count': pay_count or 0,
                'total_activities': (reg_count or 0) + (pay_count or 0)
            })
        
        return jsonify({'staff_summary': summary}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500