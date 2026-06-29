import { createClientSupabase } from "@/utils/supabase/client";

export interface MFAEnrollResult {
  qr_code: string;
  secret: string;
  factorId: string;
}

export interface MFAFactor {
  id: string;
  factor_type: string;
  status: string;
  friendly_name?: string;
}

export interface AALLevel {
  currentLevel: "aal1" | "aal2";
  nextLevel: "aal1" | "aal2";
}

/**
 * Servicio para manejar operaciones de Multi-Factor Authentication (MFA)
 * Refactorizado con mejor manejo de errores, tipado y soporte para AAL2
 */
export class MFAService {
  /**
   * Obtener el nivel de autenticación actual (AAL) del usuario
   * @returns Nivel AAL actual y siguiente nivel requerido
   */
  static async getAuthenticatorAssuranceLevel(): Promise<AALLevel> {
    const supabase = createClientSupabase();

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (error) {
      throw new Error(`Error al obtener nivel AAL: ${error.message}`);
    }

    return {
      currentLevel: data.currentLevel as "aal1" | "aal2",
      nextLevel: data.nextLevel as "aal1" | "aal2",
    };
  }

  /**
   * Verificar si el usuario tiene nivel AAL2 (requerido para algunas operaciones)
   * @returns true si el usuario tiene AAL2
   */
  static async hasAAL2(): Promise<boolean> {
    try {
      const aal = await this.getAuthenticatorAssuranceLevel();
      return aal.currentLevel === "aal2";
    } catch (error) {
      console.error("Error al verificar AAL2:", error);
      return false;
    }
  }
  /**
   * Enrollar (activar) un factor TOTP para el usuario
   * @returns Objeto con QR code, secret y factor ID
   */
  static async enrollMFA(): Promise<MFAEnrollResult> {
    const supabase = createClientSupabase();

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    if (error) {
      throw new Error(`Error al activar MFA: ${error.message}`);
    }

    if (!data.totp?.qr_code || !data.totp?.secret || !data.id) {
      throw new Error("Error: datos incompletos del factor MFA");
    }

    return {
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      factorId: data.id,
    };
  }

  /**
   * Verificar un código TOTP durante la activación
   * @param factorId ID del factor a verificar (obtenido del enroll - DEBE estar en memoria)
   * @param code Código de 6 dígitos del autenticador
   * 
   * IMPORTANTE: 
   * - El factorId DEBE venir del enroll() reciente, guardado en el estado del componente
   * - Según la documentación de Supabase, se debe crear un challenge antes de verify
   * - Si el factorId expira o se pierde, hay que empezar de nuevo con enroll()
   */
  static async verifyMFA(factorId: string, code: string): Promise<void> {
    try {
      const supabase = createClientSupabase();

      console.log("Verificando MFA con factorId del enroll:", factorId);

      // PASO 1: Crear un challenge para el factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (challengeError) {
        console.error("Error al crear challenge:", challengeError);
        throw new Error(`Error al crear challenge: ${challengeError.message}`);
      }

      if (!challengeData?.id) {
        throw new Error("Error: No se recibió el challenge ID");
      }

      const challengeId = challengeData.id;
      console.log("Challenge creado exitosamente:", challengeId);

      // PASO 2: Verificar el código usando el challengeId
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeId,
        code: code.toString().trim(), // Asegurar que sea string y sin espacios
      });

      console.log("Respuesta de verify:", {
        hasData: !!data,
        hasError: !!error,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : [],
        errorString: error ? String(error) : null,
        errorMessage: error?.message,
      });

      if (error) {
        // Capturar información completa del error
        const errorInfo = {
          error: error,
          errorMessage: error?.message || "Error desconocido",
          errorStatus: error?.status || "unknown",
          errorName: error?.name || "unknown",
          factorId: factorId,
          challengeId: challengeId,
          fullError: error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2) : "No error object",
        };

        console.error("Error en verifyMFA:", errorInfo);

        const errorMessage = error?.message || "Error desconocido al verificar código";

        // Mensajes de error más específicos
        if (errorMessage.toLowerCase().includes("invalid code") ||
          errorMessage.toLowerCase().includes("invalid") ||
          errorMessage.toLowerCase().includes("incorrect")) {
          throw new Error("El código ingresado es incorrecto. Por favor, verifica que el código de Google Authenticator sea el correcto y que no haya expirado.");
        } else if (errorMessage.toLowerCase().includes("not found") ||
          errorMessage.toLowerCase().includes("challenge")) {
          throw new Error("No se encontró el factor MFA o el challenge. Por favor, intenta activar nuevamente.");
        } else if (errorMessage.toLowerCase().includes("expired")) {
          throw new Error("El código ha expirado. Por favor, ingresa un código nuevo de Google Authenticator.");
        } else {
          throw new Error(`Error al verificar código: ${errorMessage}`);
        }
      }

      // Si hay data, significa que la verificación fue exitosa
      // El factor ahora está activo (verified)
      console.log("MFA verificado exitosamente", { data });

      // Refrescar la sesión para actualizar el AAL
      await supabase.auth.refreshSession();
    } catch (unexpectedError) {
      // Capturar cualquier error inesperado
      console.error("Error inesperado en verifyMFA:", unexpectedError);
      const errorMessage = unexpectedError instanceof Error
        ? unexpectedError.message
        : String(unexpectedError);
      throw new Error(`Error inesperado al verificar código: ${errorMessage}`);
    }
  }

  /**
   * Listar todos los factores MFA del usuario actual
   * @returns Array de factores MFA
   */
  static async listFactors(): Promise<MFAFactor[]> {
    const supabase = createClientSupabase();

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      throw new Error(`Error al listar factores MFA: ${error.message}`);
    }

    return data.totp || [];
  }

  /**
   * Desactivar (unenroll) un factor MFA
   * IMPORTANTE: Para desactivar un factor verificado, el usuario debe tener AAL2
   * Si no tiene AAL2, primero debe verificar su identidad con MFA
   * @param factorId ID del factor a eliminar
   * @param code Código TOTP opcional. Si se proporciona, se verificará antes de desactivar
   */
  static async unenrollFactor(factorId: string, code?: string): Promise<void> {
    const supabase = createClientSupabase();

    // Si se proporciona un código, verificar primero para obtener AAL2
    if (code) {
      try {
        // Obtener el factor para verificar
        const factors = await this.listFactors();
        const factor = factors.find((f) => f.id === factorId);

        if (!factor) {
          throw new Error("No se encontró el factor MFA a desactivar");
        }

        // Verificar el código para obtener AAL2
        await this.challengeAndVerify(factorId, code);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        throw new Error(`Error al verificar código antes de desactivar: ${errorMessage}`);
      }
    }

    // Intentar desactivar el factor
    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      // Si el error es por falta de AAL2, proporcionar mensaje más claro
      if (error.message?.toLowerCase().includes("aal2") ||
        error.message?.toLowerCase().includes("aal")) {
        throw new Error(
          "AAL2_REQUIRED: Se requiere verificar tu identidad con MFA antes de desactivar. " +
          "Por favor, ingresa tu código de autenticación."
        );
      }
      throw new Error(`Error al desactivar MFA: ${error.message}`);
    }
  }

  /**
   * Verificar si el usuario tiene MFA activo
   * @returns true si tiene al menos un factor activo
   */
  static async hasActiveMFA(): Promise<boolean> {
    try {
      const factors = await this.listFactors();
      return factors.length > 0;
    } catch (error) {
      console.error("Error al verificar estado MFA:", error);
      return false;
    }
  }

  /**
   * Obtener el primer factor TOTP activo del usuario
   * @returns El factor activo o null si no hay ninguno
   */
  static async getActiveFactor(): Promise<MFAFactor | null> {
    try {
      const factors = await this.listFactors();
      return factors.length > 0 ? factors[0] : null;
    } catch (error) {
      console.error("Error al obtener factor activo:", error);
      return null;
    }
  }

  /**
   * Challenge y verificar código durante el login o para obtener AAL2
   * @param factorId ID del factor a verificar
   * @param code Código de 6 dígitos del autenticador
   * @returns Sesión completa del usuario (si está disponible)
   */
  static async challengeAndVerify(factorId: string, code: string) {
    const supabase = createClientSupabase();

    // El login puede requerir un challenge previo antes de validar el código.
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.toString().trim(),
    });

    if (error) {
      const errorMessage = error.message || "Error desconocido";

      // Mensajes de error más específicos
      if (errorMessage.toLowerCase().includes("invalid code") ||
        errorMessage.toLowerCase().includes("invalid") ||
        errorMessage.toLowerCase().includes("incorrect")) {
        throw new Error("El código ingresado es incorrecto. Por favor, verifica que el código sea el correcto.");
      } else if (errorMessage.toLowerCase().includes("expired")) {
        throw new Error("El código ha expirado. Por favor, ingresa un código nuevo.");
      }

      throw new Error(`Error al verificar código MFA: ${errorMessage}`);
    }

    // La sesión puede no estar disponible en todos los contextos (ej: durante desactivación)
    // Por eso no lanzamos error si no hay sesión, solo la retornamos si existe
    // Obtener la sesión actual después de la verificación
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session;
  }

  /**
   * Verificar código para obtener AAL2 sin necesidad de sesión completa
   * Útil para operaciones que requieren AAL2 pero no necesitan una nueva sesión
   * @param factorId ID del factor a verificar
   * @param code Código de 6 dígitos del autenticador
   */
  static async verifyForAAL2(factorId: string, code: string): Promise<void> {
    const supabase = createClientSupabase();

    // Crear challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      throw new Error(`Error al crear challenge: ${challengeError.message}`);
    }

    if (!challengeData?.id) {
      throw new Error("Error: No se recibió el challenge ID");
    }

    // Verificar código
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.toString().trim(),
    });

    if (verifyError) {
      const errorMessage = verifyError.message || "Error desconocido";

      if (errorMessage.toLowerCase().includes("invalid code") ||
        errorMessage.toLowerCase().includes("invalid") ||
        errorMessage.toLowerCase().includes("incorrect")) {
        throw new Error("El código ingresado es incorrecto. Por favor, verifica que el código sea el correcto.");
      } else if (errorMessage.toLowerCase().includes("expired")) {
        throw new Error("El código ha expirado. Por favor, ingresa un código nuevo.");
      }

      throw new Error(`Error al verificar código: ${errorMessage}`);
    }

    // Refrescar la sesión para actualizar el AAL
    await supabase.auth.refreshSession();
  }
}
