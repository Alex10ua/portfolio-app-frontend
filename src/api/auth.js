import axios from 'axios';

const API_URL = '/api/v1';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Separate instance for Spring Security endpoints (no /api/v1 prefix)
const authAxios = axios.create({
    withCredentials: true,
});

export const login = async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
        await authAxios.post('/login', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            throw new Error("Invalid credentials");
        }
        throw error;
    }
};

export const register = async (userData) => {
    // userData matches Users model: { username, passwordHash, email }
    // Note: Backend expects passwordHash, but it's raw password from frontend
    const response = await api.post('/users/createUser', userData);
    return response.data;
};

export const logout = async () => {
    await authAxios.post('/logout');
};

export const getCurrentUser = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export default api;
