const ipfsService = require("../src/services/ipfs/ipfs.service");
const axios = require("axios");

jest.mock("axios");

describe("IPFS Storage Service Unit Tests (Mocked API)", () => {
  const sampleEncryptedPayload = Buffer.from(
    "3f8a9b2c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a"
  );
  const mockCid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PINATA_JWT = "mock_valid_pinata_jwt_token_12345";
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("1. Should upload encrypted buffer and return IPFS CID", async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        IpfsHash: mockCid,
        PinSize: 12345,
        Timestamp: new Date().toISOString()
      }
    });

    const cid = await ipfsService.uploadEncryptedFile(sampleEncryptedPayload, {
      fileName: "test_encrypted.bin",
      fileId: "file_uuid_100"
    });

    expect(cid).toBe(mockCid);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock_valid_pinata_jwt_token_12345"
        })
      })
    );
  });

  it("2. Should reject empty or non-buffer upload attempts with BadRequestError", async () => {
    await expect(ipfsService.uploadEncryptedFile(null)).rejects.toThrow("Encrypted binary buffer is required");
    await expect(ipfsService.uploadEncryptedFile(Buffer.from(""))).rejects.toThrow("empty file");
  });

  it("3. Should reject upload if file size exceeds limit (50MB)", async () => {
    const oversizedBuffer = Buffer.alloc(51 * 1024 * 1024); // 51 MB

    await expect(ipfsService.uploadEncryptedFile(oversizedBuffer)).rejects.toThrow(
      "exceeds maximum permitted limit"
    );
  });

  it("4. Should fetch encrypted binary payload Buffer from IPFS gateway", async () => {
    axios.get.mockResolvedValueOnce({
      data: sampleEncryptedPayload
    });

    const downloadedBuffer = await ipfsService.downloadEncryptedFile(mockCid);

    expect(Buffer.isBuffer(downloadedBuffer)).toBe(true);
    expect(downloadedBuffer.equals(sampleEncryptedPayload)).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      `https://gateway.pinata.cloud/ipfs/${mockCid}`,
      expect.objectContaining({ responseType: "arraybuffer" })
    );
  });

  it("5. Should handle gateway timeout error cleanly", async () => {
    const timeoutError = new Error("IPFS fetch request timed out.");
    timeoutError.code = "ECONNABORTED";
    axios.get.mockRejectedValueOnce(timeoutError);

    await expect(ipfsService.downloadEncryptedFile("QmTimeoutTestCid")).rejects.toThrow(
      "IPFS fetch request timed out"
    );
  });

  it("6. Should unpin file record successfully", async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });

    const success = await ipfsService.unpinFile(mockCid);
    expect(success).toBe(true);
    expect(axios.delete).toHaveBeenCalledWith(
      `https://api.pinata.cloud/pinning/unpin/${mockCid}`,
      expect.anything()
    );
  });

  it("7. SECURITY CHECK: Credentials must never be returned or exposed in API response structures", () => {
    const headers = ipfsService.getAuthHeaders();
    expect(headers).toBeDefined();
    expect(headers.Authorization).toBeDefined();
    expect(headers.PINATA_JWT).toBeUndefined(); // Raw credential property name must not leak
  });
});

// Live Integration Test Path (Only runs if valid non-placeholder Pinata JWT is configured in environment)
describe("Pinata IPFS Live Integration Test Path", () => {
  const hasLiveJwt =
    process.env.PINATA_JWT &&
    process.env.PINATA_JWT.length > 50 &&
    !process.env.PINATA_JWT.startsWith("your_");

  if (!hasLiveJwt) {
    it.skip("Live Pinata integration test skipped (no live PINATA_JWT configured)", () => {});
  } else {
    it("Should execute end-to-end upload, fetch, and unpin on real Pinata network", async () => {
      jest.unmock("axios");
      const realAxios = jest.requireActual("axios");
      axios.post = realAxios.post;
      axios.get = realAxios.get;
      axios.delete = realAxios.delete;

      const testPayload = Buffer.from(`Live_IPFS_Test_Payload_${Date.now()}`);

      // 1. Live Upload
      const cid = await ipfsService.uploadEncryptedFile(testPayload, {
        fileName: "live_test.bin"
      });
      expect(cid).toBeDefined();
      expect(typeof cid).toBe("string");

      // 2. Live Fetch
      const fetchedBuffer = await ipfsService.downloadEncryptedFile(cid);
      expect(fetchedBuffer.equals(testPayload)).toBe(true);

      // 3. Live Unpin Cleanup
      const unpinned = await ipfsService.unpinFile(cid);
      expect(unpinned).toBe(true);
    });
  }
});
