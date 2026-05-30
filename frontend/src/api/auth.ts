import axios from 'axios';

const API_BASE = import.meta.env.VITE_AUTH_URL || '/auth';

export async function signup(email: string, password: string) {
  const response = await axios.post(`${API_BASE}/signup`, { email, password });
  return response.data;
}

export async function login(email: string, password: string) {
  const response = await axios.post(`${API_BASE}/login`, { email, password });
  return response.data;
}

export async function refresh() {
  const response = await axios.post(`${API_BASE}/refresh`, {}, { withCredentials: true });
  return response.data;
}
