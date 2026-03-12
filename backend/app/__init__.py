from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from config import config
import os

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()

def create_app(config_name='default'):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions with app
    db.init_app(app)
    bcrypt.init_app(app)
    
    # FIX CORS - Allow all origins for development
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    
    # Register blueprints/routes
    from app.routes import (
        student_bp, registration_bp, staff_bp, 
        auth_bp, course_bp, payment_bp  # ADD payment_bp HERE
    )
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(student_bp, url_prefix='/api/students')
    app.register_blueprint(registration_bp, url_prefix='/api/registrations')
    app.register_blueprint(staff_bp, url_prefix='/api/staff')
    app.register_blueprint(course_bp, url_prefix='/api/courses')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')  # ADD THIS LINE
    
    # Simple test route
    @app.route('/api/test', methods=['GET'])
    def test():
        return jsonify({'message': 'CORS is working!'})
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'app': app.config.get('APP_NAME'),
            'version': app.config.get('VERSION')
        })
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Create default admin if doesn't exist
            from app.models import Staff
            
            admin_exists = Staff.query.filter_by(role='admin').first()
            if not admin_exists:
                default_admin = Staff(
                    staff_id='ADMIN-001',
                    first_name='Super',
                    last_name='Admin',
                    email='admin@school.edu',
                    phone='233200000000',
                    role='admin',
                    branch='Head Office',
                    password='admin123'
                )
                db.session.add(default_admin)
                db.session.commit()
                print("✅ Default admin created: admin@school.edu / admin123")
                
        except Exception as e:
            print(f"❌ Error creating database: {e}")
    
    return app