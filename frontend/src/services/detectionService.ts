import httpClient from "./httpclient";
import { handleApiError } from "./error";
import { extractBase64Data } from "@/utils/imageUtils";
import type {
  FaceDetectionResponse,
  FaceDetectionRequest,
} from "@/types/detection";

/**
 * Envía un frame en base64 al backend para detección de rostros
 * @param base64Image - Imagen en formato base64 (puede incluir prefijo data:image/... o ser base64 puro)
 * @returns Promise con la respuesta de detección
 * @throws ApiError si la petición falla
 */
export async function enviarFrameAlBackend(
  base64Image: string
): Promise<FaceDetectionResponse> {
  try {
    // Extraer datos base64 puros (remover prefijo si existe)
    const base64Data = extractBase64Data(base64Image);

    const requestBody: FaceDetectionRequest = {
      image: base64Data,
    };

    const response = await httpClient.post<FaceDetectionResponse>(
      "/detect/face",
      requestBody
    );

    // Imprimir respuesta de la API en consola
    //console.log("Respuesta de la API:", response.data);

    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
