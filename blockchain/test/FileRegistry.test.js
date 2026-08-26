const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FileRegistry Smart Contract Unit Tests", function () {
  let fileRegistry;
  let deployer;
  let user1;
  let user2;

  const validFileId = "file_uuid_99001";
  const validIpfsCid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const validSha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const tamperedHash = "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    const FileRegistryFactory = await ethers.getContractFactory("FileRegistry");
    fileRegistry = await FileRegistryFactory.deploy();
    await fileRegistry.waitForDeployment();
  });

  it("1. Contract deployment: Should assign contractOwner to deployer address", async function () {
    expect(await fileRegistry.contractOwner()).to.equal(deployer.address);
    expect(await fileRegistry.getFileCount()).to.equal(0);
  });

  it("2. File registration: Should successfully register a new file record", async function () {
    await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);

    const count = await fileRegistry.getFileCount();
    expect(count).to.equal(1);
  });

  it("3. Duplicate file rejection: Should revert when registering duplicate fileId", async function () {
    await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);

    await expect(
      fileRegistry.connect(user2).registerFile(validFileId, validIpfsCid, validSha256Hash)
    ).to.be.revertedWith("FileRegistry: Duplicate file registration prohibited");
  });

  it("4. File retrieval: Should retrieve complete file record tuple", async function () {
    await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);

    const [ipfsCid, sha256Hash, owner, timestamp, exists] = await fileRegistry.getFile(validFileId);

    expect(ipfsCid).to.equal(validIpfsCid);
    expect(sha256Hash).to.equal(validSha256Hash);
    expect(owner).to.equal(user1.address);
    expect(timestamp).to.be.greaterThan(0);
    expect(exists).to.be.true;
  });

  it("5. Hash retrieval & Verification: Should verify candidate hash against stored hash", async function () {
    await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);

    // Verify matching hash
    const [isMatch, canonicalHash] = await fileRegistry.verifyFile(validFileId, validSha256Hash);
    expect(isMatch).to.be.true;
    expect(canonicalHash).to.equal(validSha256Hash);

    // Verify tampered hash
    const [isMatchTampered, _] = await fileRegistry.verifyFile(validFileId, tamperedHash);
    expect(isMatchTampered).to.be.false;

    // Helper getter test
    const storedHashOnly = await fileRegistry.getFileHash(validFileId);
    expect(storedHashOnly).to.equal(validSha256Hash);
  });

  it("6. IPFS CID retrieval: Should retrieve correct IPFS CID", async function () {
    await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);

    const cid = await fileRegistry.getIpfsCid(validFileId);
    expect(cid).to.equal(validIpfsCid);
  });

  it("7. Owner verification: Should return registrant address as file owner", async function () {
    await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);

    const fileOwner = await fileRegistry.getFileOwner(validFileId);
    expect(fileOwner).to.equal(user1.address);
    expect(fileOwner).not.to.equal(user2.address);
  });

  it("8. Event emission: Should emit FileRegistered event upon registration", async function () {
    const tx = await fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, validSha256Hash);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    await expect(tx)
      .to.emit(fileRegistry, "FileRegistered")
      .withArgs(validFileId, validIpfsCid, validSha256Hash, user1.address, block.timestamp);
  });

  it("9. Invalid file handling: Should revert on empty strings or invalid hash lengths or non-existent files", async function () {
    // Non-existent file retrieval
    await expect(fileRegistry.getFile("non_existent_id")).to.be.revertedWith(
      "FileRegistry: File record does not exist"
    );

    // Empty fileId
    await expect(
      fileRegistry.connect(user1).registerFile("", validIpfsCid, validSha256Hash)
    ).to.be.revertedWith("FileRegistry: fileId cannot be empty");

    // Empty ipfsCid
    await expect(
      fileRegistry.connect(user1).registerFile(validFileId, "", validSha256Hash)
    ).to.be.revertedWith("FileRegistry: ipfsCid cannot be empty");

    // Invalid SHA-256 hash length (< 64 characters)
    await expect(
      fileRegistry.connect(user1).registerFile(validFileId, validIpfsCid, "too_short_hash")
    ).to.be.revertedWith("FileRegistry: Invalid SHA-256 length, expected 64 hex characters");
  });
});
