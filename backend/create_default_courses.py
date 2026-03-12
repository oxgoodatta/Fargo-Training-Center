from app import create_app, db
from app.models import Course

app = create_app('development')

with app.app_context():
    # Define default courses
    default_courses = [
        {
            'name': 'Forklift Training',
            'description': 'Comprehensive forklift operation and safety training',
            'duration': '2 weeks',
            'registration_fee': 100.0,
            'tuition_fee': 900.0,
        },
        {
            'name': 'Truck Driving',
            'description': 'Professional truck driving and road safety',
            'duration': '1 month',
            'registration_fee': 150.0,
            'tuition_fee': 1850.0,
        },
        {
            'name': 'Excavator Training',
            'description': 'Heavy equipment operation and maintenance',
            'duration': '3 weeks',
            'registration_fee': 200.0,
            'tuition_fee': 2300.0,
        },
        {
            'name': 'Graphics and Web Design',
            'description': 'Modern web and graphic design skills',
            'duration': '3 months',
            'registration_fee': 150.0,
            'tuition_fee': 1350.0,
        },
        {
            'name': 'General Cosmetology',
            'description': 'Beauty and hair styling techniques',
            'duration': '2 months',
            'registration_fee': 100.0,
            'tuition_fee': 900.0,
        },
        {
            'name': 'CCTV Installation',
            'description': 'Security camera systems installation and maintenance',
            'duration': '1 month',
            'registration_fee': 150.0,
            'tuition_fee': 1150.0,
        },
        {
            'name': 'AC and Solar System Installation',
            'description': 'Air conditioning and solar power systems installation',
            'duration': '2 months',
            'registration_fee': 200.0,
            'tuition_fee': 1800.0,
        }
    ]
    
    # Generate course codes
    for i, course_data in enumerate(default_courses, 1):
        words = course_data['name'].split()
        if len(words) == 1:
            code = words[0][:4].upper()
        else:
            code = ''.join(word[0] for word in words[:3]).upper()
        
        course_code = f"{code}-{i:03d}"
        
        # Check if course already exists
        existing = Course.query.filter_by(name=course_data['name']).first()
        if not existing:
            course = Course(
                course_code=course_code,
                name=course_data['name'],
                description=course_data['description'],
                duration=course_data['duration'],
                registration_fee=course_data['registration_fee'],
                tuition_fee=course_data['tuition_fee']
            )
            db.session.add(course)
            print(f"Created: {course_code} - {course_data['name']}")
    
    db.session.commit()
    print("\n✅ Default courses created successfully!")