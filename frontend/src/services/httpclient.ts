import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * URL base de la API obtenida de las variables de entorno
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Timeout por defecto para las peticiones (en milisegundos)
 */
const DEFAULT_TIMEOUT = 15000; // 15 segundos

/**
 * Headers comunes para todas las peticiones
 */
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * Configuración por defecto para las peticiones
 */
const DEFAULT_CONFIG: AxiosRequestConfig = {
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: DEFAULT_HEADERS,
};

/**
 * Instancia de axios configurada con valores por defecto
 */
const httpClient: AxiosInstance = axios.create(DEFAULT_CONFIG);

/**
 * Interceptor de peticiones: permite modificar la configuración antes de enviar
 */
httpClient.interceptors.request.use(
  async (config) => {
    // Aquí puedes agregar lógica adicional antes de enviar la petición
    // Por ejemplo: agregar tokens de autenticación, logging, etc.
    try {
      // Intentar obtener la sesión de supabase desde localStorage
      // Nota: Supabase guarda la sesión en localStorage con una clave específica
      // Usaremos un método genérico para buscar cualquier clave que empiece con sb- y termine con -auth-token
      if (typeof window !== 'undefined') {
        const storageKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (storageKey) {
          const sessionData = localStorage.getItem(storageKey);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.access_token) {
              config.headers.Authorization = `Bearer ${session.access_token}`;
            }
          }
        }
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

/**
 * Interceptor de respuestas: permite procesar las respuestas antes de devolverlas
 */
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Aquí puedes agregar lógica adicional para procesar respuestas exitosas
    return response;
  },
  (error) => {
    // Los errores se manejan en el módulo de errores
    return Promise.reject(error);
  }
);

/**
 * Obtiene la URL base de la API
 */
export const getApiBaseUrl = (): string | undefined => {
  return API_BASE_URL;
};

/**
 * Obtiene el timeout por defecto
 */
export const getDefaultTimeout = (): number => {
  return DEFAULT_TIMEOUT;
};

/**
 * Configura un nuevo timeout para el cliente
 */
export const setTimeout = (timeout: number): void => {
  httpClient.defaults.timeout = timeout;
};

/**
 * Agrega o actualiza un header común
 */
export const setHeader = (key: string, value: string): void => {
  httpClient.defaults.headers.common[key] = value;
};

/**
 * Elimina un header común
 */
export const removeHeader = (key: string): void => {
  delete httpClient.defaults.headers.common[key];
};

/**
 * Exporta la instancia configurada de axios
 */
export default httpClient;
