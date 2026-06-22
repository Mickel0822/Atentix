"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientSupabase } from "@/utils/supabase/client";
import { MFAService } from "@/services/auth/mfaService";

function TwoAuthForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const factorId = searchParams.get("factorId") || "";
  const router = useRouter();
  const [codes, setCodes] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingFactor, setIsLoadingFactor] = useState(true);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Determinar si es login flow o activación
  const isLoginFlow = !!email && !!factorId;

  useEffect(() => {
    // Si es login flow, verificar que tenemos el factorId
    if (isLoginFlow) {
      setActiveFactorId(factorId);
      setIsLoadingFactor(false);
      inputRefs.current[0]?.focus();
    } else {
      // Si no es login flow, obtener el factor activo del usuario
      loadActiveFactor();
    }
  }, []);

  const loadActiveFactor = async () => {
    try {
      setIsLoadingFactor(true);
      const factor = await MFAService.getActiveFactor();
      if (factor) {
        setActiveFactorId(factor.id);
      } else {
        setError("No tienes autenticación de dos factores activa. Por favor, actívala desde tu perfil.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar factor MFA";
      setError(errorMessage);
    } finally {
      setIsLoadingFactor(false);
      inputRefs.current[0]?.focus();
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Solo permitir números
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
    setError("");

    // Auto-avanzar al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      // Si está vacío y presiona backspace, ir al anterior
      inputRefs.current[index - 1]?.focus();
      const newCodes = [...codes];
      newCodes[index - 1] = "";
      setCodes(newCodes);
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCodes = pastedData.split("").slice(0, 6);
      while (newCodes.length < 6) {
        newCodes.push("");
      }
      setCodes(newCodes);
      // Focus en el último input con valor o el siguiente vacío
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = codes.join("");
    if (code.length !== 6) {
      setError("Por favor, ingresa el código completo de 6 dígitos.");
      return;
    }

    if (!activeFactorId) {
      setError("Error: no se encontró un factor MFA activo. Por favor, intenta nuevamente.");
      return;
    }

    setIsVerifying(true);

    try {
      // Flujo de verificación MFA para completar login (viene de /login con email+factorId
      // o de middleware con solo factorId vía loadActiveFactor)
      if (isLoginFlow || activeFactorId) {
        await MFAService.challengeAndVerify(activeFactorId, code);

        const supabase = createClientSupabase();
        await supabase.auth.refreshSession();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("No se pudo obtener la sesión. Intenta iniciar sesión de nuevo.");
        }

        const userRole = session.user?.app_metadata?.role as number | undefined;
        if (userRole === 1) {
          window.location.href = "/admin";
        } else if (userRole === 2) {
          window.location.href = "/profesor";
        } else if (userRole === 3) {
          window.location.href = "/estudiante";
        } else {
          window.location.href = "/";
        }
      } else {
        setError("No se encontró un factor MFA. Actívalo desde tu perfil o inicia sesión de nuevo.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al verificar código MFA";
      setError(errorMessage);
      // Limpiar código en caso de error
      setCodes(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-background-light min-h-screen h-screen flex flex-col md:flex-row font-display text-slate-900 selection:bg-primary/30 antialiased overflow-hidden">
      {/* Left Section: Visual/Hero */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-5/12 xl:w-1/3 flex-col justify-between bg-primary overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            alt="Modern university campus building with students walking"
            className="h-full w-full object-cover opacity-40 mix-blend-overlay"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKsQrFNP4SMuMPTy2NZu0bdz6gmLRqGYKP5jJDFULm7mkol3UGt7j2nv-peCHo6IK63zd36RHa60IwsF-aot0FtwAESzrtmeok4Nrd1Ria9_JnFD3OeRYupIsyjyzqPvZm7lSugsjrbBsjhrs5_7iiOms-cCKUh02MwoYqEXTi2zFUZtKvnF8jnWF_xRPWOE_bWd20gP_VJn1W5Ko9KEouq09ur6GJftD3tIbv-XRYCKNfmTJj8GX5W0XKS11dmYQ6QN0P_PHXmXg"
            fill
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/90 mix-blend-multiply"></div>
        </div>
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col h-full justify-between p-12">
          {/* Brand Logo (Light Version) */}
          <div className="flex items-center gap-3 text-white">
            <div className="size-8 rounded bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <span className="material-symbols-outlined text-white text-xl">
                school
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">EduXriva</h2>
          </div>
          <div className="mb-12">
            <blockquote className="text-2xl font-medium text-white leading-relaxed mb-6">
              &ldquo;La seguridad es fundamental. Protege tu cuenta con autenticación
              de dos factores.&rdquo;
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <Image
                  alt="Student profile"
                  className="rounded-full border-2 border-primary object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqT_a3tdeMJa4tRJMWim1m_su-lwHvsGDt4S33bNtbtreHea1ONkPxAAsxSy0AgfJm1gKiiU5eDBJAlqcuBl84AgxzxyBe-FTMUw1ZjT2jEGE09OS9Vz5hZ-f8bSVvbwnEEu0RuwIsXQOgDlNkdncp3wuSoljTR0F4FHLLnkIIZRGi3NL-84BYuZd18MfxE7Vdd-8QehIqYrwxlWEjEaBlRsG4AEnq1MV8IcS7g8BWDWk2UdXRlflKCP4Y5gIQ2Zx5EP16QsbDj48"
                  width={40}
                  height={40}
                  unoptimized
                />
                <Image
                  alt="Professor profile"
                  className="rounded-full border-2 border-primary object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEofLcQxxu8BfmSrPjmaVvVpQIGtV8hbLae937EIww8DDqk9WNf7RKByda9o7c3woUpVCT1WvOfbLFabhUyeuHjXvQ0z-z9uVKM8RQf9u9NTI1XyQV69Od6cHvbFNvaP8HhBwG2JZzAyBbDHV4QXKoQSH6NlH_haqRKQu5mBw7KnqhmHxf24wQyoNtPnHs3unfh-yItyjqVGr3LLSIPevrcrgihP9RU9-GKR0t04I6sEMVJNcw1EmzJi6Ych2cUHwwxM_hpRlrSb4"
                  width={40}
                  height={40}
                  unoptimized
                />
                <Image
                  alt="Admin profile"
                  className="rounded-full border-2 border-primary object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFRk9zRo-tJ8tpmjaYnoQhpJ-6asQg3fcuIa0TQUYufe9fEg9RtoB8_BYnfIg__8qHsXBXYYGrQb7yt0DeIaxOK-YgRE_vFnJvXjUtA5_CktP9qcsv8za47nHRBrFl3kN9BItQ_Ejg_n8x5bf3_0TfHUiNDX_GpFUCbnj8sl2xIreaSF2LKDWVCSpKe-D17rOKW8M2Z1nLqfSEfCm_ZFs550jUiFimoo5R6PvqjEDd2zsckV1oNBSyq3BP_Xw2T3x-EXGHNXBRdXk"
                  width={40}
                  height={40}
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Right Section: 2FA Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto h-full">
        {/* Mobile Header (Logo) */}
        <div className="md:hidden absolute top-6 left-6 flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-3xl">school</span>
          <span className="text-xl font-bold text-slate-900">
            EduXriva
          </span>
        </div>
        <div className="w-full max-w-[480px] flex flex-col items-center justify-center">
          <div className="relative w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary"></div>
            <form
              className="flex flex-col items-center p-8 md:p-10 pt-12"
              onSubmit={handleSubmit}
            >
              <div className="mb-6 flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[32px]">
                  lock_person
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center mb-2">
                <h1 className="text-slate-900 text-3xl md:text-4xl font-bold leading-tight tracking-tight">
                  Autenticación de Dos Factores
                </h1>
                <p className="text-slate-500 text-base">
                  Asegura tu cuenta
                </p>
              </div>
              <p className="text-slate-600 text-sm md:text-base font-normal leading-relaxed text-center px-2 mb-8 mt-2">
                Por favor ingresa el código de 6 dígitos generado por tu
                aplicación{" "}
                <span className="font-semibold text-primary">
                  Google Authenticator
                </span>{" "}
                para verificar tu identidad.
              </p>

              {/* Loading State */}
              {isLoadingFactor && (
                <div className="w-full mb-4 flex items-center justify-center py-4">
                  <span className="material-symbols-outlined text-primary animate-spin mr-2">
                    sync
                  </span>
                  <p className="text-gray-600">Cargando...</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="w-full mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {!isLoadingFactor && (
                <>
                  <div className="flex justify-center w-full mb-8">
                    <fieldset className="flex gap-2 sm:gap-3">
                      {codes.map((code, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          className="flex h-12 w-10 sm:h-14 sm:w-12 text-center bg-slate-50 border-b-2 border-slate-300 rounded-t-md focus:border-primary focus:bg-white focus:outline-none text-xl sm:text-2xl font-bold transition-all caret-primary text-slate-900"
                          inputMode="numeric"
                          maxLength={1}
                          type="text"
                          value={code}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          disabled={isVerifying}
                        />
                      ))}
                    </fieldset>
                  </div>
                  <button
                    type="submit"
                    disabled={isVerifying || codes.join("").length !== 6}
                    className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary hover:bg-blue-700 text-white text-base font-bold leading-normal transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <>
                        <span className="material-symbols-outlined text-lg mr-2 animate-spin">
                          sync
                        </span>
                        <span className="truncate">Verificando...</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate">Verificar Identidad</span>
                        <span className="material-symbols-outlined text-lg ml-2">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </>
              )}
              <div className="mt-6 flex flex-col items-center gap-4 w-full">
                <Link
                  className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors text-sm font-medium"
                  href="/login"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>
                  Volver al Inicio de Sesión
                </Link>
              </div>
            </form>
          </div>
          <p className="mt-8 text-center text-slate-500 text-sm">
            ¿Necesitas ayuda?{" "}
            <a
              className="font-semibold text-primary hover:text-blue-700 transition-colors"
              href="#"
            >
              Contactar Soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TwoAuthPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <TwoAuthForm />
    </Suspense>
  );
}
