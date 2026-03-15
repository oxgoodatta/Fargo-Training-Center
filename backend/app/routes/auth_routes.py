from flask import Blueprint, request, jsonify, current_app
from app import db, mail
from app.models import Student, Staff
from app.models.password_reset import PasswordResetToken
from flask_mail import Message
from flask_bcrypt import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import base64
import traceback
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

def get_logo_base64():
    """Read logo file and convert to base64 for email embedding"""
    try:
        # Get the absolute path to the logo
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up one level from routes folder to backend, then to static/images
        logo_path = os.path.join(current_dir, '..', 'static', 'images', 'logo.jpeg')
        logo_path = os.path.abspath(logo_path)
        
        print(f"🔍 Looking for logo at: {logo_path}")
        
        if os.path.exists(logo_path):
            with open(logo_path, 'rb') as logo_file:
                logo_data = logo_file.read()
                logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                print(f"✅ Logo loaded successfully! Size: {len(logo_data)} bytes")
                return f"data:image/jpeg;base64,{logo_base64}"
        else:
            print(f"❌ Logo not found at: {logo_path}")
            # Try alternative path
            alt_path = os.path.join('static', 'images', 'logo.jpeg')
            if os.path.exists(alt_path):
                with open(alt_path, 'rb') as logo_file:
                    logo_data = logo_file.read()
                    logo_base64 = base64.b64encode(logo_data).decode('utf-8')
                    print(f"✅ Logo found at alternative path!")
                    return f"data:image/jpeg;base64,{logo_base64}"
            else:
                print(f"❌ Also tried: {alt_path}")
            return None
    except Exception as e:
        print(f"⚠️ Error loading logo: {e}")
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

@bp.route('/change-password', methods=['PUT'])
def change_password():
    """Change user password"""
    try:
        data = request.get_json()
        print(f"🔐 Password change request received: {data}")
        
        # Get user from token
        auth_header = request.headers.get('Authorization')
        print(f"🔐 Auth header: {auth_header}")
        
        if not auth_header:
            print("❌ No authorization header")
            return jsonify({'error': 'No authorization token'}), 401
            
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        print(f"🔐 Token: {token[:20]}...")
        
        # Decode JWT token
        try:
            payload = jwt.decode(
                token, 
                Config.JWT_SECRET_KEY,
                algorithms=['HS256']
            )
            print(f"🔐 Token payload: {payload}")
            user_id = payload.get('user_id')
            user_type = payload.get('user_type')
            print(f"🔐 User ID from token: {user_id}, Type: {user_type}")
            
        except jwt.ExpiredSignatureError:
            print("❌ Token expired")
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError as e:
            print(f"❌ Invalid token: {e}")
            return jsonify({'error': 'Invalid token'}), 401
        
        if not user_id:
            print("❌ No user_id in token")
            return jsonify({'error': 'Invalid token payload'}), 401
        
        # Validate request data
        if not data:
            print("❌ No JSON data received")
            return jsonify({'error': 'No data provided'}), 400
            
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        print(f"🔐 Current password provided: {'Yes' if current_password else 'No'}")
        print(f"🔐 New password provided: {'Yes' if new_password else 'No'}")
        
        if not current_password:
            return jsonify({'error': 'Current password is required'}), 400
        
        if not new_password:
            return jsonify({'error': 'New password is required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Find the user (could be Staff or Student)
        print(f"🔐 Looking for user with ID: {user_id}")
        
        staff = None
        student = None
        
        if user_type == 'staff':
            staff = Staff.query.get(user_id)
            print(f"🔐 Staff found: {staff is not None}")
        elif user_type == 'student':
            student = Student.query.get(user_id)
            print(f"🔐 Student found: {student is not None}")
        else:
            # Try both if type unknown
            staff = Staff.query.get(user_id)
            student = Student.query.get(user_id)
            print(f"🔐 Staff found: {staff is not None}, Student found: {student is not None}")
        
        user = staff or student
        
        if not user:
            print(f"❌ User not found with ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        print(f"🔐 User found: {user.first_name} {user.last_name}")
        
        # Verify current password
        print("🔐 Verifying current password...")
        if not user.verify_password(current_password):
            print("❌ Current password is incorrect")
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        print("✅ Current password verified")
        
        # Update password
        print("🔐 Updating password...")
        user.password = new_password
        user.updated_at = datetime.datetime.utcnow()
        db.session.commit()
        
        print("✅ Password updated successfully")
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Unexpected error in change_password: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset link - ALWAYS sends a new email"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        print(f"🔐 Forgot password request for: {email}")
        
        # Check if email exists in staff table
        staff = Staff.query.filter_by(email=email).first()
        student = Student.query.filter_by(email=email).first()
        
        user = staff or student
        if not user:
            # Don't reveal if email exists or not for security
            print(f"ℹ️ Email {email} not found in database")
            return jsonify({
                'success': True, 
                'message': 'If your email is registered, you will receive a password reset link.'
            }), 200
        
        # Determine user type
        user_type = 'staff' if staff else 'student'
        user_id = user.id
        
        # --- UPDATED LOGIC: ALWAYS CREATE NEW TOKEN ---
        # First, delete any existing unused tokens for this email
        existing_tokens = PasswordResetToken.query.filter_by(
            email=email,
            is_used=False
        ).all()
        
        if existing_tokens:
            print(f"ℹ️ Found {len(existing_tokens)} existing unused token(s) for {email}. Deleting them...")
            for token in existing_tokens:
                db.session.delete(token)
            db.session.commit()
            print(f"✅ Deleted old token(s)")
        
        # Create new reset token
        reset_token = PasswordResetToken(
            email=email,
            user_id=user_id,
            user_type=user_type
        )
        db.session.add(reset_token)
        db.session.commit()
        print(f"✅ Created new reset token for {email} - Token: {reset_token.token[:20]}...")
        
        # Send email with reset link
        try:
            send_reset_email(email, reset_token.token, user.first_name)
            print(f"✅ Reset email sent to {email}")
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            traceback.print_exc()
            # Still return success to not reveal email existence
        
        return jsonify({
            'success': True,
            'message': 'If your email is registered, you will receive a password reset link.'
        }), 200
        
    except Exception as e:
        print(f"❌ Forgot password error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'An error occurred'}), 500

@bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        print(f"🔐 Reset password request with token: {token[:20]}...")
        
        # Find the token
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token:
            print("❌ Token not found in database")
            return jsonify({'error': 'Invalid or expired reset link'}), 400
        
        if not reset_token.is_valid():
            print(f"❌ Token invalid or expired. Used: {reset_token.is_used}, Expires: {reset_token.expires_at}")
            return jsonify({'error': 'Invalid or expired reset link'}), 400
        
        # Find the user
        if reset_token.user_type == 'staff':
            user = Staff.query.get(reset_token.user_id)
        else:
            user = Student.query.get(reset_token.user_id)
        
        if not user:
            print(f"❌ User not found for ID: {reset_token.user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        # Update password
        user.password = new_password
        user.updated_at = datetime.datetime.utcnow()
        
        # Mark token as used
        reset_token.mark_as_used()
        
        db.session.commit()
        
        print(f"✅ Password reset successful for {reset_token.email}")
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Reset password error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': 'An error occurred'}), 500

def send_reset_email(email, token, first_name):
    """Send password reset email with logo"""
    try:
        # Create reset link - adjust the URL based on your frontend
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        
        # Get logo as base64
        logo_data = get_logo_base64()
        
        # If logo loaded successfully, use it, otherwise show text
        if logo_data:
            logo_html = f'<img src="{logo_data}" alt="Fargo Training Center Logo" style="max-width: 120px; max-height: 120px; width: auto; height: auto; border-radius: 8px; background: white; padding: 8px; display: inline-block;" />'
        else:
            logo_html = '<div style="color: white; font-size: 32px; font-weight: bold; margin: 10px 0;">FARGO</div>'
        
        # Get app instance for config
        from flask import current_app
        app = current_app._get_current_object()
        
        # Create email
        msg = Message(
            subject="Reset Your Password - Fargo Training Center",
            recipients=[email],
            sender=app.config.get('MAIL_DEFAULT_SENDER')
        )
        
        # HTML email content with logo
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f4f4f4;
                }}
                .container {{ 
                    max-width: 600px; 
                    margin: 20px auto; 
                    background: #ffffff; 
                    border-radius: 10px; 
                    overflow: hidden; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
                }}
                .header {{ 
                    background: linear-gradient(135deg, #f97316, #fb923c); 
                    color: white; 
                    padding: 20px; 
                    text-align: center; 
                }}
                .logo-container {{
                    margin-bottom: 15px;
                }}
                .logo {{
                    max-width: 120px;
                    max-height: 120px;
                    width: auto;
                    height: auto;
                    border-radius: 8px;
                    background: white;
                    padding: 8px;
                    display: inline-block;
                }}
                .header h1 {{ 
                    margin: 10px 0 0 0; 
                    font-size: 28px; 
                    font-weight: 600;
                }}
                .content {{ 
                    padding: 30px; 
                    background: #ffffff; 
                }}
                .content p {{ 
                    margin: 15px 0; 
                    font-size: 16px;
                }}
                .info-box {{
                    background: #f8f9fa;
                    border-left: 4px solid #f97316;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 5px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background: #f97316;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .button:hover {{
                    background: #fb923c;
                }}
                .footer {{ 
                    text-align: center; 
                    padding: 20px; 
                    background: #f8f9fa; 
                    color: #666; 
                    font-size: 12px; 
                    border-top: 1px solid #eee; 
                }}
                @media only screen and (max-width: 600px) {{
                    .container {{ margin: 10px; }}
                    .content {{ padding: 20px; }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo-container">
                        {logo_html}
                    </div>
                    <h1>Fargo Training Center</h1>
                </div>
                <div class="content">
                    <h2 style="color: #333;">Hello {first_name},</h2>
                    
                    <p>We received a request to reset your password for your Fargo Training Center account. Click the button below to create a new password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    
                    <div class="info-box">
                        <p><strong>🔐 Security Tips:</strong></p>
                        <p>• This link will expire in 24 hours</p>
                        <p>• Never share this link with anyone</p>
                        <p>• Choose a strong password you haven't used before</p>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px; color: #f97316; font-family: monospace;">{reset_link}</p>
                    
                    <p>If you didn't request a password reset, please ignore this email or contact our support team immediately.</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    
                    <p style="font-size: 14px; color: #666;">
                        <strong>Need help?</strong><br>
                        Contact us at: <a href="mailto:support@fargotraining.com" style="color: #f97316;">support@fargotraining.com</a>
                    </p>
                </div>
                <div class="footer">
                    <p>© {datetime.datetime.now().year} Fargo Training Center. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p style="margin-top: 10px; font-size: 11px;">
                        <a href="#" style="color: #f97316; text-decoration: none;">Visit our website</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version (for email clients that don't support HTML)
        text_content = f"""
Hello {first_name},

We received a request to reset your password for your Fargo Training Center account.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you didn't request a password reset, please ignore this email or contact support.

Security Tips:
• Never share this link with anyone
• Choose a strong password you haven't used before

© {datetime.datetime.now().year} Fargo Training Center
        """
        
        msg.html = html_content
        msg.body = text_content
        
        # Send email
        mail.send(msg)
        print(f"✅ Reset email with logo sent to {email}")
        
    except Exception as e:
        print(f"❌ Failed to send reset email: {str(e)}")
        traceback.print_exc()
        raise  # Re-raise to be caught by the caller

@bp.route('/verify-reset-token/<token>', methods=['GET'])
def verify_reset_token(token):
    """Verify if a reset token is valid"""
    try:
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token:
            return jsonify({'valid': False, 'error': 'Token not found'}), 404
        
        if not reset_token.is_valid():
            return jsonify({'valid': False, 'error': 'Token expired or already used'}), 400
        
        return jsonify({
            'valid': True,
            'email': reset_token.email,
            'user_type': reset_token.user_type
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500