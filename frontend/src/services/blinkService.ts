import httpClient from "./httpclient";
import { handleApiError } from "./error";
import { extractBase64Data } from "@/utils/imageUtils";
import type {
  BlinkDetectionResponse,
  BlinkDetectionRequest,
  BlinkCountResponse,
} from "@/types/detection";

/**
 * Envía un frame en base64 al backend para detección de parpadeos
 * @param base64Image - Imagen en formato base64 (puede incluir prefijo data:image/... o ser base64 puro)
 * @returns Promise con la respuesta de detección de parpadeos
 * @throws ApiError si la petición falla
 */
export async function enviarFrameParaParpadeo(
  base64Image: string
): Promise<BlinkDetectionResponse> {
  try {
    // Extraer datos base64 puros (remover prefijo si existe)
    const base64Data = extractBase64Data(base64Image);

    const requestBody: BlinkDetectionRequest = {
      image: base64Data,
    };

    const response = await httpClient.post<BlinkDetectionResponse>(
      "/detect/blink",
      requestBody
    );

    console.log("Respuesta de la API de parpadeos:", response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Obtiene el contador actual de parpadeos del servidor
 * @returns Promise con el contador de parpadeos
 * @throws ApiError si la petición falla
 */
export async function obtenerContadorParpadeos(): Promise<BlinkCountResponse> {
  try {
    const response = await httpClient.get<BlinkCountResponse>(
      "/detect/blink/count"
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * Reinicia el contador de parpadeos en el servidor
 * @returns Promise con el contador de parpadeos (0 después del reset)
 * @throws ApiError si la petición falla
 */
export async function reiniciarContadorParpadeos(): Promise<BlinkCountResponse> {
  try {
    const response = await httpClient.post<BlinkCountResponse>(
      "/detect/blink/reset"
    );

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
