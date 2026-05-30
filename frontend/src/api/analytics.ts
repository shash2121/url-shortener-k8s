import axios from 'axios';

const API_BASE = import.meta.env.VITE_ANALYTICS_URL || '';

export async function getAnalytics(code: string) {
  const response = await axios.get(`${API_BASE}/analytics/${code}`);
  return response.data;
}
