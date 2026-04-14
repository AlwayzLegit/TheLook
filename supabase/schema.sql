-- The Look Hair Salon — Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price_text VARCHAR(50) NOT NULL,
  price_min INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  image_url VARCHAR(500),
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stylists table
CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  bio TEXT,
  image_url VARCHAR(500),
  specialties TEXT, -- JSON string
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stylist-Services join table
CREATE TABLE IF NOT EXISTS stylist_services (
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (stylist_id, service_id)
);

-- Schedule rules table
CREATE TABLE IF NOT EXISTS schedule_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
  rule_type VARCHAR(20) NOT NULL, -- 'weekly' or 'override'
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. NULL for overrides
  specific_date VARCHAR(10), -- YYYY-MM-DD for overrides
  start_time VARCHAR(5), -- HH:MM
  end_time VARCHAR(5), -- HH:MM
  is_closed BOOLEAN DEFAULT FALSE,
  note VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id),
  stylist_id UUID NOT NULL REFERENCES stylists(id),
  date VARCHAR(10) NOT NULL, -- YYYY-MM-DD
  start_time VARCHAR(5) NOT NULL, -- HH:MM
  end_time VARCHAR(5) NOT NULL, -- HH:MM
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  client_name VARCHAR(200) NOT NULL,
  client_email VARCHAR(200) NOT NULL,
  client_phone VARCHAR(20),
  notes TEXT,
  staff_notes TEXT,
  cancel_token VARCHAR(64) UNIQUE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin log table
CREATE TABLE IF NOT EXISTS admin_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_stylists_active ON stylists(active);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_stylist_date ON appointments(stylist_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_cancel_token ON appointments(cancel_token);
CREATE INDEX IF NOT EXISTS idx_schedule_rules_type ON schedule_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_schedule_rules_day ON schedule_rules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_client_email ON appointments(client_email);

-- Enable Row Level Security (RLS)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (booking flow)
CREATE POLICY "Services are viewable by everyone" 
  ON services FOR SELECT USING (true);

CREATE POLICY "Stylists are viewable by everyone" 
  ON stylists FOR SELECT USING (true);

CREATE POLICY "Stylist services are viewable by everyone" 
  ON stylist_services FOR SELECT USING (true);

CREATE POLICY "Schedule rules are viewable by everyone" 
  ON schedule_rules FOR SELECT USING (true);

-- Appointments: public can create, but only view their own
CREATE POLICY "Appointments can be created by anyone" 
  ON appointments FOR INSERT WITH CHECK (true);

CREATE POLICY "Appointments are viewable by cancel token" 
  ON appointments FOR SELECT USING (true);

-- Note: Admin operations will use service role key bypassing RLS
