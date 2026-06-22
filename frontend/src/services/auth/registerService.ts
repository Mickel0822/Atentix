import httpClient from "../httpclient";
import { handleApiError } from "../error";

/**
 * Interfaz para la petición de registro
 */
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: number; // 1, 2 o 3 según constraint de la base de datos
}

/**
 * Interfaz para los datos del usuario en la respuesta
 */
export interface UserResponse {
  user_id: string;
  email: string;
  full_name: string;
  role: number;
  confirmed: boolean;
}

/**
 * Interfaz para la respuesta de registro
 */
export interface RegisterResponse {
  message: string;
  user: UserResponse;
}

/**
 * Registra un nuevo usuario en el sistema
 * @param userData - Datos del usuario a registrar (email, password, full_name, role)
 * @returns Promise con los datos del usuario creado
 * @throws ApiError si la petición falla, el usuario ya existe o los datos son inválidos
 */
export async function register(
  userData: RegisterRequest
): Promise<RegisterResponse> {
  try {
    const response = await httpClient.post<RegisterResponse>(
      "/auth/register",
      userData
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
