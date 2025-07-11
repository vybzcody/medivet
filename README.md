# MediVet - Decentralized Health Records Platform

**MediVet** is a secure, decentralized healthcare platform built on the Internet Computer Protocol (ICP) that enables patients to manage their health records and share them with healthcare providers using granular permissions and end-to-end encryption.

## 🏥 Overview

MediVet provides a comprehensive solution for digital health record management with:

- **Patient-Controlled Data**: Patients own and control their health records
- **Granular Permissions**: Share specific data types (basic info, medical history, allergies, medications) with healthcare providers
- **End-to-End Encryption**: All health data is encrypted before storage
- **Audit Trail**: Complete access logs for transparency and security
- **Internet Identity Integration**: Secure, passwordless authentication
- **Real-time Updates**: Live polling for immediate data synchronization

## 🚀 Features

### For Patients

- **Profile Management**: Create and manage comprehensive health profiles
- **Health Records**: Add, edit, and organize medical records by category
- **Permission Control**: Grant granular access to healthcare providers
- **Access Monitoring**: View detailed logs of who accessed what data and when
- **Secure Sharing**: Share records with expiry dates and revocation capabilities

### For Healthcare Providers

- **Patient Dashboard**: View shared patient records with permission-based access
- **Encrypted Records**: Access decrypted patient data based on granted permissions
- **Profile Viewing**: See patient profiles with respect to granted permissions
- **Access Logs**: Monitor your own access to patient data

## 🏗️ Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Custom components with Lucide React icons
- **Authentication**: Internet Identity integration

### Backend

- **Language**: Motoko
- **Platform**: Internet Computer Protocol (ICP)
- **Storage**: Canister-based data persistence
- **Encryption**: AES-GCM with per-record symmetric keys
- **Authentication**: Internet Identity principals

### Key Components

```text
src/
├── medivet_backend/           # Motoko canister code
│   └── main.mo               # Main backend logic
└── medivet_frontend/         # React frontend
    ├── src/
    │   ├── components/       # React components
    │   │   ├── dashboard/    # Dashboard components
    │   │   ├── onboarding/   # User onboarding
    │   │   └── common/       # Shared components
    │   ├── stores/          # Zustand state management
    │   ├── services/        # API and utility services
    │   ├── hooks/           # Custom React hooks
    │   └── data/            # Static medical data
    └── public/              # Static assets
```

## 🛠️ Development Setup

### Prerequisites

- [DFX](https://internetcomputer.org/docs/current/developer-docs/setup/install) (Internet Computer SDK)
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd medivet
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the local Internet Computer replica**

   ```bash
   dfx start --background
   ```

4. **Deploy the canisters**

   ```bash
   dfx deploy
   ```

5. **Start the development server**

   ```bash
   npm start
   ```

6. **Access the application**

   - Frontend: `http://localhost:8080`
   - Backend Candid UI: `http://localhost:4943?canisterId={backend_canister_id}`

### Development Commands

```bash
# Generate Candid interfaces
npm run generate

# Build frontend for production
npm run build

# Deploy to local replica
dfx deploy

# Deploy to IC mainnet
dfx deploy --network ic

# Stop local replica
dfx stop
```

## 🔐 Security Features

### Encryption

- **AES-GCM Encryption**: All health records are encrypted with unique symmetric keys
- **Key Management**: Encryption keys are managed per-record and per-user
- **Client-Side Encryption**: Data is encrypted before transmission to backend

### Authentication

- **Internet Identity**: Passwordless authentication using WebAuthn
- **Principal-Based Access**: All operations tied to user principals
- **Session Management**: Secure session handling with delegation

### Permissions

- **Granular Control**: Four permission types (ViewBasicInfo, ViewMedicalHistory, ViewAllergies, ViewMedications)
- **Expiry Dates**: Time-limited access with automatic expiration
- **Revocation**: Instant permission revocation capabilities
- **Audit Trail**: Complete logging of all permission grants and access

## 📱 User Experience

### Onboarding

- **Role Selection**: Choose between Patient or Healthcare Provider
- **Profile Setup**: Guided profile creation with validation
- **Internet Identity**: Seamless authentication setup

### Dashboard Features

- **Real-time Polling**: Automatic data refresh every 30-60 seconds
- **Responsive Design**: Mobile-friendly interface
- **Toast Notifications**: User feedback for all operations
- **Loading States**: Visual feedback during async operations

### Medical Data

- **Autocomplete**: Smart suggestions for medical terms, conditions, and medications
- **Categorization**: Organized record types (Lab Results, Prescriptions, Diagnoses, etc.)
- **Static Data**: Pre-loaded common medical conditions and medications

## 🧪 Testing

### Local Testing

1. Start local replica: `dfx start --background`
2. Deploy canisters: `dfx deploy`
3. Run frontend: `npm start`
4. Test with different Internet Identity accounts

### Test Scenarios

- Patient profile creation and management
- Health record creation and sharing
- Permission granting and revocation
- Healthcare provider access to shared records
- Encryption/decryption workflows

## 🚀 Deployment

### Local Development

```bash
dfx start --background
dfx deploy
npm start
```

### Production (IC Mainnet)

```bash
dfx deploy --network ic
```

### Environment Variables

For production deployment, ensure proper environment configuration:

- Set `DFX_NETWORK=ic` for mainnet
- Configure canister IDs in `dfx.json`
- Update CSP settings in `.ic-assets.json5`

## 📚 API Documentation

### Backend Canister Methods

#### User Management

- `create_user(role: UserRole)` - Create new user profile
- `get_user()` - Get current user profile
- `update_user_profile(profile: UserProfile)` - Update user profile

#### Health Records

- `create_health_record(record: HealthRecordInput)` - Create new health record
- `get_health_records()` - Get user's health records
- `share_health_record(record_id: Text, permissions: SharePermissions)` - Share record with permissions

#### Permissions

- `grant_profile_permission(user_principal: Principal, permissions: [ProfilePermission])` - Grant profile access
- `revoke_profile_permission(user_principal: Principal)` - Revoke profile access
- `get_profile_permissions()` - Get granted permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add new feature'`
5. Push to the branch: `git push origin feature/new-feature`
6. Submit a pull request

### Code Style

- Follow TypeScript best practices
- Use Prettier for code formatting
- Write meaningful commit messages
- Add JSDoc comments for complex functions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the [Internet Computer documentation](https://internetcomputer.org/docs)
- Review the [Motoko documentation](https://internetcomputer.org/docs/current/motoko/main/motoko)

## 🔗 Resources

- [Internet Computer](https://internetcomputer.org/)
- [Internet Identity](https://identity.ic0.app/)
- [Motoko Programming Language](https://internetcomputer.org/docs/current/motoko/main/motoko)
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
