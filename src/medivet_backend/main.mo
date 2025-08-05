import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import List "mo:base/List";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Bool "mo:base/Bool";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Hash "mo:base/Hash";
import Hex "./utils/Hex";
import Time "mo:base/Time"

// Declare a shared actor class
// Bind the caller and the initializer
shared ({ caller = initializer }) actor class () {

  // Currently, a single canister smart contract is limited to 4 GB of heap size.
  // For the current limits see https://internetcomputer.org/docs/current/developer-docs/production/resource-limits.
  // To ensure that our canister does not exceed the limit, we put various restrictions (e.g., max number of users) in place.
  // This should keep us well below a memory usage of 2 GB because
  // up to 2x memory may be needed for data serialization during canister upgrades.
  // This is sufficient for this proof-of-concept, but in a production environment the actual
  // memory usage must be calculated or monitored and the various restrictions adapted accordingly.

  // Define dapp limits - important for security assurance
  private let MAX_USERS = 500;
  private let MAX_NOTES_PER_USER = 200;
  private let MAX_NOTE_CHARS = 1000;
  private let MAX_SHARES_PER_NOTE = 50;

  private type PrincipalName = Text;
  private type NoteId = Nat;

  // Define public types
  // Type of an encrypted note
  // Attention: This canister does *not* perform any encryption.
  //            Here we assume that the notes are encrypted end-
  //            to-end by the front-end (at client side).
  public type EncryptedNote = {
    encrypted_text : Text;
    id : Nat;
    owner : PrincipalName;
    // Principals with whom this note is shared. Does not include the owner.
    // Needed to be able to efficiently show in the UI with whom this note is shared.
    users : [PrincipalName];
  };

  // Define private fields
  // Stable actor fields are automatically retained across canister upgrades.
  // See https://internetcomputer.org/docs/current/motoko/main/upgrades/

  // Design choice: Use globally unique note identifiers for all users.
  //
  // The keyword `stable` makes this (scalar) variable keep its value across canister upgrades.
  //
  // See https://internetcomputer.org/docs/current/developer-docs/setup/manage-canisters#upgrade-a-canister
  private stable var nextNoteId : Nat = 1;

  // Store notes by their ID, so that note-specific encryption keys can be derived.
  private var notesById = Map.HashMap<NoteId, EncryptedNote>(0, Nat.equal, Hash.hash);
  // Store which note IDs are owned by a particular principal
  private var noteIdsByOwner = Map.HashMap<PrincipalName, List.List<NoteId>>(0, Text.equal, Text.hash);
  // Store which notes are shared with a particular principal. Does not include the owner, as this is tracked by `noteIdsByOwner`.
  private var noteIdsByUser = Map.HashMap<PrincipalName, List.List<NoteId>>(0, Text.equal, Text.hash);

  // While accessing _heap_ data is more efficient, we use the following _stable memory_
  // as a buffer to preserve data across canister upgrades.
  // Stable memory is currently 96GB. For the current limits see
  // https://internetcomputer.org/docs/current/developer-docs/production/resource-limits.
  // See also: [preupgrade], [postupgrade]
  private stable var stable_notesById : [(NoteId, EncryptedNote)] = [];
  private stable var stable_noteIdsByOwner : [(PrincipalName, List.List<NoteId>)] = [];
  private stable var stable_noteIdsByUser : [(PrincipalName, List.List<NoteId>)] = [];
  private stable var stable_healthRecordsById : [(Nat, HealthRecord)] = [];
  private stable var stable_healthRecordIdsByOwner : [(PrincipalName, List.List<Nat>)] = [];
  private var healthRecordIdsByUser = Map.HashMap<PrincipalName, List.List<Nat>>(0, Text.equal, Text.hash);
  private stable var stable_healthRecordIdsByUser : [(PrincipalName, List.List<Nat>)] = [];

  private stable var nextAttachmentId : Nat = 1;
  private var attachmentsById = Map.HashMap<Nat, Blob>(0, Nat.equal, Hash.hash);
  private stable var stable_attachmentsById : [(Nat, Blob)] = [];

  // Access Audit Trail data structures
  public type AccessAction = {
    #View;
    #Create;
    #Update;
    #Delete;
    #GrantAccess;
    #RevokeAccess;
  };

  public type AccessLog = {
    id : Nat;
    record_id : Nat;
    user : PrincipalName;
    timestamp : Time.Time;
    action : AccessAction;
    success : Bool;
  };

  private stable var nextAccessLogId : Nat = 1;
  private var accessLogs = Map.HashMap<Nat, AccessLog>(0, Nat.equal, Hash.hash);
  private var accessLogsByRecord = Map.HashMap<Nat, List.List<Nat>>(0, Nat.equal, Hash.hash);
  private var accessLogsByUser = Map.HashMap<PrincipalName, List.List<Nat>>(0, Text.equal, Text.hash);

  private stable var stable_accessLogs : [(Nat, AccessLog)] = [];
  private stable var stable_accessLogsByRecord : [(Nat, List.List<Nat>)] = [];
  private stable var stable_accessLogsByUser : [(PrincipalName, List.List<Nat>)] = [];

  public type PatientProfile = {
    owner : PrincipalName;
    full_name : Text;
    date_of_birth : Text; // Changed to Text to match frontend
    contact_info : Text;
    emergency_contact : Text;
    medical_history : ?Text;
    allergies : ?Text;
    current_medications : ?Text;
    // Patient profile permissions - who can access what personal data
    profile_permissions : [ProfilePermission];
  };

  // Patient profile permission type - separate from health record permissions
  public type ProfilePermission = {
    user : PrincipalName;
    permissions : [PermissionType];
    granted_at : Time.Time;
    expires_at : ?Time.Time;
    granted_by : PrincipalName;
  };

  public type HealthcareProviderProfile = {
    name : Text;
    specialty : Text;
    license_number : Text;
    contact_info : Text;
  };

  private var patientProfiles = Map.HashMap<PrincipalName, PatientProfile>(0, Text.equal, Text.hash);
  private var healthcareProviderProfiles = Map.HashMap<PrincipalName, HealthcareProviderProfile>(0, Text.equal, Text.hash);

  private stable var stable_patientProfiles_entries : [(PrincipalName, PatientProfile)] = [];
  private stable var stable_healthcareProviderProfiles_entries : [(PrincipalName, HealthcareProviderProfile)] = [];

  public type UserRole = Text;
  private var userRoles = Map.HashMap<PrincipalName, UserRole>(0, Text.equal, Text.hash);
  private stable var stable_userRoles_entries : [(PrincipalName, UserRole)] = [];

  // Utility function that helps writing assertion-driven code more concisely.
  private func expect<T>(opt : ?T, violation_msg : Text) : T {
    switch (opt) {
      case (null) {
        Debug.trap(violation_msg);
      };
      case (?x) {
        x;
      };
    };
  };

  private func is_authorized(user : PrincipalName, note : EncryptedNote) : Bool {
    user == note.owner or Option.isSome(Array.find(note.users, func(x : PrincipalName) : Bool { x == user }));
  };

  // Helper function to check if user has any access to record
  private func is_authorized_health_record(user : PrincipalName, record : HealthRecord) : Bool {
    Debug.print("Authorization check for user: " # user # ", record owner: " # record.owner # ", record id: " # Nat.toText(record.id));
    let isOwner = user == record.owner;
    let hasAccess = has_any_permission(user, record);
    Debug.print("Is owner: " # Bool.toText(isOwner) # ", Has access: " # Bool.toText(hasAccess));
    isOwner or hasAccess;
  };

  // Helper function to check if user has any permission (including expired ones for now)
  private func has_any_permission(user : PrincipalName, record : HealthRecord) : Bool {
    Option.isSome(
      Array.find(
        record.user_permissions,
        func(perm : UserPermission) : Bool {
          perm.user == user and (
            switch (perm.expires_at) {
              case null { true }; // No expiry
              case (?expiry) { expiry > Time.now() }; // Not expired
            }
          )
        },
      )
    );
  };

  // Helper function to check specific permission
  private func has_permission(user : PrincipalName, record : HealthRecord, permission_type : PermissionType) : Bool {
    if (user == record.owner) {
      return true; // Owner has all permissions
    };

    switch (
      Array.find(
        record.user_permissions,
        func(perm : UserPermission) : Bool {
          perm.user == user and (
            switch (perm.expires_at) {
              case null { true }; // No expiry
              case (?expiry) { expiry > Time.now() }; // Not expired
            }
          )
        },
      )
    ) {
      case (?userPerm) {
        Option.isSome(Array.find(userPerm.permissions, func(p : PermissionType) : Bool { p == permission_type }));
      };
      case null { false };
    };
  };

  public shared ({ caller }) func whoami() : async Text {
    return Principal.toText(caller);
  };

  public query func greet(name : Text) : async Text {
    return "Hello, " # name # "!";
  };

  // Shared functions, i.e., those specified with [shared], are
  // accessible to remote callers.
  // The extra parameter [caller] is the caller's principal
  // See https://internetcomputer.org/docs/current/motoko/main/actors-async

  // Add new empty note for this [caller].
  //
  // Returns:
  //      Future of ID of new empty note
  // Traps:
  //      [caller] is the anonymous identity
  //      [caller] already has [MAX_NOTES_PER_USER] notes
  //      This is the first note for [caller] and [MAX_USERS] is exceeded
  public shared ({ caller }) func create_note() : async NoteId {
    assert not Principal.isAnonymous(caller);
    let owner = Principal.toText(caller);

    let newNote : EncryptedNote = {
      id = nextNoteId;
      encrypted_text = "";
      owner = owner;
      users = [];
    };

    switch (noteIdsByOwner.get(owner)) {
      case (?owner_nids) {
        assert List.size(owner_nids) < MAX_NOTES_PER_USER;
        noteIdsByOwner.put(owner, List.push(newNote.id, owner_nids));
      };
      case null {
        assert noteIdsByOwner.size() < MAX_USERS;
        noteIdsByOwner.put(owner, List.make(newNote.id));
      };
    };

    notesById.put(newNote.id, newNote);
    nextNoteId += 1;
    newNote.id;
  };

  // Returns (a future of) this [caller]'s notes.
  //
  // --- Queries vs. Updates ---
  // Note that this method is declared as an *update* call (see `shared`) rather than *query*.
  //
  // While queries are significantly faster than updates, they are not certified by the IC.
  // Thus, we avoid using queries throughout this dapp, ensuring that the result of our
  // functions gets through consensus. Otherwise, this function could e.g. omit some notes
  // if it got executed by a malicious node. (To make the dapp more efficient, one could
  // use an approach in which both queries and updates are combined.)
  // See https://internetcomputer.org/docs/current/concepts/canisters-code#query-and-update-methods
  //
  // Returns:
  //      Future of array of EncryptedNote
  // Traps:
  //      [caller] is the anonymous identity
  public shared ({ caller }) func get_notes() : async [EncryptedNote] {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    let owned_notes = List.map(
      Option.get(noteIdsByOwner.get(user), List.nil()),
      func(nid : NoteId) : EncryptedNote {
        expect(notesById.get(nid), "missing note with ID " # Nat.toText(nid));
      },
    );
    let shared_notes = List.map(
      Option.get(noteIdsByUser.get(user), List.nil()),
      func(nid : NoteId) : EncryptedNote {
        expect(notesById.get(nid), "missing note with ID " # Nat.toText(nid));
      },
    );

    let buf = Buffer.Buffer<EncryptedNote>(List.size(owned_notes) + List.size(shared_notes));
    buf.append(Buffer.fromArray(List.toArray(owned_notes)));
    buf.append(Buffer.fromArray(List.toArray(shared_notes)));
    Buffer.toArray(buf);
  };

  // Replaces the encrypted text of note with ID [id] with [encrypted_text].
  //
  // Returns:
  //      Future of unit
  // Traps:
  //     [caller] is the anonymous identity
  //     note with ID [id] does not exist
  //     [caller] is not the note's owner and not a user with whom the note is shared
  //     [encrypted_text] exceeds [MAX_NOTE_CHARS]
  public shared ({ caller }) func update_note(id : NoteId, encrypted_text : Text) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?note_to_update) = notesById.get(id) else Debug.trap("note with id " # Nat.toText(id) # "not found");
    if (not is_authorized(caller_text, note_to_update)) {
      Debug.trap("unauthorized");
    };
    assert note_to_update.encrypted_text.size() <= MAX_NOTE_CHARS;
    notesById.put(id, { note_to_update with encrypted_text });
  };

  // Shares the note with ID [note_id] with the [user].
  // Has no effect if the note is already shared with that user.
  //
  // Returns:
  //      Future of unit
  // Traps:
  //     [caller] is the anonymous identity
  //     note with ID [id] does not exist
  //     [caller] is not the note's owner
  public shared ({ caller }) func add_user(note_id : NoteId, user : PrincipalName) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?note) = notesById.get(note_id) else Debug.trap("note with id " # Nat.toText(note_id) # "not found");
    if (caller_text != note.owner) {
      Debug.trap("unauthorized");
    };
    assert note.users.size() < MAX_SHARES_PER_NOTE;
    if (not Option.isSome(Array.find(note.users, func(u : PrincipalName) : Bool { u == user }))) {
      let users_buf = Buffer.fromArray<PrincipalName>(note.users);
      users_buf.add(user);
      let updated_note = { note with users = Buffer.toArray(users_buf) };
      notesById.put(note_id, updated_note);
    };
    switch (noteIdsByUser.get(user)) {
      case (?user_nids) {
        if (not List.some(user_nids, func(nid : NoteId) : Bool { nid == note_id })) {
          noteIdsByUser.put(user, List.push(note_id, user_nids));
        };
      };
      case null {
        noteIdsByUser.put(user, List.make(note_id));
      };
    };
  };

  // Unshares the note with ID [note_id] with the [user].
  // Has no effect if the note is already shared with that user.
  //
  // Returns:
  //      Future of unit
  // Traps:
  //     [caller] is the anonymous identity
  //     note with ID [id] does not exist
  //     [caller] is not the note's owner
  public shared ({ caller }) func remove_user(note_id : NoteId, user : PrincipalName) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?note) = notesById.get(note_id) else Debug.trap("note with id " # Nat.toText(note_id) # "not found");
    if (caller_text != note.owner) {
      Debug.trap("unauthorized");
    };
    let users_buf = Buffer.fromArray<PrincipalName>(note.users);
    users_buf.filterEntries(func(i : Nat, u : PrincipalName) : Bool { u != user });
    let updated_note = { note with users = Buffer.toArray(users_buf) };
    notesById.put(note_id, updated_note);

    switch (noteIdsByUser.get(user)) {
      case (?user_nids) {
        let updated_nids = List.filter(user_nids, func(nid : NoteId) : Bool { nid != note_id });
        if (not List.isNil(updated_nids)) {
          noteIdsByUser.put(user, updated_nids);
        } else {
          let _ = noteIdsByUser.remove(user);
        };
      };
      case null {};
    };
  };

  // Delete the note with ID [id].
  //
  // Returns:
  //      Future of unit
  // Traps:
  //     [caller] is the anonymous identity
  //     note with ID [id] does not exist
  //     [caller] is not the note's owner
  public shared ({ caller }) func delete_note(note_id : NoteId) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?note_to_delete) = notesById.get(note_id) else Debug.trap("note with id " # Nat.toText(note_id) # "not found");
    let owner = note_to_delete.owner;
    if (owner != caller_text) {
      Debug.trap("unauthorized");
    };
    switch (noteIdsByOwner.get(owner)) {
      case (?owner_nids) {
        let updated_nids = List.filter(owner_nids, func(nid : NoteId) : Bool { nid != note_id });
        if (not List.isNil(updated_nids)) {
          noteIdsByOwner.put(owner, updated_nids);
        } else {
          let _ = noteIdsByOwner.remove(owner);
        };
      };
      case null {};
    };
    for (user in note_to_delete.users.vals()) {
      switch (noteIdsByUser.get(user)) {
        case (?user_nids) {
          let updated_nids = List.filter(user_nids, func(nid : NoteId) : Bool { nid != note_id });
          if (not List.isNil(updated_nids)) {
            noteIdsByUser.put(user, updated_nids);
          } else {
            let _ = noteIdsByUser.remove(user);
          };
        };
        case null {};
      };
    };
    let _ = notesById.remove(note_id);
  };

  // PHR-specific data structures and functions

  // Granular Permission System
  public type PermissionType = {
    #READ_BASIC_INFO; // name, DOB, contact
    #READ_MEDICAL_HISTORY; // medical history
    #READ_MEDICATIONS; // current medications
    #READ_ALLERGIES; // allergies
    #READ_LAB_RESULTS; // lab results
    #READ_IMAGING; // imaging results
    #READ_MENTAL_HEALTH; // mental health records
    #WRITE_NOTES; // add notes to records
    #WRITE_PRESCRIPTIONS; // add prescriptions
    #EMERGENCY_ACCESS; // emergency access override
  };

  public type UserPermission = {
    user : PrincipalName;
    permissions : [PermissionType];
    granted_at : Time.Time;
    expires_at : ?Time.Time;
    granted_by : PrincipalName;
  };

  public type HealthRecord = {
    id : Nat;
    owner : PrincipalName;
    title : Text;
    category : Text;
    provider : Text;
    record_date : Time.Time;
    record_type : Text;
    encrypted_content : Blob;
    attachment_id : ?Nat;
    user_permissions : [UserPermission];
  };

  private stable var nextHealthRecordId : Nat = 1;
  private var healthRecordsById = Map.HashMap<Nat, HealthRecord>(0, Nat.equal, Hash.hash);
  private var healthRecordIdsByOwner = Map.HashMap<PrincipalName, List.List<Nat>>(0, Text.equal, Text.hash);

  public shared ({ caller }) func create_health_record(title : Text, category : Text, provider : Text, record_type : Text, attachment_id : ?Nat) : async Nat {
    assert not Principal.isAnonymous(caller);
    let owner = Principal.toText(caller);

    let newHealthRecord : HealthRecord = {
      id = nextHealthRecordId;
      owner = owner;
      title = title;
      category = category;
      provider = provider;
      record_date = Time.now();
      record_type = record_type;
      encrypted_content = Blob.fromArray([]);
      attachment_id = attachment_id;
      user_permissions = [];
    };

    switch (healthRecordIdsByOwner.get(owner)) {
      case (?owner_hrids) {
        healthRecordIdsByOwner.put(owner, List.push(newHealthRecord.id, owner_hrids));
      };
      case null {
        healthRecordIdsByOwner.put(owner, List.make(newHealthRecord.id));
      };
    };

    healthRecordsById.put(newHealthRecord.id, newHealthRecord);

    // Log the creation
    let _ = logAccess(newHealthRecord.id, owner, #Create, true);

    nextHealthRecordId += 1;
    newHealthRecord.id;
  };

  public shared ({ caller }) func get_health_records() : async [HealthRecord] {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    let owned_records = List.map(
      Option.get(healthRecordIdsByOwner.get(user), List.nil()),
      func(hrid : Nat) : HealthRecord {
        let record = expect(healthRecordsById.get(hrid), "missing health record with ID " # Nat.toText(hrid));
        // Log access
        let _ = logAccess(hrid, user, #View, true);
        record;
      },
    );

    let buf = Buffer.Buffer<HealthRecord>(List.size(owned_records));
    buf.append(Buffer.fromArray(List.toArray(owned_records)));
    Buffer.toArray(buf);
  };

  public shared ({ caller }) func update_health_record(id : Nat, encrypted_content : Blob) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?record_to_update) = healthRecordsById.get(id) else {
      let _ = logAccess(id, caller_text, #Update, false);
      Debug.trap("health record with id " # Nat.toText(id) # "not found");
    };

    if (caller_text != record_to_update.owner) {
      let _ = logAccess(id, caller_text, #Update, false);
      Debug.trap("unauthorized");
    };

    healthRecordsById.put(id, { record_to_update with encrypted_content });

    // Log successful update
    let _ = logAccess(id, caller_text, #Update, true);
  };

  public shared ({ caller }) func delete_health_record(hr_id : Nat) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?record_to_delete) = healthRecordsById.get(hr_id) else {
      let _ = logAccess(hr_id, caller_text, #Delete, false);
      Debug.trap("health record with id " # Nat.toText(hr_id) # "not found");
    };

    let owner = record_to_delete.owner;
    if (owner != caller_text) {
      let _ = logAccess(hr_id, caller_text, #Delete, false);
      Debug.trap("unauthorized");
    };

    switch (healthRecordIdsByOwner.get(owner)) {
      case (?owner_hrids) {
        let updated_hrids = List.filter(owner_hrids, func(hrid : Nat) : Bool { hrid != hr_id });
        if (not List.isNil(updated_hrids)) {
          healthRecordIdsByOwner.put(owner, updated_hrids);
        } else {
          let _ = healthRecordIdsByOwner.remove(owner);
        };
      };
      case null {};
    };

    let _ = healthRecordsById.remove(hr_id);

    // Log successful deletion
    let _ = logAccess(hr_id, caller_text, #Delete, true);
  };

  // Legacy grant_access function - grants basic read permissions
  public shared ({ caller }) func grant_access(hr_id : Nat, user : PrincipalName) : async () {
    // Grant basic read permissions for backward compatibility
    let basic_permissions : [PermissionType] = [
      #READ_BASIC_INFO,
      #READ_MEDICAL_HISTORY,
      #READ_MEDICATIONS,
      #READ_ALLERGIES,
      #READ_LAB_RESULTS,
      #READ_IMAGING,
    ];
    await grant_specific_access(hr_id, user, basic_permissions, null);
  };

  // New granular permission function
  public shared ({ caller }) func grant_specific_access(hr_id : Nat, user : PrincipalName, permissions : [PermissionType], expires_at : ?Time.Time) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    Debug.print("Grant specific access called by: " # caller_text # " for record: " # Nat.toText(hr_id) # " to user: " # user);

    let (?record) = healthRecordsById.get(hr_id) else {
      let _ = logAccess(hr_id, caller_text, #GrantAccess, false);
      Debug.trap("health record with id " # Nat.toText(hr_id) # "not found");
    };

    Debug.print("Record owner: " # record.owner # ", current user_permissions: " # debug_show (record.user_permissions));
    Debug.print("Caller text: " # caller_text # ", Record owner: " # record.owner);
    Debug.print("Caller == Owner: " # Bool.toText(caller_text == record.owner));

    if (caller_text != record.owner) {
      let _ = logAccess(hr_id, caller_text, #GrantAccess, false);
      Debug.print("Authorization failed - caller: " # caller_text # " is not owner: " # record.owner);
      Debug.trap("unauthorized");
    };

    // Check if user already has permissions
    let existing_perm_index = Array.find(record.user_permissions, func(perm : UserPermission) : Bool { perm.user == user });

    let new_permission : UserPermission = {
      user = user;
      permissions = permissions;
      granted_at = Time.now();
      expires_at = expires_at;
      granted_by = caller_text;
    };

    let updated_permissions = switch (existing_perm_index) {
      case (?existing) {
        // Update existing permission
        Debug.print("Updating existing permissions for user " # user);
        Array.map(
          record.user_permissions,
          func(perm : UserPermission) : UserPermission {
            if (perm.user == user) { new_permission } else { perm };
          },
        );
      };
      case null {
        // Add new permission
        Debug.print("Adding new permissions for user " # user);
        let perms_buf = Buffer.fromArray<UserPermission>(record.user_permissions);
        perms_buf.add(new_permission);
        Buffer.toArray(perms_buf);
      };
    };

    let updated_record = {
      record with user_permissions = updated_permissions
    };
    healthRecordsById.put(hr_id, updated_record);
    Debug.print("Updated record user_permissions: " # debug_show (updated_record.user_permissions));

    // Update user's health record index
    switch (healthRecordIdsByUser.get(user)) {
      case (?user_hrids) {
        if (not List.some(user_hrids, func(hrid : Nat) : Bool { hrid == hr_id })) {
          healthRecordIdsByUser.put(user, List.push(hr_id, user_hrids));
        };
      };
      case null {
        healthRecordIdsByUser.put(user, List.make(hr_id));
      };
    };

    // Log successful access grant
    let _ = logAccess(hr_id, caller_text, #GrantAccess, true);
  };

  public shared ({ caller }) func revoke_access(hr_id : Nat, user : PrincipalName) : async () {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);
    let (?record) = healthRecordsById.get(hr_id) else {
      let _ = logAccess(hr_id, caller_text, #RevokeAccess, false);
      Debug.trap("health record with id " # Nat.toText(hr_id) # "not found");
    };

    if (caller_text != record.owner) {
      let _ = logAccess(hr_id, caller_text, #RevokeAccess, false);
      Debug.trap("unauthorized");
    };

    let updated_permissions = Array.filter(record.user_permissions, func(perm : UserPermission) : Bool { perm.user != user });
    let updated_record = { record with user_permissions = updated_permissions };
    healthRecordsById.put(hr_id, updated_record);

    switch (healthRecordIdsByUser.get(user)) {
      case (?user_hrids) {
        let updated_hrids = List.filter(user_hrids, func(hrid : Nat) : Bool { hrid != hr_id });
        if (not List.isNil(updated_hrids)) {
          healthRecordIdsByUser.put(user, updated_hrids);
        } else {
          let _ = healthRecordIdsByUser.remove(user);
        };
      };
      case null {};
    };

    // Log successful access revocation
    let _ = logAccess(hr_id, caller_text, #RevokeAccess, true);
  };

  public shared ({ caller }) func get_shared_health_records() : async [HealthRecord] {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    let shared_records = List.map(
      Option.get(healthRecordIdsByUser.get(user), List.nil()),
      func(hrid : Nat) : HealthRecord {
        let record = expect(healthRecordsById.get(hrid), "missing health record with ID " # Nat.toText(hrid));
        // Log access
        let _ = logAccess(hrid, user, #View, true);
        record;
      },
    );

    let buf = Buffer.Buffer<HealthRecord>(List.size(shared_records));
    buf.append(Buffer.fromArray(List.toArray(shared_records)));
    Buffer.toArray(buf);
  };

  public shared ({ caller }) func register_user_role(role : UserRole) : async () {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    userRoles.put(user, role);
  };

  public shared ({ caller }) func get_user_role() : async ?UserRole {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    userRoles.get(user);
  };

  public shared ({ caller }) func create_patient_profile(
    full_name : Text,
    date_of_birth : Text,
    contact_info : Text,
    emergency_contact : Text,
    medical_history : ?Text,
    allergies : ?Text,
    current_medications : ?Text,
  ) : async () {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    let newProfile : PatientProfile = {
      owner = user;
      full_name = full_name;
      date_of_birth = date_of_birth;
      contact_info = contact_info;
      emergency_contact = emergency_contact;
      medical_history = medical_history;
      allergies = allergies;
      current_medications = current_medications;
      profile_permissions = [];
    };
    patientProfiles.put(user, newProfile);
  };

  public shared ({ caller }) func get_patient_profile() : async ?PatientProfile {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    patientProfiles.get(user);
  };

  public shared ({ caller }) func update_patient_profile(
    full_name : Text,
    date_of_birth : Text,
    contact_info : Text,
    emergency_contact : Text,
    medical_history : ?Text,
    allergies : ?Text,
    current_medications : ?Text,
  ) : async () {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    // Get existing profile to preserve permissions
    let existingProfile = patientProfiles.get(user);
    let existingPermissions = switch (existingProfile) {
      case (?profile) { profile.profile_permissions };
      case null { [] };
    };

    let updatedProfile : PatientProfile = {
      owner = user;
      full_name = full_name;
      date_of_birth = date_of_birth;
      contact_info = contact_info;
      emergency_contact = emergency_contact;
      medical_history = medical_history;
      allergies = allergies;
      current_medications = current_medications;
      profile_permissions = existingPermissions; // Preserve existing permissions
    };
    patientProfiles.put(user, updatedProfile);
  };

  // Grant permissions on patient profile data
  public shared ({ caller }) func grant_profile_permission(
    user_principal : PrincipalName,
    permissions : [PermissionType],
    expires_at : ?Time.Time,
  ) : async () {
    assert not Principal.isAnonymous(caller);
    let patient = Principal.toText(caller);

    // Get current patient profile
    let (?profile) = patientProfiles.get(patient) else Debug.trap("patient profile not found");

    // Check if permission already exists for this user
    let existingPermissions = Array.filter<ProfilePermission>(
      profile.profile_permissions,
      func(p : ProfilePermission) : Bool { p.user != user_principal },
    );

    // Create new permission
    let newPermission : ProfilePermission = {
      user = user_principal;
      permissions = permissions;
      granted_at = Time.now();
      expires_at = expires_at;
      granted_by = patient;
    };

    // Update profile with new permissions
    let updatedProfile : PatientProfile = {
      owner = profile.owner;
      full_name = profile.full_name;
      date_of_birth = profile.date_of_birth;
      contact_info = profile.contact_info;
      emergency_contact = profile.emergency_contact;
      medical_history = profile.medical_history;
      allergies = profile.allergies;
      current_medications = profile.current_medications;
      profile_permissions = Array.append(existingPermissions, [newPermission]);
    };

    patientProfiles.put(patient, updatedProfile);
  };

  // Check if a user has specific permissions on a patient profile
  public shared ({ caller }) func check_profile_permission(
    patient_principal : PrincipalName,
    permission_type : PermissionType,
  ) : async Bool {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    // Patient always has access to their own profile
    if (user == patient_principal) {
      return true;
    };

    let (?profile) = patientProfiles.get(patient_principal) else return false;

    // Check if user has the required permission
    for (permission in profile.profile_permissions.vals()) {
      if (permission.user == user) {
        // Check if permission hasn't expired
        switch (permission.expires_at) {
          case (?expiry) {
            if (Time.now() > expiry) {
              return false; // Permission expired
            };
          };
          case null { /* No expiry */ };
        };

        // Check if user has the specific permission
        for (perm in permission.permissions.vals()) {
          if (perm == permission_type) {
            return true;
          };
        };
      };
    };

    false;
  };

  // Get filtered patient profile based on permissions
  public shared ({ caller }) func get_patient_profile_with_permissions(
    patient_principal : PrincipalName
  ) : async ?{
    owner : PrincipalName;
    full_name : ?Text;
    date_of_birth : ?Text;
    contact_info : ?Text;
    emergency_contact : ?Text;
    medical_history : ?Text;
    allergies : ?Text;
    current_medications : ?Text;
  } {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    let (?profile) = patientProfiles.get(patient_principal) else return null;

    // Patient always has full access to their own profile
    if (user == patient_principal) {
      return ?{
        owner = profile.owner;
        full_name = ?profile.full_name;
        date_of_birth = ?profile.date_of_birth;
        contact_info = ?profile.contact_info;
        emergency_contact = ?profile.emergency_contact;
        medical_history = profile.medical_history;
        allergies = profile.allergies;
        current_medications = profile.current_medications;
      };
    };

    // Check permissions for each field
    let hasBasicInfo = await check_profile_permission(patient_principal, #READ_BASIC_INFO);
    let hasMedicalHistory = await check_profile_permission(patient_principal, #READ_MEDICAL_HISTORY);
    let hasAllergies = await check_profile_permission(patient_principal, #READ_ALLERGIES);
    let hasMedications = await check_profile_permission(patient_principal, #READ_MEDICATIONS);

    ?{
      owner = profile.owner;
      full_name = if (hasBasicInfo) ?profile.full_name else null;
      date_of_birth = if (hasBasicInfo) ?profile.date_of_birth else null;
      contact_info = if (hasBasicInfo) ?profile.contact_info else null;
      emergency_contact = if (hasBasicInfo) ?profile.emergency_contact else null;
      medical_history = if (hasMedicalHistory) profile.medical_history else null;
      allergies = if (hasAllergies) profile.allergies else null;
      current_medications = if (hasMedications) profile.current_medications else null;
    };
  };

  // Get all profile permissions for a patient (only accessible by the patient themselves)
  public shared ({ caller }) func get_profile_permissions() : async [ProfilePermission] {
    assert not Principal.isAnonymous(caller);
    let patient = Principal.toText(caller);

    let (?profile) = patientProfiles.get(patient) else return [];
    profile.profile_permissions;
  };

  // Revoke profile permission for a specific user
  public shared ({ caller }) func revoke_profile_permission(
    user_principal : PrincipalName
  ) : async () {
    assert not Principal.isAnonymous(caller);
    let patient = Principal.toText(caller);

    let (?profile) = patientProfiles.get(patient) else Debug.trap("patient profile not found");

    // Filter out permissions for the specified user
    let updatedPermissions = Array.filter<ProfilePermission>(
      profile.profile_permissions,
      func(p : ProfilePermission) : Bool { p.user != user_principal },
    );

    let updatedProfile : PatientProfile = {
      owner = profile.owner;
      full_name = profile.full_name;
      date_of_birth = profile.date_of_birth;
      contact_info = profile.contact_info;
      emergency_contact = profile.emergency_contact;
      medical_history = profile.medical_history;
      allergies = profile.allergies;
      current_medications = profile.current_medications;
      profile_permissions = updatedPermissions;
    };

    patientProfiles.put(patient, updatedProfile);
  };

  // Helper function to check if any profile permissions exist for a user on any patient
  public shared ({ caller }) func has_any_profile_permissions() : async Bool {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);

    // Iterate through all patient profiles to check if user has any permissions
    for ((patient_principal, profile) in patientProfiles.entries()) {
      for (permission in profile.profile_permissions.vals()) {
        if (permission.user == user) {
          // Check if permission hasn't expired
          switch (permission.expires_at) {
            case (?expiry) {
              if (Time.now() <= expiry) {
                return true; // Found valid permission
              };
            };
            case null { return true }; // No expiry, valid permission
          };
        };
      };
    };

    false;
  };

  // Get all permissions granted TO the current user (for healthcare providers to see what patients have shared with them)
  public shared ({ caller }) func get_permissions_granted_to_me() : async [(Text, [ProfilePermission])] {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    var result : [(Text, [ProfilePermission])] = [];

    // Iterate through all patient profiles to find permissions granted to this user
    for ((patient_principal, profile) in patientProfiles.entries()) {
      var userPermissions : [ProfilePermission] = [];
      for (permission in profile.profile_permissions.vals()) {
        if (permission.user == user) {
          userPermissions := Array.append(userPermissions, [permission]);
        };
      };
      if (userPermissions.size() > 0) {
        result := Array.append(result, [(patient_principal, userPermissions)]);
      };
    };

    result;
  };

  public shared ({ caller }) func create_healthcare_provider_profile(name : Text, specialty : Text, license_number : Text, contact_info : Text) : async () {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    let newProfile : HealthcareProviderProfile = {
      name = name;
      specialty = specialty;
      license_number = license_number;
      contact_info = contact_info;
    };
    healthcareProviderProfiles.put(user, newProfile);
  };

  public shared ({ caller }) func get_healthcare_provider_profile() : async ?HealthcareProviderProfile {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    healthcareProviderProfiles.get(user);
  };

  public shared ({ caller }) func update_healthcare_provider_profile(name : Text, specialty : Text, license_number : Text, contact_info : Text) : async () {
    assert not Principal.isAnonymous(caller);
    let user = Principal.toText(caller);
    let updatedProfile : HealthcareProviderProfile = {
      name = name;
      specialty = specialty;
      license_number = license_number;
      contact_info = contact_info;
    };
    healthcareProviderProfiles.put(user, updatedProfile);
  };

  public shared ({ caller }) func upload_attachment(content : Blob) : async Nat {
    assert not Principal.isAnonymous(caller);
    let attachmentId = nextAttachmentId;
    attachmentsById.put(attachmentId, content);
    nextAttachmentId += 1;
    attachmentId;
  };

  public shared ({ caller }) func get_attachment(id : Nat) : async ?Blob {
    assert not Principal.isAnonymous(caller);
    attachmentsById.get(id);
  };

  // Function to log access attempts
  private func logAccess(record_id : Nat, user : PrincipalName, action : AccessAction, success : Bool) : Nat {
    let accessLog : AccessLog = {
      id = nextAccessLogId;
      record_id = record_id;
      user = user;
      timestamp = Time.now();
      action = action;
      success = success;
    };

    accessLogs.put(accessLog.id, accessLog);

    // Add to record-indexed logs
    switch (accessLogsByRecord.get(record_id)) {
      case (?record_logs) {
        accessLogsByRecord.put(record_id, List.push(accessLog.id, record_logs));
      };
      case null {
        accessLogsByRecord.put(record_id, List.make(accessLog.id));
      };
    };

    // Add to user-indexed logs
    switch (accessLogsByUser.get(user)) {
      case (?user_logs) {
        accessLogsByUser.put(user, List.push(accessLog.id, user_logs));
      };
      case null {
        accessLogsByUser.put(user, List.make(accessLog.id));
      };
    };

    nextAccessLogId += 1;
    accessLog.id;
  };

  // Get access logs for a specific health record
  public shared ({ caller }) func get_record_access_logs(record_id : Nat) : async [AccessLog] {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);

    // Check if the record exists
    let (?record) = healthRecordsById.get(record_id) else Debug.trap("health record with id " # Nat.toText(record_id) # " not found");

    // Only the record owner can view access logs
    if (caller_text != record.owner) {
      Debug.trap("unauthorized");
    };

    // Log this access attempt
    let _ = logAccess(record_id, caller_text, #View, true);

    // Get all access logs for this record
    let log_ids = Option.get(accessLogsByRecord.get(record_id), List.nil());
    let logs = List.map(
      log_ids,
      func(log_id : Nat) : AccessLog {
        expect(accessLogs.get(log_id), "missing access log with ID " # Nat.toText(log_id));
      },
    );

    List.toArray(logs);
  };

  // Get access logs for the current user (their own actions)
  public shared ({ caller }) func get_user_access_logs() : async [AccessLog] {
    assert not Principal.isAnonymous(caller);
    let caller_text = Principal.toText(caller);

    // Get all access logs for this user
    let log_ids = Option.get(accessLogsByUser.get(caller_text), List.nil());
    let logs = List.map(
      log_ids,
      func(log_id : Nat) : AccessLog {
        expect(accessLogs.get(log_id), "missing access log with ID " # Nat.toText(log_id));
      },
    );

    List.toArray(logs);
  };

  // Only the vetKD methods in the IC management canister are required here.
  type VETKD_API = actor {
    vetkd_public_key : ({
      canister_id : ?Principal;
      context : Blob;
      key_id : { curve : { #bls12_381_g2 }; name : Text };
    }) -> async ({ public_key : Blob });
    vetkd_derive_key : ({
      input : Blob;
      context : Blob;
      key_id : { curve : { #bls12_381_g2 }; name : Text };
      transport_public_key : Blob;
    }) -> async ({ encrypted_key : Blob });
  };

  let management_canister : VETKD_API = actor ("aaaaa-aa");

  public shared func symmetric_key_verification_key_for_note() : async Text {
    let { public_key } = await management_canister.vetkd_public_key({
      canister_id = null;
      context = Text.encodeUtf8("note_symmetric_key");
      key_id = { curve = #bls12_381_g2; name = "test_key_1" };
    });
    Hex.encode(Blob.toArray(public_key));
  };

  public shared ({ caller }) func encrypted_symmetric_key_for_note(note_id : NoteId, transport_public_key : Blob) : async Text {
    let caller_text = Principal.toText(caller);
    let (?note) = notesById.get(note_id) else Debug.trap("note with id " # Nat.toText(note_id) # "not found");
    if (not is_authorized(caller_text, note)) {
      Debug.trap("unauthorized");
    };

    let buf = Buffer.Buffer<Nat8>(32);
    buf.append(Buffer.fromArray(natToBigEndianByteArray(16, note_id))); // fixed-size encoding
    buf.append(Buffer.fromArray(Blob.toArray(Text.encodeUtf8(note.owner))));
    let input = Blob.fromArray(Buffer.toArray(buf)); // prefix-free

    let { encrypted_key } = await (with cycles = 26_153_846_153) management_canister.vetkd_derive_key({
      input;
      context = Text.encodeUtf8("note_symmetric_key");
      key_id = { curve = #bls12_381_g2; name = "test_key_1" };
      transport_public_key;
    });
    Hex.encode(Blob.toArray(encrypted_key));
  };

  // Health Record Encryption Functions
  public shared func symmetric_key_verification_key_for_health_record() : async Text {
    let { public_key } = await management_canister.vetkd_public_key({
      canister_id = null;
      context = Text.encodeUtf8("health_record_symmetric_key");
      key_id = { curve = #bls12_381_g2; name = "test_key_1" };
    });
    Hex.encode(Blob.toArray(public_key));
  };

  public shared ({ caller }) func encrypted_symmetric_key_for_health_record(record_id : Nat, transport_public_key : Blob) : async Text {
    let caller_text = Principal.toText(caller);
    let (?record) = healthRecordsById.get(record_id) else Debug.trap("health record with id " # Nat.toText(record_id) # " not found");
    if (not is_authorized_health_record(caller_text, record)) {
      Debug.trap("unauthorized");
    };
    // Note: Access logging moved to explicit decrypt_and_log_access function

    let buf = Buffer.Buffer<Nat8>(32);
    buf.append(Buffer.fromArray(natToBigEndianByteArray(16, record_id))); // fixed-size encoding
    buf.append(Buffer.fromArray(Blob.toArray(Text.encodeUtf8(record.owner))));
    let input = Blob.fromArray(Buffer.toArray(buf)); // prefix-free

    let { encrypted_key } = await (with cycles = 26_153_846_153) management_canister.vetkd_derive_key({
      input;
      context = Text.encodeUtf8("health_record_symmetric_key");
      key_id = { curve = #bls12_381_g2; name = "test_key_1" };
      transport_public_key;
    });
    Hex.encode(Blob.toArray(encrypted_key));
  };

  // Function to explicitly log access when provider decrypts and views record content
  public shared ({ caller }) func log_record_access(record_id : Nat) : async Bool {
    let caller_text = Principal.toText(caller);
    let (?record) = healthRecordsById.get(record_id) else return false;

    if (not is_authorized_health_record(caller_text, record)) {
      let _ = logAccess(record_id, caller_text, #View, false);
      return false;
    };

    let _ = logAccess(record_id, caller_text, #View, true);
    true;
  };

  // Converts a nat to a fixed-size big-endian byte (Nat8) array
  private func natToBigEndianByteArray(len : Nat, n : Nat) : [Nat8] {
    let ith_byte = func(i : Nat) : Nat8 {
      assert (i < len);
      let shift : Nat = 8 * (len - 1 - i);
      Nat8.fromIntWrap(n / 2 ** shift);
    };
    Array.tabulate<Nat8>(len, ith_byte);
  };

  // Below, we implement the upgrade hooks for our canister.
  // See https://internetcomputer.org/docs/current/motoko/main/upgrades/

  // The work required before a canister upgrade begins.
  system func preupgrade() {
    Debug.print("Starting pre-upgrade hook...");
    stable_notesById := Iter.toArray(notesById.entries());
    stable_noteIdsByOwner := Iter.toArray(noteIdsByOwner.entries());
    stable_noteIdsByUser := Iter.toArray(noteIdsByUser.entries());
    stable_healthRecordsById := Iter.toArray(healthRecordsById.entries());
    stable_healthRecordIdsByOwner := Iter.toArray(healthRecordIdsByOwner.entries());
    stable_healthRecordIdsByUser := Iter.toArray(healthRecordIdsByUser.entries());
    stable_userRoles_entries := Iter.toArray(userRoles.entries());
    stable_patientProfiles_entries := Iter.toArray(patientProfiles.entries());
    stable_healthcareProviderProfiles_entries := Iter.toArray(healthcareProviderProfiles.entries());
    stable_attachmentsById := Iter.toArray(attachmentsById.entries());
    stable_accessLogs := Iter.toArray(accessLogs.entries());
    stable_accessLogsByRecord := Iter.toArray(accessLogsByRecord.entries());
    stable_accessLogsByUser := Iter.toArray(accessLogsByUser.entries());
    Debug.print("pre-upgrade finished.");
  };

  // The work required after a canister upgrade ends.
  // See [nextNoteId], [stable_notesByUser]
  system func postupgrade() {
    Debug.print("Starting post-upgrade hook...");

    notesById := Map.fromIter<NoteId, EncryptedNote>(
      stable_notesById.vals(),
      stable_notesById.size(),
      Nat.equal,
      Hash.hash,
    );
    stable_notesById := [];

    noteIdsByOwner := Map.fromIter<PrincipalName, List.List<NoteId>>(
      stable_noteIdsByOwner.vals(),
      stable_noteIdsByOwner.size(),
      Text.equal,
      Text.hash,
    );
    stable_noteIdsByOwner := [];

    noteIdsByUser := Map.fromIter<PrincipalName, List.List<NoteId>>(
      stable_noteIdsByUser.vals(),
      stable_noteIdsByUser.size(),
      Text.equal,
      Text.hash,
    );
    stable_noteIdsByUser := [];

    healthRecordsById := Map.fromIter<Nat, HealthRecord>(
      stable_healthRecordsById.vals(),
      stable_healthRecordsById.size(),
      Nat.equal,
      Hash.hash,
    );
    stable_healthRecordsById := [];

    healthRecordIdsByOwner := Map.fromIter<PrincipalName, List.List<Nat>>(
      stable_healthRecordIdsByOwner.vals(),
      stable_healthRecordIdsByOwner.size(),
      Text.equal,
      Text.hash,
    );
    stable_healthRecordIdsByOwner := [];

    healthRecordIdsByUser := Map.fromIter<PrincipalName, List.List<Nat>>(
      stable_healthRecordIdsByUser.vals(),
      stable_healthRecordIdsByUser.size(),
      Text.equal,
      Text.hash,
    );
    stable_healthRecordIdsByUser := [];

    userRoles := Map.fromIter<PrincipalName, UserRole>(
      stable_userRoles_entries.vals(),
      stable_userRoles_entries.size(),
      Text.equal,
      Text.hash,
    );
    stable_userRoles_entries := [];

    patientProfiles := Map.fromIter<PrincipalName, PatientProfile>(
      stable_patientProfiles_entries.vals(),
      stable_patientProfiles_entries.size(),
      Text.equal,
      Text.hash,
    );
    stable_patientProfiles_entries := [];

    healthcareProviderProfiles := Map.fromIter<PrincipalName, HealthcareProviderProfile>(
      stable_healthcareProviderProfiles_entries.vals(),
      stable_healthcareProviderProfiles_entries.size(),
      Text.equal,
      Text.hash,
    );
    stable_healthcareProviderProfiles_entries := [];

    attachmentsById := Map.fromIter<Nat, Blob>(
      stable_attachmentsById.vals(),
      stable_attachmentsById.size(),
      Nat.equal,
      Hash.hash,
    );
    stable_attachmentsById := [];

    accessLogs := Map.fromIter<Nat, AccessLog>(
      stable_accessLogs.vals(),
      stable_accessLogs.size(),
      Nat.equal,
      Hash.hash,
    );
    stable_accessLogs := [];

    accessLogsByRecord := Map.fromIter<Nat, List.List<Nat>>(
      stable_accessLogsByRecord.vals(),
      stable_accessLogsByRecord.size(),
      Nat.equal,
      Hash.hash,
    );

    stable_accessLogsByRecord := [];

    accessLogsByUser := Map.fromIter<PrincipalName, List.List<Nat>>(
      stable_accessLogsByUser.vals(),
      stable_accessLogsByUser.size(),
      Text.equal,
      Text.hash,
    );
    stable_accessLogsByUser := [];

    Debug.print("post-upgrade finished.");
  };
};
