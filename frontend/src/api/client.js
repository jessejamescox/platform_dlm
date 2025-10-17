/**
 * API Client for WAGO DLM Backend
 */

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

async function request(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Stations API
export const stationsAPI = {
  getAll: () => request('/stations'),
  getById: (id) => request(`/stations/${id}`),
  create: (data) => request('/stations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/stations/${id}`, { method: 'DELETE' }),
  setPower: (id, power) => request(`/stations/${id}/power`, {
    method: 'POST',
    body: JSON.stringify({ power })
  }),
  startSession: (id, user) => request(`/stations/${id}/session/start`, {
    method: 'POST',
    body: JSON.stringify({ user })
  }),
  stopSession: (id) => request(`/stations/${id}/session/stop`, { method: 'POST' })
};

// Load Management API
export const loadAPI = {
  getStatus: () => request('/load/status'),
  getCapacity: () => request('/load/capacity'),
  setLimits: (limits) => request('/load/limits', {
    method: 'POST',
    body: JSON.stringify(limits)
  }),
  getHistory: (limit) => request(`/load/history?limit=${limit || 10}`),
  rebalance: () => request('/load/rebalance', { method: 'POST' })
};

// Energy API
export const energyAPI = {
  getStatus: () => request('/energy/status'),
  getPV: () => request('/energy/pv'),
  simulatePV: () => request('/energy/pv/simulate', { method: 'POST' }),
  setPVProduction: (production) => request('/energy/pv/production', {
    method: 'POST',
    body: JSON.stringify({ production })
  }),
  getConsumption: () => request('/energy/consumption'),
  getCosts: () => request('/energy/costs')
};

// Schedules API
export const schedulesAPI = {
  getAll: () => request('/schedules'),
  getById: (id) => request(`/schedules/${id}`),
  create: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/schedules/${id}`, { method: 'DELETE' })
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => request('/analytics/overview'),
  getStations: () => request('/analytics/stations'),
  getZones: () => request('/analytics/zones')
};

// System API
export const systemAPI = {
  getInfo: () => request('/system/info'),
  getHealth: () => fetch(API_BASE.replace('/api', '') + '/health').then(r => r.json())
};
