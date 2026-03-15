from flask import Blueprint, request, jsonify, current_app
from app import db, mail
from app.models.notification import Notification, Template
from app.models.student import Student
from app.models.registration import Registration
from datetime import datetime
from flask_mail import Message
import os
import base64
import traceback

bp = Blueprint('notifications', __name__)

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

def send_email(subject, recipients, html_body):
    """Send email using Flask-Mail (synchronous for debugging)"""
    try:
        app = current_app._get_current_object()
        
        # Log the attempt
        print(f"📧 Preparing email for: {recipients}")
        print(f"   Subject: {subject}")
        print(f"   Using sender: {app.config.get('MAIL_DEFAULT_SENDER')}")
        
        msg = Message(
            subject=subject,
            recipients=recipients if isinstance(recipients, list) else [recipients],
            html=html_body,
            sender=app.config.get('MAIL_DEFAULT_SENDER')
        )
        
        # Send synchronously to see real errors
        print(f"📧 Connecting to Gmail SMTP...")
        mail.send(msg)
        print(f"✅ Email sent successfully to {recipients}")
        return True, None
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Email error for {recipients}: {error_msg}")
        traceback.print_exc()
        
        # Check for specific Gmail errors
        if "Username and Password not accepted" in error_msg:
            print("   ⚠️  Gmail authentication failed - check your app password in .env file")
        elif "daily limit" in error_msg.lower():
            print("   ⚠️  Gmail daily sending limit reached")
        elif "Connection refused" in error_msg:
            print("   ⚠️  Cannot connect to Gmail - check your internet connection")
        
        return False, error_msg

def personalize_message(message, student_data):
    """Replace variables in message"""
    replacements = {
        '{{name}}': student_data.get('name', 'Student'),
        '{{first_name}}': student_data.get('first_name', ''),
        '{{last_name}}': student_data.get('last_name', ''),
        '{{amount}}': student_data.get('amount', '0.00'),
        '{{course}}': student_data.get('course', ''),
        '{{date}}': student_data.get('date', ''),
        '{{branch}}': student_data.get('branch', 'Head Office'),
        '{{outstanding}}': student_data.get('outstanding', '0.00'),
        '{{registration_number}}': student_data.get('registration_number', '')
    }
    
    original = message
    for key, value in replacements.items():
        message = message.replace(key, str(value))
    
    if original != message:
        print(f"   📝 Personalized message with student data")
    
    return message

def create_html_template(content):
    """Create HTML email template with embedded logo"""
    current_year = datetime.now().year
    logo_data = get_logo_base64()
    
    # If logo loaded successfully, use it, otherwise show text
    if logo_data:
        logo_html = f'<img src="{logo_data}" alt="Fargo Training Center Logo" style="max-width: 120px; max-height: 120px; width: auto; height: auto; border-radius: 8px; background: white; padding: 8px; display: inline-block;" />'
    else:
        logo_html = '<div style="color: white; font-size: 32px; font-weight: bold; margin: 10px 0;">FARGO</div>'
    
    return f"""
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
                padding: 30px 20px; 
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
            .info-box p {{
                margin: 5px 0;
            }}
            .footer {{ 
                text-align: center; 
                padding: 20px; 
                background: #f8f9fa; 
                color: #666; 
                font-size: 12px; 
                border-top: 1px solid #eee; 
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
                {content}
            </div>
            <div class="footer">
                <p>© {current_year} Fargo Training Center. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
                <p style="margin-top: 10px; font-size: 11px;">
                    <a href="#" style="color: #f97316; text-decoration: none;">Visit our website</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

@bp.route('/send', methods=['POST'])
def send_notification():
    """Send email notifications"""
    try:
        data = request.get_json()
        
        # Validate
        if not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
        if not data.get('subject'):
            return jsonify({'error': 'Subject is required'}), 400
        if not data.get('recipients') or len(data['recipients']) == 0:
            return jsonify({'error': 'Recipients are required'}), 400
        
        print(f"\n{'='*60}")
        print(f"📧 SENDING NOTIFICATION")
        print(f"   Recipients: {len(data['recipients'])}")
        print(f"   Subject: {data['subject']}")
        print(f"{'='*60}\n")
        
        # Create notification record
        notification = Notification(
            subject=data['subject'],
            message=data['message'],
            recipient_count=len(data['recipients']),
            status='scheduled' if data.get('scheduled_at') else 'pending',
            scheduled_at=datetime.fromisoformat(data['scheduled_at']) if data.get('scheduled_at') else None
        )
        
        db.session.add(notification)
        db.session.commit()
        print(f"📝 Created notification ID: {notification.id}")
        
        # Send emails
        sent_count = 0
        failed = []
        
        for idx, email in enumerate(data['recipients'], 1):
            print(f"\n--- Processing recipient {idx}/{len(data['recipients'])}: {email} ---")
            
            try:
                # Get student data if exists
                student = Student.query.filter_by(email=email).first()
                
                if student:
                    print(f"   Found student: {student.first_name} {student.last_name} (ID: {student.id})")
                else:
                    print(f"   No student record found for {email}, using email as name")
                
                student_data = {
                    'name': f"{student.first_name} {student.last_name}" if student else email,
                    'first_name': student.first_name if student else '',
                    'last_name': student.last_name if student else '',
                    'email': email
                }
                
                # Get registration data if student exists
                if student:
                    # Get the most recent registration with outstanding balance
                    reg = Registration.query.filter_by(
                        student_id=student.id
                    ).filter(
                        Registration.outstanding_balance > 0
                    ).first()
                    
                    if reg:
                        print(f"   Found registration: {reg.course_name}")
                        print(f"   Outstanding: ₵{reg.outstanding_balance}")
                        student_data.update({
                            'course': reg.course_name,
                            'branch': reg.branch,
                            'amount': f"{reg.outstanding_balance:.2f}" if reg.outstanding_balance else "0.00",
                            'outstanding': f"{reg.outstanding_balance:.2f}" if reg.outstanding_balance else "0.00",
                            'registration_number': reg.registration_number,
                            'date': reg.registration_date.strftime('%d/%m/%Y') if reg.registration_date else ''
                        })
                    else:
                        print(f"   No registration with outstanding balance found")
                
                # Personalize message
                personalized_subject = personalize_message(data['subject'], student_data)
                personalized_message = personalize_message(data['message'], student_data)
                
                # Create HTML with embedded logo
                html_content = create_html_template(personalized_message.replace('\n', '<br>'))
                
                # Send synchronously to see real results
                success, error = send_email(personalized_subject, [email], html_content)
                
                if success:
                    sent_count += 1
                    print(f"✅ SUCCESS: Email sent to {email}")
                else:
                    failed.append({'email': email, 'error': error})
                    print(f"❌ FAILED: {email} - {error}")
                    
            except Exception as e:
                failed.append({'email': email, 'error': str(e)})
                print(f"❌ EXCEPTION for {email}: {str(e)}")
                traceback.print_exc()
        
        # Update notification
        notification.status = 'sent' if sent_count > 0 else 'failed'
        notification.sent_at = datetime.utcnow()
        db.session.commit()
        
        print(f"\n{'='*60}")
        print(f"📊 SUMMARY")
        print(f"   Total: {len(data['recipients'])}")
        print(f"   Sent: {sent_count}")
        print(f"   Failed: {len(failed)}")
        if failed:
            print(f"   Failed recipients:")
            for f in failed:
                print(f"     - {f['email']}: {f['error'][:100]}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'message': 'Emails processed',
            'sent_count': sent_count,
            'total_recipients': len(data['recipients']),
            'failed_recipients': failed,
            'notification': notification.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Fatal error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/test-email', methods=['GET'])
def test_email():
    """Test email sending with embedded logo"""
    try:
        test_email = os.environ.get('EMAIL_USER')
        if not test_email:
            test_email = 'agyekumoxgood@gmail.com'
            
        print(f"\n📧 Sending test email to: {test_email}")
        
        # Create a test message with logo
        test_content = """
        <h2 style="color: #f97316;">✨ Test Email with Embedded Logo ✨</h2>
        
        <p>If you receive this email with the Fargo Training Center logo at the top, 
        your email system is working perfectly!</p>
        
        <div class="info-box">
            <p><strong>✓ Logo is embedded directly in the email</strong></p>
            <p><strong>✓ No external internet needed to view logo</strong></p>
            <p><strong>✓ HTML template is working</strong></p>
            <p><strong>✓ Variables can be personalized</strong></p>
        </div>
        
        <p>This confirms that your email configuration is correct and the logo is properly embedded.</p>
        
        <p style="margin-top: 20px;">
            <a href="#" class="button">View Your Account</a>
        </p>
        
        <p style="margin-top: 20px; font-style: italic; color: #666;">
            This is an automated test message from Fargo Training Center.
        </p>
        """
        
        html_content = create_html_template(test_content)
        
        success, error = send_email(
            subject="Test Email with Embedded Logo - Fargo Training Center",
            recipients=[test_email],
            html_body=html_content
        )
        
        if success:
            print("✅ Test email sent successfully")
            return jsonify({'message': '✅ Test email with embedded logo sent successfully! Check your inbox.'}), 200
        else:
            print(f"❌ Test email failed: {error}")
            return jsonify({'error': error}), 500
    except Exception as e:
        print(f"❌ Test email exception: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['GET'])
def get_notifications():
    """Get notification history"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        pagination = Notification.query.order_by(
            Notification.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        notifications = []
        for n in pagination.items:
            notif_dict = n.to_dict()
            # Truncate long messages for display
            if len(notif_dict.get('message', '')) > 100:
                notif_dict['message'] = notif_dict['message'][:100] + '...'
            notifications.append(notif_dict)
        
        return jsonify({
            'notifications': notifications,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching notifications: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates', methods=['GET'])
def get_templates():
    """Get all templates"""
    try:
        templates = Template.query.order_by(Template.name).all()
        return jsonify({
            'templates': [t.to_dict() for t in templates]
        }), 200
    except Exception as e:
        print(f"❌ Error fetching templates: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates', methods=['POST'])
def create_template():
    """Create new template"""
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Template name is required'}), 400
        if not data.get('subject'):
            return jsonify({'error': 'Subject is required'}), 400
        if not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
        
        # Check if name exists
        if Template.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Template name already exists'}), 400
        
        template = Template(
            name=data['name'],
            subject=data['subject'],
            message=data['message']
        )
        
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'message': 'Template created successfully',
            'template': template.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating template: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/<int:template_id>', methods=['PUT'])
def update_template(template_id):
    """Update template"""
    try:
        template = Template.query.get_or_404(template_id)
        data = request.get_json()
        
        if data.get('name'):
            existing = Template.query.filter(
                Template.name == data['name'],
                Template.id != template_id
            ).first()
            if existing:
                return jsonify({'error': 'Template name already exists'}), 400
            template.name = data['name']
        
        if data.get('subject'):
            template.subject = data['subject']
        if data.get('message'):
            template.message = data['message']
        
        template.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Template updated successfully',
            'template': template.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error updating template: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete template"""
    try:
        template = Template.query.get_or_404(template_id)
        db.session.delete(template)
        db.session.commit()
        
        return jsonify({'message': 'Template deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error deleting template: {str(e)}")
        return jsonify({'error': str(e)}), 500