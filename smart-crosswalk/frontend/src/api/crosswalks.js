import api from './config';

export const crosswalksApi = {
  // Get all crosswalks
  getAll: async (params = {}) => {
    return api.get('/crosswalks', { params });
  },

  // Get single crosswalk
  getById: async (id) => {
    return api.get(`/crosswalks/${id}`);
  },

  // Create crosswalk
  create: async (data) => {
    return api.post('/crosswalks', data);
  },

  // Update crosswalk
  update: async (id, data) => {
    return api.patch(`/crosswalks/${id}`, data);
  },

  // Delete crosswalk
  delete: async (id) => {
    return api.delete(`/crosswalks/${id}`);
  },

  // Get statistics
  getStats: async () => {
    return api.get('/crosswalks/stats');
  },

  // Link camera to crosswalk
  linkCamera: async (id, cameraId) => {
    return api.patch(`/crosswalks/${id}/camera`, { cameraId });
  },

  // Unlink camera from crosswalk
  unlinkCamera: async (id) => {
    return api.delete(`/crosswalks/${id}/camera`);
  },

  // Link LED to crosswalk
  linkLED: async (id, ledId) => {
    return api.patch(`/crosswalks/${id}/led`, { ledId });
  },

  // Unlink LED from crosswalk
  unlinkLED: async (id) => {
    return api.delete(`/crosswalks/${id}/led`);
  },

  // Search crosswalks
  search: async (query, limit = 10) => {
    return api.get('/crosswalks/search', { 
      params: { q: query, limit } 
    });
  },

  // Get alerts for specific crosswalk
  getAlerts: async (id, filters = {}) => {
    return api.get(`/crosswalks/${id}/alerts`, { params: filters });
  },

  // Get statistics for specific crosswalk
  getCrosswalkStats: async (id) => {
    return api.get(`/crosswalks/${id}/stats`);
  }
};
