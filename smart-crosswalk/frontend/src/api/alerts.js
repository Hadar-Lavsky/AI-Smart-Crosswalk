import api from './config';

export const alertsApi = {
  // Get all alerts
  getAll: async (params = {}) => {
    return api.get('/alerts', { params });
  },

  // Get single alert
  getById: async (id) => {
    return api.get(`/alerts/${id}`);
  },

  // Create alert (from YOLO detection)
  create: async (data) => {
    return api.post('/alerts', data);
  },

  // Update alert
  update: async (id, data) => {
    return api.patch(`/alerts/${id}`, data);
  },

  // Delete alert
  delete: async (id) => {
    return api.delete(`/alerts/${id}`);
  },

  // Get statistics
  getStats: async () => {
    return api.get('/alerts/stats');
  }
};
