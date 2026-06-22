import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

import { createClientSupabase } from "@/utils/supabase/client";

// Interceptor de peticiones para agregar el token
api.interceptors.request.use(
    async (config) => {
        try {
            // Usar metodo oficial para obtener sesión
            const supabase = createClientSupabase();
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.warn("Error attaching auth token", e);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para debugging (opcional)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
