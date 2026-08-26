import api from "./api";

class FileService {
  /**
   * Uploads & encrypts PDF document via backend pipeline.
   * 
   * @param {FormData} formData - Multipart form containing 'file'
   * @param {Function} [onProgress] - Upload progress callback
   */
  async uploadFile(formData, onProgress) {
    const response = await api.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
    return response.data;
  }

  /**
   * Fetches paginated files accessible to the user.
   * 
   * @param {object} [params] - Query options: { page, limit, search }
   */
  async getFiles(params = {}) {
    const response = await api.get("/files", { params });
    return response.data;
  }

  /**
   * Fetches safe file metadata & on-chain state for a specific file.
   * 
   * @param {string} fileId - Public file UUID
   */
  async getFile(fileId) {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  }

  /**
   * Performs on-demand SHA-256 integrity audit against Ethereum smart contract WITHOUT decrypting file.
   * 
   * @param {string} fileId - Public file UUID
   */
  async verifyFile(fileId) {
    const response = await api.get(`/files/${fileId}/verify`);
    return response.data;
  }

  /**
   * Downloads original decrypted PDF payload following pre-decryption integrity verification.
   * Returns Axios response with responseType: 'blob'.
   * 
   * @param {string} fileId - Public file UUID
   */
  async downloadFile(fileId) {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: "blob"
    });
    return response;
  }

  /**
   * Deletes file and unpins from IPFS (Owner only).
   * 
   * @param {string} fileId - Public file UUID
   */
  async deleteFile(fileId) {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  }

  /**
   * DEMO UTILITY: Simulates 1-byte file payload corruption on IPFS for demonstration purposes.
   * 
   * @param {string} fileId - Public file UUID
   */
  async simulateTamper(fileId) {
    const response = await api.post(`/files/${fileId}/simulate-tamper`);
    return response.data;
  }

  /**
   * DEMO UTILITY: Resets tampered IPFS payload back to pristine condition.
   * 
   * @param {string} fileId - Public file UUID
   */
  async resetTamper(fileId) {
    const response = await api.post(`/files/${fileId}/reset-tamper`);
    return response.data;
  }
}

export default new FileService();
