from flask import Blueprint, request, jsonify, make_response
from app import db
from app.models import Registration, Student, Staff, FeePayment
from datetime import datetime
import re
import csv
from io import StringIO

bp = Blueprint('registrations', __name__)

def generate_registration_number():
    """Generate unique registration number: REG-YYYY-XXX"""
    year = datetime.now().year
    last_reg = Registration.query.order_by(Registration.id.desc()).first()
    
    if last_reg and last_reg.registration_number:
        # Extract sequence number from existing ID
        match = re.search(r'REG-\d{4}-(\d{3})', last_reg.registration_number)
        if match:
            sequence = int(match.group(1)) + 1
        else:
            sequence = 1
    else:
        sequence = 1
    
    return f"REG-{year}-{sequence:03d}"

@bp.route('/', methods=['POST'])
def create_registration():
    """Register a student for a course"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['student_id', 'course_name', 'course_fee', 'branch', 'payment_location']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate student exists
        student = Student.query.get(data['student_id'])
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Validate staff exists if provided (for accountability)
        processed_by_staff_id = data.get('processed_by_staff_id')
        if processed_by_staff_id:
            staff = Staff.query.get(processed_by_staff_id)
            if not staff:
                return jsonify({'error': 'Staff not found'}), 404
        
        # Validate payment location
        payment_location = data['payment_location'].lower()
        if payment_location not in ['office', 'field']:
            return jsonify({'error': 'Payment location must be "office" or "field"'}), 400
        
        # IMPORTANT FIX: course_fee from frontend is the TOTAL course fee
        total_course_fee = float(data['course_fee'])  # This is the total fee (registration + tuition)
        registration_fee_amount = float(data.get('registration_fee', 0))  # This is the actual registration fee amount
        amount_paid = float(data.get('amount_paid', 0))  # Amount paid by student
        
        # The tuition fee is the difference
        tuition_fee = total_course_fee - registration_fee_amount
        
        # Split the payment between registration fee and tuition fee
        if amount_paid >= registration_fee_amount:
            # Registration fee is fully paid
            reg_fee_paid = registration_fee_amount
            # Remaining amount goes to tuition
            tuition_fee_paid = amount_paid - registration_fee_amount
        else:
            # Only partial registration fee paid
            reg_fee_paid = amount_paid
            tuition_fee_paid = 0
        
        # Calculate outstanding balance
        outstanding_balance = total_course_fee - (reg_fee_paid + tuition_fee_paid)
        
        # Generate registration number
        registration_number = generate_registration_number()
        
        # Parse registration date
        registration_date_str = data.get('registration_date')
        if registration_date_str:
            try:
                registration_date = datetime.strptime(registration_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid registration date format. Use YYYY-MM-DD'}), 400
        else:
            registration_date = datetime.utcnow().date()
        
        # Get course_id from data
        course_id = data.get('course_id')
        
        # Get signature from data
        signature = data.get('signature')
        
        print(f"Creating registration with course_id: {course_id}")  # Debug log
        print(f"Total course fee: {total_course_fee}, Registration fee amount: {registration_fee_amount}, Tuition fee: {tuition_fee}")  # Debug log
        print(f"Amount paid: {amount_paid}, Reg fee paid: {reg_fee_paid}, Tuition paid: {tuition_fee_paid}")  # Debug log
        
        # Create new registration with signature
        new_registration = Registration(
            registration_number=registration_number,
            student_id=student.id,
            course_id=course_id,
            course_name=data['course_name'].strip(),
            course_duration=data.get('course_duration', '').strip(),
            course_fee=tuition_fee,  # Store the tuition fee separately
            branch=data['branch'].strip(),
            registration_fee=reg_fee_paid,  # Amount paid for registration
            tuition_fee_paid=tuition_fee_paid,  # Amount paid for tuition
            total_fee=total_course_fee,  # Total course fee
            outstanding_balance=outstanding_balance,
            payment_location=payment_location,
            status=data.get('status', 'active'),
            registration_date=registration_date,
            processed_by_staff_id=processed_by_staff_id,
            signature=signature
        )
        
        db.session.add(new_registration)
        db.session.commit()
        
        print(f"Created registration with ID: {new_registration.id}")  # Debug log
        print(f"Registration fee paid: {new_registration.registration_fee}, Tuition paid: {new_registration.tuition_fee_paid}")  # Debug log
        
        # Create payment record if amount was paid
        if amount_paid > 0:
            try:
                payment_reference = f"PAY-{datetime.now().year}-{new_registration.id:03d}"
                
                payment = FeePayment(
                    payment_reference=payment_reference,
                    registration_id=new_registration.id,
                    student_id=student.id,
                    amount=amount_paid,
                    payment_type='registration',
                    payment_method=data.get('payment_method', 'cash'),
                    momo_phone_number=data.get('momo_phone'),
                    momo_provider=data.get('momo_provider'),
                    payment_location=payment_location,
                    collected_by_staff_id=processed_by_staff_id,
                    status='completed',
                    payment_date=registration_date
                )
                
                db.session.add(payment)
                db.session.commit()
                print(f"Payment record created: {payment_reference}")
            except Exception as e:
                print(f"Error creating payment record: {str(e)}")
                # Don't rollback the registration if payment record fails
                # Just log the error
        
        # Return registration with student details
        response_data = new_registration.to_dict()
        response_data['student'] = student.to_dict()
        
        return jsonify({
            'message': 'Registration created successfully',
            'registration': response_data
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        print(f"ValueError: {str(e)}")
        return jsonify({'error': 'Invalid numeric value in fees'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error creating registration: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['GET'])
@bp.route('', methods=['GET'])
def get_registrations():
    """Get all registrations with filtering options"""
    try:
        # Get query parameters
        student_id = request.args.get('student_id', type=int)
        course_id = request.args.get('course_id', type=int)
        search = request.args.get('search', '')
        branch = request.args.get('branch', '')
        status = request.args.get('status', '')
        payment_location = request.args.get('payment_location', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Base query with student join
        query = db.session.query(Registration).join(Student)
        
        # Filter by student_id if provided
        if student_id:
            query = query.filter(Registration.student_id == student_id)
        
        # Filter by course_id if provided
        if course_id:
            query = query.filter(Registration.course_id == course_id)
        
        # Apply other filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Registration.registration_number.ilike(search_term)) |
                (Registration.course_name.ilike(search_term)) |
                (Student.first_name.ilike(search_term)) |
                (Student.last_name.ilike(search_term)) |
                (Student.phone.ilike(search_term))
            )
        
        if branch:
            query = query.filter(Registration.branch == branch)
        
        if status:
            query = query.filter(Registration.status == status)
        
        if payment_location:
            query = query.filter(Registration.payment_location == payment_location)
        
        # Date range filter
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(Registration.registration_date >= start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(Registration.registration_date <= end)
            except ValueError:
                pass
        
        # Order by latest first
        query = query.order_by(Registration.created_at.desc())
        
        # Pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Prepare response with student and staff details
        registrations = []
        for reg in pagination.items:
            reg_data = reg.to_dict()
            reg_data['student'] = reg.student.to_dict() if reg.student else None
            
            # Add staff information if available
            if reg.processed_by_staff_id:
                staff = Staff.query.get(reg.processed_by_staff_id)
                if staff:
                    reg_data['processed_by_staff'] = {
                        'id': staff.id,
                        'staff_id': staff.staff_id,
                        'name': f"{staff.first_name} {staff.last_name}",
                        'role': staff.role
                    }
            
            registrations.append(reg_data)
        
        # Get unique branches for filter dropdown
        branches = db.session.query(Registration.branch).distinct().all()
        branches = [b[0] for b in branches if b[0]]
        
        return jsonify({
            'registrations': registrations,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page,
            'filters': {
                'branches': branches,
                'statuses': ['active', 'completed', 'cancelled'],
                'payment_locations': ['office', 'field']
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_registrations: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/monthly', methods=['GET'])
def get_monthly_registrations():
    """Get monthly list of registered students (as per requirement)"""
    try:
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        export = request.args.get('export', 'false').lower() == 'true'
        
        # Query registrations for the specified month
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date()
        else:
            end_date = datetime(year, month + 1, 1).date()
        
        registrations = Registration.query.filter(
            Registration.registration_date >= start_date,
            Registration.registration_date < end_date
        ).order_by(Registration.registration_date).all()
        
        # If export is true, return CSV file
        if export:
            # Create CSV data
            si = StringIO()
            cw = csv.writer(si)
            
            # Write header
            cw.writerow([
                'Registration Number', 'Student ID', 'Student Name', 'Course',
                'Registration Date', 'Branch', 'Location', 'Registration Fee',
                'Tuition Paid', 'Total Fee', 'Outstanding', 'Status', 'Registered By'
            ])
            
            # Write data
            for reg in registrations:
                student = reg.student
                student_name = f"{student.first_name} {student.last_name}" if student else 'N/A'
                student_id = student.student_id if student else 'N/A'
                
                # Get staff name if available
                staff_name = 'Online'
                if reg.processed_by_staff_id:
                    staff = Staff.query.get(reg.processed_by_staff_id)
                    if staff:
                        staff_name = f"{staff.first_name} {staff.last_name}"
                
                cw.writerow([
                    reg.registration_number,
                    student_id,
                    student_name,
                    reg.course_name,
                    reg.registration_date.strftime('%Y-%m-%d'),
                    reg.branch,
                    reg.payment_location,
                    f"{reg.registration_fee:.2f}",
                    f"{reg.tuition_fee_paid:.2f}",
                    f"{reg.total_fee:.2f}",
                    f"{reg.outstanding_balance:.2f}",
                    reg.status,
                    staff_name
                ])
            
            # Create response
            output = make_response(si.getvalue())
            output.headers["Content-Disposition"] = f"attachment; filename=registrations_{year}_{month:02d}.csv"
            output.headers["Content-type"] = "text/csv"
            return output
        
        # Otherwise return JSON
        # Group by date for better presentation
        registrations_by_date = {}
        for reg in registrations:
            date_str = reg.registration_date.strftime('%Y-%m-%d')
            if date_str not in registrations_by_date:
                registrations_by_date[date_str] = []
            
            reg_data = reg.to_dict()
            reg_data['student'] = reg.student.to_dict() if reg.student else None
            
            # Add staff information
            if reg.processed_by_staff_id:
                staff = Staff.query.get(reg.processed_by_staff_id)
                if staff:
                    reg_data['processed_by_staff'] = {
                        'id': staff.id,
                        'staff_id': staff.staff_id,
                        'name': f"{staff.first_name} {staff.last_name}",
                        'role': staff.role
                    }
            
            registrations_by_date[date_str].append(reg_data)
        
        # Calculate monthly summary
        total_registrations = len(registrations)
        total_fees = sum(reg.total_fee for reg in registrations)
        total_paid = sum(reg.registration_fee + reg.tuition_fee_paid for reg in registrations)
        total_balance = sum(reg.outstanding_balance for reg in registrations)
        
        return jsonify({
            'month': f'{year}-{month:02d}',
            'registrations_by_date': registrations_by_date,
            'summary': {
                'total_registrations': total_registrations,
                'total_fees': total_fees,
                'total_paid': total_paid,
                'total_balance': total_balance,
                'average_fee': total_fees / total_registrations if total_registrations > 0 else 0
            },
            'registrations': [reg.to_dict() for reg in registrations]
        }), 200
        
    except Exception as e:
        print(f"Error in monthly report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:registration_id>', methods=['GET'])
def get_registration(registration_id):
    """Get specific registration by ID"""
    try:
        registration = Registration.query.get_or_404(registration_id)
        
        registration_data = registration.to_dict()
        registration_data['student'] = registration.student.to_dict() if registration.student else None
        
        # Add staff info if available
        if registration.processed_by_staff_id:
            staff = Staff.query.get(registration.processed_by_staff_id)
            if staff:
                registration_data['processed_by_staff'] = {
                    'id': staff.id,
                    'staff_id': staff.staff_id,
                    'name': f"{staff.first_name} {staff.last_name}",
                    'role': staff.role
                }
        
        return jsonify({'registration': registration_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@bp.route('/<int:registration_id>', methods=['PUT'])
def update_registration(registration_id):
    """Update registration details"""
    try:
        registration = Registration.query.get_or_404(registration_id)
        data = request.get_json()
        
        # Check if registration can be modified
        if registration.status == 'completed' and data.get('status') != 'completed':
            return jsonify({'error': 'Completed registrations cannot be modified'}), 400
        
        # Update allowed fields (including signature)
        updatable_fields = [
            'course_name', 'course_duration', 'course_fee', 'branch',
            'registration_fee', 'tuition_fee_paid', 'payment_location',
            'status', 'processed_by_staff_id', 'signature'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ['course_fee', 'registration_fee', 'tuition_fee_paid']:
                    try:
                        setattr(registration, field, float(data[field]))
                    except ValueError:
                        return jsonify({'error': f'Invalid value for {field}'}), 400
                else:
                    setattr(registration, field, data[field])
        
        # FIXED: Recalculate total fee and outstanding balance correctly
        # total_fee should remain the same (it's the course total)
        # We just need to recalculate outstanding balance
        registration.calculate_balance()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Registration updated successfully',
            'registration': registration.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:registration_id>/print', methods=['GET'])
def print_registration(registration_id):
    """Get registration details for printing (as per requirement)"""
    try:
        registration = Registration.query.get_or_404(registration_id)
        student = registration.student
        
        if not student:
            return jsonify({'error': 'Student not found for this registration'}), 404
        
        # Get the course to get the original fees
        original_registration_fee = registration.registration_fee
        original_tuition_fee = 0
        course_name_display = registration.course_name
        course_duration_display = registration.course_duration or 'Not specified'
        
        if registration.course_id:
            from app.models import Course
            course = Course.query.get(registration.course_id)
            if course:
                original_registration_fee = course.registration_fee
                original_tuition_fee = course.tuition_fee
                course_name_display = course.name
                course_duration_display = course.duration or registration.course_duration or 'Not specified'
        
        # Get staff info for printing
        staff_name = 'N/A'
        staff_role = ''
        if registration.processed_by_staff_id:
            staff = Staff.query.get(registration.processed_by_staff_id)
            if staff:
                staff_name = f"{staff.first_name} {staff.last_name}"
                staff_role = staff.role
        
        # Handle signature
        signature_html = ""
        if registration.signature and len(registration.signature) > 100:
            signature_html = f'''
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-image">
                        <img src="{registration.signature}" alt="Student Signature" />
                    </div>
                    <div class="signature-dotted-line"></div>
                    <p class="signature-label">Student Signature</p>
                </div>
            </div>
            '''
        else:
            signature_html = '''
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-dotted-line"></div>
                    <p class="signature-label">Student Signature</p>
                </div>
            </div>
            '''
        
        # Calculate total paid
        total_paid = registration.registration_fee + registration.tuition_fee_paid
        
        # Get base URL for logo
        base_url = request.host_url.rstrip('/')
        logo_url = f"{base_url}/static/images/logo.jpeg"
        
        # Create HTML directly with logo
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Registration Form - {registration.registration_number}</title>
            <style>
                body {{ 
                    font-family: 'Arial', sans-serif; 
                    padding: 40px; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white;
                    line-height: 1.5;
                }}
                .header {{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #f97316;
                    padding-bottom: 20px;
                }}
                .logo-container {{
                    width: 100px;
                    height: 100px;
                }}
                .logo-container img {{
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }}
                .title-container {{
                    flex: 1;
                    text-align: center;
                }}
                h1 {{ 
                    color: #1e3a5f; 
                    font-size: 24px;
                    margin: 0 0 5px 0;
                }}
                .school-name {{
                    color: #666;
                    font-size: 14px;
                }}
                .reg-number {{ 
                    font-size: 16px;
                    color: #f97316;
                    text-align: right;
                    margin-bottom: 20px;
                    font-weight: bold;
                }}
                .student-details {{
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 25px;
                    border: 1px solid #e9ecef;
                }}
                .detail-row {{
                    display: flex;
                    margin-bottom: 10px;
                    border-bottom: 1px dotted #dee2e6;
                    padding-bottom: 8px;
                }}
                .detail-label {{
                    font-weight: bold;
                    width: 140px;
                    color: #495057;
                }}
                .detail-value {{
                    flex: 1;
                    color: #212529;
                }}
                .staff-info {{
                    background: #e7f3ff;
                    padding: 10px 15px;
                    border-radius: 6px;
                    margin-top: 10px;
                    font-size: 14px;
                    color: #0d6efd;
                    border-left: 4px solid #0d6efd;
                }}
                .section-title {{
                    color: #1e3a5f;
                    font-size: 18px;
                    font-weight: bold;
                    margin: 25px 0 15px 0;
                    padding-bottom: 5px;
                    border-bottom: 2px solid #f97316;
                }}
                .course-info {{
                    background: #fff;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                }}
                .fee-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }}
                .fee-table th {{
                    background: #1e3a5f;
                    color: white;
                    padding: 12px;
                    text-align: left;
                    font-weight: normal;
                }}
                .fee-table td {{
                    padding: 10px 12px;
                    border-bottom: 1px solid #dee2e6;
                }}
                .fee-table .total-row {{
                    background: #fff3cd;
                    font-weight: bold;
                }}
                .signature-section {{
                    margin-top: 40px;
                    display: flex;
                    justify-content: flex-start;
                }}
                .signature-box {{
                    width: 250px;
                }}
                .signature-image {{
                    margin-bottom: 5px;
                    height: 50px;
                }}
                .signature-image img {{
                    max-height: 45px;
                    width: auto;
                    max-width: 200px;
                    object-fit: contain;
                }}
                .signature-dotted-line {{
                    border-bottom: 2px dotted #999;
                    width: 100%;
                    margin: 5px 0;
                }}
                .signature-label {{
                    font-size: 12px;
                    color: #666;
                    margin: 0;
                    text-align: left;
                }}
                .footer {{
                    margin-top: 50px;
                    text-align: center;
                    font-size: 11px;
                    color: #999;
                    border-top: 1px solid #dee2e6;
                    padding-top: 20px;
                }}
                .print-button {{
                    text-align: center;
                    margin: 20px 0;
                }}
                .print-button button {{
                    background: #f97316;
                    color: white;
                    border: none;
                    padding: 10px 30px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }}
                .print-button button:hover {{
                    background: #e06400;
                }}
                @media print {{
                    .print-button {{ display: none; }}
                    body {{ padding: 20px; }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-container">
                    <img src="{logo_url}" alt="School Logo" />
                </div>
                <div class="title-container">
                    <h1>FARGO TRAINING CENTER</h1>
                    <div class="school-name">Official Student Registration Form</div>
                </div>
                <div style="width: 100px;"></div> <!-- Spacer for balance -->
            </div>
            
            <div class="reg-number">Ref: {registration.registration_number}</div>
            
            <div class="student-details">
                <div class="detail-row">
                    <span class="detail-label">Student ID:</span>
                    <span class="detail-value">{student.student_id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">{student.first_name} {student.last_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date of Birth:</span>
                    <span class="detail-value">{student.date_of_birth.strftime('%d/%m/%Y') if student.date_of_birth else 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gender:</span>
                    <span class="detail-value">{student.gender}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">{student.phone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">{student.email or 'N/A'}</span>
                </div>
                <div class="staff-info">
                    <strong>Registered by:</strong> {staff_name} ({staff_role}) • {registration.registration_date.strftime('%d/%m/%Y')}
                </div>
            </div>

            <div class="section-title">COURSE INFORMATION</div>
            <div class="course-info">
                <div class="detail-row">
                    <span class="detail-label">Course Name:</span>
                    <span class="detail-value"><strong>{course_name_display}</strong></span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">{course_duration_display}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Branch:</span>
                    <span class="detail-value">{registration.branch}</span>
                </div>
            </div>

            <div class="section-title">FEE STRUCTURE</div>
            <table class="fee-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount (₵)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Course Fees (from Course Catalog)</strong></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>• Registration Fee</td>
                        <td>₵{original_registration_fee:.2f}</td>
                    </tr>
                    <tr>
                        <td>• Tuition Fee</td>
                        <td>₵{original_tuition_fee:.2f}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Course Fee</strong></td>
                        <td><strong>₵{original_registration_fee + original_tuition_fee:.2f}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="2" style="background: #f0f0f0; padding: 5px;"></td>
                    </tr>
                    <tr>
                        <td><strong>Payment Summary</strong></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>Total Paid</strong></td>
                        <td><strong>₵{total_paid:.2f}</strong></td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Outstanding Balance</strong></td>
                        <td><strong>₵{registration.outstanding_balance:.2f}</strong></td>
                    </tr>
                </tbody>
            </table>

            <div class="signature-section">
                {signature_html}
            </div>
            
            <div class="footer">
                <p>This is an official registration document from SchoolSync Academy</p>
                <p>Registration Number: {registration.registration_number} • Printed on {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
            </div>
            
            <div class="print-button">
                <button onclick="window.print()">Print Registration Form</button>
            </div>
        </body>
        </html>
        """
        
        # Create response with HTML content
        response = make_response(html)
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        return response
        
    except Exception as e:
        print(f"Error generating printable form: {str(e)}")
        return jsonify({'error': str(e)}), 404

@bp.route('/branches/summary', methods=['GET'])
def get_branch_summary():
    """Get fee collection summary per branch (as per requirement)"""
    try:
        # Group by branch and calculate totals
        from sqlalchemy import func
        
        results = db.session.query(
            Registration.branch,
            func.count(Registration.id).label('total_registrations'),
            func.sum(Registration.total_fee).label('total_fees'),
            func.sum(Registration.registration_fee + Registration.tuition_fee_paid).label('total_collected'),
            func.sum(Registration.outstanding_balance).label('total_outstanding')
        ).group_by(Registration.branch).all()
        
        summary = []
        for branch, total_reg, total_fees, total_collected, total_outstanding in results:
            summary.append({
                'branch': branch,
                'total_registrations': total_reg or 0,
                'total_fees': float(total_fees) if total_fees else 0,
                'total_collected': float(total_collected) if total_collected else 0,
                'total_outstanding': float(total_outstanding) if total_outstanding else 0,
                'collection_rate': (float(total_collected) / float(total_fees) * 100) if total_fees else 0
            })
        
        # Calculate grand totals
        grand_totals = {
            'total_registrations': sum(item['total_registrations'] for item in summary),
            'total_fees': sum(item['total_fees'] for item in summary),
            'total_collected': sum(item['total_collected'] for item in summary),
            'total_outstanding': sum(item['total_outstanding'] for item in summary)
        }
        
        return jsonify({
            'branch_summary': summary,
            'grand_totals': grand_totals
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500