/**
 * SUBCATEGORY CONFIGURATION
 * 
 * This file defines all main categories, their sub-categories, 
 * and the specific attributes for each sub-category.
 * 
 * Structure:
 * - Main Category (e.g., "Auto & Vehicles")
 *   - Sub-category (e.g., "Cars")
 *     - Attributes (e.g., Make, Model, Year, Mileage)
 */

// ============ ATTRIBUTE FIELD INTERFACE ============
export interface SubcategoryAttribute {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'toggle' | 'multiselect';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  dependsOn?: string;
  dependentOptions?: Record<string, string[]>;
  suffix?: string;
  min?: number;
  max?: number;
  icon?: string;
}

export interface SubcategoryConfig {
  id: string;
  name: string;
  icon?: string;
  conditionOptions?: string[];
  attributes: SubcategoryAttribute[];
}

export interface MainCategoryConfig {
  id: string;
  name: string;
  icon: string;
  subcategories: SubcategoryConfig[];
}

// ============ AUTO & VEHICLES ============
const AUTO_BRANDS = ['Audi', 'BMW', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Mazda', 'Mercedes-Benz', 'Mini', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Seat', 'Skoda', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Chevrolet', 'Jeep', 'Land Rover', 'Lexus', 'Other'];
const AUTO_MODELS: Record<string, string[]> = {
  'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'Z4', 'M3', 'M4', 'M5', 'iX', 'i4', 'Other'],
  'Mercedes-Benz': ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'AMG GT', 'EQS', 'EQE', 'Other'],
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'e-tron', 'Other'],
  'Volkswagen': ['Golf', 'Polo', 'Passat', 'Tiguan', 'T-Roc', 'Arteon', 'ID.3', 'ID.4', 'ID.5', 'Touareg', 'Other'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck', 'Other'],
  'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman', 'Other'],
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Yaris', 'Land Cruiser', 'Prius', 'C-HR', 'Supra', 'Hilux', 'Other'],
  'Ford': ['Focus', 'Fiesta', 'Mustang', 'Kuga', 'Puma', 'Explorer', 'Ranger', 'F-150', 'Other'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'Other'],
  'Hyundai': ['i10', 'i20', 'i30', 'Tucson', 'Santa Fe', 'Kona', 'Ioniq 5', 'Other'],
  'Kia': ['Picanto', 'Rio', 'Ceed', 'Sportage', 'Sorento', 'Niro', 'EV6', 'Other'],
  'Other': ['Other']
};

const MOTORCYCLE_BRANDS = ['BMW', 'Ducati', 'Harley-Davidson', 'Honda', 'Kawasaki', 'KTM', 'Suzuki', 'Triumph', 'Yamaha', 'Vespa', 'Piaggio', 'Other'];

export const AUTO_VEHICLES_CATEGORY: MainCategoryConfig = {
  id: 'auto_vehicles',
  name: 'Auto & Vehicles',
  icon: 'car-outline',
  subcategories: [
    {
      id: 'vehicle_parts',
      name: 'Vehicle Parts & Accessories',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair', 'For Parts'],
      attributes: [
        { name: 'part_type', label: 'Part Type', type: 'select', options: ['Engine Parts', 'Transmission', 'Brakes', 'Suspension', 'Exhaust', 'Electrical', 'Body Parts', 'Interior', 'Wheels & Tires', 'Accessories', 'Audio & Electronics', 'Other'], required: true, icon: 'construct-outline' },
        { name: 'compatible_make', label: 'Compatible Make', type: 'select', options: AUTO_BRANDS, icon: 'car-outline' },
        { name: 'compatible_model', label: 'Compatible Model', type: 'text', placeholder: 'e.g., Golf GTI 2018-2023', icon: 'document-text-outline' },
        { name: 'part_number', label: 'Part Number (OEM)', type: 'text', placeholder: 'e.g., 1K0 615 301', icon: 'barcode-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Bosch, Brembo', icon: 'ribbon-outline' },
      ]
    },
    {
      id: 'cars',
      name: 'Cars',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair', 'Accident-Free', 'For Parts'],
      attributes: [
        { name: 'make', label: 'Make', type: 'select', options: AUTO_BRANDS, required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'select', required: true, dependsOn: 'make', dependentOptions: AUTO_MODELS, icon: 'car-sport-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2020', min: 1950, max: 2026, required: true, icon: 'calendar-outline' },
        { name: 'mileage', label: 'Mileage', type: 'number', placeholder: '50000', suffix: 'km', required: true, icon: 'speedometer-outline' },
        { name: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid', 'LPG', 'CNG'], required: true, icon: 'water-outline' },
        { name: 'transmission', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual', 'Semi-Automatic', 'CVT'], required: true, icon: 'settings-outline' },
        { name: 'body_type', label: 'Body Type', type: 'select', options: ['Sedan', 'Hatchback', 'SUV', 'Coupe', 'Convertible', 'Wagon', 'Van', 'Pickup'], icon: 'car-outline' },
        { name: 'engine_size', label: 'Engine Size', type: 'text', placeholder: '2.0L', icon: 'flash-outline' },
        { name: 'color', label: 'Color', type: 'select', options: ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Yellow', 'Orange', 'Other'], icon: 'color-palette-outline' },
        { name: 'doors', label: 'Doors', type: 'select', options: ['2', '3', '4', '5'], icon: 'enter-outline' },
        { name: 'registered', label: 'Registered', type: 'toggle', icon: 'document-outline' },
      ]
    },
    {
      id: 'motorcycles_scooters',
      name: 'Motorcycles & Scooters',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair', 'For Parts'],
      attributes: [
        { name: 'make', label: 'Make', type: 'select', options: MOTORCYCLE_BRANDS, required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., CBR 600RR', required: true, icon: 'bicycle-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2020', min: 1950, max: 2026, required: true, icon: 'calendar-outline' },
        { name: 'mileage', label: 'Mileage', type: 'number', placeholder: '15000', suffix: 'km', required: true, icon: 'speedometer-outline' },
        { name: 'engine_cc', label: 'Engine Size', type: 'number', placeholder: '600', suffix: 'cc', required: true, icon: 'flash-outline' },
        { name: 'type', label: 'Type', type: 'select', options: ['Sport', 'Cruiser', 'Touring', 'Naked', 'Adventure', 'Scooter', 'Moped', 'Off-road', 'Electric'], icon: 'bicycle-outline' },
        { name: 'color', label: 'Color', type: 'text', placeholder: 'Red/Black', icon: 'color-palette-outline' },
      ]
    },
    {
      id: 'buses_microbuses',
      name: 'Buses & Microbuses',
      conditionOptions: ['New', 'Used - Good', 'Used - Fair', 'For Parts'],
      attributes: [
        { name: 'make', label: 'Make', type: 'text', placeholder: 'e.g., Mercedes, MAN, Volvo', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., Sprinter', required: true, icon: 'bus-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2018', min: 1970, max: 2026, required: true, icon: 'calendar-outline' },
        { name: 'mileage', label: 'Mileage', type: 'number', placeholder: '150000', suffix: 'km', icon: 'speedometer-outline' },
        { name: 'seats', label: 'Seats', type: 'number', placeholder: '16', required: true, icon: 'people-outline' },
        { name: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Diesel', 'Electric', 'CNG', 'Hybrid'], icon: 'water-outline' },
      ]
    },
    {
      id: 'trucks_trailers',
      name: 'Trucks & Trailers',
      conditionOptions: ['New', 'Used - Good', 'Used - Fair', 'For Parts'],
      attributes: [
        { name: 'make', label: 'Make', type: 'text', placeholder: 'e.g., Scania, MAN, Volvo', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', required: true, icon: 'car-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2018', min: 1970, max: 2026, required: true, icon: 'calendar-outline' },
        { name: 'mileage', label: 'Mileage', type: 'number', placeholder: '500000', suffix: 'km', icon: 'speedometer-outline' },
        { name: 'load_capacity', label: 'Load Capacity', type: 'number', placeholder: '40', suffix: 'tons', icon: 'barbell-outline' },
        { name: 'type', label: 'Type', type: 'select', options: ['Box Truck', 'Flatbed', 'Refrigerated', 'Tanker', 'Dump Truck', 'Trailer', 'Semi-Trailer', 'Other'], required: true, icon: 'cube-outline' },
      ]
    },
    {
      id: 'heavy_machinery',
      name: 'Construction & Heavy Machinery',
      conditionOptions: ['New', 'Used - Good', 'Used - Fair', 'For Parts'],
      attributes: [
        { name: 'machine_type', label: 'Machine Type', type: 'select', options: ['Excavator', 'Bulldozer', 'Crane', 'Forklift', 'Loader', 'Backhoe', 'Grader', 'Roller', 'Concrete Mixer', 'Other'], required: true, icon: 'construct-outline' },
        { name: 'make', label: 'Make', type: 'text', placeholder: 'e.g., Caterpillar, Komatsu', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', required: true, icon: 'barcode-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2018', min: 1970, max: 2026, required: true, icon: 'calendar-outline' },
        { name: 'operating_hours', label: 'Operating Hours', type: 'number', placeholder: '5000', suffix: 'hours', icon: 'time-outline' },
      ]
    },
    {
      id: 'watercraft_boats',
      name: 'Watercraft & Boats',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Speedboat', 'Sailboat', 'Yacht', 'Jet Ski', 'Kayak', 'Canoe', 'Inflatable', 'Fishing Boat', 'Houseboat', 'Other'], required: true, icon: 'boat-outline' },
        { name: 'make', label: 'Make', type: 'text', placeholder: 'e.g., Bayliner, Sea Ray', icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'boat-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2020', min: 1950, max: 2026, icon: 'calendar-outline' },
        { name: 'length', label: 'Length', type: 'number', placeholder: '8', suffix: 'm', icon: 'resize-outline' },
        { name: 'engine_type', label: 'Engine Type', type: 'select', options: ['Outboard', 'Inboard', 'Jet Drive', 'Electric', 'Sail Only', 'None'], icon: 'flash-outline' },
      ]
    },
    {
      id: 'car_services',
      name: 'Car Services',
      attributes: [
        { name: 'service_type', label: 'Service Type', type: 'select', options: ['Repair & Maintenance', 'Detailing', 'Towing', 'Inspection', 'Paint & Body', 'Tuning', 'Window Tinting', 'Audio Installation', 'Other'], required: true, icon: 'construct-outline' },
        { name: 'experience_years', label: 'Years of Experience', type: 'select', options: ['1-2', '3-5', '5-10', '10+'], icon: 'time-outline' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Weekdays', 'Weekends', 'Flexible', '24/7'], icon: 'calendar-outline' },
        { name: 'service_area', label: 'Service Area', type: 'text', placeholder: 'Berlin & surroundings', icon: 'location-outline' },
      ]
    }
  ]
};

// ============ PROPERTIES ============
export const PROPERTIES_CATEGORY: MainCategoryConfig = {
  id: 'properties',
  name: 'Properties',
  icon: 'business-outline',
  subcategories: [
    {
      id: 'new_builds',
      name: 'New Builds',
      conditionOptions: ['New Build', 'Under Construction', 'Off-Plan'],
      attributes: [
        { name: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Villa', 'Townhouse', 'Penthouse', 'Studio'], required: true, icon: 'home-outline' },
        { name: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5', '6+'], required: true, icon: 'bed-outline' },
        { name: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4', '5+'], required: true, icon: 'water-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '100', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'completion_date', label: 'Completion Date', type: 'text', placeholder: 'Q2 2025', icon: 'calendar-outline' },
        { name: 'parking', label: 'Parking', type: 'select', options: ['Included', 'Available', 'None'], icon: 'car-outline' },
        { name: 'developer', label: 'Developer', type: 'text', placeholder: 'Developer name', icon: 'business-outline' },
      ]
    },
    {
      id: 'houses_apartments_rent',
      name: 'Houses & Apartments For Rent',
      conditionOptions: ['New', 'Renovated', 'Good', 'Needs Renovation'],
      attributes: [
        { name: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Studio', 'Penthouse', 'Villa', 'Townhouse', 'Loft', 'Room'], required: true, icon: 'home-outline' },
        { name: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5', '6+'], required: true, icon: 'bed-outline' },
        { name: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4', '5+'], required: true, icon: 'water-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '85', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'furnished', label: 'Furnished', type: 'select', options: ['Fully Furnished', 'Partially Furnished', 'Unfurnished'], required: true, icon: 'cube-outline' },
        { name: 'floor', label: 'Floor', type: 'select', options: ['Ground', '1', '2', '3', '4', '5', '6-10', '10+', 'Top Floor'], icon: 'layers-outline' },
        { name: 'parking', label: 'Parking', type: 'select', options: ['Garage', 'Outdoor Parking', 'Street Parking', 'None'], icon: 'car-outline' },
        { name: 'available_from', label: 'Available From', type: 'select', options: ['Immediately', 'Within 1 Month', 'Within 3 Months', 'Negotiable'], icon: 'time-outline' },
        { name: 'pets_allowed', label: 'Pets Allowed', type: 'toggle', icon: 'paw-outline' },
        { name: 'balcony', label: 'Balcony/Terrace', type: 'toggle', icon: 'sunny-outline' },
        { name: 'elevator', label: 'Elevator', type: 'toggle', icon: 'arrow-up-outline' },
      ]
    },
    {
      id: 'houses_apartments_sale',
      name: 'Houses & Apartments For Sale',
      conditionOptions: ['New Build', 'Renovated', 'Good', 'Needs Renovation'],
      attributes: [
        { name: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Studio', 'Penthouse', 'Villa', 'Townhouse', 'Loft'], required: true, icon: 'home-outline' },
        { name: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5', '6+'], required: true, icon: 'bed-outline' },
        { name: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4', '5+'], required: true, icon: 'water-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '100', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'year_built', label: 'Year Built', type: 'number', placeholder: '2015', icon: 'calendar-outline' },
        { name: 'floor', label: 'Floor', type: 'select', options: ['Ground', '1', '2', '3', '4', '5', '6-10', '10+', 'Top Floor'], icon: 'layers-outline' },
        { name: 'parking', label: 'Parking', type: 'select', options: ['Garage', 'Outdoor Parking', 'Street Parking', 'None'], icon: 'car-outline' },
        { name: 'energy_rating', label: 'Energy Rating', type: 'select', options: ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'Unknown'], icon: 'leaf-outline' },
        { name: 'balcony', label: 'Balcony/Terrace', type: 'toggle', icon: 'sunny-outline' },
        { name: 'elevator', label: 'Elevator', type: 'toggle', icon: 'arrow-up-outline' },
      ]
    },
    {
      id: 'short_let',
      name: 'Short Let',
      conditionOptions: ['Excellent', 'Good'],
      attributes: [
        { name: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Studio', 'Room', 'Villa'], required: true, icon: 'home-outline' },
        { name: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5+'], required: true, icon: 'bed-outline' },
        { name: 'max_guests', label: 'Max Guests', type: 'number', placeholder: '4', required: true, icon: 'people-outline' },
        { name: 'minimum_stay', label: 'Minimum Stay', type: 'select', options: ['1 Night', '2 Nights', '3 Nights', '1 Week', '2 Weeks', '1 Month'], icon: 'calendar-outline' },
        { name: 'amenities', label: 'Key Amenities', type: 'text', placeholder: 'WiFi, Kitchen, Parking', icon: 'list-outline' },
      ]
    },
    {
      id: 'land_plots_rent',
      name: 'Land & Plots for Rent',
      attributes: [
        { name: 'land_type', label: 'Land Type', type: 'select', options: ['Agricultural', 'Commercial', 'Residential', 'Industrial', 'Mixed Use'], required: true, icon: 'map-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '500', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'access_road', label: 'Road Access', type: 'toggle', icon: 'car-outline' },
        { name: 'utilities', label: 'Utilities Available', type: 'text', placeholder: 'Water, Electricity', icon: 'flash-outline' },
      ]
    },
    {
      id: 'land_plots_sale',
      name: 'Land & Plots For Sale',
      attributes: [
        { name: 'land_type', label: 'Land Type', type: 'select', options: ['Agricultural', 'Commercial', 'Residential', 'Industrial', 'Mixed Use'], required: true, icon: 'map-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '1000', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'building_permit', label: 'Building Permit', type: 'select', options: ['Available', 'Possible', 'Not Available', 'Unknown'], icon: 'document-outline' },
        { name: 'access_road', label: 'Road Access', type: 'toggle', icon: 'car-outline' },
        { name: 'utilities', label: 'Utilities Available', type: 'text', placeholder: 'Water, Electricity, Gas', icon: 'flash-outline' },
      ]
    },
    {
      id: 'event_centres',
      name: 'Event Centres, Venues & Workstations',
      attributes: [
        { name: 'venue_type', label: 'Venue Type', type: 'select', options: ['Event Hall', 'Conference Room', 'Co-working Space', 'Office', 'Studio', 'Warehouse', 'Outdoor Venue'], required: true, icon: 'business-outline' },
        { name: 'capacity', label: 'Capacity', type: 'number', placeholder: '100', suffix: 'people', required: true, icon: 'people-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '200', suffix: 'm²', icon: 'resize-outline' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly'], icon: 'calendar-outline' },
        { name: 'amenities', label: 'Amenities', type: 'text', placeholder: 'WiFi, Projector, Catering', icon: 'list-outline' },
      ]
    },
    {
      id: 'commercial_rent',
      name: 'Commercial Property for Rent',
      conditionOptions: ['New', 'Renovated', 'Good', 'Shell'],
      attributes: [
        { name: 'property_type', label: 'Property Type', type: 'select', options: ['Office', 'Retail Shop', 'Restaurant', 'Warehouse', 'Industrial', 'Showroom', 'Medical/Clinic'], required: true, icon: 'business-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '200', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'floors', label: 'Floors', type: 'number', placeholder: '1', icon: 'layers-outline' },
        { name: 'parking_spaces', label: 'Parking Spaces', type: 'number', placeholder: '5', icon: 'car-outline' },
        { name: 'available_from', label: 'Available From', type: 'select', options: ['Immediately', 'Within 1 Month', 'Within 3 Months', 'Negotiable'], icon: 'time-outline' },
      ]
    },
    {
      id: 'commercial_sale',
      name: 'Commercial Property for Sale',
      conditionOptions: ['New Build', 'Renovated', 'Good', 'Shell', 'Needs Renovation'],
      attributes: [
        { name: 'property_type', label: 'Property Type', type: 'select', options: ['Office Building', 'Retail Space', 'Restaurant', 'Warehouse', 'Industrial', 'Mixed Use', 'Hotel'], required: true, icon: 'business-outline' },
        { name: 'size_sqm', label: 'Size', type: 'number', placeholder: '500', suffix: 'm²', required: true, icon: 'resize-outline' },
        { name: 'year_built', label: 'Year Built', type: 'number', placeholder: '2010', icon: 'calendar-outline' },
        { name: 'current_income', label: 'Current Income (if rented)', type: 'text', placeholder: '€5,000/month', icon: 'cash-outline' },
        { name: 'parking_spaces', label: 'Parking Spaces', type: 'number', placeholder: '10', icon: 'car-outline' },
      ]
    }
  ]
};

// ============ ELECTRONICS ============
export const ELECTRONICS_CATEGORY: MainCategoryConfig = {
  id: 'electronics',
  name: 'Electronics',
  icon: 'laptop-outline',
  subcategories: [
    {
      id: 'laptops_computers',
      name: 'Laptops & Computers',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair', 'For Parts'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Laptop', 'Desktop', 'All-in-One', 'Gaming PC', 'Workstation', 'Mini PC'], required: true, icon: 'laptop-outline' },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Lenovo', 'Dell', 'HP', 'Asus', 'Acer', 'MSI', 'Microsoft', 'Samsung', 'Custom Build', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., MacBook Pro 14"', required: true, icon: 'barcode-outline' },
        { name: 'processor', label: 'Processor', type: 'text', placeholder: 'e.g., Intel i7-12700H', required: true, icon: 'hardware-chip-outline' },
        { name: 'ram', label: 'RAM', type: 'select', options: ['4GB', '8GB', '16GB', '32GB', '64GB', '128GB'], required: true, icon: 'server-outline' },
        { name: 'storage', label: 'Storage', type: 'text', placeholder: 'e.g., 512GB SSD', required: true, icon: 'folder-outline' },
        { name: 'graphics', label: 'Graphics Card', type: 'text', placeholder: 'e.g., RTX 4070', icon: 'game-controller-outline' },
        { name: 'screen_size', label: 'Screen Size', type: 'text', placeholder: '15.6"', icon: 'expand-outline' },
        { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', '6+ Months Left', 'Expired', 'None'], icon: 'shield-checkmark-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
      ]
    },
    {
      id: 'tv_dvd',
      name: 'TV & DVD Equipment',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Smart TV', 'LED TV', 'OLED TV', 'QLED TV', 'DVD Player', 'Blu-ray Player', 'Streaming Device', 'Projector', 'Other'], required: true, icon: 'tv-outline' },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Philips', 'Panasonic', 'Apple', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'screen_size', label: 'Screen Size', type: 'text', placeholder: '55"', icon: 'expand-outline' },
        { name: 'resolution', label: 'Resolution', type: 'select', options: ['HD (720p)', 'Full HD (1080p)', '4K UHD', '8K', 'Other'], icon: 'eye-outline' },
        { name: 'smart_features', label: 'Smart Features', type: 'toggle', icon: 'wifi-outline' },
        { name: 'year', label: 'Year', type: 'number', placeholder: '2023', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'video_game_consoles',
      name: 'Video Game Consoles',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair', 'For Parts'],
      attributes: [
        { name: 'console', label: 'Console', type: 'select', options: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch', 'Nintendo Switch OLED', 'Steam Deck', 'Retro Console', 'Other'], required: true, icon: 'game-controller-outline' },
        { name: 'storage', label: 'Storage', type: 'text', placeholder: 'e.g., 1TB', icon: 'folder-outline' },
        { name: 'edition', label: 'Edition', type: 'text', placeholder: 'e.g., Digital Edition, God of War Bundle', icon: 'ribbon-outline' },
        { name: 'controllers', label: 'Controllers Included', type: 'number', placeholder: '1', icon: 'game-controller-outline' },
        { name: 'games_included', label: 'Games Included', type: 'text', placeholder: 'List games if any', icon: 'disc-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
      ]
    },
    {
      id: 'audio_music',
      name: 'Audio & Music Equipment',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Speakers', 'Soundbar', 'Home Theater', 'Amplifier', 'Turntable', 'DJ Equipment', 'Mixer', 'Studio Monitor', 'Other'], required: true, icon: 'musical-notes-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Bose, Sonos, JBL', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'Model name', icon: 'barcode-outline' },
        { name: 'wireless', label: 'Wireless', type: 'toggle', icon: 'wifi-outline' },
        { name: 'connectivity', label: 'Connectivity', type: 'text', placeholder: 'Bluetooth, WiFi, AUX', icon: 'bluetooth-outline' },
      ]
    },
    {
      id: 'headphones',
      name: 'Headphones',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Over-Ear', 'On-Ear', 'In-Ear', 'Earbuds', 'Gaming Headset', 'Bone Conduction'], required: true, icon: 'headset-outline' },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Sony', 'Bose', 'Sennheiser', 'JBL', 'Beats', 'Samsung', 'Audio-Technica', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., AirPods Pro 2', required: true, icon: 'barcode-outline' },
        { name: 'wireless', label: 'Wireless', type: 'toggle', icon: 'wifi-outline' },
        { name: 'noise_cancelling', label: 'Noise Cancelling', type: 'toggle', icon: 'volume-mute-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
      ]
    },
    {
      id: 'photo_video_cameras',
      name: 'Photo & Video Cameras',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['DSLR', 'Mirrorless', 'Compact', 'Action Camera', 'Camcorder', 'Film Camera', 'Drone', 'Instant Camera', 'Other'], required: true, icon: 'camera-outline' },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'GoPro', 'DJI', 'Leica', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., EOS R5', required: true, icon: 'barcode-outline' },
        { name: 'megapixels', label: 'Megapixels', type: 'text', placeholder: '45 MP', icon: 'aperture-outline' },
        { name: 'lens_included', label: 'Lens Included', type: 'text', placeholder: 'e.g., 24-70mm f/2.8', icon: 'ellipse-outline' },
        { name: 'shutter_count', label: 'Shutter Count', type: 'number', placeholder: '15000', icon: 'speedometer-outline' },
        { name: 'accessories', label: 'Accessories', type: 'text', placeholder: 'Batteries, charger, bag', icon: 'gift-outline' },
      ]
    },
    {
      id: 'security_surveillance',
      name: 'Security & Surveillance',
      conditionOptions: ['New/Sealed', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Security Camera', 'DVR/NVR', 'Doorbell Camera', 'Smart Lock', 'Alarm System', 'Baby Monitor', 'Other'], required: true, icon: 'videocam-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Ring, Arlo, Hikvision', required: true, icon: 'ribbon-outline' },
        { name: 'resolution', label: 'Resolution', type: 'select', options: ['720p', '1080p', '2K', '4K'], icon: 'eye-outline' },
        { name: 'wireless', label: 'Wireless', type: 'toggle', icon: 'wifi-outline' },
        { name: 'night_vision', label: 'Night Vision', type: 'toggle', icon: 'moon-outline' },
      ]
    },
    {
      id: 'networking',
      name: 'Networking Products',
      conditionOptions: ['New/Sealed', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Router', 'Mesh System', 'Switch', 'Access Point', 'Modem', 'Network Card', 'Powerline Adapter', 'Other'], required: true, icon: 'wifi-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Asus, TP-Link, Netgear', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'wifi_standard', label: 'WiFi Standard', type: 'select', options: ['WiFi 5', 'WiFi 6', 'WiFi 6E', 'WiFi 7', 'N/A'], icon: 'wifi-outline' },
        { name: 'speed', label: 'Speed', type: 'text', placeholder: 'e.g., AX6000', icon: 'speedometer-outline' },
      ]
    },
    {
      id: 'printers_scanners',
      name: 'Printers & Scanners',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Inkjet Printer', 'Laser Printer', 'All-in-One', 'Photo Printer', 'Scanner', '3D Printer', 'Other'], required: true, icon: 'print-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., HP, Canon, Epson', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'color', label: 'Color Printing', type: 'toggle', icon: 'color-palette-outline' },
        { name: 'wireless', label: 'Wireless', type: 'toggle', icon: 'wifi-outline' },
      ]
    },
    {
      id: 'computer_monitors',
      name: 'Computer Monitors',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., LG, Dell, Samsung', required: true, icon: 'ribbon-outline' },
        { name: 'size', label: 'Screen Size', type: 'text', placeholder: '27"', required: true, icon: 'expand-outline' },
        { name: 'resolution', label: 'Resolution', type: 'select', options: ['Full HD (1080p)', 'QHD (1440p)', '4K UHD', '5K', 'Ultrawide'], required: true, icon: 'eye-outline' },
        { name: 'refresh_rate', label: 'Refresh Rate', type: 'select', options: ['60Hz', '75Hz', '144Hz', '165Hz', '240Hz', '360Hz'], icon: 'speedometer-outline' },
        { name: 'panel_type', label: 'Panel Type', type: 'select', options: ['IPS', 'VA', 'TN', 'OLED', 'Mini-LED'], icon: 'tv-outline' },
      ]
    },
    {
      id: 'computer_hardware',
      name: 'Computer Hardware',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'For Parts'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Graphics Card', 'Processor', 'RAM', 'SSD', 'HDD', 'Motherboard', 'Power Supply', 'CPU Cooler', 'Case', 'Other'], required: true, icon: 'hardware-chip-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Nvidia, AMD, Intel', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., RTX 4090', required: true, icon: 'barcode-outline' },
        { name: 'specifications', label: 'Specifications', type: 'text', placeholder: 'e.g., 24GB GDDR6X', icon: 'list-outline' },
        { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', 'Expired', 'None'], icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'computer_accessories',
      name: 'Computer Accessories',
      conditionOptions: ['New/Sealed', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Keyboard', 'Mouse', 'Webcam', 'Microphone', 'Mousepad', 'USB Hub', 'Docking Station', 'Laptop Stand', 'External Drive', 'Other'], required: true, icon: 'keypad-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Logitech, Razer', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'wireless', label: 'Wireless', type: 'toggle', icon: 'wifi-outline' },
      ]
    },
    {
      id: 'electronics_accessories',
      name: 'Accessories & Supplies for Electronics',
      conditionOptions: ['New/Sealed', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Cables', 'Chargers', 'Adapters', 'Batteries', 'Cases', 'Stands', 'Mounts', 'Other'], required: true, icon: 'flash-outline' },
        { name: 'compatible_with', label: 'Compatible With', type: 'text', placeholder: 'e.g., iPhone 15, MacBook', icon: 'phone-portrait-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
      ]
    },
    {
      id: 'video_games',
      name: 'Video Games',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'platform', label: 'Platform', type: 'select', options: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Other'], required: true, icon: 'game-controller-outline' },
        { name: 'title', label: 'Game Title', type: 'text', required: true, icon: 'disc-outline' },
        { name: 'edition', label: 'Edition', type: 'text', placeholder: 'e.g., Deluxe Edition', icon: 'ribbon-outline' },
        { name: 'region', label: 'Region', type: 'select', options: ['Region Free', 'Europe', 'US', 'Asia', 'Japan'], icon: 'globe-outline' },
      ]
    },
    {
      id: 'software',
      name: 'Software',
      conditionOptions: ['New/Unused License', 'Used License'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Operating System', 'Office Suite', 'Antivirus', 'Design Software', 'Development Tools', 'Games', 'Other'], required: true, icon: 'code-outline' },
        { name: 'name', label: 'Software Name', type: 'text', required: true, icon: 'document-outline' },
        { name: 'version', label: 'Version', type: 'text', placeholder: 'e.g., 2024', icon: 'information-outline' },
        { name: 'license_type', label: 'License Type', type: 'select', options: ['Lifetime', '1 Year', 'Subscription', 'OEM'], icon: 'key-outline' },
        { name: 'platform', label: 'Platform', type: 'select', options: ['Windows', 'Mac', 'Linux', 'Cross-platform'], icon: 'laptop-outline' },
      ]
    }
  ]
};

// ============ PHONES & TABLETS ============
const PHONE_BRANDS = ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Huawei', 'Sony', 'Oppo', 'Vivo', 'Nokia', 'Motorola', 'Nothing', 'Other'];

export const PHONES_TABLETS_CATEGORY: MainCategoryConfig = {
  id: 'phones_tablets',
  name: 'Phones & Tablets',
  icon: 'phone-portrait-outline',
  subcategories: [
    {
      id: 'mobile_phones',
      name: 'Mobile Phones',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair', 'For Parts'],
      attributes: [
        { name: 'brand', label: 'Brand', type: 'select', options: PHONE_BRANDS, required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPhone 15 Pro Max', required: true, icon: 'phone-portrait-outline' },
        { name: 'storage', label: 'Storage', type: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'], required: true, icon: 'folder-outline' },
        { name: 'ram', label: 'RAM', type: 'select', options: ['4GB', '6GB', '8GB', '12GB', '16GB'], icon: 'server-outline' },
        { name: 'color', label: 'Color', type: 'text', placeholder: 'e.g., Natural Titanium', icon: 'color-palette-outline' },
        { name: 'battery_health', label: 'Battery Health', type: 'select', options: ['100%', '95-99%', '90-94%', '85-89%', '80-84%', 'Below 80%', 'Unknown'], icon: 'battery-half-outline' },
        { name: 'carrier_lock', label: 'Carrier Lock', type: 'select', options: ['Unlocked', 'Carrier Locked', 'Unknown'], icon: 'lock-closed-outline' },
        { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', '6+ Months Left', 'Expired', 'None'], icon: 'shield-checkmark-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
        { name: 'accessories_included', label: 'Accessories Included', type: 'toggle', icon: 'gift-outline' },
      ]
    },
    {
      id: 'phone_accessories',
      name: 'Accessories for Phones & Tablets',
      conditionOptions: ['New/Sealed', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Case', 'Screen Protector', 'Charger', 'Cable', 'Power Bank', 'Car Mount', 'Stylus', 'Keyboard', 'Stand', 'Other'], required: true, icon: 'phone-portrait-outline' },
        { name: 'compatible_with', label: 'Compatible With', type: 'text', placeholder: 'e.g., iPhone 15, Samsung S24', required: true, icon: 'phone-portrait-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Apple, Spigen, Anker', icon: 'ribbon-outline' },
      ]
    },
    {
      id: 'smart_watches',
      name: 'Smart Watches',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Garmin', 'Fitbit', 'Huawei', 'Xiaomi', 'Google', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., Apple Watch Series 9', required: true, icon: 'watch-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., 45mm', icon: 'resize-outline' },
        { name: 'connectivity', label: 'Connectivity', type: 'select', options: ['GPS Only', 'GPS + Cellular'], icon: 'wifi-outline' },
        { name: 'band_included', label: 'Band Included', type: 'text', placeholder: 'Band type/color', icon: 'sync-outline' },
        { name: 'battery_health', label: 'Battery Health', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Unknown'], icon: 'battery-half-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
      ]
    },
    {
      id: 'tablets',
      name: 'Tablets',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair', 'For Parts'],
      attributes: [
        { name: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Microsoft', 'Lenovo', 'Huawei', 'Amazon', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPad Pro 12.9"', required: true, icon: 'tablet-portrait-outline' },
        { name: 'storage', label: 'Storage', type: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'], required: true, icon: 'folder-outline' },
        { name: 'ram', label: 'RAM', type: 'select', options: ['4GB', '6GB', '8GB', '12GB', '16GB'], icon: 'server-outline' },
        { name: 'screen_size', label: 'Screen Size', type: 'text', placeholder: '12.9"', icon: 'expand-outline' },
        { name: 'connectivity', label: 'Connectivity', type: 'select', options: ['WiFi Only', 'WiFi + Cellular'], icon: 'wifi-outline' },
        { name: 'color', label: 'Color', type: 'text', icon: 'color-palette-outline' },
        { name: 'accessories_included', label: 'Accessories Included', type: 'text', placeholder: 'e.g., Keyboard, Apple Pencil', icon: 'gift-outline' },
        { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', '6+ Months Left', 'Expired', 'None'], icon: 'shield-checkmark-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
      ]
    },
    {
      id: 'phones_headphones',
      name: 'Headphones',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['True Wireless Earbuds', 'Over-Ear Wireless', 'On-Ear Wireless', 'In-Ear Wired', 'Over-Ear Wired', 'Gaming Headset'], required: true, icon: 'headset-outline' },
        { name: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Sony', 'Bose', 'Samsung', 'Beats', 'JBL', 'Sennheiser', 'Other'], required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', placeholder: 'e.g., AirPods Pro 2', required: true, icon: 'barcode-outline' },
        { name: 'noise_cancelling', label: 'Noise Cancelling', type: 'toggle', icon: 'volume-mute-outline' },
        { name: 'battery_life', label: 'Battery Life', type: 'text', placeholder: 'e.g., 6 hours + case', icon: 'battery-half-outline' },
        { name: 'original_box', label: 'Original Box', type: 'toggle', icon: 'cube-outline' },
      ]
    }
  ]
};

// ============ HOME, FURNITURE & APPLIANCES ============
export const HOME_FURNITURE_CATEGORY: MainCategoryConfig = {
  id: 'home_furniture',
  name: 'Home, Furniture & Appliances',
  icon: 'home-outline',
  subcategories: [
    {
      id: 'furniture',
      name: 'Furniture',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair', 'Needs Repair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Sofa', 'Bed', 'Dining Table', 'Desk', 'Chair', 'Wardrobe', 'Bookshelf', 'TV Stand', 'Coffee Table', 'Dresser', 'Outdoor Furniture', 'Cabinet', 'Other'], required: true, icon: 'bed-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Leather', 'Fabric', 'Glass', 'Plastic', 'Rattan', 'Mixed'], required: true, icon: 'layers-outline' },
        { name: 'dimensions', label: 'Dimensions (L×W×H)', type: 'text', placeholder: '180×90×75 cm', icon: 'resize-outline' },
        { name: 'color', label: 'Color', type: 'text', placeholder: 'White Oak', icon: 'color-palette-outline' },
        { name: 'brand', label: 'Brand', type: 'select', options: ['IKEA', 'BoConcept', 'West Elm', 'Muuto', 'Hay', 'Habitat', 'Custom Made', 'Unknown', 'Other'], icon: 'ribbon-outline' },
        { name: 'style', label: 'Style', type: 'select', options: ['Modern', 'Classic', 'Scandinavian', 'Industrial', 'Vintage', 'Minimalist', 'Rustic'], icon: 'sparkles-outline' },
        { name: 'assembly_required', label: 'Assembly Required', type: 'toggle', icon: 'build-outline' },
      ]
    },
    {
      id: 'lighting',
      name: 'Lighting',
      conditionOptions: ['New', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Ceiling Light', 'Floor Lamp', 'Table Lamp', 'Wall Light', 'Desk Lamp', 'Chandelier', 'LED Strip', 'Outdoor Light', 'Smart Light', 'Other'], required: true, icon: 'bulb-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'style', label: 'Style', type: 'select', options: ['Modern', 'Industrial', 'Classic', 'Minimalist', 'Vintage'], icon: 'sparkles-outline' },
        { name: 'bulb_type', label: 'Bulb Type', type: 'select', options: ['LED', 'Incandescent', 'Fluorescent', 'Halogen', 'Smart Bulb'], icon: 'bulb-outline' },
        { name: 'smart', label: 'Smart Features', type: 'toggle', icon: 'wifi-outline' },
      ]
    },
    {
      id: 'storage_organization',
      name: 'Storage & Organization',
      conditionOptions: ['New', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Shelving Unit', 'Storage Box', 'Closet Organizer', 'Shoe Rack', 'Hooks & Hangers', 'Baskets', 'Other'], required: true, icon: 'file-tray-stacked-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Plastic', 'Fabric', 'Other'], icon: 'layers-outline' },
        { name: 'dimensions', label: 'Dimensions', type: 'text', placeholder: '100×40×180 cm', icon: 'resize-outline' },
      ]
    },
    {
      id: 'home_accessories',
      name: 'Home Accessories',
      conditionOptions: ['New', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Rugs', 'Curtains', 'Cushions', 'Mirrors', 'Vases', 'Frames', 'Clocks', 'Plants/Pots', 'Candles', 'Other'], required: true, icon: 'home-outline' },
        { name: 'color', label: 'Color/Pattern', type: 'text', icon: 'color-palette-outline' },
        { name: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'Size', icon: 'resize-outline' },
        { name: 'material', label: 'Material', type: 'text', icon: 'layers-outline' },
      ]
    },
    {
      id: 'home_appliances',
      name: 'Home Appliances',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair', 'For Parts'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Washing Machine', 'Dryer', 'Refrigerator', 'Freezer', 'Dishwasher', 'Vacuum Cleaner', 'Air Conditioner', 'Heater', 'Fan', 'Iron', 'Other'], required: true, icon: 'hardware-chip-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Bosch, Samsung, Dyson', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'energy_rating', label: 'Energy Rating', type: 'select', options: ['A+++', 'A++', 'A+', 'A', 'B', 'C', 'D', 'Unknown'], icon: 'leaf-outline' },
        { name: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g., 8kg, 300L', icon: 'resize-outline' },
        { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', 'Expired', 'None'], icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'kitchen_appliances',
      name: 'Kitchen Appliances',
      conditionOptions: ['New/Sealed', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Coffee Machine', 'Microwave', 'Oven', 'Toaster', 'Blender', 'Mixer', 'Food Processor', 'Air Fryer', 'Kettle', 'Juicer', 'Other'], required: true, icon: 'cafe-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., KitchenAid, Nespresso', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'color', label: 'Color', type: 'text', icon: 'color-palette-outline' },
        { name: 'warranty', label: 'Warranty', type: 'select', options: ['Under Warranty', '1+ Year Left', 'Expired', 'None'], icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'kitchenware',
      name: 'Kitchenware & Cookware',
      conditionOptions: ['New', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Pots & Pans', 'Dishes', 'Glasses', 'Cutlery', 'Bakeware', 'Knives', 'Utensils', 'Storage Containers', 'Other'], required: true, icon: 'restaurant-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Stainless Steel', 'Non-stick', 'Cast Iron', 'Ceramic', 'Glass', 'Plastic', 'Other'], icon: 'layers-outline' },
        { name: 'quantity', label: 'Quantity/Set Size', type: 'text', placeholder: 'e.g., Set of 6, 24-piece', icon: 'copy-outline' },
      ]
    },
    {
      id: 'household_chemicals',
      name: 'Household Chemicals',
      conditionOptions: ['New/Sealed', 'Partially Used'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Cleaning Products', 'Laundry', 'Dishwashing', 'Air Fresheners', 'Pest Control', 'Other'], required: true, icon: 'flask-outline' },
        { name: 'quantity', label: 'Quantity', type: 'text', placeholder: 'e.g., 5L, Pack of 3', icon: 'cube-outline' },
      ]
    },
    {
      id: 'garden_supplies',
      name: 'Garden Supplies',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Garden Tools', 'Lawn Mower', 'Plants', 'Pots & Planters', 'Outdoor Furniture', 'BBQ & Grill', 'Pool Equipment', 'Irrigation', 'Seeds & Soil', 'Other'], required: true, icon: 'leaf-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'power_source', label: 'Power Source', type: 'select', options: ['Manual', 'Electric', 'Battery', 'Petrol', 'N/A'], icon: 'flash-outline' },
      ]
    }
  ]
};

// ============ FASHION & BEAUTY ============
export const FASHION_BEAUTY_CATEGORY: MainCategoryConfig = {
  id: 'fashion_beauty',
  name: 'Fashion & Beauty',
  icon: 'shirt-outline',
  subcategories: [
    {
      id: 'clothing',
      name: 'Clothing',
      conditionOptions: ['New with Tags', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Dresses', 'Tops', 'Pants', 'Jeans', 'Shorts', 'Skirts', 'Jackets', 'Coats', 'Sweaters', 'Suits', 'Activewear', 'Swimwear', 'Other'], required: true, icon: 'shirt-outline' },
        { name: 'for_gender', label: 'For', type: 'select', options: ['Men', 'Women', 'Unisex'], required: true, icon: 'people-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Zara, H&M, Nike', required: true, icon: 'ribbon-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., M, 40, US 8', required: true, icon: 'resize-outline' },
        { name: 'color', label: 'Color', type: 'text', required: true, icon: 'color-palette-outline' },
        { name: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Cotton, Wool', icon: 'layers-outline' },
      ]
    },
    {
      id: 'shoes',
      name: 'Shoes',
      conditionOptions: ['New with Tags', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Sneakers', 'Boots', 'Heels', 'Flats', 'Sandals', 'Loafers', 'Athletic', 'Formal', 'Other'], required: true, icon: 'footsteps-outline' },
        { name: 'for_gender', label: 'For', type: 'select', options: ['Men', 'Women', 'Unisex'], required: true, icon: 'people-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Nike, Adidas, Gucci', required: true, icon: 'ribbon-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., EU 42, US 9', required: true, icon: 'resize-outline' },
        { name: 'color', label: 'Color', type: 'text', required: true, icon: 'color-palette-outline' },
      ]
    },
    {
      id: 'bags',
      name: 'Bags',
      conditionOptions: ['New with Tags', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Handbag', 'Backpack', 'Tote', 'Crossbody', 'Clutch', 'Messenger', 'Travel Bag', 'Wallet', 'Other'], required: true, icon: 'bag-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Louis Vuitton, Coach', required: true, icon: 'ribbon-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Leather', 'Canvas', 'Nylon', 'Synthetic', 'Other'], icon: 'layers-outline' },
        { name: 'color', label: 'Color', type: 'text', required: true, icon: 'color-palette-outline' },
        { name: 'authentic', label: 'Authentic', type: 'select', options: ['Yes - With Receipt/Card', 'Yes - No Proof', 'Unknown'], icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'watches',
      name: 'Watches',
      conditionOptions: ['New with Tags', 'Like New', 'Good', 'Fair', 'Vintage'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Analog', 'Digital', 'Smart Watch', 'Luxury', 'Sport', 'Vintage'], required: true, icon: 'watch-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Rolex, Omega, Casio', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Stainless Steel', 'Gold', 'Titanium', 'Ceramic', 'Leather Strap', 'Rubber Strap', 'Other'], icon: 'layers-outline' },
        { name: 'authentic', label: 'Authentic', type: 'select', options: ['Yes - With Papers/Box', 'Yes - No Papers', 'Unknown'], icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'jewelry',
      name: 'Jewelry',
      conditionOptions: ['New', 'Like New', 'Good', 'Vintage'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Necklace', 'Earrings', 'Bracelet', 'Ring', 'Pendant', 'Set', 'Other'], required: true, icon: 'diamond-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Gold', 'Silver', 'Platinum', 'Stainless Steel', 'Costume', 'Other'], required: true, icon: 'layers-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'stones', label: 'Stones (if any)', type: 'text', placeholder: 'e.g., Diamond, Sapphire', icon: 'sparkles-outline' },
        { name: 'authentic', label: 'Authentic/Certified', type: 'select', options: ['Yes - Certified', 'Yes - No Certificate', 'Costume/Fashion', 'Unknown'], icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'skincare',
      name: 'Skincare',
      conditionOptions: ['New/Sealed', 'Lightly Used'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Cleanser', 'Moisturizer', 'Serum', 'Sunscreen', 'Mask', 'Toner', 'Eye Cream', 'Set', 'Other'], required: true, icon: 'water-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., La Mer, CeraVe', required: true, icon: 'ribbon-outline' },
        { name: 'skin_type', label: 'Skin Type', type: 'select', options: ['All', 'Dry', 'Oily', 'Combination', 'Sensitive'], icon: 'information-circle-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., 50ml', icon: 'resize-outline' },
        { name: 'expiry_date', label: 'Expiry Date', type: 'text', placeholder: '2025-12', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'makeup',
      name: 'Makeup',
      conditionOptions: ['New/Sealed', 'Swatched/Tested', 'Lightly Used'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Foundation', 'Lipstick', 'Eyeshadow', 'Mascara', 'Concealer', 'Blush', 'Primer', 'Setting Spray', 'Brushes', 'Set', 'Other'], required: true, icon: 'color-fill-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., MAC, Charlotte Tilbury', required: true, icon: 'ribbon-outline' },
        { name: 'shade', label: 'Shade/Color', type: 'text', icon: 'color-palette-outline' },
        { name: 'expiry_date', label: 'Expiry Date', type: 'text', placeholder: '2025-12', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'haircare',
      name: 'Hair Care',
      conditionOptions: ['New/Sealed', 'Lightly Used'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Shampoo', 'Conditioner', 'Hair Mask', 'Styling Product', 'Hair Tool', 'Hair Color', 'Treatment', 'Other'], required: true, icon: 'cut-outline' },
        { name: 'brand', label: 'Brand', type: 'text', required: true, icon: 'ribbon-outline' },
        { name: 'hair_type', label: 'Hair Type', type: 'select', options: ['All', 'Dry', 'Oily', 'Curly', 'Color-treated', 'Damaged'], icon: 'information-circle-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., 250ml', icon: 'resize-outline' },
      ]
    },
    {
      id: 'perfumes',
      name: 'Perfumes & Fragrances',
      conditionOptions: ['New/Sealed', 'Partially Used'],
      attributes: [
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Dior, Chanel', required: true, icon: 'ribbon-outline' },
        { name: 'name', label: 'Fragrance Name', type: 'text', placeholder: 'e.g., Sauvage', required: true, icon: 'flask-outline' },
        { name: 'type', label: 'Type', type: 'select', options: ['Eau de Parfum', 'Eau de Toilette', 'Cologne', 'Perfume Oil', 'Body Mist'], required: true, icon: 'flask-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., 100ml', icon: 'resize-outline' },
        { name: 'remaining', label: 'Remaining', type: 'select', options: ['Full/New', '90%+', '70-90%', '50-70%', 'Less than 50%'], icon: 'pie-chart-outline' },
        { name: 'authentic', label: 'Authentic', type: 'select', options: ['Yes - With Box', 'Yes - No Box', 'Unknown'], icon: 'shield-checkmark-outline' },
      ]
    }
  ]
};

// ============ JOBS & SERVICES ============
export const JOBS_SERVICES_CATEGORY: MainCategoryConfig = {
  id: 'jobs_services',
  name: 'Jobs & Services',
  icon: 'briefcase-outline',
  subcategories: [
    {
      id: 'job_listings',
      name: 'Job Listings',
      attributes: [
        { name: 'job_title', label: 'Job Title', type: 'text', required: true, icon: 'person-outline' },
        { name: 'job_type', label: 'Job Type', type: 'select', options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Mini-Job', 'Temporary'], required: true, icon: 'briefcase-outline' },
        { name: 'industry', label: 'Industry', type: 'select', options: ['Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales', 'Education', 'Hospitality', 'Retail', 'Manufacturing', 'Construction', 'Other'], icon: 'business-outline' },
        { name: 'experience', label: 'Experience Required', type: 'select', options: ['Entry Level', '1-2 Years', '3-5 Years', '5+ Years', 'Not Required'], icon: 'trending-up-outline' },
        { name: 'salary_range', label: 'Salary Range', type: 'text', placeholder: '€40,000 - €60,000', icon: 'cash-outline' },
        { name: 'remote', label: 'Remote Work', type: 'select', options: ['Fully Remote', 'Hybrid', 'On-site Only'], icon: 'home-outline' },
        { name: 'start_date', label: 'Start Date', type: 'select', options: ['Immediately', 'Within 1 Month', 'Within 3 Months', 'Flexible'], icon: 'calendar-outline' },
      ]
    },
    {
      id: 'professional_services',
      name: 'Professional Services',
      attributes: [
        { name: 'service_type', label: 'Service Type', type: 'select', options: ['Legal', 'Accounting', 'Consulting', 'IT Support', 'Translation', 'Tutoring', 'Coaching', 'Design', 'Writing', 'Photography', 'Other'], required: true, icon: 'briefcase-outline' },
        { name: 'experience_years', label: 'Years of Experience', type: 'select', options: ['1-2', '3-5', '5-10', '10+'], icon: 'time-outline' },
        { name: 'pricing', label: 'Pricing Model', type: 'select', options: ['Hourly', 'Per Project', 'Per Session', 'Monthly Retainer'], icon: 'cash-outline' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Weekdays', 'Weekends', 'Evenings', 'Flexible', '24/7'], icon: 'calendar-outline' },
        { name: 'service_area', label: 'Service Area', type: 'text', placeholder: 'Berlin & surroundings', icon: 'location-outline' },
        { name: 'certifications', label: 'Certifications', type: 'text', placeholder: 'Relevant certifications', icon: 'ribbon-outline' },
      ]
    },
    {
      id: 'home_services',
      name: 'Home Services',
      attributes: [
        { name: 'service_type', label: 'Service Type', type: 'select', options: ['Cleaning', 'Plumbing', 'Electrical', 'Painting', 'Moving', 'Renovation', 'Gardening', 'Handyman', 'Pest Control', 'Other'], required: true, icon: 'construct-outline' },
        { name: 'experience_years', label: 'Years of Experience', type: 'select', options: ['1-2', '3-5', '5-10', '10+'], icon: 'time-outline' },
        { name: 'pricing', label: 'Pricing', type: 'select', options: ['Hourly Rate', 'Fixed Price', 'Per Job', 'Free Quote'], required: true, icon: 'cash-outline' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Weekdays', 'Weekends', 'Flexible', 'Emergency/24h'], icon: 'calendar-outline' },
        { name: 'service_area', label: 'Service Area', type: 'text', placeholder: 'Your coverage area', icon: 'location-outline' },
        { name: 'insured', label: 'Insured', type: 'toggle', icon: 'shield-checkmark-outline' },
      ]
    },
    {
      id: 'events_entertainment',
      name: 'Events & Entertainment',
      attributes: [
        { name: 'service_type', label: 'Service Type', type: 'select', options: ['DJ', 'Photography', 'Videography', 'Catering', 'Event Planning', 'MC/Host', 'Band/Musician', 'Decorator', 'Other'], required: true, icon: 'musical-notes-outline' },
        { name: 'experience_years', label: 'Years of Experience', type: 'select', options: ['1-2', '3-5', '5-10', '10+'], icon: 'time-outline' },
        { name: 'event_types', label: 'Event Types', type: 'text', placeholder: 'Weddings, Corporate, Birthdays', icon: 'calendar-outline' },
        { name: 'pricing', label: 'Pricing', type: 'select', options: ['Hourly', 'Per Event', 'Package', 'Custom Quote'], icon: 'cash-outline' },
        { name: 'service_area', label: 'Service Area', type: 'text', placeholder: 'Travel area', icon: 'location-outline' },
      ]
    },
    {
      id: 'health_wellness',
      name: 'Health & Wellness Services',
      attributes: [
        { name: 'service_type', label: 'Service Type', type: 'select', options: ['Personal Training', 'Yoga', 'Massage', 'Nutrition', 'Physiotherapy', 'Mental Health', 'Beauty Treatment', 'Other'], required: true, icon: 'fitness-outline' },
        { name: 'certifications', label: 'Certifications', type: 'text', placeholder: 'Relevant certifications', icon: 'ribbon-outline' },
        { name: 'pricing', label: 'Pricing', type: 'select', options: ['Per Session', 'Hourly', 'Package', 'Subscription'], icon: 'cash-outline' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Weekdays', 'Weekends', 'Evenings', 'Flexible'], icon: 'calendar-outline' },
        { name: 'location_type', label: 'Location', type: 'select', options: ['My Studio', 'Client Location', 'Online', 'Gym', 'Flexible'], icon: 'location-outline' },
      ]
    }
  ]
};

// ============ PETS ============
export const PETS_CATEGORY: MainCategoryConfig = {
  id: 'pets',
  name: 'Pets',
  icon: 'paw-outline',
  subcategories: [
    {
      id: 'dogs',
      name: 'Dogs',
      attributes: [
        { name: 'breed', label: 'Breed', type: 'text', placeholder: 'e.g., Golden Retriever', required: true, icon: 'paw-outline' },
        { name: 'age', label: 'Age', type: 'text', placeholder: 'e.g., 2 years, 6 months', required: true, icon: 'calendar-outline' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], required: true, icon: 'male-female-outline' },
        { name: 'size', label: 'Size', type: 'select', options: ['Toy/Teacup', 'Small', 'Medium', 'Large', 'Giant'], icon: 'resize-outline' },
        { name: 'vaccinated', label: 'Vaccinated', type: 'select', options: ['Fully Vaccinated', 'Partially', 'No'], required: true, icon: 'medkit-outline' },
        { name: 'neutered', label: 'Neutered/Spayed', type: 'select', options: ['Yes', 'No'], icon: 'cut-outline' },
        { name: 'microchipped', label: 'Microchipped', type: 'toggle', icon: 'hardware-chip-outline' },
        { name: 'pedigree', label: 'Pedigree/Papers', type: 'select', options: ['Yes', 'No'], icon: 'document-outline' },
        { name: 'trained', label: 'Trained', type: 'select', options: ['Fully Trained', 'Basic Training', 'Puppy', 'Not Trained'], icon: 'school-outline' },
      ]
    },
    {
      id: 'cats',
      name: 'Cats',
      attributes: [
        { name: 'breed', label: 'Breed', type: 'text', placeholder: 'e.g., Maine Coon, Domestic', required: true, icon: 'paw-outline' },
        { name: 'age', label: 'Age', type: 'text', placeholder: 'e.g., 1 year, 3 months', required: true, icon: 'calendar-outline' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'], required: true, icon: 'male-female-outline' },
        { name: 'vaccinated', label: 'Vaccinated', type: 'select', options: ['Fully Vaccinated', 'Partially', 'No'], required: true, icon: 'medkit-outline' },
        { name: 'neutered', label: 'Neutered/Spayed', type: 'select', options: ['Yes', 'No'], icon: 'cut-outline' },
        { name: 'microchipped', label: 'Microchipped', type: 'toggle', icon: 'hardware-chip-outline' },
        { name: 'indoor_outdoor', label: 'Indoor/Outdoor', type: 'select', options: ['Indoor Only', 'Outdoor Access', 'Both'], icon: 'home-outline' },
      ]
    },
    {
      id: 'birds',
      name: 'Birds',
      attributes: [
        { name: 'species', label: 'Species', type: 'text', placeholder: 'e.g., Budgie, Parrot', required: true, icon: 'leaf-outline' },
        { name: 'age', label: 'Age', type: 'text', required: true, icon: 'calendar-outline' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], icon: 'male-female-outline' },
        { name: 'tamed', label: 'Tamed/Hand-raised', type: 'toggle', icon: 'hand-left-outline' },
        { name: 'talks', label: 'Can Talk', type: 'toggle', icon: 'chatbubble-outline' },
        { name: 'cage_included', label: 'Cage Included', type: 'toggle', icon: 'cube-outline' },
      ]
    },
    {
      id: 'fish_aquarium',
      name: 'Fish & Aquarium',
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Freshwater Fish', 'Saltwater Fish', 'Aquarium', 'Equipment', 'Plants', 'Other'], required: true, icon: 'fish-outline' },
        { name: 'species', label: 'Species (if fish)', type: 'text', icon: 'fish-outline' },
        { name: 'tank_size', label: 'Tank Size (if aquarium)', type: 'text', placeholder: 'e.g., 100L', icon: 'resize-outline' },
        { name: 'quantity', label: 'Quantity', type: 'text', placeholder: 'e.g., 5 fish', icon: 'copy-outline' },
        { name: 'complete_setup', label: 'Complete Setup', type: 'toggle', icon: 'checkmark-circle-outline' },
      ]
    },
    {
      id: 'small_animals',
      name: 'Small Animals',
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Rabbit', 'Hamster', 'Guinea Pig', 'Gerbil', 'Ferret', 'Chinchilla', 'Rat', 'Mouse', 'Other'], required: true, icon: 'paw-outline' },
        { name: 'age', label: 'Age', type: 'text', required: true, icon: 'calendar-outline' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Unknown'], icon: 'male-female-outline' },
        { name: 'cage_included', label: 'Cage Included', type: 'toggle', icon: 'cube-outline' },
        { name: 'neutered', label: 'Neutered', type: 'select', options: ['Yes', 'No', 'N/A'], icon: 'cut-outline' },
      ]
    },
    {
      id: 'pet_supplies',
      name: 'Pet Supplies',
      conditionOptions: ['New', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Food', 'Toys', 'Bed/Housing', 'Clothing', 'Grooming', 'Health', 'Training', 'Travel', 'Other'], required: true, icon: 'basket-outline' },
        { name: 'for_pet', label: 'For Pet Type', type: 'select', options: ['Dog', 'Cat', 'Bird', 'Fish', 'Small Animal', 'Reptile', 'Universal'], required: true, icon: 'paw-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., Large, 10kg', icon: 'resize-outline' },
      ]
    }
  ]
};

// ============ SPORTS & HOBBIES ============
export const SPORTS_HOBBIES_CATEGORY: MainCategoryConfig = {
  id: 'sports_hobbies',
  name: 'Sports & Hobbies',
  icon: 'football-outline',
  subcategories: [
    {
      id: 'sports_equipment',
      name: 'Sports Equipment',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'sport', label: 'Sport', type: 'select', options: ['Football/Soccer', 'Basketball', 'Tennis', 'Golf', 'Swimming', 'Skiing/Snowboard', 'Running', 'Cycling', 'Martial Arts', 'Yoga', 'Other'], required: true, icon: 'football-outline' },
        { name: 'item_type', label: 'Item Type', type: 'text', placeholder: 'e.g., Ball, Racket, Shoes', required: true, icon: 'layers-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Nike, Adidas', icon: 'ribbon-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'Size if applicable', icon: 'resize-outline' },
      ]
    },
    {
      id: 'fitness_equipment',
      name: 'Fitness Equipment',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Treadmill', 'Exercise Bike', 'Rowing Machine', 'Weights', 'Bench', 'Resistance Bands', 'Yoga Mat', 'Home Gym', 'Other'], required: true, icon: 'barbell-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'weight', label: 'Weight/Capacity', type: 'text', placeholder: 'e.g., 20kg, supports 150kg', icon: 'barbell-outline' },
        { name: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'L×W×H', icon: 'resize-outline' },
      ]
    },
    {
      id: 'bicycles',
      name: 'Bicycles',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair', 'For Parts'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Road Bike', 'Mountain Bike', 'E-Bike', 'City/Urban', 'Hybrid', 'BMX', 'Folding', 'Gravel', 'Kids Bike', 'Other'], required: true, icon: 'bicycle-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Canyon, Trek', required: true, icon: 'ribbon-outline' },
        { name: 'frame_size', label: 'Frame Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', '48cm', '50cm', '52cm', '54cm', '56cm', '58cm', 'Other'], icon: 'resize-outline' },
        { name: 'wheel_size', label: 'Wheel Size', type: 'select', options: ['16"', '20"', '24"', '26"', '27.5"', '29"', '700c'], icon: 'ellipse-outline' },
        { name: 'gears', label: 'Gears', type: 'text', placeholder: 'e.g., 21-speed', icon: 'cog-outline' },
        { name: 'frame_material', label: 'Frame Material', type: 'select', options: ['Carbon', 'Aluminum', 'Steel', 'Titanium', 'Other'], icon: 'construct-outline' },
      ]
    },
    {
      id: 'musical_instruments',
      name: 'Musical Instruments',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair', 'Vintage'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Guitar', 'Piano/Keyboard', 'Drums', 'Violin', 'Bass', 'Saxophone', 'Flute', 'Trumpet', 'DJ Equipment', 'Other'], required: true, icon: 'musical-notes-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Fender, Yamaha', required: true, icon: 'ribbon-outline' },
        { name: 'model', label: 'Model', type: 'text', icon: 'barcode-outline' },
        { name: 'acoustic_electric', label: 'Type', type: 'select', options: ['Acoustic', 'Electric', 'Acoustic-Electric', 'Digital', 'N/A'], icon: 'flash-outline' },
        { name: 'accessories', label: 'Accessories Included', type: 'text', placeholder: 'Case, stand, cables', icon: 'gift-outline' },
      ]
    },
    {
      id: 'books_comics',
      name: 'Books & Comics',
      conditionOptions: ['New', 'Like New', 'Good', 'Acceptable'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Fiction', 'Non-Fiction', 'Textbook', 'Comic/Manga', 'Magazine', 'Children\'s Book', 'Rare/Collectible', 'Other'], required: true, icon: 'book-outline' },
        { name: 'title', label: 'Title', type: 'text', required: true, icon: 'document-text-outline' },
        { name: 'author', label: 'Author', type: 'text', icon: 'person-outline' },
        { name: 'language', label: 'Language', type: 'select', options: ['English', 'German', 'French', 'Spanish', 'Other'], icon: 'language-outline' },
        { name: 'format', label: 'Format', type: 'select', options: ['Hardcover', 'Paperback', 'E-book Code', 'Audio Book'], icon: 'book-outline' },
      ]
    },
    {
      id: 'collectibles',
      name: 'Collectibles & Art',
      conditionOptions: ['Mint', 'Excellent', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Coins', 'Stamps', 'Trading Cards', 'Action Figures', 'Art', 'Antiques', 'Memorabilia', 'Vintage Items', 'Other'], required: true, icon: 'diamond-outline' },
        { name: 'era', label: 'Era/Year', type: 'text', placeholder: 'e.g., 1990s, Victorian', icon: 'calendar-outline' },
        { name: 'authenticity', label: 'Authenticity', type: 'select', options: ['Certified', 'With Provenance', 'Unknown', 'Reproduction'], icon: 'shield-checkmark-outline' },
        { name: 'rarity', label: 'Rarity', type: 'select', options: ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique'], icon: 'star-outline' },
      ]
    },
    {
      id: 'outdoor_camping',
      name: 'Outdoor & Camping',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Tent', 'Sleeping Bag', 'Backpack', 'Hiking Gear', 'Cooking Equipment', 'Camping Furniture', 'Navigation', 'Climbing Gear', 'Other'], required: true, icon: 'bonfire-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'capacity', label: 'Capacity/Size', type: 'text', placeholder: 'e.g., 4-person, 65L', icon: 'resize-outline' },
        { name: 'season_rating', label: 'Season Rating', type: 'select', options: ['3-Season', '4-Season', 'Summer', 'Winter', 'N/A'], icon: 'thermometer-outline' },
      ]
    }
  ]
};

// ============ KIDS & BABY ============
export const KIDS_BABY_CATEGORY: MainCategoryConfig = {
  id: 'kids_baby',
  name: 'Kids & Baby',
  icon: 'people-outline',
  subcategories: [
    {
      id: 'baby_gear',
      name: 'Baby Gear',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Stroller', 'Car Seat', 'Baby Carrier', 'Bouncer', 'Swing', 'Walker', 'Playpen', 'Other'], required: true, icon: 'happy-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Bugaboo, Cybex', required: true, icon: 'ribbon-outline' },
        { name: 'age_range', label: 'Age Range', type: 'select', options: ['0-6 months', '6-12 months', '1-2 years', '2-4 years', '0-4 years'], icon: 'calendar-outline' },
        { name: 'safety_certified', label: 'Safety Certified', type: 'toggle', icon: 'shield-checkmark-outline' },
        { name: 'weight_limit', label: 'Weight Limit', type: 'text', placeholder: 'e.g., up to 22kg', icon: 'barbell-outline' },
      ]
    },
    {
      id: 'baby_furniture',
      name: 'Baby & Kids Furniture',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Crib', 'Bassinet', 'Changing Table', 'High Chair', 'Kids Bed', 'Kids Desk', 'Storage', 'Other'], required: true, icon: 'bed-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'age_range', label: 'Age Range', type: 'select', options: ['0-6 months', '6-12 months', '1-3 years', '3-6 years', '6+ years'], icon: 'calendar-outline' },
        { name: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Plastic', 'Mixed'], icon: 'layers-outline' },
        { name: 'convertible', label: 'Convertible', type: 'toggle', icon: 'sync-outline' },
      ]
    },
    {
      id: 'toys',
      name: 'Toys & Games',
      conditionOptions: ['New', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Building Sets', 'Dolls', 'Action Figures', 'Board Games', 'Puzzles', 'Educational', 'Outdoor', 'Electronic', 'Ride-on', 'Other'], required: true, icon: 'game-controller-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., LEGO, Fisher-Price', icon: 'ribbon-outline' },
        { name: 'age_range', label: 'Age Range', type: 'select', options: ['0-1 year', '1-3 years', '3-5 years', '5-8 years', '8-12 years', '12+ years'], required: true, icon: 'calendar-outline' },
        { name: 'complete_set', label: 'Complete Set', type: 'toggle', icon: 'checkmark-circle-outline' },
      ]
    },
    {
      id: 'kids_clothing',
      name: 'Kids Clothing',
      conditionOptions: ['New with Tags', 'Like New', 'Good', 'Fair'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Sleepwear', 'Shoes', 'Accessories', 'Bundle'], required: true, icon: 'shirt-outline' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Boy', 'Girl', 'Unisex'], required: true, icon: 'male-female-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., 3-6 months, 4T, 110cm', required: true, icon: 'resize-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'quantity', label: 'Quantity (if bundle)', type: 'text', icon: 'copy-outline' },
      ]
    },
    {
      id: 'feeding_nursing',
      name: 'Feeding & Nursing',
      conditionOptions: ['New/Sealed', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Bottles', 'Breast Pump', 'Sterilizer', 'Food Maker', 'Feeding Accessories', 'Formula', 'Other'], required: true, icon: 'nutrition-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
        { name: 'quantity', label: 'Quantity', type: 'text', placeholder: 'e.g., Set of 6', icon: 'copy-outline' },
        { name: 'expiry', label: 'Expiry (if applicable)', type: 'text', placeholder: '2025-12', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'maternity',
      name: 'Maternity',
      conditionOptions: ['New with Tags', 'Like New', 'Good'],
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Maternity Clothing', 'Nursing Wear', 'Maternity Pillow', 'Belly Band', 'Pump Accessories', 'Other'], required: true, icon: 'heart-outline' },
        { name: 'size', label: 'Size', type: 'text', placeholder: 'e.g., M, Size 10', icon: 'resize-outline' },
        { name: 'brand', label: 'Brand', type: 'text', icon: 'ribbon-outline' },
      ]
    }
  ]
};

// ============ FRIENDSHIP & DATING ============
export const FRIENDSHIP_DATING_CATEGORY: MainCategoryConfig = {
  id: 'friendship_dating',
  name: 'Friendship & Dating',
  icon: 'heart-outline',
  subcategories: [
    {
      id: 'friendship_social',
      name: 'Friendship & Social',
      attributes: [
        { name: 'seeking', label: 'Looking For', type: 'select', options: ['Friends', 'Activity Partners', 'Study Buddies', 'Professional Network', 'Support Group'], required: true, icon: 'people-outline' },
        { name: 'interests', label: 'Interests', type: 'text', placeholder: 'e.g., Sports, Music, Gaming', icon: 'flash-outline' },
        { name: 'age_range', label: 'Age Range', type: 'text', placeholder: 'e.g., 25-35', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'looking_for_friends',
      name: 'Looking for Friends',
      attributes: [
        { name: 'friendship_type', label: 'Type of Friendship', type: 'select', options: ['Casual Friends', 'Close Friends', 'Activity Partners', 'Online Friends'], required: true, icon: 'people-outline' },
        { name: 'interests', label: 'Common Interests', type: 'text', placeholder: 'e.g., Movies, Sports, Travel', icon: 'flash-outline' },
      ]
    },
    {
      id: 'professional_networking',
      name: 'Professional Networking',
      attributes: [
        { name: 'industry', label: 'Industry', type: 'text', placeholder: 'e.g., Technology, Finance', icon: 'briefcase-outline' },
        { name: 'purpose', label: 'Purpose', type: 'select', options: ['Career Advice', 'Business Partners', 'Mentorship', 'Collaboration', 'Job Referrals'], required: true, icon: 'people-outline' },
      ]
    },
    {
      id: 'roommate_search',
      name: 'Roommate Search',
      attributes: [
        { name: 'location', label: 'Preferred Location', type: 'text', placeholder: 'City or neighborhood', icon: 'location-outline' },
        { name: 'budget', label: 'Budget Range', type: 'text', placeholder: 'e.g., $500-800/month', icon: 'cash-outline' },
        { name: 'move_in', label: 'Move-in Date', type: 'text', placeholder: 'e.g., Immediate, Next month', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'study_buddies',
      name: 'Study Buddies',
      attributes: [
        { name: 'subject', label: 'Subject/Course', type: 'text', placeholder: 'e.g., Math, Programming', required: true, icon: 'book-outline' },
        { name: 'level', label: 'Level', type: 'select', options: ['High School', 'University', 'Graduate', 'Professional Certification', 'Self-Study'], icon: 'school-outline' },
      ]
    },
    {
      id: 'dating_relationships',
      name: 'Dating & Relationships',
      attributes: [
        { name: 'looking_for', label: 'Looking For', type: 'select', options: ['Casual Dating', 'Serious Relationship', 'Long-term Partner', 'Marriage'], required: true, icon: 'heart-outline' },
        { name: 'age_preference', label: 'Age Preference', type: 'text', placeholder: 'e.g., 25-35', icon: 'calendar-outline' },
      ]
    },
    {
      id: 'casual_dating',
      name: 'Casual Dating',
      attributes: [
        { name: 'interests', label: 'Interests', type: 'text', placeholder: 'e.g., Dining, Movies, Travel', icon: 'flash-outline' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Weekdays', 'Weekends', 'Evenings', 'Flexible'], icon: 'time-outline' },
      ]
    },
    {
      id: 'dating_romance',
      name: 'Dating & Romance',
      attributes: [
        { name: 'relationship_goal', label: 'Relationship Goal', type: 'select', options: ['Dating', 'Romance', 'Companionship'], required: true, icon: 'heart-outline' },
        { name: 'interests', label: 'Interests', type: 'text', placeholder: 'e.g., Travel, Music, Sports', icon: 'flash-outline' },
      ]
    },
    {
      id: 'long_term_relationship',
      name: 'Long-term Relationship',
      attributes: [
        { name: 'values', label: 'Important Values', type: 'text', placeholder: 'e.g., Family, Career, Adventure', icon: 'heart-outline' },
        { name: 'lifestyle', label: 'Lifestyle', type: 'select', options: ['Active', 'Homebody', 'Social', 'Quiet', 'Adventurous'], icon: 'sunny-outline' },
      ]
    },
    {
      id: 'faith_based_dating',
      name: 'Faith-based Dating',
      attributes: [
        { name: 'faith', label: 'Faith/Religion', type: 'text', placeholder: 'e.g., Christian, Muslim, Jewish', required: true, icon: 'heart-outline' },
        { name: 'involvement', label: 'Involvement Level', type: 'select', options: ['Very Active', 'Active', 'Moderate', 'Cultural'], icon: 'star-outline' },
      ]
    },
    {
      id: 'mature_dating_40_plus',
      name: 'Mature Dating (40+)',
      attributes: [
        { name: 'relationship_type', label: 'Looking For', type: 'select', options: ['Companionship', 'Dating', 'Serious Relationship', 'Marriage'], required: true, icon: 'heart-outline' },
        { name: 'status', label: 'Status', type: 'select', options: ['Single', 'Divorced', 'Widowed'], icon: 'person-outline' },
      ]
    },
    {
      id: 'activity_partners',
      name: 'Activity Partners',
      attributes: [
        { name: 'activity', label: 'Activity', type: 'select', options: ['Sports', 'Hiking', 'Gym', 'Dancing', 'Gaming', 'Travel', 'Dining', 'Movies', 'Music', 'Art', 'Other'], required: true, icon: 'walk-outline' },
        { name: 'frequency', label: 'Frequency', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Occasional'], icon: 'calendar-outline' },
      ]
    },
    {
      id: 'travel_companions',
      name: 'Travel Companions',
      attributes: [
        { name: 'destination', label: 'Destination/Region', type: 'text', placeholder: 'e.g., Europe, Asia, Beach', icon: 'airplane-outline' },
        { name: 'travel_style', label: 'Travel Style', type: 'select', options: ['Budget', 'Mid-range', 'Luxury', 'Backpacking', 'Adventure'], icon: 'compass-outline' },
        { name: 'duration', label: 'Trip Duration', type: 'text', placeholder: 'e.g., 1 week, 2 weeks', icon: 'time-outline' },
      ]
    },
    {
      id: 'gaming_partners',
      name: 'Gaming Partners',
      attributes: [
        { name: 'platform', label: 'Platform', type: 'select', options: ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'Multiple'], required: true, icon: 'game-controller-outline' },
        { name: 'games', label: 'Games', type: 'text', placeholder: 'e.g., FIFA, Call of Duty, Minecraft', icon: 'game-controller-outline' },
      ]
    },
    {
      id: 'language_exchange',
      name: 'Language Exchange',
      attributes: [
        { name: 'native_language', label: 'Native Language', type: 'text', placeholder: 'Your native language', required: true, icon: 'globe-outline' },
        { name: 'learning_language', label: 'Learning Language', type: 'text', placeholder: 'Language you want to learn', required: true, icon: 'book-outline' },
        { name: 'level', label: 'Your Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], icon: 'school-outline' },
      ]
    },
  ]
};

// ============ AGRICULTURE & FOOD ============
export const AGRICULTURE_CATEGORY: MainCategoryConfig = {
  id: 'agriculture',
  name: 'Agriculture & Food',
  icon: 'leaf-outline',
  subcategories: [
    {
      id: 'farm_equipment',
      name: 'Farm Equipment',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['Tractors', 'Harvesters', 'Ploughs', 'Seeders', 'Irrigation', 'Sprayers', 'Other'], required: true, icon: 'construct-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., John Deere', icon: 'ribbon-outline' },
      ]
    },
    {
      id: 'livestock',
      name: 'Livestock',
      attributes: [
        { name: 'animal_type', label: 'Animal Type', type: 'select', options: ['Cattle', 'Goats', 'Sheep', 'Pigs', 'Poultry', 'Other'], required: true, icon: 'paw-outline' },
        { name: 'quantity', label: 'Quantity', type: 'number', placeholder: 'Number of animals', icon: 'calculator-outline' },
      ]
    },
    {
      id: 'seeds_plants',
      name: 'Seeds & Plants',
      attributes: [
        { name: 'plant_type', label: 'Type', type: 'select', options: ['Seeds', 'Seedlings', 'Mature Plants', 'Fertilizer', 'Other'], required: true, icon: 'leaf-outline' },
        { name: 'crop', label: 'Crop/Plant Name', type: 'text', placeholder: 'e.g., Maize, Tomatoes', icon: 'flower-outline' },
      ]
    },
    {
      id: 'farm_produce',
      name: 'Farm Produce',
      attributes: [
        { name: 'produce_type', label: 'Produce Type', type: 'select', options: ['Grains', 'Vegetables', 'Fruits', 'Dairy', 'Other'], required: true, icon: 'nutrition-outline' },
        { name: 'quantity', label: 'Quantity (kg)', type: 'number', placeholder: 'Amount in kg', icon: 'scale-outline' },
      ]
    },
  ]
};

// ============ COMMERCIAL EQUIPMENT ============
export const COMMERCIAL_EQUIPMENT_CATEGORY: MainCategoryConfig = {
  id: 'commercial_equipment',
  name: 'Commercial Equipment',
  icon: 'construct-outline',
  subcategories: [
    {
      id: 'office_equipment',
      name: 'Office Equipment',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['Printers', 'Copiers', 'Scanners', 'Projectors', 'Furniture', 'Other'], required: true, icon: 'print-outline' },
      ]
    },
    {
      id: 'restaurant_equipment',
      name: 'Restaurant Equipment',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['Ovens', 'Refrigerators', 'Grills', 'Dishwashers', 'Coffee Machines', 'Other'], required: true, icon: 'restaurant-outline' },
      ]
    },
    {
      id: 'industrial_machinery',
      name: 'Industrial Machinery',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'machinery_type', label: 'Machinery Type', type: 'select', options: ['Manufacturing', 'Packaging', 'Welding', 'Lifting', 'Other'], required: true, icon: 'cog-outline' },
        { name: 'power', label: 'Power (kW)', type: 'number', placeholder: 'Power rating', icon: 'flash-outline' },
      ]
    },
    {
      id: 'retail_equipment',
      name: 'Retail Equipment',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['POS Systems', 'Display Units', 'Shelving', 'Cash Registers', 'Other'], required: true, icon: 'storefront-outline' },
      ]
    },
  ]
};

// ============ REPAIR & CONSTRUCTION ============
export const REPAIR_CONSTRUCTION_CATEGORY: MainCategoryConfig = {
  id: 'repair_construction',
  name: 'Repair & Construction',
  icon: 'hammer-outline',
  subcategories: [
    {
      id: 'construction_materials',
      name: 'Construction Materials',
      conditionOptions: ['New', 'Surplus'],
      attributes: [
        { name: 'material_type', label: 'Material Type', type: 'select', options: ['Cement', 'Sand', 'Gravel', 'Bricks', 'Steel', 'Timber', 'Roofing', 'Other'], required: true, icon: 'cube-outline' },
        { name: 'quantity', label: 'Quantity', type: 'text', placeholder: 'e.g., 50 bags, 100kg', icon: 'calculator-outline' },
      ]
    },
    {
      id: 'tools',
      name: 'Tools',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'tool_type', label: 'Tool Type', type: 'select', options: ['Power Tools', 'Hand Tools', 'Measuring Tools', 'Safety Equipment', 'Other'], required: true, icon: 'hammer-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., DeWalt, Makita', icon: 'ribbon-outline' },
      ]
    },
    {
      id: 'repair_services',
      name: 'Repair Services',
      attributes: [
        { name: 'service_type', label: 'Service Type', type: 'select', options: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Roofing', 'General Handyman', 'Other'], required: true, icon: 'build-outline' },
        { name: 'experience', label: 'Years of Experience', type: 'number', placeholder: 'Years', icon: 'time-outline' },
      ]
    },
    {
      id: 'heavy_equipment',
      name: 'Heavy Equipment',
      conditionOptions: ['New', 'Like New', 'Used - Good', 'Used - Fair'],
      attributes: [
        { name: 'equipment_type', label: 'Equipment Type', type: 'select', options: ['Excavators', 'Bulldozers', 'Cranes', 'Loaders', 'Cement Mixers', 'Other'], required: true, icon: 'construct-outline' },
        { name: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g., Caterpillar', icon: 'ribbon-outline' },
      ]
    },
  ]
};

// ============ COMMUNITY ============
export const COMMUNITY_CATEGORY: MainCategoryConfig = {
  id: 'community',
  name: 'Community',
  icon: 'people-outline',
  subcategories: [
    {
      id: 'events',
      name: 'Local Events',
      attributes: [
        { name: 'event_type', label: 'Event Type', type: 'select', options: ['Meetup', 'Workshop', 'Party', 'Sports Event', 'Concert', 'Exhibition', 'Charity', 'Other'], required: true, icon: 'calendar-outline' },
        { name: 'date', label: 'Date', type: 'text', placeholder: 'Event date', icon: 'calendar-outline' },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'Event location', icon: 'location-outline' },
      ]
    },
    {
      id: 'clubs_groups',
      name: 'Clubs & Groups',
      attributes: [
        { name: 'group_type', label: 'Group Type', type: 'select', options: ['Sports Club', 'Book Club', 'Hobby Group', 'Professional Group', 'Social Club', 'Support Group', 'Other'], required: true, icon: 'people-outline' },
        { name: 'meeting_frequency', label: 'Meeting Frequency', type: 'select', options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'], icon: 'time-outline' },
      ]
    },
    {
      id: 'volunteering',
      name: 'Volunteering',
      attributes: [
        { name: 'cause', label: 'Cause', type: 'select', options: ['Environment', 'Education', 'Health', 'Animals', 'Elderly Care', 'Children', 'Homeless', 'Other'], required: true, icon: 'heart-outline' },
        { name: 'commitment', label: 'Time Commitment', type: 'select', options: ['One-time', 'Weekly', 'Monthly', 'Flexible'], icon: 'time-outline' },
      ]
    },
    {
      id: 'lost_found',
      name: 'Lost & Found',
      attributes: [
        { name: 'type', label: 'Type', type: 'select', options: ['Lost', 'Found'], required: true, icon: 'search-outline' },
        { name: 'item', label: 'Item Description', type: 'text', placeholder: 'Describe the item', required: true, icon: 'cube-outline' },
        { name: 'location', label: 'Last Known Location', type: 'text', placeholder: 'Where lost/found', icon: 'location-outline' },
      ]
    },
    {
      id: 'announcements',
      name: 'Announcements',
      attributes: [
        { name: 'announcement_type', label: 'Type', type: 'select', options: ['Community News', 'Neighborhood Alert', 'Public Notice', 'General Announcement'], required: true, icon: 'megaphone-outline' },
      ]
    },
    {
      id: 'rideshare',
      name: 'Rideshare & Carpool',
      attributes: [
        { name: 'route', label: 'Route', type: 'text', placeholder: 'From - To', required: true, icon: 'car-outline' },
        { name: 'frequency', label: 'Frequency', type: 'select', options: ['One-time', 'Daily', 'Weekdays', 'Weekly'], icon: 'calendar-outline' },
        { name: 'cost_share', label: 'Cost Share', type: 'text', placeholder: 'e.g., $5/trip', icon: 'cash-outline' },
      ]
    },
  ]
};

// ============ MASTER CATEGORIES LIST ============
export const ALL_CATEGORIES: MainCategoryConfig[] = [
  AUTO_VEHICLES_CATEGORY,
  PROPERTIES_CATEGORY,
  ELECTRONICS_CATEGORY,
  PHONES_TABLETS_CATEGORY,
  HOME_FURNITURE_CATEGORY,
  FASHION_BEAUTY_CATEGORY,
  JOBS_SERVICES_CATEGORY,
  PETS_CATEGORY,
  SPORTS_HOBBIES_CATEGORY,
  KIDS_BABY_CATEGORY,
  FRIENDSHIP_DATING_CATEGORY,
  COMMUNITY_CATEGORY,
];

// ============ HELPER FUNCTIONS ============

/**
 * Get a main category by ID
 */
export const getMainCategory = (categoryId: string): MainCategoryConfig | undefined => {
  return ALL_CATEGORIES.find(cat => cat.id === categoryId);
};

/**
 * Get a subcategory config by main category ID and subcategory ID
 */
export const getSubcategoryConfig = (categoryId: string, subcategoryId: string): SubcategoryConfig | undefined => {
  const mainCategory = getMainCategory(categoryId);
  if (!mainCategory) return undefined;
  return mainCategory.subcategories.find(sub => sub.id === subcategoryId);
};

/**
 * Get all subcategories for a main category
 */
export const getSubcategories = (categoryId: string): SubcategoryConfig[] => {
  const mainCategory = getMainCategory(categoryId);
  return mainCategory?.subcategories || [];
};

/**
 * Get attributes for a specific subcategory
 */
export const getSubcategoryAttributes = (categoryId: string, subcategoryId: string): SubcategoryAttribute[] => {
  const subcat = getSubcategoryConfig(categoryId, subcategoryId);
  return subcat?.attributes || [];
};

/**
 * Get condition options for a specific subcategory
 */
export const getConditionOptions = (categoryId: string, subcategoryId: string): string[] => {
  const subcat = getSubcategoryConfig(categoryId, subcategoryId);
  return subcat?.conditionOptions || ['New', 'Like New', 'Good', 'Fair'];
};

/**
 * Flatten all categories to simple array for backend compatibility
 */
export const getCategoriesForBackend = () => {
  return ALL_CATEGORIES.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    subcategories: cat.subcategories.map(sub => sub.id),
  }));
};

/**
 * Get icon for a category
 */
export const getCategoryIcon = (categoryId: string): string => {
  const cat = getMainCategory(categoryId);
  return cat?.icon || 'apps-outline';
};

/**
 * Get name for a category
 */
export const getCategoryName = (categoryId: string): string => {
  const cat = getMainCategory(categoryId);
  return cat?.name || categoryId;
};

/**
 * Get subcategory name
 */
export const getSubcategoryName = (categoryId: string, subcategoryId: string): string => {
  const subcat = getSubcategoryConfig(categoryId, subcategoryId);
  return subcat?.name || subcategoryId;
};
