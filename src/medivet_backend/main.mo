import Array "mo:base/Array";
import Blob "mo:base/Blob";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Hex "./utils/Hex";
import Nat8 "mo:base/Nat8";


// -------------------- Admin Principal --------------------
shared ({ caller = admin }) actor class Medivet() = this {

    // -------------------- Types --------------------
public type Result<T> = Result.Result<T, Text>;

public type Role = { #Patient; #Provider; #Admin };

public type PatientProfile = {
  fullName: Text;
  dob: Text;
  contact: Text;
  emergency: Text;
  medicalHistory: ?Text;
  allergies: ?Text;
  medications: ?Text;
  gender: Text;
  profilePhoto: ?Text; // filename in vault canister
};

public type ProviderProfile = {
  name: Text;
  license: Text;
  specialty: Text;
  contact: Text;
  profilePhoto: ?Text; // filename in vault canister
};

public type UserProfile = { #Patient: PatientProfile; #Provider: ProviderProfile };

public type User = {
  id: Principal;
  role: Role;
  profile: ?UserProfile;
  reputation: Nat;
  lastSpamTs: Time.Time;
};

public type RecordStatus = { #Monetizable; #NonMonetizable; #Flagged };

public type PermissionType = {
  #ReadBasicInfo;        // name, DOB, contact
  #ReadMedicalHistory;   // medical history
  #ReadMedications;      // current medications
  #ReadAllergies;        // allergies
  #ReadLabResults;       // lab results
  #ReadImaging;          // imaging results
  #ReadMentalHealth;     // mental health records
  #WriteNotes;           // add notes to records
  #WritePrescriptions;   // add prescriptions
  #EmergencyAccess;      // emergency access override
};

public type UserPermission = {
  user: Principal;
  permissions: [PermissionType];
  grantedAt: Time.Time;
  expiresAt: ?Time.Time;
  grantedBy: Principal;
};

// Profile permissions reuse the same structure as UserPermission
public type ProfilePermission = UserPermission;

public type HealthRecord = {
  id: Nat;
  owner: Principal;
  title: Text;
  category: Text;
  encryptedBlob: Blob;
  attachment: ?Nat;
  status: RecordStatus;
  createdAt: Time.Time;
  modifiedAt: Time.Time;
  accessCount: Nat;
  userPermissions: [UserPermission];
};

public type AccessLog = {
  id: Nat;
  recordId: Nat;
  provider: Principal;
  paidMT: Nat;
  ts: Time.Time;
};

// -------------------- Constants --------------------
private transient let MAX_RECORDS_PER_PATIENT: Nat = 1_000;
private transient let QUERY_COST_MT: Nat = 1;
private transient let SPAM_THRESHOLD: Nat = 50;
private transient let REPUTATION_DECAY: Nat = 86_400_000_000_000;

// -------------------- Stable Storage --------------------
private stable var usersStable: [(Principal, User)] = [];
private stable var recordsStable: [(Nat, HealthRecord)] = [];
private stable var logsStable: [(Nat, AccessLog)] = [];
private stable var nextRecordId: Nat = 0;
private stable var nextLogId: Nat = 0;
// Profile permissions stable storage: owner -> list of profile permissions granted to others
private stable var profilePermsStable: [(Principal, [ProfilePermission])] = [];

// -------------------- In-Memory Maps --------------------
private transient var users = HashMap.HashMap<Principal, User>(0, Principal.equal, Principal.hash);
private transient var records = HashMap.HashMap<Nat, HealthRecord>(0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
private transient var logs = HashMap.HashMap<Nat, AccessLog>(0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
// Owner -> profile permissions granted to others
private transient var profilePermissionsByOwner = HashMap.HashMap<Principal, [ProfilePermission]>(0, Principal.equal, Principal.hash);


// -------------------- Helpers --------------------
private func require(cond: Bool, err: Text): Result<()> {
  if (cond) {
    #ok(());
  } else {
    #err(err);
  };
};

private func _getUser(p: Principal): Result<User> =
  switch (users.get(p)) {
    case (?u) #ok(u);
    case null #err("user not found");
  };

// -------------------- User Management --------------------
public shared ({ caller }) func getUser(): async Result<User> {
  switch (require(not Principal.isAnonymous(caller), "anonymous")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  _getUser(caller)
};

public shared ({ caller }) func getPatientProfile(): async Result<PatientProfile> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Patient, "not a patient")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  switch (u.profile) {
    case (?#Patient(profile)) { #ok(profile) };
    case _ { #err("no patient profile found") };
  };
};

public shared ({ caller }) func getProviderProfile(): async Result<ProviderProfile> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "not a provider")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  switch (u.profile) {
    case (?#Provider(profile)) { #ok(profile) };
    case _ { #err("no provider profile found") };
  };
};

public shared ({ caller }) func updatePatientProfile(p: PatientProfile): async Result<()> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Patient, "role mismatch")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  users.put(caller, { u with profile = ?(#Patient p) });
  #ok(());
};

public shared ({ caller }) func updateProviderProfile(p: ProviderProfile): async Result<()> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "role mismatch")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  users.put(caller, { u with profile = ?(#Provider p) });
  #ok(());
};

public shared ({ caller }) func createUser(role: Role): async Result<()> {
  switch (require(not Principal.isAnonymous(caller), "anonymous")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  switch (require(users.get(caller) == null, "already registered")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let u: User = {
    id = caller;
    role;
    profile = null;
    reputation = 100;
    lastSpamTs = Time.now();
  };
  users.put(caller, u);
  #ok(());
};

public shared ({ caller }) func createPatientProfile(p: PatientProfile): async Result<()> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Patient, "role mismatch")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  users.put(caller, { u with profile = ?(#Patient p) });
  #ok(());
};

public shared ({ caller }) func createProviderProfile(p: ProviderProfile): async Result<()> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "role mismatch")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  users.put(caller, { u with profile = ?(#Provider p) });
  #ok(());
};

public shared ({ caller }) func whitelistProvider(p: Principal): async Result<()> {
  switch (require(caller == admin, "not admin")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let u = switch (_getUser(p)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "not provider")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  users.put(p, { u with reputation = 100 });
  #ok(());
};

// -------------------- Record CRUD --------------------
public shared ({ caller }) func createHealthRecord(
  title: Text,
  category: Text,
  encryptedBlob: Blob,
  attach: ?Nat,
  status: RecordStatus
): async Result<Nat> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Patient, "only patient")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  // Count existing records for this user
  let userRecords = Iter.filter(records.vals(), func(r: HealthRecord): Bool { r.owner == caller });
  let count = Iter.size(userRecords);
  
  switch (require(count < MAX_RECORDS_PER_PATIENT, "max records reached")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let id = nextRecordId;
  nextRecordId += 1;
  let now = Time.now();
  let rec: HealthRecord = {
    id; 
    owner = caller; 
    title; 
    category; 
    encryptedBlob;
    attachment = attach; 
    status; 
    createdAt = now;
    modifiedAt = now;
    accessCount = 0;
    userPermissions = [];
  };
  records.put(id, rec);
  #ok(id);
};

public shared ({ caller }) func getHealthRecords(): async Result<[HealthRecord]> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Patient, "only patient")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let userRecords = Iter.filter(records.vals(), func(r: HealthRecord): Bool { r.owner == caller });
  #ok(Iter.toArray(userRecords));
};

public shared ({ caller }) func updateHealthRecord(
  id: Nat,
  title: Text,
  category: Text,
  encryptedBlob: Blob
): async Result<()> {
  let rec = switch (records.get(id)) { case (?r) r; case null return #err("not found"); };
  
  switch (require(rec.owner == caller, "not owner")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let updatedRec = {
    rec with
    title = title;
    category = category;
    encryptedBlob = encryptedBlob;
    modifiedAt = Time.now();
  };
  
  records.put(id, updatedRec);
  #ok(());
};

public shared ({ caller }) func deleteRecord(id: Nat): async Result<()> {
  let rec = switch (records.get(id)) { case (?r) r; case null return #err("not found"); };
  
  switch (require(rec.owner == caller, "not owner")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let _ = records.remove(id);
  #ok(());
};

public shared ({ caller }) func flagRecord(id: Nat): async Result<()> {
  switch (require(caller == admin, "not admin")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  switch (records.get(id)) {
    case null return #err("not found");
    case (?rec) {
      records.put(id, { rec with status = #Flagged });
      #ok(());
    };
  };
};

// -------------------- Access Logs Query --------------------
public shared ({ caller }) func getAccessLogs(): async Result<[AccessLog]> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "only provider")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let providerLogs = Iter.filter(logs.vals(), func(log: AccessLog): Bool { log.provider == caller });
  #ok(Iter.toArray(providerLogs));
};

public shared ({ caller }) func getRecordAccessLogs(recordId: Nat): async Result<[AccessLog]> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  // Allow both patients (record owners) and providers to view access logs
  let recordLogs = Iter.filter(logs.vals(), func(log: AccessLog): Bool { 
    log.recordId == recordId and 
    (u.role == #Provider or 
     (u.role == #Patient and 
      (switch (records.get(recordId)) { 
        case (?rec) rec.owner == caller; 
        case null false; 
      })
     )
    )
  });
  #ok(Iter.toArray(recordLogs));
};

public shared ({ caller }) func getMonetizableRecords(): async Result<[HealthRecord]> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "only provider")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let monetizableRecords = Iter.filter(records.vals(), func(r: HealthRecord): Bool { r.status == #Monetizable });
  #ok(Iter.toArray(monetizableRecords));
};

// -------------------- Record Sharing & Permissions --------------------
public shared ({ caller }) func grantSpecificAccess(
  recordId: Nat,
  userPrincipal: Principal,
  permissions: [PermissionType],
  expiryTimestamp: ?Int  // Nanosecond timestamp, optional
): async Result<()> {
  // Validate record exists and caller owns it
  let rec = switch (records.get(recordId)) { 
    case (?r) r; 
    case null return #err("record not found"); 
  };
  
  switch (require(rec.owner == caller, "only record owner can grant access")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  // Validate target user exists
  let _ = switch (_getUser(userPrincipal)) { 
    case (#ok(u)) u; 
    case (#err(e)) return #err("target user not found: " # e); 
  };
  
  // Validate permissions array is not empty
  switch (require(permissions.size() > 0, "permissions cannot be empty")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let now = Time.now();
  
  // Convert expiry timestamp from milliseconds to nanoseconds if provided
  let expiryNs = switch (expiryTimestamp) {
    case (?ms) ?(Int.abs(ms) * 1_000_000); // Convert ms to ns
    case null null;
  };
  
  // Validate expiry is in the future if provided
  switch (expiryNs) {
    case (?expiry) {
      switch (require(expiry > now, "expiry date must be in the future")) {
        case (#err(msg)) { return #err(msg); };
        case (#ok()) {};
      };
    };
    case null {};
  };
  
  let newPermission: UserPermission = {
    user = userPrincipal;
    permissions = permissions;
    grantedAt = now;
    expiresAt = expiryNs;
    grantedBy = caller;
  };
  
  // Filter out any existing permissions for this user and add the new one
  let updatedPermissions = Array.filter(rec.userPermissions, func(p: UserPermission): Bool {
    p.user != userPrincipal
  });
  
  let finalPermissions = Array.append(updatedPermissions, [newPermission]);
  
  let updatedRec = {
    rec with
    userPermissions = finalPermissions;
    modifiedAt = now;
  };
  
  records.put(recordId, updatedRec);
  #ok(());
};

public shared ({ caller }) func revokeAccess(
  recordId: Nat,
  userPrincipal: Principal
): async Result<()> {
  // Validate record exists and caller owns it
  let rec = switch (records.get(recordId)) { 
    case (?r) r; 
    case null return #err("record not found"); 
  };
  
  switch (require(rec.owner == caller, "only record owner can revoke access")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  // Filter out permissions for the specified user
  let updatedPermissions = Array.filter(rec.userPermissions, func(p: UserPermission): Bool {
    p.user != userPrincipal
  });
  
  // Check if any permissions were actually removed
  switch (require(updatedPermissions.size() != rec.userPermissions.size(), "no permissions found for user")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let updatedRec = {
    rec with
    userPermissions = updatedPermissions;
    modifiedAt = Time.now();
  };
  
  records.put(recordId, updatedRec);
  #ok(());
};

public shared ({ caller }) func getSharedHealthRecords(): async Result<[HealthRecord]> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  // This method is primarily for providers to see records shared with them
  switch (require(u.role == #Provider, "only providers can access shared records")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let now = Time.now();
  
  // Filter records where the caller has valid, non-expired permissions
  let sharedRecords = Array.filter(
    Iter.toArray(records.vals()),
    func(record: HealthRecord): Bool {
      // Check if caller has permissions for this record
      let hasPermission = Array.find(record.userPermissions, func(perm: UserPermission): Bool {
        perm.user == caller and
        (switch (perm.expiresAt) {
          case (?expiry) expiry > now; // Not expired
          case null true; // No expiry
        })
      });
      
      switch (hasPermission) {
        case (?_) true;
        case null false;
      }
    }
  );
  
  #ok(sharedRecords);
};

public shared ({ caller }) func lookupProviderByPrincipal(providerPrincipal: Principal): async Result<ProviderProfile> {
  let targetUser = switch (_getUser(providerPrincipal)) { 
    case (#ok(u)) u; 
    case (#err(e)) return #err("provider not found: " # e); 
  };
  
  switch (require(targetUser.role == #Provider, "specified user is not a provider")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  switch (targetUser.profile) {
    case (?#Provider(profile)) { #ok(profile) };
    case _ { #err("provider profile not found") };
  };
};

// -------------------- Pay-per-query & Logging --------------------
public shared (msg) func queryRecord(id: Nat): async Result<HealthRecord> {
  let caller = msg.caller;
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  
  switch (require(u.role == #Provider, "only provider")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  
  let now = Time.now();
  if (now - u.lastSpamTs < REPUTATION_DECAY) {
    switch (require(u.reputation > SPAM_THRESHOLD, "reputation too low")) {
      case (#err(msg)) { return #err(msg); };
      case (#ok()) {};
    };
  };
  
  switch (records.get(id)) {
    case null return #err("not found");
    case (?rec) {
      switch (require(rec.status == #Monetizable, "record not monetizable")) {
        case (#err(msg)) { return #err(msg); };
        case (#ok()) {};
      };
      
      // Simulate payment
      let paid = QUERY_COST_MT;
      logs.put(nextLogId, {
        id = nextLogId; recordId = id; provider = caller; paidMT = paid; ts = now;
      });
      nextLogId += 1;
      records.put(id, { rec with accessCount = rec.accessCount + 1 });
      #ok(rec);
    };
  };
};

// -------------------- VetKD Integration --------------------
type VETKD_API = actor {
  vetkd_public_key: ({
    canister_id: ?Principal;
    context: Blob;
    key_id: { curve: { #bls12_381_g2 }; name: Text };
  }) -> async { public_key: Blob };
  vetkd_derive_key: ({
    input: Blob;
    context: Blob;
    key_id: { curve: { #bls12_381_g2 }; name: Text };
    transport_public_key: Blob;
  }) -> async { encrypted_key: Blob };
};
let management_canister: VETKD_API = actor ("aaaaa-aa");

// Identity-based encryption verification key
public shared func symmetric_key_verification_key_for_user(): async Text {
  let { public_key } = await management_canister.vetkd_public_key({
    canister_id = null;
    context = Text.encodeUtf8("medivet_user_encryption");
    key_id = { curve = #bls12_381_g2; name = "test_key_1" };
  });
  Hex.encode(Blob.toArray(public_key));
};

// Identity-based encrypted key derivation
public shared ({ caller }) func encrypted_symmetric_key_for_user(
  transport_public_key: Blob
): async Text {
  // No need to verify specific records - this is pure identity-based encryption
  // Any authenticated user can get their own encryption key
  
  // Use caller's principal as input for user-based encryption (pure identity-based)
  let input = Principal.toBlob(caller);
  
  let { encrypted_key } = await (with cycles = 26_153_846_153) management_canister.vetkd_derive_key({
    input;
    context = Text.encodeUtf8("medivet_user_encryption");
    key_id = { curve = #bls12_381_g2; name = "test_key_1" };
    transport_public_key;
  });
  
  Hex.encode(Blob.toArray(encrypted_key))
};

// public func fromNat(len : Nat, n : Nat) : [Nat8] {
//     let ith_byte = func(i : Nat) : Nat8 {
//         assert(i < len);
//         let shift : Nat = 8 * (len - 1 - i);
//         Nat8.fromIntWrap(n / 2**shift)
//     };
//     Array.tabulate<Nat8>(len, ith_byte)
// };
public shared func fromNat(len : Nat, n : Nat) : async [Nat8] {
    let ith_byte = func(i : Nat) : Nat8 {
        assert(i < len);
        let shift : Nat = 8 * (len - 1 - i);
        Nat8.fromIntWrap(n / 2**shift)
    };
    return Array.tabulate<Nat8>(len, ith_byte)
};

// public shared ({ caller }) func getEncryptedSymmetricKey(
//   recordId: Nat,
//   transportPubKey: Blob
// ): async Result<Text> {
//   switch (records.get(recordId)) {
//     case null return #err("not found");
//     case (?rec) {
//       if (rec.owner != caller) return #err("unauthorized");
//       let input = Blob.fromArray(
//         Array.append(
//           Text.encodeUtf8("medivet:"),
//         //   Blob.toArray(Nat.toBlob(recordId)),
//         Blob.fromArray(await fromNat(8, recordId))
//         )
//       );
//       let { encrypted_key } = await management_canister.vetkd_derive_key({
//         input;
//         context = Text.encodeUtf8("medivet_symmetric_key");
//         key_id = { curve = #bls12_381_g2; name = "medivet_key" };
//         transport_public_key = transportPubKey;
//       });
//       #ok(Hex.encode(Blob.toArray(encrypted_key)));
//     };
//   };
// };

// -------------------- Profile Permissions (Profile-level sharing) --------------------
// Grant profile permissions from the caller (must be a patient) to a target user
public shared ({ caller }) func grant_profile_permission(
  user_principal: Principal,
  permissions: [PermissionType],
  expiryTimestamp: ?Int
): async Result<()> {
  // Caller must be a registered patient
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  switch (require(u.role == #Patient, "only patient can grant profile permissions")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };

  switch (require(permissions.size() > 0, "permissions cannot be empty")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };

  let now = Time.now();
  let expiryNs = switch (expiryTimestamp) { case (?ms) ?(Int.abs(ms) * 1_000_000); case null null; };
  switch (expiryNs) {
    case (?e) { switch (require(e > now, "expiry date must be in the future")) { case (#err(msg)) { return #err(msg) }; case (#ok()) {} } };
    case null {};
  };

  let newPerm: ProfilePermission = {
    user = user_principal;
    permissions = permissions;
    grantedAt = now;
    expiresAt = expiryNs;
    grantedBy = caller;
  };

  let existing = switch (profilePermissionsByOwner.get(caller)) { case (?arr) arr; case null [] };
  let filtered = Array.filter(existing, func(p: ProfilePermission): Bool { p.user != user_principal });
  let updated = Array.append(filtered, [newPerm]);
  profilePermissionsByOwner.put(caller, updated);
  #ok(())
};

public shared ({ caller }) func get_profile_permissions(): async [ProfilePermission] {
  switch (profilePermissionsByOwner.get(caller)) { case (?arr) arr; case null [] };
};

public shared ({ caller }) func revoke_profile_permission(user_principal: Principal): async Result<()> {
  let u = switch (_getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  switch (require(u.role == #Patient, "only patient can revoke profile permissions")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  let existing = switch (profilePermissionsByOwner.get(caller)) { case (?arr) arr; case null [] };
  let filtered = Array.filter(existing, func(p: ProfilePermission): Bool { p.user != user_principal });
  switch (require(filtered.size() != existing.size(), "no permissions found for user")) {
    case (#err(msg)) { return #err(msg); };
    case (#ok()) {};
  };
  profilePermissionsByOwner.put(caller, filtered);
  #ok(())
};

public shared ({ caller }) func has_any_profile_permissions(): async Bool {
  switch (profilePermissionsByOwner.get(caller)) { case (?arr) arr.size() > 0; case null false };
};

public shared ({ caller }) func check_profile_permission(user_principal: Principal, permission: PermissionType): async Bool {
  let perms = switch (profilePermissionsByOwner.get(caller)) { case (?arr) arr; case null [] };
  let now = Time.now();
  let has = Array.find(perms, func(p: ProfilePermission): Bool {
    p.user == user_principal and Array.find(p.permissions, func(x: PermissionType): Bool { x == permission }) != null and
    (switch (p.expiresAt) { case null true; case (?e) e > now })
  });
  switch (has) { case null false; case (?_) true };
};

// For providers: fetch another patient's profile filtered by permissions granted to the caller
public shared ({ caller }) func get_patient_profile_with_permissions(patient_principal: Principal): async Result<{
  fullName: ?Text;
  dob: ?Text;
  contact: ?Text;
  emergency: ?Text;
  medicalHistory: ?Text;
  allergies: ?Text;
  medications: ?Text;
}> {
  // Ensure target user exists and is a patient
  let target = switch (_getUser(patient_principal)) { case (#ok(u)) u; case (#err(e)) return #err("patient not found: " # e) };
  switch (require(target.role == #Patient, "target is not a patient")) { case (#err(msg)) { return #err(msg) }; case (#ok()) {} };

  // Must have existing profile
  let profile = switch (target.profile) { case (?#Patient(p)) p; case _ return #err("no patient profile found") };

  // Find permissions granted by target to caller
  let perms = switch (profilePermissionsByOwner.get(patient_principal)) { case (?arr) arr; case null [] };
  let now = Time.now();
  let granted = Array.find(perms, func(p: ProfilePermission): Bool { p.user == caller and (switch (p.expiresAt) { case null true; case (?e) e > now }) });
  switch (granted) {
    case null { return #err("no permissions granted") };
    case (?(p)) {
      // Helper to check if specific permission exists
      let has = func(pt: PermissionType): Bool { Array.find(p.permissions, func(x: PermissionType): Bool { x == pt }) != null };
      #ok({
        fullName = if (has(#ReadBasicInfo)) ?profile.fullName else null;
        dob = if (has(#ReadBasicInfo)) ?profile.dob else null;
        contact = if (has(#ReadBasicInfo)) ?profile.contact else null;
        emergency = if (has(#EmergencyAccess)) ?profile.emergency else null;
        medicalHistory = if (has(#ReadMedicalHistory)) profile.medicalHistory else null;
        allergies = if (has(#ReadAllergies)) profile.allergies else null;
        medications = if (has(#ReadMedications)) profile.medications else null;
      })
    }
  }
};

// For providers: list patients who granted me profile permissions
public shared ({ caller }) func get_permissions_granted_to_me(): async [(Text, [ProfilePermission])] {
  var results: [(Text, [ProfilePermission])] = [];
  for ((owner, perms) in profilePermissionsByOwner.entries()) {
    let now = Time.now();
    let mine = Array.filter(perms, func(p: ProfilePermission): Bool { p.user == caller and (switch (p.expiresAt) { case null true; case (?e) e > now }) });
    if (mine.size() > 0) {
      results := Array.append(results, [(Principal.toText(owner), mine)]);
    };
  };
  results
};

// Compatibility helper for frontend store
public shared ({ caller }) func get_user_access_logs(): async [AccessLog] {
  switch (await getAccessLogs()) { case (#ok(logs)) logs; case (#err(_)) [] };
};

// -------------------- Upgrade Hooks --------------------
system func preupgrade() {
  usersStable := Iter.toArray(users.entries());
  recordsStable := Iter.toArray(records.entries());
  logsStable := Iter.toArray(logs.entries());
  profilePermsStable := Iter.toArray(profilePermissionsByOwner.entries());
};

system func postupgrade() {
  users := HashMap.fromIter<Principal, User>(usersStable.vals(), 0, Principal.equal, Principal.hash);
  records := HashMap.fromIter<Nat, HealthRecord>(recordsStable.vals(), 0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
  logs := HashMap.fromIter<Nat, AccessLog>(logsStable.vals(), 0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
  profilePermissionsByOwner := HashMap.fromIter<Principal, [ProfilePermission]>(profilePermsStable.vals(), 0, Principal.equal, Principal.hash);
  usersStable := [];
  recordsStable := [];
  logsStable := [];
  profilePermsStable := [];
};

};
