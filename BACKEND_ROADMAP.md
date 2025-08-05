
# MediVet Backend Roadmap

This document outlines the current features, status, and planned improvements for the MediVet backend, preparing it for user testing and future development.

## 1. Current Features & Status

The backend currently supports the core functionality for a decentralized health record management system.

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **User Management** | ✅ **Implemented** | `create_user`, `get_user`, `update_user_profile`. Supports `Patient` and `HealthcareProvider` roles. |
| **Health Records** | ✅ **Implemented** | CRUD operations for health records (`create_health_record`, `get_health_records`, `update_health_record`, `delete_health_record`). |
| **Granular Permissions** | ✅ **Implemented** | `grant_specific_access`, `revoke_access`, `get_shared_health_records`. Permissions are based on `PermissionType` enum. |
| **Profile Permissions** | ✅ **Implemented** | Granular permissions for patient profiles, allowing patients to share specific parts of their profile. |
| **Client-Side Encryption Support** | ✅ **Implemented** | `symmetric_key_verification_key_for_health_record`, `encrypted_symmetric_key_for_health_record`. Uses vetKeys for key derivation. |
| **Access Audit Trail** | ✅ **Implemented** | `logAccess`, `get_record_access_logs`, `get_user_access_logs`. Logs all critical actions. |
| **File Vault Integration** | ✅ **Implemented** | A separate `file_vault` actor (`vault/app.mo`) is available for chunked file uploads. |
| **Data Persistence** | ✅ **Implemented** | `preupgrade` and `postupgrade` hooks are implemented for canister upgrades. |

## 2. Proposed Improvements for User Testing

To make the backend robust and ready for user testing, the following improvements are recommended.

| Improvement | Priority | Description |
| :--- | :--- | :--- |
| **1. Refactor State Management** | **High** | The current state management uses multiple `Map` objects for related data. This can be simplified by using a single `Map` with a comprehensive `User` struct, reducing complexity and potential inconsistencies. |
| **2. Enhance Scalability** | **High** | The current implementation stores all data in a single canister. To support a larger number of users and records, we should explore strategies like sharding data across multiple canisters. |
| **3. Gas and Performance Optimization** | **Medium** | Review and optimize expensive calls, especially those involving loops and multiple state writes. This will reduce cycle consumption and improve performance. |
| **4. Comprehensive Unit & Integration Testing** | **High** | Develop a suite of automated tests to cover all public methods, ensuring correctness and preventing regressions. |
| **5. Improved Error Handling** | **Medium** | Replace `Debug.trap` with a more structured error handling system using `Result` types. This will provide more informative errors to the frontend. |
| **6. Code Cleanup and Documentation** | **Low** | Refactor code for clarity, add comments where necessary, and ensure all public functions have comprehensive docstrings. |

## 3. File Storage Integration (`file_vault`)

The `file_vault` actor is a critical component for storing large files like medical reports, and images.

### Current Functionality

- **Chunked Uploads**: `uploadFileChunk` allows for uploading large files in smaller, manageable chunks.
- **File Management**: `getFiles`, `getTotalChunks`, `getFileChunk`, `deleteFile`.
- **User-Based Storage**: Files are associated with the user's `Principal`.

### Integration Plan

1.  **Connect `medivet_backend` to `file_vault`**:
    -   Update `dfx.json` to ensure the `medivet_backend` canister can call the `file_vault` canister.
    -   Create an actor interface in `main.mo` to interact with the `file_vault`.
2.  **Associate Files with Health Records**:
    -   Modify the `HealthRecord` type to include an optional `file_name: Text` or `file_id: Nat`.
    -   When creating or updating a health record, the frontend will first upload the file to the `file_vault` and then pass the file identifier to the `medivet_backend`.
3.  **Permissions and Access Control**:
    -   Access to files in the `file_vault` should be governed by the permissions on the associated health record in `medivet_backend`.
    -   When a user requests a file, `medivet_backend` will first verify their permissions on the health record before granting access to the file in the `file_vault`. This can be done by having `medivet_backend` proxy the file request to the `file_vault`.

By completing these improvements and fully integrating the `file_vault`, the MediVet backend will be well-prepared for user testing, providing a secure, scalable, and feature-rich platform.

## 4. Data Monetization Roadmap

A key challenge for a platform like MediVet is to enable data monetization in a way that is both privacy-preserving and beneficial to all stakeholders. This roadmap outlines a possible approach to achieve this.

### Guiding Principles

- **Patient Consent**: Patients must give explicit consent for their data to be used for any monetization purposes.
- **Anonymity and Privacy**: All data used for monetization must be anonymized to protect patient privacy.
- **Fair Compensation**: Patients should be compensated for the use of their data.

### Proposed Architecture

1.  **Data Anonymization Service**:
    -   A new canister responsible for anonymizing health data.
    -   This service will remove all personally identifiable information (PII) from health records, such as names, contact information, and dates of birth.
    -   The anonymization service will be audited to ensure its correctness and security.
2.  **Decentralized Data Marketplace**:
    -   A marketplace where researchers, pharmaceutical companies, and other organizations can request access to anonymized health data.
    -   Data requests will be specific, outlining the type of data needed and the purpose of the research.
3.  **Patient Consent and Compensation**:
    -   Patients will be notified of data requests that match their health profile.
    -   They can choose to opt-in and provide their anonymized data.
    -   In return, they will receive a share of the revenue generated from the data sale, paid in cryptocurrency (e.g., ICP or a dedicated MediVet token).

### Implementation Plan

| Step | Description | Status |
| :--- | :--- | :--- |
| **1. Develop Anonymization Canister** | Create a new canister that can securely and effectively anonymize health records. | ⬜️ **Not Started** |
| **2. Build Data Marketplace Canister** | Develop the marketplace canister that allows data consumers to submit requests and data producers (patients) to fulfill them. | ⬜️ **Not Started** |
| **3. Implement Patient Consent Workflow** | Design and build the UI and backend logic for patients to manage their data sharing preferences and view their earnings. | ⬜️ **Not Started** |
| **4. Integrate with a Payment System** | Integrate a payment system to handle the distribution of compensation to patients. | ⬜️ **Not Started** |
| **5. Legal and Ethical Review** | Conduct a thorough legal and ethical review of the data monetization model to ensure compliance with regulations like GDPR and HIPAA. | ⬜️ **Not Started** |

This data monetization model will create a new revenue stream for the MediVet platform while empowering patients to contribute to medical research and get compensated for their data, all without compromising their privacy.
