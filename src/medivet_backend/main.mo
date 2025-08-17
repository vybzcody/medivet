import Array "mo:base/Array";
import Blob "mo:base/Blob";
import HashMap "mo:base/HashMap";
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
};

public type ProviderProfile = {
  name: Text;
  license: Text;
  specialty: Text;
  contact: Text;
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

// -------------------- In-Memory Maps --------------------
private transient var users = HashMap.HashMap<Principal, User>(0, Principal.equal, Principal.hash);
private transient var records = HashMap.HashMap<Nat, HealthRecord>(0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
private transient var logs = HashMap.HashMap<Nat, AccessLog>(0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });


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

// -------------------- Upgrade Hooks --------------------
system func preupgrade() {
  usersStable := Iter.toArray(users.entries());
  recordsStable := Iter.toArray(records.entries());
  logsStable := Iter.toArray(logs.entries());
};

system func postupgrade() {
  users := HashMap.fromIter<Principal, User>(usersStable.vals(), 0, Principal.equal, Principal.hash);
  records := HashMap.fromIter<Nat, HealthRecord>(recordsStable.vals(), 0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
  logs := HashMap.fromIter<Nat, AccessLog>(logsStable.vals(), 0, Nat.equal, func(n: Nat): Nat32 { Nat32.fromNat(n % (2**32 - 1)) });
  usersStable := [];
  recordsStable := [];
  logsStable := [];
};

};