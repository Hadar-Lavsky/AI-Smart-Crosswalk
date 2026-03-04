import api from './config';

export const ledsApi = {
  // Get all LEDs
  getAll: async (params = {}) => {
    return api.get('/leds', { params });
  },

  // Get single LED
  getById: async (id) => {
    return api.get(`/leds/${id}`);
  },

  // Create LED
  create: async (data) => {
    return api.post('/leds', data);
  },

  // Delete LED
  delete: async (id) => {
    return api.delete(`/leds/${id}`);
  }
};
