import httpClient from "./httpclient";
import { handleApiError } from "./error";

export interface SaludoResponse {
  mensaje: string;
}

/**
 * Obtiene el saludo del endpoint /check/saludo
 * @returns Promise con el mensaje de saludo
 * @throws ApiError si la petición falla
 */
export async function obtenerSaludo(): Promise<SaludoResponse> {
  try {
    const response = await httpClient.get<SaludoResponse>("/check/saludo");
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
