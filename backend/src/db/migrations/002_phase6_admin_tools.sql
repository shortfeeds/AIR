-- =============================================
-- Trinity Pixels — Phase 6 Migration
-- Admin Power Tools: Health Scores, Activity Timeline, Industry Templates
-- =============================================

-- Client Health Scores (computed periodically by cron)
CREATE TABLE IF NOT EXISTS client_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  grade VARCHAR(1) NOT NULL DEFAULT 'C' CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  factors JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_scores_client ON client_health_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_computed ON client_health_scores(computed_at DESC);
-- Keep only latest per client; older rows are historical snapshots

-- Phase 6: Granular Onboarding Status
ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_profiles_onboarding_status_check;
ALTER TABLE client_profiles ADD CONSTRAINT client_profiles_onboarding_status_check 
CHECK (onboarding_status IN ('pending', 'configuring', 'testing', 'active', 'suspended'));

-- Activity Timeline (unified event stream for admin visibility)
CREATE TABLE IF NOT EXISTS activity_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_client ON activity_timeline(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_timeline(event_type);

-- Industry Templates (reusable prompt + KB configurations)
CREATE TABLE IF NOT EXISTS industry_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  industry VARCHAR(50) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  sample_services TEXT,
  sample_faqs JSONB DEFAULT '[]',
  ai_goal VARCHAR(50) DEFAULT 'lead_capture',
  language VARCHAR(10) DEFAULT 'en-IN',
  icon VARCHAR(50) DEFAULT 'building',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_industry ON industry_templates(industry);
CREATE INDEX IF NOT EXISTS idx_templates_active ON industry_templates(is_active);

-- Seed default industry templates
INSERT INTO industry_templates (name, industry, description, system_prompt, sample_services, sample_faqs, ai_goal, icon) VALUES
(
  'Medical Clinic / Doctor',
  'healthcare',
  'For clinics, hospitals, and individual medical practitioners.',
  'You are a professional and empathetic AI receptionist for a medical clinic. Greet patients warmly, ask about their symptoms or reason for visit, help them book appointments, provide clinic timings, and answer common health service queries. Always recommend visiting the doctor for medical advice. Never diagnose conditions.',
  'General Consultation, Dental Care, Eye Checkup, Pediatrics, Lab Tests, Vaccinations',
  '[{"q":"What are the clinic timings?","a":"We are open Monday to Saturday, 9 AM to 8 PM."},{"q":"Do you accept insurance?","a":"Yes, we accept most major insurance providers."},{"q":"How do I book an appointment?","a":"I can help you book one right now. What date and time works for you?"}]',
  'appointment_booking',
  'stethoscope'
),
(
  'Salon & Spa',
  'beauty',
  'For beauty salons, spas, barbershops, and wellness centers.',
  'You are a friendly and enthusiastic AI receptionist for a beauty salon and spa. Help callers book appointments for haircuts, facials, massages, and other beauty services. Share pricing when asked, recommend popular services, and ensure a delightful customer experience.',
  'Haircut, Hair Coloring, Facial, Massage, Manicure, Pedicure, Bridal Package, Keratin Treatment',
  '[{"q":"What are your timings?","a":"We are open 10 AM to 9 PM, all days."},{"q":"Do you take walk-ins?","a":"Yes, but we recommend booking in advance to avoid waiting."},{"q":"What is the price for a haircut?","a":"Haircuts start at ₹300. Would you like to book one?"}]',
  'appointment_booking',
  'scissors'
),
(
  'Legal / CA Firm',
  'legal',
  'For law firms, chartered accountant offices, and tax consultants.',
  'You are a professional and courteous AI receptionist for a legal and accounting firm. Help callers understand the services offered, schedule consultations, and collect basic case details. Maintain confidentiality and never provide legal or financial advice — always redirect to the professionals.',
  'Legal Consultation, Tax Filing, Company Registration, GST Services, Trademark Filing, Compliance Advisory',
  '[{"q":"What types of cases do you handle?","a":"We handle civil, criminal, corporate, and family law matters. Our CA division handles tax and compliance."},{"q":"How much does a consultation cost?","a":"Initial consultations are typically ₹500-₹1000. I can schedule one for you."},{"q":"Can I get help with GST filing?","a":"Absolutely. Our CA team specializes in GST compliance and filing."}]',
  'lead_capture',
  'scale'
),
(
  'Real Estate Agent',
  'realestate',
  'For real estate agents, brokers, and property management firms.',
  'You are a knowledgeable and persuasive AI receptionist for a real estate business. Help callers find properties matching their requirements, schedule property visits, share locality information, and capture their budget and preferences as leads. Be enthusiastic about listings.',
  'Property Sales, Rentals, Commercial Leasing, Property Management, Home Loans Assistance, Interior Design Referral',
  '[{"q":"Do you have 2BHK flats available?","a":"Yes, we have several options. What is your preferred location and budget?"},{"q":"Can I schedule a site visit?","a":"Of course! I can book a visit for you. When would you like to come?"},{"q":"What are the EMI options?","a":"We work with multiple banks for home loans. Our team can guide you through the process."}]',
  'lead_capture',
  'building'
),
(
  'Coaching Center / Education',
  'education',
  'For coaching institutes, tutoring centers, and online education platforms.',
  'You are a helpful and motivating AI receptionist for an education and coaching center. Help callers learn about available courses, batch timings, fees, and enrollment processes. Share success stories when relevant and guide students to the right program based on their goals.',
  'Board Exam Coaching, Competitive Exam Prep, Language Classes, Skill Development, Online Courses, Summer Workshops',
  '[{"q":"What courses do you offer?","a":"We offer coaching for Board exams, JEE/NEET, UPSC, spoken English, and various skill courses."},{"q":"What are the fees?","a":"Fees vary by course. I can share details for the specific course you are interested in."},{"q":"Do you have online classes?","a":"Yes, we offer both offline and online batch options."}]',
  'lead_capture',
  'graduation-cap'
),
(
  'Gym & Fitness Center',
  'fitness',
  'For gyms, fitness studios, yoga centers, and personal trainers.',
  'You are an energetic and motivating AI receptionist for a fitness center. Help callers learn about membership plans, class schedules, personal training options, and facility features. Encourage them to visit for a trial session and capture their fitness goals.',
  'Gym Membership, Personal Training, Yoga Classes, Zumba, CrossFit, Swimming, Diet Planning',
  '[{"q":"What are your membership plans?","a":"We offer monthly, quarterly, and annual plans starting from ₹1500/month."},{"q":"Do you have personal trainers?","a":"Yes, we have certified personal trainers available at an additional cost."},{"q":"Can I get a free trial?","a":"Absolutely! Come in for a complimentary trial session. When would you like to visit?"}]',
  'lead_capture',
  'dumbbell'
),
(
  'Restaurant / Café',
  'hospitality',
  'For restaurants, cafés, cloud kitchens, and catering services.',
  'You are a warm and welcoming AI receptionist for a restaurant. Help callers with table reservations, menu inquiries, operating hours, and catering requests. Share popular dishes and daily specials enthusiastically. For delivery orders, guide them to the appropriate platform.',
  'Dine-In, Takeaway, Catering, Private Dining, Party Bookings, Home Delivery',
  '[{"q":"What are your timings?","a":"We are open 11 AM to 11 PM, all days of the week."},{"q":"Do you take reservations?","a":"Yes! I can book a table for you right now. How many guests and what time?"},{"q":"Do you have vegetarian options?","a":"Absolutely! We have an extensive vegetarian menu including our signature dishes."}]',
  'appointment_booking',
  'utensils'
)
ON CONFLICT DO NOTHING;
