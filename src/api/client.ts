import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1/',
  withCredentials: true,
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const authAxios = axios.create({ withCredentials: true });

export default apiClient;
