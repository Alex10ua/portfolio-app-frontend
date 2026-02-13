import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1'; // Adjust if backend runs on different port

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for session cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

export const login = async (username, password) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
        await api.post('/login', params, {
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
    await api.post('/logout');
};

export const getCurrentUser = async () => {
    const response = await api.get('/users/me');
    return response.data;
};

export default api;
