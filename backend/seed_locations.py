"""
Location Seed Script for Avida Marketplace
Seeds location data for 13 countries: Tanzania, Kenya, Uganda, South Africa, Nigeria, 
Ghana, Zambia, Zimbabwe, Germany, United States, Netherlands, Australia, Canada

Run with: python seed_locations.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Location data structure: Countries with their regions, districts, and cities
LOCATION_DATA = {
    "TZ": {
        "name": "Tanzania",
        "flag": "🇹🇿",
        "regions": {
            "DSM": {
                "name": "Dar es Salaam",
                "districts": {
                    "ILA": {"name": "Ilala", "cities": [
                        {"code": "CBD", "name": "Dar es Salaam CBD", "lat": -6.8160, "lng": 39.2803},
                        {"code": "KIJ", "name": "Kijitonyana", "lat": -6.8089, "lng": 39.2574},
                        {"code": "VNG", "name": "Vingunguti", "lat": -6.8522, "lng": 39.2482},
                    ]},
                    "KIN": {"name": "Kinondoni", "cities": [
                        {"code": "MIK", "name": "Mikocheni", "lat": -6.7638, "lng": 39.2637},
                        {"code": "MSA", "name": "Msasani", "lat": -6.7555, "lng": 39.2673},
                        {"code": "SIN", "name": "Sinza", "lat": -6.7883, "lng": 39.2356},
                        {"code": "KIM", "name": "Kijitonyama", "lat": -6.7722, "lng": 39.2534},
                    ]},
                    "TEM": {"name": "Temeke", "cities": [
                        {"code": "MBI", "name": "Mbagala", "lat": -6.9103, "lng": 39.2801},
                        {"code": "KUA", "name": "Kurasini", "lat": -6.8532, "lng": 39.2931},
                    ]},
                }
            },
            "ARU": {
                "name": "Arusha",
                "districts": {
                    "ARC": {"name": "Arusha City", "cities": [
                        {"code": "ARC", "name": "Arusha", "lat": -3.3869, "lng": 36.6830},
                        {"code": "THM", "name": "Themi", "lat": -3.3731, "lng": 36.6975},
                    ]},
                    "ARM": {"name": "Arumeru", "cities": [
                        {"code": "USA", "name": "Usa River", "lat": -3.3636, "lng": 36.8353},
                        {"code": "TEN", "name": "Tengeru", "lat": -3.3906, "lng": 36.7806},
                    ]},
                }
            },
            "MWZ": {
                "name": "Mwanza",
                "districts": {
                    "ILE": {"name": "Ilemela", "cities": [
                        {"code": "MWA", "name": "Mwanza", "lat": -2.5166, "lng": 32.9003},
                        {"code": "BUG", "name": "Bugarama", "lat": -2.5039, "lng": 32.8997},
                    ]},
                    "NYA": {"name": "Nyamagana", "cities": [
                        {"code": "PAB", "name": "Pamba", "lat": -2.5087, "lng": 32.9253},
                    ]},
                }
            },
            "DOD": {
                "name": "Dodoma",
                "districts": {
                    "DOD": {"name": "Dodoma Urban", "cities": [
                        {"code": "DOD", "name": "Dodoma", "lat": -6.1630, "lng": 35.7516},
                    ]},
                }
            },
            "MBY": {
                "name": "Mbeya",
                "districts": {
                    "MBC": {"name": "Mbeya City", "cities": [
                        {"code": "MBY", "name": "Mbeya", "lat": -8.9000, "lng": 33.4500},
                    ]},
                }
            },
        }
    },
    "KE": {
        "name": "Kenya",
        "flag": "🇰🇪",
        "regions": {
            "NAI": {
                "name": "Nairobi",
                "districts": {
                    "NAI": {"name": "Nairobi City", "cities": [
                        {"code": "CBD", "name": "Nairobi CBD", "lat": -1.2864, "lng": 36.8172},
                        {"code": "WES", "name": "Westlands", "lat": -1.2637, "lng": 36.8044},
                        {"code": "KAR", "name": "Karen", "lat": -1.3197, "lng": 36.7134},
                        {"code": "KIL", "name": "Kilimani", "lat": -1.2922, "lng": 36.7816},
                    ]},
                }
            },
            "MSA": {
                "name": "Mombasa",
                "districts": {
                    "MSA": {"name": "Mombasa Island", "cities": [
                        {"code": "MSA", "name": "Mombasa", "lat": -4.0435, "lng": 39.6682},
                        {"code": "NYA", "name": "Nyali", "lat": -4.0279, "lng": 39.7104},
                    ]},
                }
            },
            "KIS": {
                "name": "Kisumu",
                "districts": {
                    "KIS": {"name": "Kisumu Central", "cities": [
                        {"code": "KIS", "name": "Kisumu", "lat": -0.0917, "lng": 34.7680},
                    ]},
                }
            },
            "NAK": {
                "name": "Nakuru",
                "districts": {
                    "NAK": {"name": "Nakuru Town", "cities": [
                        {"code": "NAK", "name": "Nakuru", "lat": -0.3031, "lng": 36.0800},
                    ]},
                }
            },
            "ELD": {
                "name": "Uasin Gishu",
                "districts": {
                    "ELD": {"name": "Eldoret", "cities": [
                        {"code": "ELD", "name": "Eldoret", "lat": 0.5143, "lng": 35.2698},
                    ]},
                }
            },
        }
    },
    "UG": {
        "name": "Uganda",
        "flag": "🇺🇬",
        "regions": {
            "KLA": {
                "name": "Central Region",
                "districts": {
                    "KLA": {"name": "Kampala", "cities": [
                        {"code": "KLA", "name": "Kampala", "lat": 0.3476, "lng": 32.5825},
                        {"code": "KOL", "name": "Kololo", "lat": 0.3297, "lng": 32.5933},
                        {"code": "NTI", "name": "Ntinda", "lat": 0.3542, "lng": 32.6083},
                    ]},
                    "WAK": {"name": "Wakiso", "cities": [
                        {"code": "ENT", "name": "Entebbe", "lat": 0.0511, "lng": 32.4637},
                        {"code": "NAL", "name": "Naalya", "lat": 0.3686, "lng": 32.6467},
                    ]},
                }
            },
            "JIN": {
                "name": "Eastern Region",
                "districts": {
                    "JIN": {"name": "Jinja", "cities": [
                        {"code": "JIN", "name": "Jinja", "lat": 0.4244, "lng": 33.2041},
                    ]},
                    "MBA": {"name": "Mbale", "cities": [
                        {"code": "MBA", "name": "Mbale", "lat": 1.0647, "lng": 34.1797},
                    ]},
                }
            },
            "GUL": {
                "name": "Northern Region",
                "districts": {
                    "GUL": {"name": "Gulu", "cities": [
                        {"code": "GUL", "name": "Gulu", "lat": 2.7746, "lng": 32.2990},
                    ]},
                }
            },
            "MBR": {
                "name": "Western Region",
                "districts": {
                    "MBR": {"name": "Mbarara", "cities": [
                        {"code": "MBR", "name": "Mbarara", "lat": -0.6072, "lng": 30.6545},
                    ]},
                }
            },
        }
    },
    "ZA": {
        "name": "South Africa",
        "flag": "🇿🇦",
        "regions": {
            "GT": {
                "name": "Gauteng",
                "districts": {
                    "JHB": {"name": "City of Johannesburg", "cities": [
                        {"code": "JHB", "name": "Johannesburg", "lat": -26.2041, "lng": 28.0473},
                        {"code": "SAN", "name": "Sandton", "lat": -26.1076, "lng": 28.0567},
                        {"code": "ROD", "name": "Randburg", "lat": -26.0936, "lng": 27.9869},
                        {"code": "SOW", "name": "Soweto", "lat": -26.2678, "lng": 27.8585},
                    ]},
                    "PTA": {"name": "City of Tshwane", "cities": [
                        {"code": "PTA", "name": "Pretoria", "lat": -25.7479, "lng": 28.2293},
                        {"code": "CEN", "name": "Centurion", "lat": -25.8603, "lng": 28.1894},
                    ]},
                }
            },
            "WC": {
                "name": "Western Cape",
                "districts": {
                    "CPT": {"name": "City of Cape Town", "cities": [
                        {"code": "CPT", "name": "Cape Town", "lat": -33.9249, "lng": 18.4241},
                        {"code": "SEA", "name": "Sea Point", "lat": -33.9147, "lng": 18.3815},
                        {"code": "STE", "name": "Stellenbosch", "lat": -33.9321, "lng": 18.8602},
                    ]},
                }
            },
            "KZN": {
                "name": "KwaZulu-Natal",
                "districts": {
                    "DBN": {"name": "eThekwini", "cities": [
                        {"code": "DBN", "name": "Durban", "lat": -29.8587, "lng": 31.0218},
                        {"code": "UML", "name": "Umhlanga", "lat": -29.7268, "lng": 31.0835},
                    ]},
                }
            },
            "EC": {
                "name": "Eastern Cape",
                "districts": {
                    "PLZ": {"name": "Nelson Mandela Bay", "cities": [
                        {"code": "PLZ", "name": "Port Elizabeth", "lat": -33.9608, "lng": 25.6022},
                    ]},
                }
            },
        }
    },
    "NG": {
        "name": "Nigeria",
        "flag": "🇳🇬",
        "regions": {
            "LA": {
                "name": "Lagos",
                "districts": {
                    "LIS": {"name": "Lagos Island", "cities": [
                        {"code": "LIS", "name": "Lagos Island", "lat": 6.4541, "lng": 3.4084},
                        {"code": "VIC", "name": "Victoria Island", "lat": 6.4281, "lng": 3.4219},
                        {"code": "IKO", "name": "Ikoyi", "lat": 6.4483, "lng": 3.4346},
                    ]},
                    "LMA": {"name": "Lagos Mainland", "cities": [
                        {"code": "IKJ", "name": "Ikeja", "lat": 6.6018, "lng": 3.3515},
                        {"code": "YAB", "name": "Yaba", "lat": 6.5095, "lng": 3.3711},
                        {"code": "SUR", "name": "Surulere", "lat": 6.5009, "lng": 3.3578},
                    ]},
                    "LEK": {"name": "Lekki", "cities": [
                        {"code": "LEK", "name": "Lekki", "lat": 6.4698, "lng": 3.5852},
                        {"code": "AJH", "name": "Ajah", "lat": 6.4698, "lng": 3.5852},
                    ]},
                }
            },
            "FC": {
                "name": "Federal Capital Territory",
                "districts": {
                    "ABJ": {"name": "Abuja Municipal", "cities": [
                        {"code": "ABJ", "name": "Abuja", "lat": 9.0579, "lng": 7.4951},
                        {"code": "GAR", "name": "Garki", "lat": 9.0378, "lng": 7.4899},
                        {"code": "WUS", "name": "Wuse", "lat": 9.0574, "lng": 7.4817},
                    ]},
                }
            },
            "KN": {
                "name": "Kano",
                "districts": {
                    "KNM": {"name": "Kano Municipal", "cities": [
                        {"code": "KAN", "name": "Kano", "lat": 12.0022, "lng": 8.5919},
                    ]},
                }
            },
            "RV": {
                "name": "Rivers",
                "districts": {
                    "PHC": {"name": "Port Harcourt City", "cities": [
                        {"code": "PHC", "name": "Port Harcourt", "lat": 4.8156, "lng": 7.0498},
                    ]},
                }
            },
        }
    },
    "GH": {
        "name": "Ghana",
        "flag": "🇬🇭",
        "regions": {
            "GR": {
                "name": "Greater Accra",
                "districts": {
                    "ACC": {"name": "Accra Metropolitan", "cities": [
                        {"code": "ACC", "name": "Accra", "lat": 5.6037, "lng": -0.1870},
                        {"code": "OKA", "name": "Osu", "lat": 5.5560, "lng": -0.1869},
                        {"code": "CAN", "name": "Cantonments", "lat": 5.5741, "lng": -0.1703},
                    ]},
                    "TEM": {"name": "Tema Metropolitan", "cities": [
                        {"code": "TEM", "name": "Tema", "lat": 5.6698, "lng": -0.0166},
                    ]},
                }
            },
            "AS": {
                "name": "Ashanti",
                "districts": {
                    "KUM": {"name": "Kumasi Metropolitan", "cities": [
                        {"code": "KUM", "name": "Kumasi", "lat": 6.6885, "lng": -1.6244},
                    ]},
                }
            },
            "WR": {
                "name": "Western",
                "districts": {
                    "TAK": {"name": "Sekondi-Takoradi", "cities": [
                        {"code": "TAK", "name": "Takoradi", "lat": 4.8845, "lng": -1.7554},
                    ]},
                }
            },
        }
    },
    "ZM": {
        "name": "Zambia",
        "flag": "🇿🇲",
        "regions": {
            "LS": {
                "name": "Lusaka Province",
                "districts": {
                    "LSK": {"name": "Lusaka", "cities": [
                        {"code": "LSK", "name": "Lusaka", "lat": -15.3875, "lng": 28.3228},
                        {"code": "KAL", "name": "Kabulonga", "lat": -15.4106, "lng": 28.3167},
                    ]},
                }
            },
            "CB": {
                "name": "Copperbelt Province",
                "districts": {
                    "KIT": {"name": "Kitwe", "cities": [
                        {"code": "KIT", "name": "Kitwe", "lat": -12.8024, "lng": 28.2132},
                    ]},
                    "NDO": {"name": "Ndola", "cities": [
                        {"code": "NDO", "name": "Ndola", "lat": -12.9587, "lng": 28.6366},
                    ]},
                }
            },
            "SP": {
                "name": "Southern Province",
                "districts": {
                    "LIV": {"name": "Livingstone", "cities": [
                        {"code": "LIV", "name": "Livingstone", "lat": -17.8419, "lng": 25.8544},
                    ]},
                }
            },
        }
    },
    "ZW": {
        "name": "Zimbabwe",
        "flag": "🇿🇼",
        "regions": {
            "HR": {
                "name": "Harare",
                "districts": {
                    "HRE": {"name": "Harare", "cities": [
                        {"code": "HRE", "name": "Harare", "lat": -17.8292, "lng": 31.0522},
                        {"code": "BOR", "name": "Borrowdale", "lat": -17.7636, "lng": 31.0878},
                    ]},
                }
            },
            "BU": {
                "name": "Bulawayo",
                "districts": {
                    "BUL": {"name": "Bulawayo", "cities": [
                        {"code": "BUL", "name": "Bulawayo", "lat": -20.1325, "lng": 28.6265},
                    ]},
                }
            },
            "MN": {
                "name": "Manicaland",
                "districts": {
                    "MUT": {"name": "Mutare", "cities": [
                        {"code": "MUT", "name": "Mutare", "lat": -18.9707, "lng": 32.6709},
                    ]},
                }
            },
        }
    },
    "DE": {
        "name": "Germany",
        "flag": "🇩🇪",
        "regions": {
            "BE": {
                "name": "Berlin",
                "districts": {
                    "MIT": {"name": "Mitte", "cities": [
                        {"code": "BER", "name": "Berlin Mitte", "lat": 52.5200, "lng": 13.4050},
                    ]},
                    "KRZ": {"name": "Kreuzberg", "cities": [
                        {"code": "KRZ", "name": "Kreuzberg", "lat": 52.4989, "lng": 13.4044},
                    ]},
                    "CHA": {"name": "Charlottenburg", "cities": [
                        {"code": "CHA", "name": "Charlottenburg", "lat": 52.5166, "lng": 13.3043},
                    ]},
                }
            },
            "BY": {
                "name": "Bavaria",
                "districts": {
                    "MUC": {"name": "Munich", "cities": [
                        {"code": "MUC", "name": "Munich", "lat": 48.1351, "lng": 11.5820},
                        {"code": "NUR", "name": "Nuremberg", "lat": 49.4521, "lng": 11.0767},
                    ]},
                }
            },
            "HE": {
                "name": "Hesse",
                "districts": {
                    "FRA": {"name": "Frankfurt", "cities": [
                        {"code": "FRA", "name": "Frankfurt", "lat": 50.1109, "lng": 8.6821},
                    ]},
                }
            },
            "NW": {
                "name": "North Rhine-Westphalia",
                "districts": {
                    "COL": {"name": "Cologne", "cities": [
                        {"code": "COL", "name": "Cologne", "lat": 50.9375, "lng": 6.9603},
                        {"code": "DUS", "name": "Dusseldorf", "lat": 51.2277, "lng": 6.7735},
                    ]},
                }
            },
            "HH": {
                "name": "Hamburg",
                "districts": {
                    "HAM": {"name": "Hamburg", "cities": [
                        {"code": "HAM", "name": "Hamburg", "lat": 53.5511, "lng": 9.9937},
                    ]},
                }
            },
        }
    },
    "US": {
        "name": "United States",
        "flag": "🇺🇸",
        "regions": {
            "CA": {
                "name": "California",
                "districts": {
                    "LA": {"name": "Los Angeles County", "cities": [
                        {"code": "LAX", "name": "Los Angeles", "lat": 34.0522, "lng": -118.2437},
                        {"code": "HOL", "name": "Hollywood", "lat": 34.0928, "lng": -118.3287},
                        {"code": "SMO", "name": "Santa Monica", "lat": 34.0195, "lng": -118.4912},
                        {"code": "BEV", "name": "Beverly Hills", "lat": 34.0736, "lng": -118.4004},
                    ]},
                    "SF": {"name": "San Francisco County", "cities": [
                        {"code": "SFO", "name": "San Francisco", "lat": 37.7749, "lng": -122.4194},
                    ]},
                    "SD": {"name": "San Diego County", "cities": [
                        {"code": "SAN", "name": "San Diego", "lat": 32.7157, "lng": -117.1611},
                    ]},
                }
            },
            "NY": {
                "name": "New York",
                "districts": {
                    "NYC": {"name": "New York City", "cities": [
                        {"code": "MAN", "name": "Manhattan", "lat": 40.7831, "lng": -73.9712},
                        {"code": "BRK", "name": "Brooklyn", "lat": 40.6782, "lng": -73.9442},
                        {"code": "QNS", "name": "Queens", "lat": 40.7282, "lng": -73.7949},
                    ]},
                }
            },
            "TX": {
                "name": "Texas",
                "districts": {
                    "HOU": {"name": "Harris County", "cities": [
                        {"code": "HOU", "name": "Houston", "lat": 29.7604, "lng": -95.3698},
                    ]},
                    "DAL": {"name": "Dallas County", "cities": [
                        {"code": "DAL", "name": "Dallas", "lat": 32.7767, "lng": -96.7970},
                    ]},
                    "AUS": {"name": "Travis County", "cities": [
                        {"code": "AUS", "name": "Austin", "lat": 30.2672, "lng": -97.7431},
                    ]},
                }
            },
            "FL": {
                "name": "Florida",
                "districts": {
                    "MIA": {"name": "Miami-Dade County", "cities": [
                        {"code": "MIA", "name": "Miami", "lat": 25.7617, "lng": -80.1918},
                        {"code": "MIB", "name": "Miami Beach", "lat": 25.7907, "lng": -80.1300},
                    ]},
                    "ORL": {"name": "Orange County", "cities": [
                        {"code": "ORL", "name": "Orlando", "lat": 28.5383, "lng": -81.3792},
                    ]},
                }
            },
            "IL": {
                "name": "Illinois",
                "districts": {
                    "CHI": {"name": "Cook County", "cities": [
                        {"code": "CHI", "name": "Chicago", "lat": 41.8781, "lng": -87.6298},
                    ]},
                }
            },
            "WA": {
                "name": "Washington",
                "districts": {
                    "SEA": {"name": "King County", "cities": [
                        {"code": "SEA", "name": "Seattle", "lat": 47.6062, "lng": -122.3321},
                    ]},
                }
            },
        }
    },
    "NL": {
        "name": "Netherlands",
        "flag": "🇳🇱",
        "regions": {
            "NH": {
                "name": "North Holland",
                "districts": {
                    "AMS": {"name": "Amsterdam", "cities": [
                        {"code": "AMS", "name": "Amsterdam", "lat": 52.3676, "lng": 4.9041},
                        {"code": "AMW", "name": "Amsterdam West", "lat": 52.3700, "lng": 4.8500},
                    ]},
                    "HAA": {"name": "Haarlem", "cities": [
                        {"code": "HAA", "name": "Haarlem", "lat": 52.3874, "lng": 4.6462},
                    ]},
                }
            },
            "ZH": {
                "name": "South Holland",
                "districts": {
                    "RTD": {"name": "Rotterdam", "cities": [
                        {"code": "RTD", "name": "Rotterdam", "lat": 51.9244, "lng": 4.4777},
                    ]},
                    "HAG": {"name": "The Hague", "cities": [
                        {"code": "HAG", "name": "The Hague", "lat": 52.0705, "lng": 4.3007},
                    ]},
                }
            },
            "UT": {
                "name": "Utrecht",
                "districts": {
                    "UTR": {"name": "Utrecht", "cities": [
                        {"code": "UTR", "name": "Utrecht", "lat": 52.0907, "lng": 5.1214},
                    ]},
                }
            },
            "NB": {
                "name": "North Brabant",
                "districts": {
                    "EIN": {"name": "Eindhoven", "cities": [
                        {"code": "EIN", "name": "Eindhoven", "lat": 51.4416, "lng": 5.4697},
                    ]},
                }
            },
        }
    },
    "AU": {
        "name": "Australia",
        "flag": "🇦🇺",
        "regions": {
            "NSW": {
                "name": "New South Wales",
                "districts": {
                    "SYD": {"name": "Sydney", "cities": [
                        {"code": "SYD", "name": "Sydney", "lat": -33.8688, "lng": 151.2093},
                        {"code": "BON", "name": "Bondi", "lat": -33.8914, "lng": 151.2743},
                        {"code": "PAR", "name": "Parramatta", "lat": -33.8151, "lng": 151.0011},
                    ]},
                }
            },
            "VIC": {
                "name": "Victoria",
                "districts": {
                    "MEL": {"name": "Melbourne", "cities": [
                        {"code": "MEL", "name": "Melbourne", "lat": -37.8136, "lng": 144.9631},
                        {"code": "STK", "name": "St Kilda", "lat": -37.8679, "lng": 144.9805},
                    ]},
                }
            },
            "QLD": {
                "name": "Queensland",
                "districts": {
                    "BNE": {"name": "Brisbane", "cities": [
                        {"code": "BNE", "name": "Brisbane", "lat": -27.4698, "lng": 153.0251},
                        {"code": "GC", "name": "Gold Coast", "lat": -28.0167, "lng": 153.4000},
                    ]},
                }
            },
            "WA": {
                "name": "Western Australia",
                "districts": {
                    "PER": {"name": "Perth", "cities": [
                        {"code": "PER", "name": "Perth", "lat": -31.9505, "lng": 115.8605},
                    ]},
                }
            },
            "SA": {
                "name": "South Australia",
                "districts": {
                    "ADL": {"name": "Adelaide", "cities": [
                        {"code": "ADL", "name": "Adelaide", "lat": -34.9285, "lng": 138.6007},
                    ]},
                }
            },
        }
    },
    "CA": {
        "name": "Canada",
        "flag": "🇨🇦",
        "regions": {
            "ON": {
                "name": "Ontario",
                "districts": {
                    "TOR": {"name": "Toronto", "cities": [
                        {"code": "TOR", "name": "Toronto", "lat": 43.6532, "lng": -79.3832},
                        {"code": "SCR", "name": "Scarborough", "lat": 43.7731, "lng": -79.2577},
                        {"code": "MIS", "name": "Mississauga", "lat": 43.5890, "lng": -79.6441},
                    ]},
                    "OTT": {"name": "Ottawa", "cities": [
                        {"code": "OTT", "name": "Ottawa", "lat": 45.4215, "lng": -75.6972},
                    ]},
                }
            },
            "BC": {
                "name": "British Columbia",
                "districts": {
                    "VAN": {"name": "Vancouver", "cities": [
                        {"code": "VAN", "name": "Vancouver", "lat": 49.2827, "lng": -123.1207},
                        {"code": "BUR", "name": "Burnaby", "lat": 49.2488, "lng": -122.9805},
                    ]},
                    "VIC": {"name": "Victoria", "cities": [
                        {"code": "VIC", "name": "Victoria", "lat": 48.4284, "lng": -123.3656},
                    ]},
                }
            },
            "QC": {
                "name": "Quebec",
                "districts": {
                    "MTL": {"name": "Montreal", "cities": [
                        {"code": "MTL", "name": "Montreal", "lat": 45.5017, "lng": -73.5673},
                        {"code": "LAV", "name": "Laval", "lat": 45.6066, "lng": -73.7124},
                    ]},
                    "QUE": {"name": "Quebec City", "cities": [
                        {"code": "QUE", "name": "Quebec City", "lat": 46.8139, "lng": -71.2080},
                    ]},
                }
            },
            "AB": {
                "name": "Alberta",
                "districts": {
                    "CAL": {"name": "Calgary", "cities": [
                        {"code": "CAL", "name": "Calgary", "lat": 51.0447, "lng": -114.0719},
                    ]},
                    "EDM": {"name": "Edmonton", "cities": [
                        {"code": "EDM", "name": "Edmonton", "lat": 53.5461, "lng": -113.4938},
                    ]},
                }
            },
        }
    },
}


async def seed_locations():
    """Seed location data into MongoDB"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ.get('DB_NAME', 'classifieds_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    countries_coll = db.location_countries
    regions_coll = db.location_regions
    districts_coll = db.location_districts
    cities_coll = db.location_cities
    
    # Clear existing data
    print("Clearing existing location data...")
    await countries_coll.delete_many({})
    await regions_coll.delete_many({})
    await districts_coll.delete_many({})
    await cities_coll.delete_many({})
    
    total_countries = 0
    total_regions = 0
    total_districts = 0
    total_cities = 0
    
    for country_code, country_data in LOCATION_DATA.items():
        # Insert country
        await countries_coll.insert_one({
            "code": country_code,
            "name": country_data["name"],
            "flag": country_data.get("flag")
        })
        total_countries += 1
        print(f"  Added country: {country_data['name']} ({country_code})")
        
        for region_code, region_data in country_data["regions"].items():
            # Insert region
            await regions_coll.insert_one({
                "country_code": country_code,
                "region_code": region_code,
                "name": region_data["name"]
            })
            total_regions += 1
            
            for district_code, district_data in region_data["districts"].items():
                # Insert district
                await districts_coll.insert_one({
                    "country_code": country_code,
                    "region_code": region_code,
                    "district_code": district_code,
                    "name": district_data["name"]
                })
                total_districts += 1
                
                for city in district_data["cities"]:
                    # Insert city
                    await cities_coll.insert_one({
                        "country_code": country_code,
                        "region_code": region_code,
                        "district_code": district_code,
                        "city_code": city["code"],
                        "name": city["name"],
                        "lat": city["lat"],
                        "lng": city["lng"]
                    })
                    total_cities += 1
    
    # Create indexes
    print("\nCreating indexes...")
    await countries_coll.create_index("code", unique=True)
    await regions_coll.create_index([("country_code", 1), ("region_code", 1)], unique=True)
    await districts_coll.create_index([("country_code", 1), ("region_code", 1), ("district_code", 1)], unique=True)
    await cities_coll.create_index([("country_code", 1), ("region_code", 1), ("district_code", 1), ("city_code", 1)], unique=True)
    await cities_coll.create_index([("country_code", 1), ("name", "text")])
    
    print(f"\nSeeding complete!")
    print(f"  Countries: {total_countries}")
    print(f"  Regions: {total_regions}")
    print(f"  Districts: {total_districts}")
    print(f"  Cities: {total_cities}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_locations())
