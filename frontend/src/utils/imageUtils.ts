/**
 * Extrae los datos base64 puros de una cadena que puede incluir el prefijo data:image/...
 * @param base64Image - Cadena base64 que puede incluir prefijo (ej: "data:image/jpeg;base64,/9j/4AAQ...")
 * @returns Cadena base64 pura sin prefijo (ej: "/9j/4AAQ...")
 */
export function extractBase64Data(base64Image: string): string {
  // Si la cadena incluye una coma, significa que tiene prefijo data:image/...
  if (base64Image.includes(",")) {
    // Retornar solo la parte después de la coma
    return base64Image.split(",")[1];
  }
  // Si no tiene coma, asumir que ya es base64 puro
  return base64Image;
}

