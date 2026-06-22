"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { MFAService } from "@/services/auth/mfaService";

type Step = 1 | 2; // 1: escanear QR, 2: ingresar código

interface MFAActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MFAActivationModal({
  isOpen,
  onClose,
  onSuccess,
}: MFAActivationModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [factorId, setFactorId] = useState<string>("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [mounted, setMounted] = useState(false);
  const verificationSuccessRef = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const factorIdRef = useRef<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Inicializar MFA solo una vez cuando se abre el modal
  useEffect(() => {
    if (!isOpen || factorId) return;

    const initializeMFA = async () => {
      setIsLoading(true);
      setError("");
      setStep(1);

      try {
        const result = await MFAService.enrollMFA();

        setQrCode(result.qr_code);
        setSecret(result.secret);
        setFactorId(result.factorId);
        factorIdRef.current = result.factorId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error al inicializar MFA";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMFA();
  }, [isOpen, factorId]);

  const goToStep2 = () => {
    setError("");
    setStep(2);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const goToStep1 = () => {
    setError("");
    setCode(["", "", "", "", "", ""]);
    setStep(1);
  };

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

    const currentFactorId = factorId || factorIdRef.current;

    if (!currentFactorId) {
      setError(
        "Error: No se encontró el factor MFA. Por favor, cierra este modal e intenta activar nuevamente."
      );
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      await MFAService.verifyMFA(currentFactorId, codeString);
      verificationSuccessRef.current = true;
      
      // Pequeño delay para mejor UX antes de cerrar
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al verificar código";
      setError(errorMessage);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = async () => {
    // Si hay un factorId pero NO se verificó exitosamente, eliminarlo
    const currentFactorId = factorId || factorIdRef.current;
    if (currentFactorId && !verificationSuccessRef.current) {
      try {
        await MFAService.unenrollFactor(currentFactorId);
      } catch (err) {
        console.error("Error al eliminar factor no verificado:", err);
      }
    }

    setStep(1);
    setCode(["", "", "", "", "", ""]);
    setError("");
    setQrCode("");
    setSecret("");
    setFactorId("");
    factorIdRef.current = "";
    setShowSecret(false);
    verificationSuccessRef.current = false;
    setIsLoading(false);
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-4">
                sync
              </span>
              <p className="text-gray-600">
                Inicializando autenticación de dos factores...
              </p>
            </div>
          ) : step === 1 ? (
            /* ——— Paso 1: Escanear QR ——— */
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4 w-full justify-center">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="w-2 h-2 rounded-full bg-gray-200" />
              </div>
              <div className="mb-4 flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">qr_code_2</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Escanear código QR
              </h2>
              <p className="text-gray-500 text-sm text-center mb-6">
                Abre tu app de autenticación y escanea el código
              </p>

              {qrCode && (
                <div className="mb-5 p-4 bg-white border-2 border-gray-200 rounded-xl">
                  <img
                    src={qrCode}
                    alt="QR para MFA"
                    className="w-56 h-56 mx-auto"
                  />
                </div>
              )}

              <div className="w-full mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Código de respaldo</span>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-sm text-primary hover:underline"
                  >
                    {showSecret ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {showSecret && secret && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <code className="text-xs font-mono text-gray-700 break-all">{secret}</code>
                  </div>
                )}
              </div>

              <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3 mb-6 w-full">
                <p className="text-sm text-blue-800">
                  <strong>Instrucciones:</strong> Abre Google Authenticator (o similar), escanea el QR y guarda el código de respaldo si lo ves.
                </p>
              </div>

              {error && (
                <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={goToStep2}
                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Ya escaneé, continuar
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          ) : (
            /* ——— Paso 2: Ingresar código ——— */
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4 w-full justify-center">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <div className="mb-4 flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-2xl">pin</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Ingresar código
              </h2>
              <p className="text-gray-500 text-sm text-center mb-6">
                Escribe el código de 6 dígitos de tu app
              </p>

              {error && (
                <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="w-full mb-6">
                <div className="flex justify-center">
                  <fieldset className="flex gap-2 sm:gap-3">
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        className="flex h-12 w-10 sm:h-14 sm:w-12 text-center bg-gray-50 border-b-2 border-gray-300 rounded-t-md focus:border-primary focus:bg-white focus:outline-none text-xl sm:text-2xl font-bold transition-all caret-primary text-gray-900"
                        inputMode="numeric"
                        maxLength={1}
                        type="text"
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        disabled={isVerifying}
                      />
                    ))}
                  </fieldset>
                </div>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying || code.join("").length !== 6}
                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Verificando...
                  </>
                ) : (
                  <>
                    Verificar y Activar
                    <span className="material-symbols-outlined">check</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={goToStep1}
                className="mt-4 text-sm text-gray-500 hover:text-primary"
              >
                Volver a escanear
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
