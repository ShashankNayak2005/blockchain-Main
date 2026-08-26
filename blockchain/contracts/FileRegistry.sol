// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FileRegistry
 * @notice Immutable blockchain registry for secure PDF file sharing metadata and SHA-256 integrity hashes.
 * @dev Stores ONLY tamper-resistant metadata required for file existence and integrity verification.
 *      PDF files, raw AES keys, master keys, passwords, and sensitive user data MUST NEVER be stored on-chain.
 */
contract FileRegistry {
    address public contractOwner;

    struct FileRecord {
        string fileId;
        string ipfsCid;
        string sha256Hash;
        address owner;
        uint256 timestamp;
        bool exists;
    }

    // Mapping from public fileId to FileRecord
    mapping(string => FileRecord) private files;
    
    // Array of registered fileIds for iteration
    string[] private fileIds;

    // Events
    event FileRegistered(
        string indexed fileId,
        string ipfsCid,
        string sha256Hash,
        address indexed owner,
        uint256 timestamp
    );

    event FileDeactivated(string indexed fileId, address indexed modifierAddress);

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "FileRegistry: Caller is not contract owner");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    /**
     * @notice Registers file metadata and SHA-256 checksum on-chain.
     * @param _fileId Unique identifier of the file.
     * @param _ipfsCid IPFS Content Identifier pointer.
     * @param _sha256Hash Cryptographic SHA-256 digest of the encrypted payload (64 hex chars).
     */
    function registerFile(
        string memory _fileId,
        string memory _ipfsCid,
        string memory _sha256Hash
    ) external {
        require(bytes(_fileId).length > 0, "FileRegistry: fileId cannot be empty");
        require(bytes(_ipfsCid).length > 0, "FileRegistry: ipfsCid cannot be empty");
        require(bytes(_sha256Hash).length == 64, "FileRegistry: Invalid SHA-256 length, expected 64 hex characters");
        require(!files[_fileId].exists, "FileRegistry: Duplicate file registration prohibited");

        FileRecord memory newRecord = FileRecord({
            fileId: _fileId,
            ipfsCid: _ipfsCid,
            sha256Hash: _sha256Hash,
            owner: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        files[_fileId] = newRecord;
        fileIds.push(_fileId);

        emit FileRegistered(_fileId, _ipfsCid, _sha256Hash, msg.sender, block.timestamp);
    }

    /**
     * @notice Retrieves stored on-chain record for a file.
     * @param _fileId Unique identifier of the file.
     */
    function getFile(string memory _fileId)
        external
        view
        returns (
            string memory ipfsCid,
            string memory sha256Hash,
            address owner,
            uint256 timestamp,
            bool exists
        )
    {
        require(files[_fileId].exists, "FileRegistry: File record does not exist");
        FileRecord memory record = files[_fileId];
        return (record.ipfsCid, record.sha256Hash, record.owner, record.timestamp, record.exists);
    }

    /**
     * @notice Verifies whether a candidate SHA-256 hash matches the stored on-chain canonical hash.
     * @param _fileId Unique identifier of the file.
     * @param _candidateHash Hash computed from retrieved file payload.
     * @return isMatch True if candidate hash matches canonical hash.
     * @return canonicalHash The original immutable hash stored on-chain.
     */
    function verifyFile(string memory _fileId, string memory _candidateHash)
        external
        view
        returns (bool isMatch, string memory canonicalHash)
    {
        require(files[_fileId].exists, "FileRegistry: File record does not exist");
        string memory storedHash = files[_fileId].sha256Hash;
        bool isValid = (keccak256(abi.encodePacked(storedHash)) == keccak256(abi.encodePacked(_candidateHash)));
        return (isValid, storedHash);
    }

    /**
     * @notice Helper getter for SHA-256 checksum only.
     */
    function getFileHash(string memory _fileId) external view returns (string memory) {
        require(files[_fileId].exists, "FileRegistry: File record does not exist");
        return files[_fileId].sha256Hash;
    }

    /**
     * @notice Helper getter for IPFS CID only.
     */
    function getIpfsCid(string memory _fileId) external view returns (string memory) {
        require(files[_fileId].exists, "FileRegistry: File record does not exist");
        return files[_fileId].ipfsCid;
    }

    /**
     * @notice Helper getter for document owner address.
     */
    function getFileOwner(string memory _fileId) external view returns (address) {
        require(files[_fileId].exists, "FileRegistry: File record does not exist");
        return files[_fileId].owner;
    }

    /**
     * @notice Returns total number of registered files on-chain.
     */
    function getFileCount() external view returns (uint256) {
        return fileIds.length;
    }
}
