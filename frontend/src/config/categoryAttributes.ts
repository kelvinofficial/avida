// Category-specific attribute configurations
// This defines exactly which fields to show for each category

export interface AttributeField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'toggle' | 'date';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  dependsOn?: string; // For dependent dropdowns
  dependentOptions?: Record<string, string[]>; // Options based on parent value
  suffix?: string; // e.g., "km", "sqm"
  min?: number;
  max?: number;
}

export interface CategoryAttributeConfig {
  id: string;
  name: string;
  icon: string;
  attributes: AttributeField[];
  conditionOptions?: string[];
}

// ============ AUTO / VEHICLES ============
const AUTO_BRANDS = ['Audi', 'BMW', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mini', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat', 'Skoda', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Other'];
const AUTO_MODELS: Record<string, string[]> = {
  'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'Z4', 'M3', 'M4', 'M5', 'Other'],
  'Mercedes-Benz': ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'AMG GT', 'Other'],
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'Other'],
  'Volkswagen': ['Golf', 'Polo', 'Passat', 'Tiguan', 'T-Roc', 'Arteon', 'ID.3', 'ID.4', 'Touareg', 'Other'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck', 'Other'],
  'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman', 'Other'],
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Yaris', 'Land Cruiser', 'Prius', 'C-HR', 'Supra', 'Other'],
  'Ford': ['Focus', 'Fiesta', 'Mustang', 'Kuga', 'Puma', 'Explorer', 'Ranger', 'Other'],
  'Other': ['Other']
};

export const VEHICLES_CONFIG: CategoryAttributeConfig = {
  id: 'vehicles',
  name: 'Auto & Vehicles',
  icon: 'car-outline',
  conditionOptions: ['New', 'Like New', 'Good', 'Fair', 'For Parts'],
  attributes: [
    { name: 'brand', label: 'Brand', type: 'select', options: AUTO_BRANDS, required: true },
    { name: 'model', label: 'Model', type: 'select', required: true, dependsOn: 'brand', dependentOptions: AUTO_MODELS },
    { name: 'year', label: 'Year', type: 'number', placeholder: '2020', min: 1950, max: 2026, required: true },
    { name: 'mileage', label: 'Mileage', type: 'number', placeholder: '50000', suffix: 'km', required: true },
    { name: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid', 'LPG', 'CNG'], required: true },
    { name: 'transmission', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT'], required: true },
    { name: 'engine_size', label: 'Engine Size', type: 'text', placeholder: '2.0L' },
    { name: 'color', label: 'Color', type: 'select', options: ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Yellow', 'Orange', 'Other'] },
    { name: 'body_type', label: 'Body Type', type: 'select', options: ['Sedan', 'Hatchback', 'SUV', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Pickup'] },
    { name: 'doors', label: 'Doors', type: 'select', options: ['2', '3', '4', '5'] },
  ]
};

// ============ MOBILE & TABLETS ============
const MOBILE_BRANDS = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Huawei', 'Sony', 'Oppo', 'Vivo', 'Nokia', 'Motorola', 'Other'];
const MOBILE_MODELS: Record<string, string[]> = {
  'Apple': ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone SE', 'iPad Pro', 'iPad Air', 'iPad', 'iPad Mini', 'Other'],
  'Samsung': ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy A54', 'Galaxy Tab S9', 'Other'],
  'Google': ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7a', 'Pixel Fold', 'Other'],
  'OnePlus': ['OnePlus 12', 'OnePlus 11', 'OnePlus Nord', 'Other'],
  'Other': ['Other']
};

export const ELECTRONICS_CONFIG: CategoryAttributeConfig = {
  id: 'electronics',
  name: 'Electronics & Mobile',
  icon: 'phone-portrait-outline',
  conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
  attributes: [
    { name: 'device_type', label: 'Device Type', type: 'select', options: ['Smartphone', 'Tablet', 'Laptop', 'Desktop', 'TV', 'Audio', 'Camera', 'Gaming Console', 'Wearable', 'Other'], required: true },
    { name: 'brand', label: 'Brand', type: 'select', options: MOBILE_BRANDS, required: true },
    { name: 'model', label: 'Model', type: 'select', dependsOn: 'brand', dependentOptions: MOBILE_MODELS, required: true },
    { name: 'storage', label: 'Storage', type: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB', 'Other'] },
    { name: 'ram', label: 'RAM', type: 'select', options: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB', 'Other'] },
    { name: 'screen_size', label: 'Screen Size', type: 'text', placeholder: '6.7 inch' },
    { name: 'battery_health', label: 'Battery Health', type: 'select', options: ['100%', '95-99%', '90-94%', '85-89%', '80-84%', 'Below 80%', 'Unknown'] },
    { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', '6+ Months Left', 'Expired', 'None'] },
    { name: 'color', label: 'Color', type: 'text', placeholder: 'Space Gray' },
    { name: 'accessories_included', label: 'Accessories Included', type: 'toggle' },
    { name: 'original_box', label: 'Original Box', type: 'toggle' },
  ]
};

// ============ PROPERTIES ============
export const REALESTATE_CONFIG: CategoryAttributeConfig = {
  id: 'realestate',
  name: 'Properties',
  icon: 'business-outline',
  conditionOptions: ['New Build', 'Renovated', 'Good', 'Needs Renovation'],
  attributes: [
    { name: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Studio', 'Penthouse', 'Villa', 'Townhouse', 'Loft', 'Commercial', 'Land'], required: true },
    { name: 'purpose', label: 'For', type: 'select', options: ['Rent', 'Sale'], required: true },
    { name: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5', '6+'], required: true },
    { name: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4', '5+'], required: true },
    { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '85', suffix: 'm²', required: true },
    { name: 'floor', label: 'Floor', type: 'select', options: ['Ground', '1', '2', '3', '4', '5', '6-10', '10+', 'Penthouse'] },
    { name: 'total_floors', label: 'Total Floors in Building', type: 'number', placeholder: '5' },
    { name: 'furnished', label: 'Furnished', type: 'select', options: ['Fully Furnished', 'Partially Furnished', 'Unfurnished'] },
    { name: 'parking', label: 'Parking', type: 'select', options: ['Garage', 'Outdoor Parking', 'Street Parking', 'No Parking'] },
    { name: 'year_built', label: 'Year Built', type: 'number', placeholder: '2015' },
    { name: 'energy_rating', label: 'Energy Rating', type: 'select', options: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'Unknown'] },
    { name: 'available_from', label: 'Available From', type: 'select', options: ['Immediately', 'Within 1 Month', 'Within 3 Months', 'Negotiable'] },
    { name: 'pets_allowed', label: 'Pets Allowed', type: 'toggle' },
    { name: 'balcony', label: 'Balcony/Terrace', type: 'toggle' },
    { name: 'elevator', label: 'Elevator', type: 'toggle' },
  ]
};

// ============ BIKES ============
export const BIKES_CONFIG: CategoryAttributeConfig = {
  id: 'bikes',
  name: 'Bicycles',
  icon: 'bicycle-outline',
  conditionOptions: ['New', 'Like New', 'Good', 'Fair', 'For Parts'],
  attributes: [
    { name: 'bike_type', label: 'Bike Type', type: 'select', options: ['Road Bike', 'Mountain Bike', 'E-Bike', 'City/Urban', 'Hybrid', 'BMX', 'Folding', 'Gravel', 'Kids Bike', 'Other'], required: true },
    { name: 'brand', label: 'Brand', type: 'select', options: ['Canyon', 'Trek', 'Specialized', 'Giant', 'Scott', 'Cube', 'Cannondale', 'BMC', 'Bianchi', 'Santa Cruz', 'Brompton', 'Other'], required: true },
    { name: 'frame_size', label: 'Frame Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', '48cm', '50cm', '52cm', '54cm', '56cm', '58cm', '60cm', 'One Size'] },
    { name: 'wheel_size', label: 'Wheel Size', type: 'select', options: ['16 inch', '20 inch', '24 inch', '26 inch', '27.5 inch', '29 inch', '700c'] },
    { name: 'gear_count', label: 'Gears', type: 'select', options: ['Single Speed', '3', '7', '8', '9', '10', '11', '12', '18', '21', '24', '27', '30+'] },
    { name: 'brake_type', label: 'Brake Type', type: 'select', options: ['Disc (Hydraulic)', 'Disc (Mechanical)', 'Rim Brake', 'Coaster Brake'] },
    { name: 'suspension', label: 'Suspension', type: 'select', options: ['None (Rigid)', 'Front Only (Hardtail)', 'Full Suspension'] },
    { name: 'frame_material', label: 'Frame Material', type: 'select', options: ['Carbon', 'Aluminum', 'Steel', 'Titanium', 'Other'] },
    { name: 'color', label: 'Color', type: 'text', placeholder: 'Black/Red' },
  ]
};

// ============ SERVICES ============
export const SERVICES_CONFIG: CategoryAttributeConfig = {
  id: 'services',
  name: 'Services',
  icon: 'construct-outline',
  attributes: [
    { name: 'service_type', label: 'Service Type', type: 'select', options: ['Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring', 'IT Support', 'Photography', 'Personal Training', 'Gardening', 'Renovation', 'Interior Design', 'Translation', 'Other'], required: true },
    { name: 'experience_years', label: 'Years of Experience', type: 'select', options: ['Less than 1', '1-2', '3-5', '5-10', '10+'], required: true },
    { name: 'pricing_model', label: 'Pricing', type: 'select', options: ['Hourly Rate', 'Fixed Price', 'Per Project', 'Per Session', 'Per Day'], required: true },
    { name: 'availability', label: 'Availability', type: 'select', options: ['Weekdays Only', 'Weekends Only', 'Flexible', '24/7', 'By Appointment'] },
    { name: 'service_area', label: 'Service Area', type: 'text', placeholder: 'Berlin and surrounding areas' },
    { name: 'response_time', label: 'Response Time', type: 'select', options: ['Same Day', 'Within 24 Hours', 'Within 48 Hours', 'Within a Week'] },
    { name: 'certifications', label: 'Certifications', type: 'text', placeholder: 'Licensed, Insured, TÜV Certified' },
    { name: 'languages', label: 'Languages', type: 'text', placeholder: 'German, English' },
  ]
};

// ============ JOBS ============
export const JOBS_CONFIG: CategoryAttributeConfig = {
  id: 'jobs',
  name: 'Jobs',
  icon: 'briefcase-outline',
  attributes: [
    { name: 'job_title', label: 'Job Title', type: 'text', placeholder: 'Software Engineer', required: true },
    { name: 'job_type', label: 'Employment Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Mini-Job'], required: true },
    { name: 'salary_type', label: 'Salary Type', type: 'select', options: ['Annual Salary', 'Monthly Salary', 'Hourly Rate', 'Negotiable', 'Not Disclosed'] },
    { name: 'salary_range', label: 'Salary Range', type: 'text', placeholder: '€50,000 - €70,000' },
    { name: 'experience_required', label: 'Experience Required', type: 'select', options: ['Entry Level', '1-2 Years', '3-5 Years', '5-10 Years', '10+ Years', 'No Experience'] },
    { name: 'education_level', label: 'Education Level', type: 'select', options: ['High School', 'Vocational Training', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'Not Required'] },
    { name: 'industry', label: 'Industry', type: 'select', options: ['Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Education', 'Manufacturing', 'Hospitality', 'Retail', 'Other'] },
    { name: 'remote', label: 'Remote Work', type: 'select', options: ['Fully Remote', 'Hybrid', 'On-site Only'] },
    { name: 'start_date', label: 'Start Date', type: 'select', options: ['Immediately', 'Within 1 Month', 'Within 3 Months', 'Flexible'] },
    { name: 'benefits', label: 'Benefits', type: 'text', placeholder: 'Health Insurance, 401k, Flexible Hours' },
  ]
};

// ============ FURNITURE ============
export const FURNITURE_CONFIG: CategoryAttributeConfig = {
  id: 'home',
  name: 'Home & Furniture',
  icon: 'home-outline',
  conditionOptions: ['New', 'Like New', 'Good', 'Fair', 'Needs Repair'],
  attributes: [
    { name: 'furniture_type', label: 'Furniture Type', type: 'select', options: ['Sofa', 'Bed', 'Dining Table', 'Desk', 'Chair', 'Wardrobe', 'Bookshelf', 'TV Stand', 'Coffee Table', 'Dresser', 'Outdoor Furniture', 'Other'], required: true },
    { name: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Leather', 'Fabric', 'Glass', 'Plastic', 'Rattan', 'Mixed'], required: true },
    { name: 'dimensions', label: 'Dimensions (L×W×H)', type: 'text', placeholder: '180×90×75 cm' },
    { name: 'color', label: 'Color', type: 'text', placeholder: 'White Oak', required: true },
    { name: 'brand', label: 'Brand', type: 'select', options: ['IKEA', 'BoConcept', 'West Elm', 'Muuto', 'Hay', 'Habitat', 'Custom Made', 'Unknown', 'Other'] },
    { name: 'assembly_required', label: 'Assembly Required', type: 'toggle' },
    { name: 'weight', label: 'Weight (approx)', type: 'text', placeholder: '25 kg' },
    { name: 'style', label: 'Style', type: 'select', options: ['Modern', 'Classic', 'Scandinavian', 'Industrial', 'Vintage', 'Minimalist', 'Rustic'] },
  ]
};

// ============ FASHION ============
export const FASHION_CONFIG: CategoryAttributeConfig = {
  id: 'fashion',
  name: 'Fashion & Accessories',
  icon: 'shirt-outline',
  conditionOptions: ['New with Tags', 'Like New', 'Good', 'Fair'],
  attributes: [
    { name: 'item_type', label: 'Item Type', type: 'select', options: ['Clothing', 'Shoes', 'Bags', 'Watches', 'Jewelry', 'Accessories', 'Sunglasses', 'Belts', 'Scarves'], required: true },
    { name: 'category', label: 'For', type: 'select', options: ['Men', 'Women', 'Kids', 'Unisex'], required: true },
    { name: 'brand', label: 'Brand', type: 'text', placeholder: 'Nike, Gucci, Zara...', required: true },
    { name: 'size', label: 'Size', type: 'text', placeholder: 'M, 42, US 9', required: true },
    { name: 'color', label: 'Color', type: 'text', placeholder: 'Black', required: true },
    { name: 'material', label: 'Material', type: 'text', placeholder: 'Cotton, Leather, Wool...' },
    { name: 'original', label: 'Authentic/Original', type: 'select', options: ['Yes - With Receipt', 'Yes - No Receipt', 'Unknown'] },
    { name: 'style', label: 'Style', type: 'select', options: ['Casual', 'Formal', 'Sport', 'Vintage', 'Designer', 'Streetwear'] },
  ]
};

// ============ BEAUTY & PERSONAL ============
export const BEAUTY_CONFIG: CategoryAttributeConfig = {
  id: 'beauty',
  name: 'Beauty & Personal Care',
  icon: 'sparkles-outline',
  conditionOptions: ['New/Sealed', 'Lightly Used', 'Partially Used'],
  attributes: [
    { name: 'product_type', label: 'Product Type', type: 'select', options: ['Skincare', 'Makeup', 'Hair Care', 'Perfume', 'Grooming', 'Beauty Device', 'Nail Care', 'Body Care', 'Other'], required: true },
    { name: 'brand', label: 'Brand', type: 'text', placeholder: 'La Mer, Chanel, MAC...', required: true },
    { name: 'skin_hair_type', label: 'Suitable For', type: 'text', placeholder: 'All Skin Types, Dry Hair...' },
    { name: 'usage_state', label: 'Usage State', type: 'select', options: ['New/Sealed', '90%+ Remaining', '70-90% Remaining', '50-70% Remaining', 'Less than 50%'], required: true },
    { name: 'expiry_date', label: 'Expiry Date', type: 'text', placeholder: '2026-12' },
    { name: 'authenticity', label: 'Authentic', type: 'select', options: ['Yes - With Proof', 'Yes - No Proof', 'Unknown'] },
    { name: 'quantity', label: 'Quantity/Size', type: 'text', placeholder: '100ml, Set of 3' },
  ]
};

// ============ LEISURE & ACTIVITIES ============
export const LEISURE_CONFIG: CategoryAttributeConfig = {
  id: 'leisure',
  name: 'Leisure & Activities',
  icon: 'bicycle-outline',
  attributes: [
    { name: 'activity_type', label: 'Activity Type', type: 'select', options: ['Sports Equipment', 'Fitness', 'Music Instruments', 'Art Supplies', 'Books', 'Games', 'Outdoor Gear', 'Class/Workshop', 'Tickets', 'Other'], required: true },
    { name: 'duration', label: 'Duration (if service)', type: 'text', placeholder: '2 hours' },
    { name: 'skill_level', label: 'Skill Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] },
    { name: 'equipment_included', label: 'Equipment Included', type: 'toggle' },
    { name: 'group_size', label: 'Group Size', type: 'text', placeholder: '1-4 people' },
    { name: 'availability', label: 'Availability', type: 'text', placeholder: 'Weekends, By Appointment' },
    { name: 'brand', label: 'Brand (if product)', type: 'text', placeholder: 'Wilson, Yamaha...' },
  ]
};

// ============ KIDS ============
export const KIDS_CONFIG: CategoryAttributeConfig = {
  id: 'family',
  name: 'Kids & Baby',
  icon: 'people-outline',
  conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
  attributes: [
    { name: 'item_type', label: 'Item Type', type: 'select', options: ['Stroller', 'Car Seat', 'Crib/Bed', 'High Chair', 'Toys', 'Clothing', 'Books', 'Baby Monitor', 'Feeding', 'Bathing', 'Safety', 'Other'], required: true },
    { name: 'age_range', label: 'Age Range', type: 'select', options: ['0-6 Months', '6-12 Months', '1-2 Years', '2-4 Years', '4-6 Years', '6-8 Years', '8+ Years', 'All Ages'], required: true },
    { name: 'brand', label: 'Brand', type: 'text', placeholder: 'Bugaboo, Cybex, LEGO...' },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Boy', 'Girl', 'Unisex'] },
    { name: 'material', label: 'Material', type: 'text', placeholder: 'Wood, Plastic, Fabric...' },
    { name: 'safety_certified', label: 'Safety Certified', type: 'toggle' },
  ]
};

// ============ ANIMALS ============
export const ANIMALS_CONFIG: CategoryAttributeConfig = {
  id: 'animals',
  name: 'Animals & Pets',
  icon: 'paw-outline',
  attributes: [
    { name: 'animal_type', label: 'Animal Type', type: 'select', options: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Reptile', 'Horse', 'Pet Supplies', 'Other'], required: true },
    { name: 'breed', label: 'Breed', type: 'text', placeholder: 'Golden Retriever, Maine Coon...', required: true },
    { name: 'age', label: 'Age', type: 'text', placeholder: '6 months, 2 years', required: true },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], required: true },
    { name: 'vaccinated', label: 'Vaccinated', type: 'select', options: ['Fully Vaccinated', 'Partially', 'No', 'Unknown'], required: true },
    { name: 'health_status', label: 'Health Status', type: 'select', options: ['Excellent', 'Good', 'Special Needs'] },
    { name: 'neutered', label: 'Neutered/Spayed', type: 'select', options: ['Yes', 'No', 'Unknown'] },
    { name: 'microchipped', label: 'Microchipped', type: 'toggle' },
    { name: 'papers', label: 'Papers/Pedigree', type: 'select', options: ['Yes', 'No'] },
  ]
};

// ============ INDUSTRIAL MACHINES ============
export const INDUSTRIAL_CONFIG: CategoryAttributeConfig = {
  id: 'industrial',
  name: 'Industrial Machines',
  icon: 'cog-outline',
  conditionOptions: ['New', 'Excellent', 'Good', 'Operational', 'For Parts'],
  attributes: [
    { name: 'machine_type', label: 'Machine Type', type: 'select', options: ['CNC Machine', 'Forklift', 'Robot', 'Laser Cutter', '3D Printer', 'Hydraulic Press', 'Injection Molding', 'Welding', 'Conveyor', 'Compressor', 'Generator', 'Other'], required: true },
    { name: 'brand', label: 'Brand', type: 'text', placeholder: 'Haas, KUKA, Trumpf...', required: true },
    { name: 'model', label: 'Model', type: 'text', placeholder: 'VF-2, KR 16...', required: true },
    { name: 'year', label: 'Year of Manufacture', type: 'number', placeholder: '2020', required: true },
    { name: 'operating_hours', label: 'Operating Hours', type: 'number', placeholder: '5000', suffix: 'hours' },
    { name: 'power_rating', label: 'Power Rating', type: 'text', placeholder: '22 kW' },
    { name: 'voltage', label: 'Voltage', type: 'select', options: ['110V', '220V', '380V', '400V', '480V', 'Other'] },
    { name: 'certification', label: 'Certification', type: 'select', options: ['TÜV Certified', 'CE Marked', 'ISO Certified', 'None'] },
    { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '3 Months', '6 Months', 'As-Is'] },
  ]
};

// ============ AGRICULTURE ============
export const AGRICULTURE_CONFIG: CategoryAttributeConfig = {
  id: 'agriculture',
  name: 'Agriculture',
  icon: 'leaf-outline',
  conditionOptions: ['New', 'Excellent', 'Good', 'Fair'],
  attributes: [
    { name: 'item_type', label: 'Item Type', type: 'select', options: ['Tractor', 'Harvester', 'Livestock', 'Crops/Seeds', 'Plants/Trees', 'Equipment', 'Fertilizer', 'Feed', 'Other'], required: true },
    { name: 'brand', label: 'Brand', type: 'text', placeholder: 'John Deere, Claas...' },
    { name: 'quantity', label: 'Quantity', type: 'text', placeholder: '10 head, 500 kg', required: true },
    { name: 'unit', label: 'Unit', type: 'select', options: ['Piece', 'Kilogram', 'Ton', 'Liter', 'Head', 'Pack', 'Hectare', 'Other'] },
    { name: 'year', label: 'Year (for machinery)', type: 'number', placeholder: '2020' },
    { name: 'usage_hours', label: 'Usage Hours', type: 'number', placeholder: '2500', suffix: 'hours' },
    { name: 'organic', label: 'Organic Certified', type: 'toggle' },
    { name: 'harvest_date', label: 'Harvest Date (for crops)', type: 'text', placeholder: '2024-09' },
  ]
};

// ============ MISCELLANEOUS ============
export const MISC_CONFIG: CategoryAttributeConfig = {
  id: 'misc',
  name: 'Miscellaneous',
  icon: 'ellipsis-horizontal-outline',
  conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
  attributes: [
    { name: 'item_type', label: 'Item Type', type: 'text', placeholder: 'Books, Collectibles...', required: true },
    { name: 'brand', label: 'Brand (if applicable)', type: 'text' },
    { name: 'quantity', label: 'Quantity', type: 'text', placeholder: '1, Set of 5' },
  ]
};

// ============ CATEGORY MAP ============
export const CATEGORY_CONFIGS: Record<string, CategoryAttributeConfig> = {
  'vehicles': VEHICLES_CONFIG,
  'electronics': ELECTRONICS_CONFIG,
  'realestate': REALESTATE_CONFIG,
  'home': FURNITURE_CONFIG,
  'fashion': FASHION_CONFIG,
  'services': SERVICES_CONFIG,
  'jobs': JOBS_CONFIG,
  'family': KIDS_CONFIG,
  'beauty': BEAUTY_CONFIG,
  'leisure': LEISURE_CONFIG,
  'animals': ANIMALS_CONFIG,
  'industrial': INDUSTRIAL_CONFIG,
  'agriculture': AGRICULTURE_CONFIG,
  'misc': MISC_CONFIG,
  'bikes': BIKES_CONFIG,
};

export const getCategoryConfig = (categoryId: string): CategoryAttributeConfig | null => {
  return CATEGORY_CONFIGS[categoryId] || null;
};
