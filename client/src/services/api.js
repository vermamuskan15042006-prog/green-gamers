const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'gg_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(endpoint, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Unexpected server response' };
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export const api = {
  // Auth & Profile
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  // Plants & Progress Updates
  getPlants: () => request('/plants'),
  getPlantDetails: (id) => request(`/plants/${id}`),
  createPlant: (payload) =>
    request('/plants', {
      method: 'POST',
      body: payload instanceof FormData ? payload : JSON.stringify(payload)
    }),
  updatePlant: (id, payload) =>
    request(`/plants/${id}`, {
      method: 'PUT',
      body: payload instanceof FormData ? payload : JSON.stringify(payload)
    }),
  deletePlant: (id) => request(`/plants/${id}`, { method: 'DELETE' }),
  getPlantUpdates: (id) => request(`/plants/${id}/updates`),
  addPlantUpdate: (id, formData) =>
    request(`/plants/${id}/updates`, { method: 'POST', body: formData }),

  // Green-Sense AI
  diagnosePlant: (payload) =>
    request('/ai/diagnose', {
      method: 'POST',
      body: payload instanceof FormData ? payload : JSON.stringify(payload)
    }),

  // Smart Location Advisor & Weather Care
  getLocationAdvisor: (lat, lng) =>
    request(`/location/advisor?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
  getWeatherCare: (location) =>
    request(
      location
        ? `/location/weather-care?location=${encodeURIComponent(location)}`
        : '/location/weather-care'
    ),

  // Gamification & Reminders
  getDashboard: () => request('/gamification/dashboard'),
  getReminders: () => request('/gamification/reminders'),
  createReminder: (payload) =>
    request('/gamification/reminders', { method: 'POST', body: JSON.stringify(payload) }),
  completeReminder: (id) =>
    request(`/gamification/reminders/${id}/complete`, { method: 'PATCH' }),
  deleteReminder: (id) =>
    request(`/gamification/reminders/${id}`, { method: 'DELETE' }),
  joinChallenge: (challengeId) =>
    request(`/gamification/challenges/${challengeId}/join`, { method: 'POST' }),
  getLeaderboard: () => request('/gamification/leaderboard'),
  getRewards: () => request('/gamification/rewards'),

  // Eco-Academy Courses
  getCourses: () => request('/courses'),
  unlockCourse: (slug) => request(`/courses/${slug}/unlock`, { method: 'POST' }),
  completeCourse: (slug) => request(`/courses/${slug}/complete`, { method: 'POST' }),

  // Plant Communities
  getCommunities: () => request('/communities'),
  joinCommunity: (slug) => request(`/communities/${slug}/join`, { method: 'POST' }),
  leaveCommunity: (slug) => request(`/communities/${slug}/leave`, { method: 'POST' }),
  createCommunityPost: (slug, payload) =>
    request(`/communities/${slug}/posts`, { method: 'POST', body: JSON.stringify(payload) }),

  // NGO / Plantation Groups
  getNgoOverview: () => request('/ngo/overview'),
  createDrive: (payload) =>
    request('/ngo/drives', { method: 'POST', body: JSON.stringify(payload) }),
  logDriveBatch: (driveId, payload) =>
    request(`/ngo/drives/${driveId}/batches`, { method: 'POST', body: JSON.stringify(payload) })
};

export default api;
