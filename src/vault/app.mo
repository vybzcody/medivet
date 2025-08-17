import Bool "mo:base/Bool";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import HashMap "mo:map/Map";
import { phash; thash } "mo:map/Map";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Option "mo:base/Option";
import Time "mo:base/Time";
import Result "mo:base/Result";

persistent actor Filevault {

  // Define a data type for a file's chunks.
  type FileChunk = {
    chunk : Blob;
    index : Nat;
  };

  // Define a data type for a file's data.
  type File = {
    name : Text;
    chunks : [FileChunk];
    totalSize : Nat;
    fileType : Text;
    createdAt : Time.Time;
    modifiedAt : Time.Time;
    isProfilePhoto : Bool;
  };

  // Define file sharing permissions
  type FilePermission = {
    sharedWith : Principal;
    canDownload : Bool;
    canView : Bool;
    expiresAt : ?Time.Time;
    sharedAt : Time.Time;
  };

  // Enhanced file metadata for sharing
  type FileMetadata = {
    name : Text;
    size : Nat;
    fileType : Text;
    createdAt : Time.Time;
    modifiedAt : Time.Time;
    isProfilePhoto : Bool;
    permissions : [FilePermission];
  };

  // Define a data type for storing files associated with a user principal.
  type UserFiles = HashMap.Map<Text, File>;

  // HashMap to store the user data
  private var files = HashMap.new<Principal, UserFiles>();
  
  // HashMap to store file sharing permissions
  private var filePermissions = HashMap.new<Text, [FilePermission]>(); // Key: "owner_principal:filename"

  // Return files associated with a user's principal.
  private func getUserFiles(user : Principal) : UserFiles {
    switch (HashMap.get(files, phash, user)) {
      case null {
        let newFileMap = HashMap.new<Text, File>();
        let _ = HashMap.put(files, phash, user, newFileMap);
        newFileMap;
      };
      case (?existingFiles) existingFiles;
    };
  };

  // Check if a file name already exists for the user.
  public shared (msg) func checkFileExists(name : Text) : async Bool {
    Option.isSome(HashMap.get(getUserFiles(msg.caller), thash, name));
  };

  // Upload a file in chunks.
  public shared (msg) func uploadFileChunk(name : Text, chunk : Blob, index : Nat, fileType : Text, isProfilePhoto : Bool) : async () {
    let userFiles = getUserFiles(msg.caller);
    let fileChunk = { chunk = chunk; index = index };
    let now = Time.now();

    switch (HashMap.get(userFiles, thash, name)) {
      case null {
        let _ = HashMap.put(userFiles, thash, name, { 
          name = name; 
          chunks = [fileChunk]; 
          totalSize = chunk.size(); 
          fileType = fileType;
          createdAt = now;
          modifiedAt = now;
          isProfilePhoto = isProfilePhoto;
        });
      };
      case (?existingFile) {
        let updatedChunks = Array.append(existingFile.chunks, [fileChunk]);
        let _ = HashMap.put(
          userFiles,
          thash,
          name,
          {
            name = name;
            chunks = updatedChunks;
            totalSize = existingFile.totalSize + chunk.size();
            fileType = fileType;
            createdAt = existingFile.createdAt;
            modifiedAt = now;
            isProfilePhoto = isProfilePhoto;
          },
        );
      };
    };
  };

  // Return list of files for a user.
  public shared (msg) func getFiles() : async [{
    name : Text;
    size : Nat;
    fileType : Text;
  }] {
    Iter.toArray(
      Iter.map(
        HashMap.vals(getUserFiles(msg.caller)),
        func(file : File) : { name : Text; size : Nat; fileType : Text } {
          {
            name = file.name;
            size = file.totalSize;
            fileType = file.fileType;
          };
        },
      )
    );
  };

  // Return total chunks for a file
  public shared (msg) func getTotalChunks(name : Text) : async Nat {
    switch (HashMap.get(getUserFiles(msg.caller), thash, name)) {
      case null 0;
      case (?file) file.chunks.size();
    };
  };

  // Return specific chunk for a file.
  public shared (msg) func getFileChunk(name : Text, index : Nat) : async ?Blob {
    switch (HashMap.get(getUserFiles(msg.caller), thash, name)) {
      case null null;
      case (?file) {
        switch (Array.find(file.chunks, func(chunk : FileChunk) : Bool { chunk.index == index })) {
          case null null;
          case (?foundChunk) ?foundChunk.chunk;
        };
      };
    };
  };

  // Get file's type.
  public shared (msg) func getFileType(name : Text) : async ?Text {
    switch (HashMap.get(getUserFiles(msg.caller), thash, name)) {
      case null null;
      case (?file) ?file.fileType;
    };
  };

  // Get enhanced file metadata including sharing permissions
  public shared (msg) func getFileMetadata(name : Text) : async ?FileMetadata {
    switch (HashMap.get(getUserFiles(msg.caller), thash, name)) {
      case null null;
      case (?file) {
        let permissionKey = Principal.toText(msg.caller) # ":" # name;
        let permissions = switch (HashMap.get(filePermissions, thash, permissionKey)) {
          case null [];
          case (?perms) perms;
        };
        ?{
          name = file.name;
          size = file.totalSize;
          fileType = file.fileType;
          createdAt = file.createdAt;
          modifiedAt = file.modifiedAt;
          isProfilePhoto = file.isProfilePhoto;
          permissions = permissions;
        };
      };
    };
  };

  // Get all files with enhanced metadata
  public shared (msg) func getFilesWithMetadata() : async [FileMetadata] {
    let userFiles = getUserFiles(msg.caller);
    Iter.toArray(
      Iter.map(
        HashMap.vals(userFiles),
        func(file : File) : FileMetadata {
          let permissionKey = Principal.toText(msg.caller) # ":" # file.name;
          let permissions = switch (HashMap.get(filePermissions, thash, permissionKey)) {
            case null [];
            case (?perms) perms;
          };
          {
            name = file.name;
            size = file.totalSize;
            fileType = file.fileType;
            createdAt = file.createdAt;
            modifiedAt = file.modifiedAt;
            isProfilePhoto = file.isProfilePhoto;
            permissions = permissions;
          };
        },
      )
    );
  };

  // Share a file with another user
  public shared (msg) func shareFile(
    fileName : Text,
    targetUser : Principal,
    canDownload : Bool,
    canView : Bool,
    expiryDays : ?Nat
  ) : async Result.Result<(), Text> {
    // Check if file exists
    switch (HashMap.get(getUserFiles(msg.caller), thash, fileName)) {
      case null #err("File not found");
      case (?file) {
        let permissionKey = Principal.toText(msg.caller) # ":" # fileName;
        let now = Time.now();
        let expiresAt = switch (expiryDays) {
          case null null;
          case (?days) ?(now + Int.abs(days) * 24 * 60 * 60 * 1_000_000_000); // Convert days to nanoseconds
        };
        
        let newPermission : FilePermission = {
          sharedWith = targetUser;
          canDownload = canDownload;
          canView = canView;
          expiresAt = expiresAt;
          sharedAt = now;
        };
        
        let currentPermissions = switch (HashMap.get(filePermissions, thash, permissionKey)) {
          case null [];
          case (?perms) perms;
        };
        
        // Remove any existing permission for this user and add the new one
        let filteredPermissions = Array.filter(currentPermissions, func(perm : FilePermission) : Bool {
          perm.sharedWith != targetUser
        });
        let updatedPermissions = Array.append(filteredPermissions, [newPermission]);
        
        let _ = HashMap.put(filePermissions, thash, permissionKey, updatedPermissions);
        #ok(());
      };
    };
  };

  // Revoke file sharing permission
  public shared (msg) func revokeFileSharing(fileName : Text, targetUser : Principal) : async Result.Result<(), Text> {
    let permissionKey = Principal.toText(msg.caller) # ":" # fileName;
    switch (HashMap.get(filePermissions, thash, permissionKey)) {
      case null #err("No permissions found");
      case (?permissions) {
        let filteredPermissions = Array.filter(permissions, func(perm : FilePermission) : Bool {
          perm.sharedWith != targetUser
        });
        
        if (filteredPermissions.size() == permissions.size()) {
          #err("Permission not found for specified user");
        } else {
          let _ = HashMap.put(filePermissions, thash, permissionKey, filteredPermissions);
          #ok(());
        };
      };
    };
  };

  // Get files shared with the current user
  public shared (msg) func getSharedFiles() : async [FileMetadata] {
    let now = Time.now();
    let sharedFiles = Array.init<FileMetadata>(0, { 
      name = ""; 
      size = 0; 
      fileType = ""; 
      createdAt = 0; 
      modifiedAt = 0; 
      isProfilePhoto = false; 
      permissions = []; 
    });
    
    // This is a simplified implementation - in production, we'd need to iterate through all users' files
    // For now, return empty array - this would be enhanced with proper indexing
    [];
  };

  // Get profile photo for a user (if shared or own)
  public shared (msg) func getUserProfilePhoto(userPrincipal : Principal) : async ?FileMetadata {
    let userFiles = switch (HashMap.get(files, phash, userPrincipal)) {
      case null null;
      case (?files) ?files;
    };
    
    switch (userFiles) {
      case null null;
      case (?files) {
        // Find profile photo
        let profilePhotoFile = HashMap.find(files, func(name : Text, file : File) : Bool {
          file.isProfilePhoto
        });
        
        switch (profilePhotoFile) {
          case null null;
          case (?(name, file)) {
            // Check if we have permission to view this file (if it's not our own)
            if (userPrincipal == msg.caller) {
              // Own file
              ?{
                name = file.name;
                size = file.totalSize;
                fileType = file.fileType;
                createdAt = file.createdAt;
                modifiedAt = file.modifiedAt;
                isProfilePhoto = file.isProfilePhoto;
                permissions = [];
              };
            } else {
              // Check sharing permissions
              let permissionKey = Principal.toText(userPrincipal) # ":" # file.name;
              let permissions = switch (HashMap.get(filePermissions, thash, permissionKey)) {
                case null [];
                case (?perms) perms;
              };
              
              let now = Time.now();
              let hasPermission = Array.find(permissions, func(perm : FilePermission) : Bool {
                perm.sharedWith == msg.caller and
                perm.canView and
                (switch (perm.expiresAt) {
                  case null true;
                  case (?expiry) expiry > now;
                })
              });
              
              switch (hasPermission) {
                case null null;
                case (?_) ?{
                  name = file.name;
                  size = file.totalSize;
                  fileType = file.fileType;
                  createdAt = file.createdAt;
                  modifiedAt = file.modifiedAt;
                  isProfilePhoto = file.isProfilePhoto;
                  permissions = permissions;
                };
              };
            };
          };
        };
      };
    };
  };

  // Delete a file.
  public shared (msg) func deleteFile(name : Text) : async Bool {
    let deleted = Option.isSome(HashMap.remove(getUserFiles(msg.caller), thash, name));
    if (deleted) {
      // Also remove any sharing permissions for this file
      let permissionKey = Principal.toText(msg.caller) # ":" # name;
      let _ = HashMap.remove(filePermissions, thash, permissionKey);
    };
    deleted;
  };
};
