// MediToken - ICRC-1 compliant token for healthcare data monetization
// Based on the ICRC-1 reference implementation

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Result "mo:base/Result";

actor class MediToken() = this {

  // Token configuration
  private stable let TOKEN_NAME = "MediToken";
  private stable let TOKEN_SYMBOL = "MDT";
  private stable let TOKEN_DECIMALS = 8 : Nat8;
  private stable let TOKEN_FEE = 10_000 : Nat; // 0.0001 MDT
  private stable let INITIAL_SUPPLY = 1_000_000_000_00000000 : Nat; // 1 billion MDT


  public type Account = { owner : Principal; subaccount : ?Subaccount };
  public type Subaccount = Blob;
  public type Tokens = Nat;
  public type Memo = Blob;
  public type Timestamp = Nat64;
  public type Duration = Nat64;
  public type TxIndex = Nat;
  public type TxLog = Buffer.Buffer<Transaction>;
  public type Result<T, E> = { #Ok : T; #Err : E };

  public type Value = { #Nat : Nat; #Int : Int; #Blob : Blob; #Text : Text };

  let maxMemoSize = 32;
  let permittedDriftNanos : Duration = 60_000_000_000;
  let transactionWindowNanos : Duration = 24 * 60 * 60 * 1_000_000_000;
  let defaultSubaccount : Subaccount = Blob.fromArrayMut(Array.init(32, 0 : Nat8));

  public type Operation = {
    #Approve : Approve;
    #Transfer : Transfer;
    #Burn : Transfer;
    #Mint : Transfer;
  };

  public type CommonFields = {
    memo : ?Memo;
    fee : ?Tokens;
    created_at_time : ?Timestamp;
  };

  public type Approve = CommonFields and {
    from : Account;
    spender : Account;
    amount : Nat;
    expires_at : ?Nat64;
  };

  public type TransferSource = {
    #Init;
    #Icrc1Transfer;
    #Icrc2TransferFrom;
  };

  public type Transfer = CommonFields and {
    spender : Account;
    source : TransferSource;
    to : Account;
    from : Account;
    amount : Tokens;
  };

  public type Allowance = { allowance : Nat; expires_at : ?Nat64 };

  public type Transaction = {
    operation : Operation;
    fee : Tokens;
    timestamp : Timestamp;
  };

  public type DeduplicationError = {
    #TooOld;
    #Duplicate : { duplicate_of : TxIndex };
    #CreatedInFuture : { ledger_time : Timestamp };
  };

  public type CommonError = {
    #InsufficientFunds : { balance : Tokens };
    #BadFee : { expected_fee : Tokens };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferError = DeduplicationError or CommonError or {
    #BadBurn : { min_burn_amount : Tokens };
  };

  public type ApproveError = DeduplicationError or CommonError or {
    #Expired : { ledger_time : Nat64 };
    #AllowanceChanged : { current_allowance : Nat };
  };

  public type TransferFromError = TransferError or {
    #InsufficientAllowance : { allowance : Nat };
  };

  // Minting account (this canister itself)
  let mintingAccount : Account = {
    owner = Principal.fromActor(this);
    subaccount = null;
  };

  // Helper functions
  func accountsEqual(lhs : Account, rhs : Account) : Bool {
    let lhsSubaccount = Option.get(lhs.subaccount, defaultSubaccount);
    let rhsSubaccount = Option.get(rhs.subaccount, defaultSubaccount);

    Principal.equal(lhs.owner, rhs.owner) and Blob.equal(
      lhsSubaccount,
      rhsSubaccount
    );
  };

  func balance(account : Account, log : TxLog) : Nat {
    var sum = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Burn(args)) {
          if (accountsEqual(args.from, account)) { sum -= args.amount };
        };
        case (#Mint(args)) {
          if (accountsEqual(args.to, account)) { sum += args.amount };
        };
        case (#Transfer(args)) {
          if (accountsEqual(args.from, account)) {
            sum -= args.amount + tx.fee;
          };
          if (accountsEqual(args.to, account)) { sum += args.amount };
        };
        case (#Approve(args)) {
          if (accountsEqual(args.from, account)) { sum -= tx.fee };
        };
      };
    };
    sum;
  };

  func totalSupply(log : TxLog) : Tokens {
    var total = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Burn(args)) { total -= args.amount };
        case (#Mint(args)) { total += args.amount };
        case (#Transfer(_)) { total -= tx.fee };
        case (#Approve(_)) { total -= tx.fee };
      };
    };
    total;
  };

  func validateSubaccount(s : ?Subaccount) {
    let subaccount = Option.get(s, defaultSubaccount);
    assert (subaccount.size() == 32);
  };

  func validateMemo(m : ?Memo) {
    switch (m) {
      case (null) {};
      case (?memo) { assert (memo.size() <= maxMemoSize) };
    };
  };

  func checkTxTime(created_at_time : ?Timestamp, now : Timestamp) : Result<(), DeduplicationError> {
    let txTime : Timestamp = Option.get(created_at_time, now);

    if ((txTime > now) and (txTime - now > permittedDriftNanos)) {
      return #Err(#CreatedInFuture { ledger_time = now });
    };

    if ((txTime < now) and (now - txTime > transactionWindowNanos + permittedDriftNanos)) {
      return #Err(#TooOld);
    };

    #Ok(());
  };

  // Initialize genesis transaction with initial supply
  func makeGenesisChain() : TxLog {
    let now = Nat64.fromNat(Int.abs(Time.now()));
    let log = Buffer.Buffer<Transaction>(100);
    
    // Mint initial supply to the minting account
    let tx : Transaction = {
      operation = #Mint({
        spender = mintingAccount;
        source = #Init;
        from = mintingAccount;
        to = mintingAccount;
        amount = INITIAL_SUPPLY;
        fee = null;
        memo = null;
        created_at_time = ?now;
      });
      fee = 0;
      timestamp = now;
    };
    log.add(tx);
    log;
  };

  // Transaction log
  var log : TxLog = makeGenesisChain();

  // Stable storage for upgrades
  stable var persistedLog : [Transaction] = [];

  system func preupgrade() {
    persistedLog := Buffer.toArray(log);
  };

  system func postupgrade() {
    log := Buffer.Buffer(persistedLog.size());
    for (tx in Array.vals(persistedLog)) {
      log.add(tx);
    };
  };

  func recordTransaction(tx : Transaction) : TxIndex {
    let idx = log.size();
    log.add(tx);
    idx;
  };

  func findTransfer(transfer : Transfer, log : TxLog) : ?TxIndex {
    var i = 0;
    for (tx in log.vals()) {
      switch (tx.operation) {
        case (#Burn(args)) { if (args == transfer) { return ?i } };
        case (#Mint(args)) { if (args == transfer) { return ?i } };
        case (#Transfer(args)) { if (args == transfer) { return ?i } };
        case (_) {};
      };
      i += 1;
    };
    null;
  };

  func classifyTransfer(log : TxLog, transfer : Transfer) : Result<(Operation, Tokens), TransferError> {
    let minter = mintingAccount;

    if (Option.isSome(transfer.created_at_time)) {
      switch (findTransfer(transfer, log)) {
        case (?txid) { return #Err(#Duplicate { duplicate_of = txid }) };
        case null {};
      };
    };

    let result = if (accountsEqual(transfer.from, minter)) {
      if (Option.get(transfer.fee, 0) != 0) {
        return #Err(#BadFee { expected_fee = 0 });
      };
      (#Mint(transfer), 0);
    } else if (accountsEqual(transfer.to, minter)) {
      if (Option.get(transfer.fee, 0) != 0) {
        return #Err(#BadFee { expected_fee = 0 });
      };

      if (transfer.amount < TOKEN_FEE) {
        return #Err(#BadBurn { min_burn_amount = TOKEN_FEE });
      };

      let debitBalance = balance(transfer.from, log);
      if (debitBalance < transfer.amount) {
        return #Err(#InsufficientFunds { balance = debitBalance });
      };

      (#Burn(transfer), 0);
    } else {
      let effectiveFee = TOKEN_FEE;
      if (Option.get(transfer.fee, effectiveFee) != effectiveFee) {
        return #Err(#BadFee { expected_fee = TOKEN_FEE });
      };

      let debitBalance = balance(transfer.from, log);
      if (debitBalance < transfer.amount + effectiveFee) {
        return #Err(#InsufficientFunds { balance = debitBalance });
      };

      (#Transfer(transfer), effectiveFee);
    };
    #Ok(result);
  };

  func applyTransfer(args : Transfer) : Result<TxIndex, TransferError> {
    validateSubaccount(args.from.subaccount);
    validateSubaccount(args.to.subaccount);
    validateMemo(args.memo);

    let now = Nat64.fromNat(Int.abs(Time.now()));

    switch (checkTxTime(args.created_at_time, now)) {
      case (#Ok(_)) {};
      case (#Err(e)) { return #Err(e) };
    };

    switch (classifyTransfer(log, args)) {
      case (#Ok((operation, effectiveFee))) {
        #Ok(recordTransaction({ operation = operation; fee = effectiveFee; timestamp = now }));
      };
      case (#Err(e)) { #Err(e) };
    };
  };

  // ICRC-1 Standard Methods

  public shared ({ caller }) func icrc1_transfer({
    from_subaccount : ?Subaccount;
    to : Account;
    amount : Tokens;
    fee : ?Tokens;
    memo : ?Memo;
    created_at_time : ?Timestamp;
  }) : async Result<TxIndex, TransferError> {
    let from = {
      owner = caller;
      subaccount = from_subaccount;
    };
    applyTransfer({
      spender = from;
      source = #Icrc1Transfer;
      from = from;
      to = to;
      amount = amount;
      fee = fee;
      memo = memo;
      created_at_time = created_at_time;
    });
  };

  public query func icrc1_balance_of(account : Account) : async Tokens {
    balance(account, log);
  };

  public query func icrc1_total_supply() : async Tokens {
    totalSupply(log);
  };

  public query func icrc1_minting_account() : async ?Account {
    ?mintingAccount;
  };

  public query func icrc1_name() : async Text {
    TOKEN_NAME;
  };

  public query func icrc1_symbol() : async Text {
    TOKEN_SYMBOL;
  };

  public query func icrc1_decimals() : async Nat8 {
    TOKEN_DECIMALS;
  };

  public query func icrc1_fee() : async Nat {
    TOKEN_FEE;
  };

  public query func icrc1_metadata() : async [(Text, Value)] {
    [
      ("icrc1:name", #Text(TOKEN_NAME)),
      ("icrc1:symbol", #Text(TOKEN_SYMBOL)),
      ("icrc1:decimals", #Nat(Nat8.toNat(TOKEN_DECIMALS))),
      ("icrc1:fee", #Nat(TOKEN_FEE)),
      ("icrc1:logo", #Text("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzRGQkYzRSIvPgogIDx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TURUPC90ZXh0Pgo8L3N2Zz4=")),
    ];
  };

  public query func icrc1_supported_standards() : async [{
    name : Text;
    url : Text;
  }] {
    [
      {
        name = "ICRC-1";
        url = "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1";
      }
    ];
  };

  // Custom methods for MediVet platform

  // Mint tokens to a specific account (only callable by admin)
  public shared ({ caller }) func mint_tokens(to : Account, amount : Tokens) : async Result<TxIndex, TransferError> {
    // Check if caller is admin
    if (Principal.notEqual(caller, Principal.fromActor(this))) {
      return #Err(#GenericError { error_code = 403; message = "Unauthorized: Only admin can mint tokens" });
    };

    applyTransfer({
      spender = mintingAccount;
      source = #Init;
      from = mintingAccount;
      to = to;
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
  };

  // Burn tokens from a specific account (only callable by the account owner)
  public shared ({ caller }) func burn_tokens(amount : Tokens, from_subaccount : ?Subaccount) : async Result<TxIndex, TransferError> {
    let from = {
      owner = caller;
      subaccount = from_subaccount;
    };

    applyTransfer({
      spender = from;
      source = #Icrc1Transfer;
      from = from;
      to = mintingAccount;
      amount = amount;
      fee = null;
      memo = null;
      created_at_time = null;
    });
  };

  // Get transaction history for debugging
  public query func get_transactions_count() : async Nat {
    log.size();
  };

  // Health check
  public query func health_check() : async Bool {
    true;
  };
};
