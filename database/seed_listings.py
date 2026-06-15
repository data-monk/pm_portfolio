"""
Seed the commute_search database with 50 realistic NYC rental listings.
Run from the repo root: python3 database/seed_listings.py

Requires POSTGRES_DSN env var or uses the default local connection.
"""
from __future__ import annotations

import os
import sys
import asyncio
import json

try:
    import asyncpg
except ImportError:
    print("asyncpg not installed. Run: pip3 install asyncpg")
    sys.exit(1)

DSN = os.getenv(
    "POSTGRES_DSN",
    f"postgresql://{os.getenv('USER', 'postgres')}@localhost:5432/commute_search",
)

# 50 realistic NYC rentals — real addresses, real-ish prices, varied boroughs
LISTINGS = [
    # ── Manhattan: Financial District ──────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-001",
        "address_line1": "75 Wall St", "city": "New York", "state": "NY",
        "zip_code": "10005", "neighborhood": "Financial District",
        "lat": 40.7069, "lng": -74.0089,
        "bedrooms": 1, "bathrooms": 1, "sqft": 700,
        "price": 3200, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_ac": True, "has_dishwasher": True,
        "fee_type": "no_fee",
        "description": "Luxury 1BR in the heart of FiDi. Steps from Fulton St subway hub.",
        "listing_url": "https://streeteasy.com/building/75-wall-street-new_york",
    },
    {
        "source": "zillow", "external_id": "z-nyc-002",
        "address_line1": "20 Exchange Pl", "city": "New York", "state": "NY",
        "zip_code": "10005", "neighborhood": "Financial District",
        "lat": 40.7060, "lng": -74.0114,
        "bedrooms": 0, "bathrooms": 1, "sqft": 500,
        "price": 2500, "property_type": "studio",
        "has_doorman": True, "has_elevator": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Sleek studio in landmarked Art Deco tower. Concierge building.",
        "listing_url": "https://www.zillow.com/homedetails/20-exchange-pl-new-york-ny-10005",
    },
    # ── Manhattan: Tribeca ──────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-003",
        "address_line1": "111 Worth St", "city": "New York", "state": "NY",
        "zip_code": "10013", "neighborhood": "Tribeca",
        "lat": 40.7146, "lng": -74.0068,
        "bedrooms": 2, "bathrooms": 2, "sqft": 1100,
        "price": 5800, "property_type": "loft",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_unit": True, "has_ac": True, "has_dishwasher": True,
        "has_outdoor_space": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Stunning 2BR loft in Tribeca with exposed brick and 12ft ceilings.",
        "listing_url": "https://streeteasy.com/building/111-worth-street-new_york",
    },
    # ── Manhattan: Soho ─────────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-nyc-004",
        "address_line1": "210 Spring St", "city": "New York", "state": "NY",
        "zip_code": "10012", "neighborhood": "Soho",
        "lat": 40.7255, "lng": -74.0028,
        "bedrooms": 1, "bathrooms": 1, "sqft": 750,
        "price": 4100, "property_type": "loft",
        "has_elevator": True, "has_ac": True, "has_dishwasher": True,
        "has_laundry_in_bldg": True,
        "fee_type": "broker_fee",
        "description": "Classic Soho cast-iron loft. Hardwood floors, exposed beams.",
        "listing_url": "https://www.apartments.com/210-spring-st-new-york-ny-10012",
    },
    # ── Manhattan: West Village ─────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-005",
        "address_line1": "350 Bleecker St", "city": "New York", "state": "NY",
        "zip_code": "10014", "neighborhood": "West Village",
        "lat": 40.7349, "lng": -74.0059,
        "bedrooms": 1, "bathrooms": 1, "sqft": 625,
        "price": 3800, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Charming West Village 1BR on quiet, tree-lined block. Pre-war detail.",
        "listing_url": "https://streeteasy.com/building/350-bleecker-street-new_york",
    },
    # ── Manhattan: Chelsea ──────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-nyc-006",
        "address_line1": "250 W 26th St", "city": "New York", "state": "NY",
        "zip_code": "10001", "neighborhood": "Chelsea",
        "lat": 40.7457, "lng": -74.0001,
        "bedrooms": 2, "bathrooms": 1, "sqft": 950,
        "price": 4500, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_laundry_in_unit": True,
        "has_ac": True, "has_dishwasher": True,
        "fee_type": "no_fee",
        "description": "Spacious 2BR in the heart of Chelsea gallery district.",
        "listing_url": "https://www.zillow.com/homedetails/250-w-26th-st-new-york-ny-10001",
    },
    # ── Manhattan: Hell's Kitchen ────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-nyc-007",
        "address_line1": "520 W 45th St", "city": "New York", "state": "NY",
        "zip_code": "10036", "neighborhood": "Hell's Kitchen",
        "lat": 40.7601, "lng": -73.9936,
        "bedrooms": 1, "bathrooms": 1, "sqft": 680,
        "price": 3100, "property_type": "apartment",
        "has_elevator": True, "has_ac": True, "has_laundry_in_bldg": True,
        "pets_allowed": True, "fee_type": "no_fee",
        "description": "Renovated 1BR steps from Midtown and the Hudson River Greenway.",
        "listing_url": "https://www.apartments.com/520-w-45th-st-new-york-ny-10036",
    },
    # ── Manhattan: Upper West Side ──────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-008",
        "address_line1": "310 Riverside Dr", "city": "New York", "state": "NY",
        "zip_code": "10025", "neighborhood": "Upper West Side",
        "lat": 40.7967, "lng": -73.9730,
        "bedrooms": 2, "bathrooms": 1, "sqft": 1050,
        "price": 4200, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_laundry_in_bldg": True,
        "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Classic pre-war 2BR on Riverside Drive with park views.",
        "listing_url": "https://streeteasy.com/building/310-riverside-drive-new_york",
    },
    # ── Manhattan: Harlem ───────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-nyc-009",
        "address_line1": "2050 Adam Clayton Powell Jr Blvd", "city": "New York", "state": "NY",
        "zip_code": "10027", "neighborhood": "Harlem",
        "lat": 40.8135, "lng": -73.9501,
        "bedrooms": 2, "bathrooms": 1, "sqft": 900,
        "price": 2800, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Bright 2BR in Central Harlem, steps from the 2/3 subway.",
        "listing_url": "https://www.zillow.com/homedetails/2050-adam-clayton-powell-blvd-new-york-ny-10027",
    },
    # ── Manhattan: Washington Heights ───────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-nyc-010",
        "address_line1": "600 W 181st St", "city": "New York", "state": "NY",
        "zip_code": "10033", "neighborhood": "Washington Heights",
        "lat": 40.8479, "lng": -73.9373,
        "bedrooms": 3, "bathrooms": 1, "sqft": 1200,
        "price": 2600, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Spacious 3BR in Washington Heights with great A train access.",
        "listing_url": "https://www.apartments.com/600-w-181st-st-new-york-ny-10033",
    },
    # ── Brooklyn: DUMBO ─────────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-bk-011",
        "address_line1": "100 Jay St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11201", "neighborhood": "DUMBO",
        "lat": 40.6985, "lng": -73.9877,
        "bedrooms": 1, "bathrooms": 1, "sqft": 800,
        "price": 4200, "property_type": "loft",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_unit": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Converted warehouse loft in DUMBO with Manhattan Bridge views.",
        "listing_url": "https://streeteasy.com/building/100-jay-street-brooklyn",
    },
    # ── Brooklyn: Brooklyn Heights ───────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-bk-012",
        "address_line1": "50 Remsen St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11201", "neighborhood": "Brooklyn Heights",
        "lat": 40.6948, "lng": -73.9952,
        "bedrooms": 2, "bathrooms": 1, "sqft": 950,
        "price": 3800, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Pre-war 2BR on one of Brooklyn Heights' most beautiful blocks.",
        "listing_url": "https://www.zillow.com/homedetails/50-remsen-st-brooklyn-ny-11201",
    },
    # ── Brooklyn: Park Slope ─────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bk-013",
        "address_line1": "200 7th Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11215", "neighborhood": "Park Slope",
        "lat": 40.6701, "lng": -73.9826,
        "bedrooms": 2, "bathrooms": 1, "sqft": 1050,
        "price": 3400, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "pets_allowed": True, "has_outdoor_space": True,
        "fee_type": "no_fee",
        "description": "Sunny 2BR with backyard garden access in prime Park Slope.",
        "listing_url": "https://www.apartments.com/200-7th-ave-brooklyn-ny-11215",
    },
    # ── Brooklyn: Williamsburg ───────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-bk-014",
        "address_line1": "100 N 4th St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11249", "neighborhood": "Williamsburg",
        "lat": 40.7180, "lng": -73.9612,
        "bedrooms": 1, "bathrooms": 1, "sqft": 720,
        "price": 3300, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_unit": True, "has_ac": True,
        "has_dishwasher": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Modern 1BR in North Williamsburg, steps from the L train.",
        "listing_url": "https://streeteasy.com/building/100-north-4th-street-brooklyn",
    },
    {
        "source": "zillow", "external_id": "z-bk-015",
        "address_line1": "215 N 10th St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11211", "neighborhood": "Williamsburg",
        "lat": 40.7160, "lng": -73.9548,
        "bedrooms": 2, "bathrooms": 2, "sqft": 1000,
        "price": 4000, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_unit": True, "has_ac": True,
        "has_gym": True, "has_dishwasher": True,
        "fee_type": "no_fee",
        "description": "Luxury 2BR/2BA with rooftop access in prime Williamsburg.",
        "listing_url": "https://www.zillow.com/homedetails/215-n-10th-st-brooklyn-ny-11211",
    },
    # ── Brooklyn: Bushwick ───────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bk-016",
        "address_line1": "1090 Jefferson Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11221", "neighborhood": "Bushwick",
        "lat": 40.6949, "lng": -73.9187,
        "bedrooms": 2, "bathrooms": 1, "sqft": 950,
        "price": 2400, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Renovated 2BR in Bushwick's vibrant arts district. High ceilings.",
        "listing_url": "https://www.apartments.com/1090-jefferson-ave-brooklyn-ny-11221",
    },
    # ── Brooklyn: Crown Heights ──────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-bk-017",
        "address_line1": "940 St Johns Pl", "city": "Brooklyn", "state": "NY",
        "zip_code": "11213", "neighborhood": "Crown Heights",
        "lat": 40.6692, "lng": -73.9405,
        "bedrooms": 3, "bathrooms": 1, "sqft": 1200,
        "price": 3100, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Spacious 3BR on a quiet Crown Heights block, near Kingston Ave station.",
        "listing_url": "https://streeteasy.com/building/940-saint-johns-place-brooklyn",
    },
    # ── Brooklyn: Greenpoint ─────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-bk-018",
        "address_line1": "148 Nassau Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11222", "neighborhood": "Greenpoint",
        "lat": 40.7280, "lng": -73.9493,
        "bedrooms": 1, "bathrooms": 1, "sqft": 680,
        "price": 2900, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Charming 1BR in Greenpoint, steps from G train and McCarren Park.",
        "listing_url": "https://www.zillow.com/homedetails/148-nassau-ave-brooklyn-ny-11222",
    },
    # ── Brooklyn: Prospect Heights ───────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bk-019",
        "address_line1": "555 Vanderbilt Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11238", "neighborhood": "Prospect Heights",
        "lat": 40.6766, "lng": -73.9701,
        "bedrooms": 2, "bathrooms": 1, "sqft": 900,
        "price": 3500, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Gorgeous 2BR steps from Grand Army Plaza and Prospect Park.",
        "listing_url": "https://www.apartments.com/555-vanderbilt-ave-brooklyn-ny-11238",
    },
    # ── Brooklyn: Red Hook ───────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-bk-020",
        "address_line1": "100 Beard St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11231", "neighborhood": "Red Hook",
        "lat": 40.6722, "lng": -74.0091,
        "bedrooms": 2, "bathrooms": 1, "sqft": 1100,
        "price": 3200, "property_type": "loft",
        "has_laundry_in_unit": True, "has_ac": True, "has_outdoor_space": True,
        "pets_allowed": True, "fee_type": "no_fee",
        "description": "Industrial loft in Red Hook waterfront complex with Brooklyn harbor views.",
        "listing_url": "https://streeteasy.com/building/100-beard-street-brooklyn",
    },
    # ── Queens: Astoria ─────────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-qn-021",
        "address_line1": "31-85 31st St", "city": "Astoria", "state": "NY",
        "zip_code": "11106", "neighborhood": "Astoria",
        "lat": 40.7625, "lng": -73.9311,
        "bedrooms": 2, "bathrooms": 1, "sqft": 850,
        "price": 2700, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Bright 2BR in Astoria's Greek corridor, near N/W train.",
        "listing_url": "https://www.zillow.com/homedetails/31-85-31st-st-astoria-ny-11106",
    },
    {
        "source": "apartments_com", "external_id": "ac-qn-022",
        "address_line1": "22-44 37th St", "city": "Astoria", "state": "NY",
        "zip_code": "11105", "neighborhood": "Astoria",
        "lat": 40.7715, "lng": -73.9299,
        "bedrooms": 1, "bathrooms": 1, "sqft": 650,
        "price": 2300, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Cozy 1BR in Astoria near parks and great restaurants.",
        "listing_url": "https://www.apartments.com/22-44-37th-st-astoria-ny-11105",
    },
    # ── Queens: Long Island City ─────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-qn-023",
        "address_line1": "43-10 Crescent St", "city": "Long Island City", "state": "NY",
        "zip_code": "11101", "neighborhood": "Long Island City",
        "lat": 40.7492, "lng": -73.9447,
        "bedrooms": 1, "bathrooms": 1, "sqft": 750,
        "price": 3100, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_unit": True, "has_ac": True, "has_dishwasher": True,
        "has_outdoor_space": True, "fee_type": "no_fee",
        "description": "High-rise luxury 1BR with Manhattan skyline views, 7 min to Midtown.",
        "listing_url": "https://streeteasy.com/building/43-10-crescent-street-long-island-city",
    },
    {
        "source": "zillow", "external_id": "z-qn-024",
        "address_line1": "5-25 47th Ave", "city": "Long Island City", "state": "NY",
        "zip_code": "11101", "neighborhood": "Long Island City",
        "lat": 40.7449, "lng": -73.9508,
        "bedrooms": 2, "bathrooms": 2, "sqft": 1050,
        "price": 4200, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_unit": True, "has_ac": True, "has_dishwasher": True,
        "fee_type": "no_fee",
        "description": "Waterfront 2BR/2BA in LIC with East River and skyline views.",
        "listing_url": "https://www.zillow.com/homedetails/5-25-47th-ave-long-island-city-ny-11101",
    },
    # ── Queens: Jackson Heights ──────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-qn-025",
        "address_line1": "84-12 Roosevelt Ave", "city": "Jackson Heights", "state": "NY",
        "zip_code": "11372", "neighborhood": "Jackson Heights",
        "lat": 40.7490, "lng": -73.8836,
        "bedrooms": 2, "bathrooms": 1, "sqft": 900,
        "price": 2200, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Spacious 2BR in diverse Jackson Heights near 7/E/F/M/R trains.",
        "listing_url": "https://www.apartments.com/84-12-roosevelt-ave-jackson-heights-ny-11372",
    },
    # ── Queens: Flushing ─────────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-qn-026",
        "address_line1": "136-20 Roosevelt Ave", "city": "Flushing", "state": "NY",
        "zip_code": "11354", "neighborhood": "Flushing",
        "lat": 40.7580, "lng": -73.8303,
        "bedrooms": 2, "bathrooms": 1, "sqft": 850,
        "price": 2000, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Renovated 2BR near Flushing Main St (7 train). Vibrant neighborhood.",
        "listing_url": "https://streeteasy.com/building/136-20-roosevelt-ave-flushing",
    },
    # ── Queens: Forest Hills ─────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-qn-027",
        "address_line1": "98-38 67th Ave", "city": "Forest Hills", "state": "NY",
        "zip_code": "11375", "neighborhood": "Forest Hills",
        "lat": 40.7196, "lng": -73.8450,
        "bedrooms": 1, "bathrooms": 1, "sqft": 700,
        "price": 2400, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Quiet 1BR in Forest Hills Gardens area. Close to E/F/M/R trains.",
        "listing_url": "https://www.zillow.com/homedetails/98-38-67th-ave-forest-hills-ny-11375",
    },
    # ── Bronx: Riverdale ─────────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bx-028",
        "address_line1": "3625 Henry Hudson Pkwy", "city": "Bronx", "state": "NY",
        "zip_code": "10463", "neighborhood": "Riverdale",
        "lat": 40.8976, "lng": -73.9079,
        "bedrooms": 2, "bathrooms": 1, "sqft": 1000,
        "price": 2500, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Spacious 2BR in Riverdale with Hudson River views and doorman.",
        "listing_url": "https://www.apartments.com/3625-henry-hudson-pkwy-bronx-ny-10463",
    },
    # ── Bronx: Mott Haven ────────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-bx-029",
        "address_line1": "350 Bruckner Blvd", "city": "Bronx", "state": "NY",
        "zip_code": "10454", "neighborhood": "Mott Haven",
        "lat": 40.8095, "lng": -73.9276,
        "bedrooms": 1, "bathrooms": 1, "sqft": 700,
        "price": 2100, "property_type": "apartment",
        "has_laundry_in_unit": True, "has_ac": True, "has_dishwasher": True,
        "fee_type": "no_fee",
        "description": "Brand new construction 1BR in South Bronx's emerging arts district.",
        "listing_url": "https://streeteasy.com/building/350-bruckner-blvd-bronx",
    },
    # ── Manhattan: Murray Hill ────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-nyc-030",
        "address_line1": "303 E 33rd St", "city": "New York", "state": "NY",
        "zip_code": "10016", "neighborhood": "Murray Hill",
        "lat": 40.7456, "lng": -73.9774,
        "bedrooms": 1, "bathrooms": 1, "sqft": 650,
        "price": 3000, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_laundry_in_bldg": True,
        "has_ac": True,
        "fee_type": "no_fee",
        "description": "Modern 1BR in Murray Hill with full-service building and roof deck.",
        "listing_url": "https://www.zillow.com/homedetails/303-e-33rd-st-new-york-ny-10016",
    },
    # ── Manhattan: Gramercy ───────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-nyc-031",
        "address_line1": "200 E 20th St", "city": "New York", "state": "NY",
        "zip_code": "10003", "neighborhood": "Gramercy",
        "lat": 40.7380, "lng": -73.9841,
        "bedrooms": 0, "bathrooms": 1, "sqft": 480,
        "price": 2700, "property_type": "studio",
        "has_elevator": True, "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Charming studio in historic Gramercy Park neighborhood.",
        "listing_url": "https://www.apartments.com/200-e-20th-st-new-york-ny-10003",
    },
    # ── Manhattan: East Village ───────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-032",
        "address_line1": "144 E 7th St", "city": "New York", "state": "NY",
        "zip_code": "10009", "neighborhood": "East Village",
        "lat": 40.7263, "lng": -73.9823,
        "bedrooms": 1, "bathrooms": 1, "sqft": 600,
        "price": 3100, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Sunny East Village 1BR in walkup building. Top floor, great light.",
        "listing_url": "https://streeteasy.com/building/144-east-7th-street-new_york",
    },
    # ── Manhattan: Lower East Side ────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-nyc-033",
        "address_line1": "170 Essex St", "city": "New York", "state": "NY",
        "zip_code": "10002", "neighborhood": "Lower East Side",
        "lat": 40.7197, "lng": -73.9882,
        "bedrooms": 2, "bathrooms": 1, "sqft": 850,
        "price": 3700, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_unit": True, "has_ac": True,
        "fee_type": "broker_fee",
        "description": "Contemporary 2BR on the LES. Designer finishes, chef's kitchen.",
        "listing_url": "https://www.zillow.com/homedetails/170-essex-st-new-york-ny-10002",
    },
    # ── Brooklyn: Bed-Stuy ───────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bk-034",
        "address_line1": "1110 Fulton St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11238", "neighborhood": "Bedford-Stuyvesant",
        "lat": 40.6807, "lng": -73.9548,
        "bedrooms": 2, "bathrooms": 1, "sqft": 1000,
        "price": 2900, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Sunny 2BR in Bed-Stuy brownstone. Renovated kitchen, original details.",
        "listing_url": "https://www.apartments.com/1110-fulton-st-brooklyn-ny-11238",
    },
    # ── Brooklyn: Cobble Hill ─────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-bk-035",
        "address_line1": "210 Clinton St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11201", "neighborhood": "Cobble Hill",
        "lat": 40.6869, "lng": -73.9979,
        "bedrooms": 1, "bathrooms": 1, "sqft": 730,
        "price": 3300, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Lovely 1BR on tree-lined Clinton St in charming Cobble Hill.",
        "listing_url": "https://streeteasy.com/building/210-clinton-street-brooklyn",
    },
    # ── Manhattan: Upper East Side ───────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-nyc-036",
        "address_line1": "420 E 72nd St", "city": "New York", "state": "NY",
        "zip_code": "10021", "neighborhood": "Upper East Side",
        "lat": 40.7685, "lng": -73.9567,
        "bedrooms": 1, "bathrooms": 1, "sqft": 700,
        "price": 3400, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_laundry_in_bldg": True,
        "has_ac": True,
        "fee_type": "no_fee",
        "description": "Classic UES 1BR with white-glove doorman service. Steps from the 6 train.",
        "listing_url": "https://www.zillow.com/homedetails/420-e-72nd-st-new-york-ny-10021",
    },
    # ── Brooklyn: Fort Greene ─────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bk-037",
        "address_line1": "34 S Portland Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11217", "neighborhood": "Fort Greene",
        "lat": 40.6892, "lng": -73.9773,
        "bedrooms": 2, "bathrooms": 1, "sqft": 950,
        "price": 3600, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "has_outdoor_space": True, "fee_type": "no_fee",
        "description": "Renovated 2BR in Fort Greene brownstone with private garden access.",
        "listing_url": "https://www.apartments.com/34-s-portland-ave-brooklyn-ny-11217",
    },
    # ── Queens: Woodside ─────────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-qn-038",
        "address_line1": "62-05 Woodside Ave", "city": "Woodside", "state": "NY",
        "zip_code": "11377", "neighborhood": "Woodside",
        "lat": 40.7460, "lng": -73.9027,
        "bedrooms": 2, "bathrooms": 1, "sqft": 900,
        "price": 2100, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Quiet 2BR near Woodside LIRR and 7 train. Easy Midtown commute.",
        "listing_url": "https://streeteasy.com/building/62-05-woodside-ave-woodside",
    },
    # ── Manhattan: Inwood ────────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-nyc-039",
        "address_line1": "4835 Broadway", "city": "New York", "state": "NY",
        "zip_code": "10034", "neighborhood": "Inwood",
        "lat": 40.8679, "lng": -73.9226,
        "bedrooms": 2, "bathrooms": 1, "sqft": 950,
        "price": 2300, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Bright 2BR in Inwood near the 1 train and Inwood Hill Park.",
        "listing_url": "https://www.zillow.com/homedetails/4835-broadway-new-york-ny-10034",
    },
    # ── Brooklyn: Carroll Gardens ─────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-bk-040",
        "address_line1": "100 Carroll St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11231", "neighborhood": "Carroll Gardens",
        "lat": 40.6806, "lng": -73.9990,
        "bedrooms": 1, "bathrooms": 1, "sqft": 700,
        "price": 3100, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Lovely 1BR in Carroll Gardens, steps from F/G trains and Smith St.",
        "listing_url": "https://www.apartments.com/100-carroll-st-brooklyn-ny-11231",
    },
    # ── Manhattan: Midtown East ───────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-041",
        "address_line1": "235 E 40th St", "city": "New York", "state": "NY",
        "zip_code": "10016", "neighborhood": "Midtown East",
        "lat": 40.7506, "lng": -73.9769,
        "bedrooms": 0, "bathrooms": 1, "sqft": 450,
        "price": 2900, "property_type": "studio",
        "has_doorman": True, "has_elevator": True, "has_laundry_in_bldg": True,
        "has_ac": True, "fee_type": "no_fee",
        "description": "Well-located studio steps from Grand Central. Move-in ready.",
        "listing_url": "https://streeteasy.com/building/235-east-40th-street-new_york",
    },
    # ── Brooklyn: Sunset Park ─────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-bk-042",
        "address_line1": "5204 4th Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11220", "neighborhood": "Sunset Park",
        "lat": 40.6478, "lng": -74.0033,
        "bedrooms": 3, "bathrooms": 1, "sqft": 1250,
        "price": 2800, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Spacious 3BR in Sunset Park with views of Greenwood Cemetery.",
        "listing_url": "https://www.zillow.com/homedetails/5204-4th-ave-brooklyn-ny-11220",
    },
    # ── Queens: Sunnyside ─────────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-qn-043",
        "address_line1": "44-02 46th St", "city": "Sunnyside", "state": "NY",
        "zip_code": "11104", "neighborhood": "Sunnyside",
        "lat": 40.7445, "lng": -73.9186,
        "bedrooms": 2, "bathrooms": 1, "sqft": 850,
        "price": 2300, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Roomy 2BR in Sunnyside, Queens. Near 7 train, affordable area.",
        "listing_url": "https://www.apartments.com/44-02-46th-st-sunnyside-ny-11104",
    },
    # ── Manhattan: Kips Bay ────────────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-044",
        "address_line1": "400 E 30th St", "city": "New York", "state": "NY",
        "zip_code": "10016", "neighborhood": "Kips Bay",
        "lat": 40.7420, "lng": -73.9776,
        "bedrooms": 1, "bathrooms": 1, "sqft": 680,
        "price": 3200, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_unit": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Renovated 1BR in full-service Kips Bay building. Steps from 6 train.",
        "listing_url": "https://streeteasy.com/building/400-east-30th-street-new_york",
    },
    # ── Brooklyn: Windsor Terrace ─────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-bk-045",
        "address_line1": "170 E 3rd St", "city": "Brooklyn", "state": "NY",
        "zip_code": "11218", "neighborhood": "Windsor Terrace",
        "lat": 40.6569, "lng": -73.9789,
        "bedrooms": 2, "bathrooms": 1, "sqft": 950,
        "price": 2900, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True, "pets_allowed": True,
        "has_outdoor_space": True, "fee_type": "no_fee",
        "description": "Quiet 2BR near Prospect Park. Close to F/G trains.",
        "listing_url": "https://www.zillow.com/homedetails/170-e-3rd-st-brooklyn-ny-11218",
    },
    # ── Staten Island: St. George ─────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-si-046",
        "address_line1": "100 Richmond Terrace", "city": "Staten Island", "state": "NY",
        "zip_code": "10301", "neighborhood": "St. George",
        "lat": 40.6439, "lng": -74.0767,
        "bedrooms": 2, "bathrooms": 1, "sqft": 1100,
        "price": 1900, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Affordable 2BR near Staten Island Ferry. Easy commute to Lower Manhattan.",
        "listing_url": "https://www.apartments.com/100-richmond-terrace-staten-island-ny-10301",
    },
    # ── Manhattan: Morningside Heights ────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-047",
        "address_line1": "530 W 113th St", "city": "New York", "state": "NY",
        "zip_code": "10025", "neighborhood": "Morningside Heights",
        "lat": 40.8055, "lng": -73.9625,
        "bedrooms": 1, "bathrooms": 1, "sqft": 680,
        "price": 2600, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Sun-drenched 1BR near Columbia University. Steps from 1 train.",
        "listing_url": "https://streeteasy.com/building/530-west-113th-street-new_york",
    },
    # ── Brooklyn: Flatbush ────────────────────────────────────────────────────────
    {
        "source": "zillow", "external_id": "z-bk-048",
        "address_line1": "925 Church Ave", "city": "Brooklyn", "state": "NY",
        "zip_code": "11218", "neighborhood": "Flatbush",
        "lat": 40.6474, "lng": -73.9638,
        "bedrooms": 3, "bathrooms": 1, "sqft": 1300,
        "price": 2500, "property_type": "apartment",
        "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Spacious 3BR in Flatbush, close to B/Q trains and Ocean Pkwy.",
        "listing_url": "https://www.zillow.com/homedetails/925-church-ave-brooklyn-ny-11218",
    },
    # ── Queens: Jamaica ────────────────────────────────────────────────────────────
    {
        "source": "apartments_com", "external_id": "ac-qn-049",
        "address_line1": "168-12 Jamaica Ave", "city": "Jamaica", "state": "NY",
        "zip_code": "11432", "neighborhood": "Jamaica",
        "lat": 40.7065, "lng": -73.7921,
        "bedrooms": 2, "bathrooms": 1, "sqft": 900,
        "price": 1800, "property_type": "apartment",
        "has_elevator": True, "has_laundry_in_bldg": True, "has_ac": True,
        "fee_type": "no_fee",
        "description": "Affordable 2BR in Jamaica near E/J/Z trains and AirTrain.",
        "listing_url": "https://www.apartments.com/168-12-jamaica-ave-jamaica-ny-11432",
    },
    # ── Manhattan: Sutton Place ───────────────────────────────────────────────────
    {
        "source": "streeteasy", "external_id": "se-nyc-050",
        "address_line1": "4 Sutton Pl S", "city": "New York", "state": "NY",
        "zip_code": "10022", "neighborhood": "Sutton Place",
        "lat": 40.7538, "lng": -73.9610,
        "bedrooms": 2, "bathrooms": 2, "sqft": 1200,
        "price": 6500, "property_type": "apartment",
        "has_doorman": True, "has_elevator": True, "has_gym": True,
        "has_laundry_in_unit": True, "has_ac": True, "has_dishwasher": True,
        "has_outdoor_space": True, "pets_allowed": True,
        "fee_type": "no_fee",
        "description": "Prestigious 2BR/2BA in white-glove Sutton Place building with river views.",
        "listing_url": "https://streeteasy.com/building/4-sutton-place-south-new_york",
    },
]

SOURCE_NAME_TO_ID = {
    "zillow": 1,
    "apartments_com": 2,
    "streeteasy": 3,
    "facebook_marketplace": 4,
}


async def seed(dsn: str) -> None:
    conn = await asyncpg.connect(dsn)
    print(f"Connected to: {dsn}")

    inserted = 0
    skipped = 0
    for listing in LISTINGS:
        source_id = SOURCE_NAME_TO_ID[listing["source"]]
        try:
            await conn.execute("""
                INSERT INTO cs_listings (
                    source_id, external_id,
                    address_line1, city, state, zip_code, neighborhood,
                    latitude, longitude, listing_type, property_type,
                    bedrooms, bathrooms, square_feet,
                    price, has_doorman, has_elevator, has_gym,
                    has_laundry_in_unit, has_laundry_in_bldg,
                    has_dishwasher, has_ac, pets_allowed, has_outdoor_space,
                    listing_url, description, fee_type, is_active
                ) VALUES (
                    $1, $2,
                    $3, $4, $5, $6, $7,
                    $8, $9, 'rental', $10,
                    $11, $12, $13,
                    $14, $15, $16, $17,
                    $18, $19, $20, $21, $22, $23,
                    $24, $25, $26, TRUE
                )
                ON CONFLICT (source_id, external_id) DO UPDATE SET listing_url = EXCLUDED.listing_url
            """,
                source_id,
                listing["external_id"],
                listing["address_line1"],
                listing["city"],
                listing["state"],
                listing.get("zip_code"),
                listing.get("neighborhood"),
                listing["lat"],
                listing["lng"],
                listing.get("property_type"),
                listing.get("bedrooms"),
                listing.get("bathrooms"),
                listing.get("sqft"),
                float(listing["price"]),
                listing.get("has_doorman", False),
                listing.get("has_elevator", False),
                listing.get("has_gym", False),
                listing.get("has_laundry_in_unit", False),
                listing.get("has_laundry_in_bldg", False),
                listing.get("has_dishwasher", False),
                listing.get("has_ac", False),
                listing.get("pets_allowed"),
                listing.get("has_outdoor_space", False),
                listing["listing_url"],
                listing.get("description"),
                listing.get("fee_type"),
            )
            inserted += 1
            print(f"  ✓ {listing['neighborhood'] or listing['city']} — {listing['address_line1']}")
        except Exception as e:
            print(f"  ✗ {listing['external_id']}: {e}")
            skipped += 1

    await conn.close()
    print(f"\nDone: {inserted} inserted, {skipped} skipped")


if __name__ == "__main__":
    asyncio.run(seed(DSN))
