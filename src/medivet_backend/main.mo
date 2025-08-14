import Array "mo:base/Array";
import Blob "mo:base/Blob";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Option "mo:base/Option";
import Hex "./utils/Hex";
import Nat8 "mo:base/Nat8";
import Hash "mo:base/Hash";


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
private transient var records = HashMap.HashMap<Nat, HealthRecord>(0, Nat.equal, Hash.hash);
private transient var logs = HashMap.HashMap<Nat, AccessLog>(0, Nat.equal, Hash.hash);


// -------------------- Helpers --------------------
private func require(cond: Bool, err: Text): () {
  assert(cond);
};

private func getUser(p: Principal): Result<User> =
  switch (users.get(p)) {
    case (?u) #ok(u);
    case null #err("user not found");
  };

// -------------------- User Management --------------------
public shared ({ caller }) func createUser(role: Role): async Result<()> {
  require(not Principal.isAnonymous(caller), "anonymous");
  require(users.get(caller) == null, "already registered");
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
  let u = switch (getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  require(u.role == #Patient, "role mismatch");
  users.put(caller, { u with profile = ?(#Patient p) });
  #ok(());
};

public shared ({ caller }) func createProviderProfile(p: ProviderProfile): async Result<()> {
  let u = switch (getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  require(u.role == #Provider, "role mismatch");
  users.put(caller, { u with profile = ?(#Provider p) });
  #ok(());
};

public shared ({ caller }) func whitelistProvider(p: Principal): async Result<()> {
  require(caller == admin, "not admin");
  let u = switch (getUser(p)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  require(u.role == #Provider, "not provider");
  users.put(p, { u with reputation = 100 });
  #ok(());
};

// -------------------- Record CRUD --------------------
// public shared ({ caller }) func createRecord(
//   title: Text,
//   category: Text,
//   blob: Blob,
//   attach: ?Nat,
//   status: RecordStatus
// ): async Result<Nat> {
//   let u = switch (getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
//   require(u.role == #Patient, "only patient");
//   // let count = Iter.size(records.vals().filter(func(r) { r.owner == caller }));
//   // require(count < MAX_RECORDS_PER_PATIENT, "max records reached");
//   let id = nextRecordId;
//   nextRecordId += 1;
//   let rec: HealthRecord = {
//     id; owner = caller; title; category; encryptedBlob = blob;
//     attachment = attach; status; createdAt = Time.now(); accessCount = 0;
//   };
//   records.put(id, rec);
//   #ok(id);
// };

public shared ({ caller }) func deleteRecord(id: Nat): async Result<()> {
  let rec = switch (records.get(id)) { case (?r) r; case null return #err("not found"); };
  require(rec.owner == caller, "not owner");
  let _ = records.remove(id);
  #ok(());
};

public shared ({ caller }) func flagRecord(id: Nat): async Result<()> {
  require(caller == admin, "not admin");
  switch (records.get(id)) {
    case null return #err("not found");
    case (?rec) {
      records.put(id, { rec with status = #Flagged });
      #ok(());
    };
  };
};

// -------------------- Pay-per-query & Logging --------------------
public shared (msg) func queryRecord(id: Nat): async Result<HealthRecord> {
  let caller = msg.caller;
  let u = switch (getUser(caller)) { case (#ok(u)) u; case (#err(e)) return #err(e); };
  require(u.role == #Provider, "only provider");
  let now = Time.now();
  if (now - u.lastSpamTs < REPUTATION_DECAY) {
    require(u.reputation > SPAM_THRESHOLD, "reputation too low");
  };
  switch (records.get(id)) {
    case null return #err("not found");
    case (?rec) {
      require(rec.status == #Monetizable, "record not monetizable");
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

public shared func getSymmetricKeyVerificationKey(): async Text {
  let { public_key } = await management_canister.vetkd_public_key({
    canister_id = null;
    context = Text.encodeUtf8("medivet_symmetric_key");
    key_id = { curve = #bls12_381_g2; name = "medivet_key" };
  });
  Hex.encode(Blob.toArray(public_key));
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
  records := HashMap.fromIter<Nat, HealthRecord>(recordsStable.vals(), 0, Nat.equal, Hash.hash);
  logs := HashMap.fromIter<Nat, AccessLog>(logsStable.vals(), 0, Nat.equal, Hash.hash);
  usersStable := [];
  recordsStable := [];
  logsStable := [];
};

};