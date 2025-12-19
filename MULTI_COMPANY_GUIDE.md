# Multi-Company Field Sales Management System

## Overview

This system now supports multiple companies with complete data isolation. Each company operates independently with its own salesmen, distributors, and data.

## Secret Registration Key

**IMPORTANT**: The owner registration secret key is: `FSM2025SECURE`

This key is hardcoded in the system and must be kept confidential. Only authorized business owners should have access to this key to register new companies.

## How It Works

### 1. Owner Registration (Company Creation)

When an owner signs up:
- Must provide the **secret registration key** (`FSM2025SECURE`)
- Fills in company details (name, phone, address, etc.)
- System automatically:
  - Creates a new company record
  - Generates a unique 6-character company code (e.g., `AB12CD`)
  - Links the owner to the company

### 2. Salesman/Distributor Registration

When a salesman or distributor signs up:
- Must provide the **company code** given by their employer
- System validates the code exists
- User is automatically linked to that company
- Can only see and work with data from their company

### 3. Data Isolation

All data is scoped by company:
- Shops, orders, and reports are filtered by `company_id`
- Row Level Security (RLS) ensures users only access their company's data
- Complete data separation between companies

## Company Code

- Each company gets a unique 6-character alphanumeric code
- Displayed on the owner dashboard
- Must be shared with employees for registration
- Example: `AB12CD`, `XY98ZF`

## GPS Location Improvements

Enhanced location accuracy with:
- `enableHighAccuracy: true` - Uses GPS instead of network location
- `timeout: 10000` - Waits up to 10 seconds for accurate reading
- `maximumAge: 0` - Never uses cached location data
- Better error messages for location permission issues

## Testing

1. **Create Owner Account**:
   - Go to Sign Up → Select "Owner"
   - Enter secret key: `FSM2025SECURE`
   - Fill company details
   - Note the generated company code

2. **Create Employee Accounts**:
   - Go to Sign Up → Select "Salesman" or "Distributor"
   - Enter the company code from step 1
   - Register account

3. **Test Data Isolation**:
   - Create another company with different owner
   - Verify that employees from different companies cannot see each other's data

## Security

- Secret key is required for owner registration
- Company codes are validated before linking employees
- Row Level Security ensures data isolation
- All database queries are automatically scoped by company
- Users cannot access data from other companies

## Database Schema

### Companies Table
- `id`: UUID (primary key)
- `company_name`: Company name
- `company_code`: Unique 6-character code
- `owner_id`: References auth.users
- `owner_name`, `owner_email`, `owner_phone`: Contact details
- `address`, `city`, `state`: Company location

### Profiles Table (Updated)
- Added `company_id`: Links users to their company

### Shops & Orders Tables (Updated)
- Added `company_id`: Scopes all data by company

## Future Enhancements

Consider adding:
- Ability for owners to view their employee list
- Employee invitation system via email
- Company settings and customization
- Multi-level permissions within a company
- Analytics comparing team performance
