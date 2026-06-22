"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MFAService } from "@/services/auth/mfaService";

interface MFADeactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  factorId: string;
}

export default function MFADeactivationModal({
  isOpen,
  onClose,
  onSuccess,
  factorId,
}: MFADeactivationModalProps) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Limpiar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCode(["", "", "", "", "", ""]);
      setError("");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-avanzar al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verificar cuando se complete el código
    if (value && index === 5) {
      const codeString = newCode.join("");
      if (codeString.length === 6) {
        setTimeout(() => handleVerify(), 300);
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = "";
      setCode(newCode);
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && code.join("").length === 6) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split("").slice(0, 6);
      while (newCode.length < 6) {
        newCode.push("");
      }
      setCode(newCode);
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();

      // Auto-verificar si el código está completo
      if (pastedData.length === 6) {
        setTimeout(() => handleVerify(), 300);
      }
    }
  };

  const handleVerify = async () => {
    const codeString = code.join("");
    if (codeString.length !== 6) return;

    setIsVerifying(true);
    setError("");

    try {
      // Verificar código para obtener AAL2
      await MFAService.verifyForAAL2(factorId, codeString);
      
      // Ahora desactivar el factor
      await MFAService.unenrollFactor(factorId);
      
      onSuccess();
      handleClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al verificar código";
      setError(errorMessage);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    // Limpiar estado
    setCode(["", "", "", "", "", ""]);
    setError("");
    setIsVerifying(false);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="p-6">
          <div className="flex flex-col items-center">
            <div className="mb-6 flex items-center justify-center size-16 rounded-full bg-red-100 text-red-600">
              <span className="material-symbols-outlined text-[32px]">
                lock_open
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Desactivar Autenticación de Dos Factores
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Por seguridad, necesitamos verificar tu identidad antes de desactivar 2FA.
              Ingresa el código de tu aplicación autenticadora.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 w-full">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">⚠️ Advertencia:</span>
                <br />
                Al desactivar 2FA, tu cuenta será menos segura. Asegúrate de que realmente quieres hacerlo.
              </p>
            </div>

            {error && (
              <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="w-full mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Código de verificación
              </label>
              <div className="flex justify-center">
                <fieldset className="flex gap-2 sm:gap-3">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      className="flex h-12 w-10 sm:h-14 sm:w-12 text-center bg-gray-50 border-b-2 border-gray-300 rounded-t-md focus:border-red-500 focus:bg-white focus:outline-none text-xl sm:text-2xl font-bold transition-all caret-red-500 text-gray-900"
                      inputMode="numeric"
                      maxLength={1}
                      type="text"
                      value={digit}
                      onChange={(e) =>
                        handleCodeChange(index, e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      disabled={isVerifying}
                    />
                  ))}
                </fieldset>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleClose}
                disabled={isVerifying}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerify}
                disabled={isVerifying || code.join("").length !== 6}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      sync
                    </span>
                    Verificando...
                  </>
                ) : (
                  <>
                    Desactivar 2FA
                    <span className="material-symbols-outlined">lock_open</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
