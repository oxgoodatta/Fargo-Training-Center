from flask import Blueprint, request, jsonify, make_response
from app import db
from app.models import FeePayment, Registration, Student, Staff
from datetime import datetime
import re
import csv
from io import StringIO
from sqlalchemy import exc  # Add this import for integrity error handling
import time  # Add this for timestamp fallback

bp = Blueprint('payments', __name__)

def generate_payment_reference():
    """Generate unique payment reference: PAY-YYYY-XXXXXX (unlimited)"""
    year = datetime.now().year
    
    # Try up to 10 times to generate a unique reference
    for attempt in range(10):
        # Get the latest payment overall (not just for this year)
        last_payment = FeePayment.query.order_by(FeePayment.id.desc()).first()
        
        if last_payment and last_payment.payment_reference:
            # Try to extract number from any format
            match = re.search(r'(\d+)$', last_payment.payment_reference)
            if match:
                # Get the last number and increment
                last_number = int(match.group(1))
                sequence = last_number + 1
            else:
                # Fallback to ID if pattern not found
                sequence = last_payment.id + 1
        else:
            # First payment ever
            sequence = 1
        
        # Format with 6 digits (000001 to 999999 - practically unlimited)
        payment_reference = f"PAY-{year}-{sequence:06d}"
        
        # Check if this reference already exists (extra safety)
        existing = FeePayment.query.filter_by(payment_reference=payment_reference).first()
        if not existing:
            return payment_reference
    
    # If all attempts fail, use timestamp as fallback
    timestamp = int(time.time())
    return f"PAY-{year}-{timestamp}"

@bp.route('/', methods=['POST'])
def create_payment():
    """Record a new payment (full or partial)"""
    try:
        data = request.get_json()
        
        # Validate required fields - collected_by_staff_id is optional for online payments
        required_fields = ['registration_id', 'student_id', 'amount', 'payment_method', 'payment_location']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get registration
        registration = Registration.query.get(data['registration_id'])
        if not registration:
            return jsonify({'error': 'Registration not found'}), 404
        
        # Validate amount
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        if amount > (registration.outstanding_balance or 0):
            return jsonify({'error': 'Amount cannot exceed outstanding balance'}), 400
        
        # Determine payment type
        if amount == registration.outstanding_balance:
            payment_type = 'full'
        else:
            payment_type = 'partial'
        
        # Handle collected_by_staff_id (can be None for online payments)
        collected_by_staff_id = data.get('collected_by_staff_id')
        
        # Generate payment reference with retry logic
        max_retries = 5
        payment_reference = None
        payment = None
        
        for attempt in range(max_retries):
            try:
                payment_reference = generate_payment_reference()
                
                # Create payment record - UPDATED to use transaction_id and confirm_transaction_id
                payment = FeePayment(
                    payment_reference=payment_reference,
                    registration_id=registration.id,
                    student_id=data['student_id'],
                    amount=amount,
                    payment_type=payment_type,
                    payment_method=data['payment_method'],
                    momo_transaction_id=data.get('momo_transaction_id'),  # Keep for backward compatibility
                    momo_phone_number=data.get('momo_phone_number'),
                    momo_provider=data.get('momo_provider'),
                    transaction_id=data.get('transaction_id'),  # Store transaction ID
                    confirm_transaction_id=data.get('confirm_transaction_id'),  # Store confirmation
                    payment_location=data['payment_location'],
                    collected_by_staff_id=collected_by_staff_id,
                    status='completed',
                    payment_date=datetime.utcnow().date()
                )
                
                db.session.add(payment)
                db.session.commit()
                break  # Success, exit retry loop
                
            except exc.IntegrityError as e:
                db.session.rollback()
                if "payment_reference" in str(e):
                    print(f"Payment reference {payment_reference} already exists, retrying... (attempt {attempt + 1}/{max_retries})")
                    if attempt == max_retries - 1:
                        # Last attempt failed
                        print(f"Failed to create payment after {max_retries} attempts")
                        return jsonify({'error': 'Could not generate unique payment reference. Please try again.'}), 500
                    # Otherwise, try again with a new reference
                    continue
                else:
                    # Some other integrity error
                    raise e
        
        # Update registration
        registration.tuition_fee_paid = registration.tuition_fee_paid + amount
        registration.calculate_balance()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Payment recorded successfully',
            'payment': payment.to_dict(),
            'updated_balance': registration.outstanding_balance
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating payment: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/', methods=['GET'])
@bp.route('', methods=['GET'])
def get_payments():
    """Get all payments with filters"""
    try:
        student_id = request.args.get('student_id', type=int)
        registration_id = request.args.get('registration_id', type=int)
        payment_method = request.args.get('payment_method', '')
        payment_location = request.args.get('payment_location', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = FeePayment.query
        
        if student_id:
            query = query.filter_by(student_id=student_id)
        
        if registration_id:
            query = query.filter_by(registration_id=registration_id)
        
        if payment_method:
            query = query.filter_by(payment_method=payment_method)
        
        if payment_location:
            query = query.filter_by(payment_location=payment_location)
        
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(FeePayment.payment_date >= start)
            except:
                pass
        
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(FeePayment.payment_date <= end)
            except:
                pass
        
        # Order by latest first
        query = query.order_by(FeePayment.created_at.desc())
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        payments = [p.to_dict() for p in pagination.items]
        
        return jsonify({
            'payments': payments,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        print(f"Error fetching payments: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/summary', methods=['GET'])
def get_payment_summary():
    """Get payment summary statistics"""
    try:
        from sqlalchemy import func
        
        total_payments = db.session.query(func.sum(FeePayment.amount)).scalar() or 0
        total_count = FeePayment.query.count()
        
        # Payments by method
        momo_total = db.session.query(func.sum(FeePayment.amount)).filter_by(payment_method='momo').scalar() or 0
        cash_total = db.session.query(func.sum(FeePayment.amount)).filter_by(payment_method='cash').scalar() or 0
        
        # Payments by location
        office_total = db.session.query(func.sum(FeePayment.amount)).filter_by(payment_location='office').scalar() or 0
        field_total = db.session.query(func.sum(FeePayment.amount)).filter_by(payment_location='field').scalar() or 0
        
        return jsonify({
            'total_amount': total_payments,
            'total_count': total_count,
            'by_method': {
                'momo': momo_total,
                'cash': cash_total
            },
            'by_location': {
                'office': office_total,
                'field': field_total
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting payment summary: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/export', methods=['GET'])
def export_payments():
    """Export payments as CSV"""
    try:
        from io import StringIO
        import csv
        from flask import make_response
        
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        query = FeePayment.query
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(FeePayment.payment_date >= start)
        
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(FeePayment.payment_date <= end)
        
        payments = query.order_by(FeePayment.payment_date).all()
        
        si = StringIO()
        cw = csv.writer(si)
        cw.writerow(['Reference', 'Student', 'Registration', 'Amount', 'Method', 'Location', 'Date', 'Status', 'Transaction ID'])
        
        for p in payments:
            student = p.student
            student_name = f"{student.first_name} {student.last_name}" if student else 'N/A'
            cw.writerow([
                p.payment_reference,
                student_name,
                p.registration.registration_number if p.registration else 'N/A',
                p.amount,
                p.payment_method,
                p.payment_location,
                p.payment_date.strftime('%Y-%m-%d'),
                p.status,
                p.transaction_id or p.momo_transaction_id or 'N/A'  # Show transaction ID
            ])
        
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=payments.csv"
        output.headers["Content-type"] = "text/csv"
        return output
        
    except Exception as e:
        print(f"Error exporting payments: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:payment_id>/refund', methods=['POST'])
def process_refund(payment_id):
    """Process a refund for a payment"""
    try:
        payment = FeePayment.query.get_or_404(payment_id)
        
        if payment.status != 'completed':
            return jsonify({'error': 'Only completed payments can be refunded'}), 400
        
        # Update registration
        registration = payment.registration
        registration.tuition_fee_paid -= payment.amount
        registration.calculate_balance()
        
        # Update payment status
        payment.status = 'refunded'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Refund processed successfully',
            'payment': payment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error processing refund: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/test', methods=['GET'])
def test_payments():
    return jsonify({'message': 'Payments blueprint is working!'}), 200