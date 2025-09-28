-- Initial seed data for the pipeline management system

-- Insert initial locations with geofencing coordinates
INSERT OR IGNORE INTO locations (id, name, aliases, bbox_coordinates, center_lat, center_lon) VALUES
('nyc-location', 'New York City', '["nyc", "new york", "manhattan", "brooklyn", "queens", "bronx", "staten island"]',
 '{"min_lat": 40.4774, "min_lon": -74.2591, "max_lat": 40.9176, "max_lon": -73.7004}', 40.7128, -74.0060),

('seattle-location', 'Seattle', '["seattle", "sea", "emerald city"]',
 '{"min_lat": 47.4818, "min_lon": -122.4596, "max_lat": 47.7341, "max_lon": -122.2244}', 47.6062, -122.3321),

('tampa-location', 'Tampa', '["tampa", "tampa bay", "cigar city"]',
 '{"min_lat": 27.8353, "min_lon": -82.6424, "max_lat": 28.0648, "max_lon": -82.2817}', 27.9506, -82.4572),

('miami-location', 'Miami', '["miami", "magic city", "the 305"]',
 '{"min_lat": 25.6937, "min_lon": -80.3842, "max_lat": 25.8557, "max_lon": -80.1212}', 25.7617, -80.1918),

('los-angeles-location', 'Los Angeles', '["los angeles", "la", "city of angels", "hollywood"]',
 '{"min_lat": 33.7037, "min_lon": -118.6681, "max_lat": 34.3373, "max_lon": -118.1553}', 34.0522, -118.2437),

('chicago-location', 'Chicago', '["chicago", "chi-town", "the windy city", "second city"]',
 '{"min_lat": 41.6445, "min_lon": -87.9403, "max_lat": 42.0230, "max_lon": -87.5240}', 41.8781, -87.6298),

('boston-location', 'Boston', '["boston", "beantown", "the hub"]',
 '{"min_lat": 42.2279, "min_lon": -71.1910, "max_lat": 42.4002, "max_lon": -70.9228}', 42.3601, -71.0589),

('san-francisco-location', 'San Francisco', '["san francisco", "sf", "the city", "frisco"]',
 '{"min_lat": 37.6398, "min_lon": -123.1738, "max_lat": 37.9298, "max_lon": -122.2817}', 37.7749, -122.4194);

-- Insert a default admin user (password: 'admin123' - should be changed immediately)
-- Password hash is bcrypt of 'admin123'
INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES
('admin-user-1', 'admin@echoridge.com', '$2b$12$dOZF.5V1DrjV0UQ3Dg1wHuI62hecpOljLP/Df4p5mIixya28kvnEa', 'admin');