# Blockchain Design Document

## 1. Overview & Architecture
- **Network Environment:** Local Hardhat Ethereum Node (`http://127.0.0.1:8545`) running EVM (Ethereum Virtual Machine).
- **Development Toolchain:** Hardhat, Solc (`v0.8.20+`), Ethers.js (`v6`).
- **Core Purpose:** The smart contract acts as an immutable, tamper-proof registry for document integrity hashes and IPFS storage pointers. It provides cryptographic proof of file existence and hash state at a specific timestamp.

---

## 2. On-Chain vs. Off-Chain Storage Matrix

| Data Item | Storage Location | Rationale |
| :--- | :--- | :--- |
| `fileId` (UUID string/bytes32) | Both Blockchain & MySQL | Public identifier linking MySQL metadata to On-Chain record. |
| `ipfsCid` | Both Blockchain & MySQL | Immutable pointer to IPFS encrypted binary storage. |
| `sha256Hash` | Both Blockchain & MySQL | **Canonical checksum**. Used on download to detect file tampering. |
| `ownerAddress` / `ownerId` | Both Blockchain & MySQL | Address of registering backend wallet / owner string. |
| `timestamp` | Blockchain | Block timestamp proving exact time of registration. |
| Encrypted PDF Binary | IPFS Only | PDF binary payload stored off-chain on IPFS (too large for gas). |
| Wrapped AES Encryption Key | MySQL Only | Protected AES key stored in database (NEVER on blockchain). |
| Key IV / Key AuthTag / File IV | MySQL Only | Cryptographic parameters stored off-chain in database. |
| User Passwords / User Roles | MySQL Only | Application auth data stored in MySQL. |

---

## 3. Smart Contract Specification (`FileRegistry.sol`)

### 3.1 Contract Features
- **File Registration (`registerFile`):** Records file metadata (`fileId`, `ipfsCid`, `sha256Hash`) and assigns contract caller (`msg.sender`) as registrant. Emits `FileRegistered` event.
- **File Retrieval (`getFile`):** Read-only view returning recorded CID, SHA-256 hash, owner address, block timestamp, and active status.
- **File Verification (`verifyFileHash`):** Compares a candidate SHA-256 string against the stored hash and returns a boolean match flag.
- **Deactivation (`deactivateFile`):** Allows document registrant or contract owner to soft-delete an entry on-chain.

---

### 3.2 Complete Smart Contract Source Code (`contracts/FileRegistry.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FileRegistry
 * @notice Immutable blockchain registry for secure PDF file sharing hashes and IPFS pointers.
 * @dev Stores cryptographically verified SHA-256 hashes and IPFS CIDs. Raw keys and file contents are never stored.
 */
contract FileRegistry {
    address public owner;

    struct FileRecord {
        string fileId;
        string ipfsCid;
        string sha256Hash;
        address registrant;
        uint256 timestamp;
        bool isActive;
    }

    // Mapping from fileId to FileRecord
    mapping(string => FileRecord) private files;
    
    // List of registered fileIds for iteration
    string[] private fileIds;

    // Events
    event FileRegistered(
        string indexed fileId,
        string ipfsCid,
        string sha256Hash,
        address indexed registrant,
        uint256 timestamp
    );

    event FileDeactivated(string indexed fileId, address indexed modifierAddress);

    modifier onlyOwner() {
        require(msg.sender == owner, "FileRegistry: Caller is not contract owner");
        _;
    }

    modifier onlyRegistrantOrOwner(string memory _fileId) {
        require(files[_fileId].timestamp != 0, "FileRegistry: File record does not exist");
        require(
            msg.sender == files[_fileId].registrant || msg.sender == owner,
            "FileRegistry: Unauthorized caller"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registers file metadata and SHA-256 checksum on-chain.
     * @param _fileId Public UUID identifier of the file.
     * @param _ipfsCid IPFS Content Identifier for the encrypted file.
     * @param _sha256Hash Cryptographic SHA-256 digest of the encrypted payload.
     */
    function registerFile(
        string memory _fileId,
        string memory _ipfsCid,
        string memory _sha256Hash
    ) external {
        require(bytes(_fileId).length > 0, "FileRegistry: fileId cannot be empty");
        require(bytes(_ipfsCid).length > 0, "FileRegistry: ipfsCid cannot be empty");
        require(bytes(_sha256Hash).length > 63, "FileRegistry: Invalid SHA-256 length");
        require(files[_fileId].timestamp == 0, "FileRegistry: File already registered");

        FileRecord memory newRecord = FileRecord({
            fileId: _fileId,
            ipfsCid: _ipfsCid,
            sha256Hash: _sha256Hash,
            registrant: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });

        files[_fileId] = newRecord;
        fileIds.push(_fileId);

        emit FileRegistered(_fileId, _ipfsCid, _sha256Hash, msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieves the stored on-chain file record.
     * @param _fileId Unique identifier of the file.
     */
    function getFile(string memory _fileId)
        external
        view
        returns (
            string memory ipfsCid,
            string memory sha256Hash,
            address registrant,
            uint256 timestamp,
            bool isActive
        )
    {
        require(files[_fileId].timestamp != 0, "FileRegistry: File record does not exist");
        FileRecord memory record = files[_fileId];
        return (record.ipfsCid, record.sha256Hash, record.registrant, record.timestamp, record.isActive);
    }

    /**
     * @notice Verifies whether a candidate SHA-256 hash matches the on-chain canonical hash.
     * @param _fileId File identifier.
     * @param _candidateHash Hash calculated from retrieved file payload.
     */
    function verifyFileHash(string memory _fileId, string memory _candidateHash)
        external
        view
        returns (bool matches, string memory canonicalHash)
    {
        require(files[_fileId].timestamp != 0, "FileRegistry: File record does not exist");
        string memory storedHash = files[_fileId].sha256Hash;
        bool isValid = (keccak256(abi.encodePacked(storedHash)) == keccak256(abi.encodePacked(_candidateHash)));
        return (isValid, storedHash);
    }

    /**
     * @notice Deactivates a file record on-chain.
     */
    function deactivateFile(string memory _fileId) external onlyRegistrantOrOwner(_fileId) {
        files[_fileId].isActive = false;
        emit FileDeactivated(_fileId, msg.sender);
    }
}
```

---

## 4. Hardhat Deployment & Configuration

### `hardhat.config.js`
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  }
};
```

---

## 5. Ethers.js Service Integration Pattern

The Express backend connects to Hardhat node using `ethers.JsonRpcProvider` and a pre-funded signer account:

```javascript
const { ethers } = require("ethers");
const FileRegistryABI = require("../artifacts/contracts/FileRegistry.sol/FileRegistry.json").abi;

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545");
    this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, FileRegistryABI, this.wallet);
  }

  async registerFileOnChain(fileId, ipfsCid, sha256Hash) {
    const tx = await this.contract.registerFile(fileId, ipfsCid, sha256Hash);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getOnChainFile(fileId) {
    return await this.contract.getFile(fileId);
  }

  async verifyOnChainHash(fileId, candidateHash) {
    const res = await this.contract.verifyFileHash(fileId, candidateHash);
    return { matches: res.matches, storedHash: res.canonicalHash };
  }
}

module.exports = new BlockchainService();
```
