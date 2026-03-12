# init_db.py
from app import create_app, db
from app.models import Student, Staff, Registration, Course, FeePayment

app = create_app('development')
with app.app_context():
    db.create_all()
    print('✅ Database created successfully!')
    
    # Check if admin already exists
    admin = Staff.query.filter_by(email='admin@school.edu').first()
    if not admin:
        admin = Staff(
            staff_id='ADMIN-001',
            first_name='Super',
            last_name='Admin',
            email='admin@school.edu',
            phone='233200000000',
            role='admin',
            branch='Head Office',
            password='admin123'
        )
        db.session.add(admin)
        db.session.commit()
        print('✅ Default admin created: admin@school.edu / admin123')
    else:
        print('✅ Admin already exists')