"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClientSupabase } from "@/utils/supabase/client";
import { MFAService } from "@/services/auth/mfaService";
import Alert from "@/components/Alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | undefined>();
  const [alertDetail, setAlertDetail] = useState<string | undefined>();
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClientSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Manejar errores de Supabase
        let errorMessage = "Error al iniciar sesión";
        let errorDetail = error.message;

        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid")
        ) {
          errorMessage = "Email o contraseña incorrectos";
          errorDetail = "";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Email no confirmado";
          errorDetail =
            "Por favor, verifica tu correo electrónico antes de iniciar sesión";
        } else if (error.message.includes("User is banned")) {
          // Custom message for banned/deleted users
          errorMessage = "Su usuario ha sido eliminado. Comuniquese con el administrador.";
          errorDetail = "Acceso denegado permanentemente.";
        }

        setError(errorMessage);
        setAlertMessage(errorMessage);
        setAlertDetail(errorDetail);
        setAlertType("error");
        setIsAlertOpen(true);
        return;
      }

      // Si hay sesión: comprobar si se requiere MFA (getAuthenticatorAssuranceLevel)
      // Con MFA activo, signInWithPassword devuelve sesión AAL1; nextLevel aal2 => redirigir a /twoauth
      if (data.session) {
        // Verificar estado lógico del usuario antes de proceder
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("ctr_estado, is_active")
          .eq("user_id", data.user.id)
          .single();

        if (profileData) {
          let errorMsg = "";

          if (profileData.ctr_estado === 0) {
            errorMsg = "Su usuario ha sido eliminado. Comuniquese con el administrador.";
          } else if (profileData.is_active === false) {
            errorMsg = "Su usuario se encuentra inactivo. Comuniquese con el administrador.";
          }

          if (errorMsg) {
            await supabase.auth.signOut();
            setError(errorMsg);
            setAlertMessage(errorMsg);
            setAlertDetail("Acceso denegado.");
            setAlertType("error");
            setIsAlertOpen(true);
            setIsLoading(false);
            return;
          }
        }

        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        const needsMFA =
          !aalError &&
          aalData?.nextLevel === "aal2" &&
          aalData?.currentLevel !== "aal2";

        if (needsMFA) {
          const { data: factorsData, error: factorsError } =
            await supabase.auth.mfa.listFactors();

          if (!factorsError && factorsData?.totp?.length) {
            const factorId = factorsData.totp[0].id;
            router.push(
              `/twoauth?email=${encodeURIComponent(email)}&factorId=${encodeURIComponent(factorId)}`
            );
            return;
          }
          setError("No se encontró un factor MFA. Contacta a soporte.");
          setAlertMessage("Error en autenticación de dos factores");
          setAlertDetail("No se encontró un factor MFA configurado.");
          setAlertType("error");
          setIsAlertOpen(true);
          return;
        }

        // No requiere MFA: ir al dashboard
        const userRole = data.user?.app_metadata?.role as number | undefined;

        setAlertMessage("Inicio de sesión exitoso");
        setAlertDetail(undefined);
        setAlertType("success");
        setIsAlertOpen(true);

        setTimeout(() => {
          if (userRole === 1) {
            window.location.href = "/admin";
          } else if (userRole === 2) {
            window.location.href = "/profesor";
          } else if (userRole === 3) {
            window.location.href = "/estudiante";
          } else {
            window.location.href = "/";
          }
        }, 1500);
        return;
      }

      // Caso poco común: user sin session (algunos flujos de Supabase)
      if (!data.session && data.user) {
        try {
          const factors = await MFAService.listFactors();
          if (factors.length > 0) {
            router.push(
              `/twoauth?email=${encodeURIComponent(email)}&factorId=${encodeURIComponent(factors[0].id)}`
            );
            return;
          }
        } catch (mfaErr) {
          console.error("Error al obtener factores MFA:", mfaErr);
        }
        setError("Error al verificar autenticación de dos factores");
        setAlertMessage("Error al verificar autenticación de dos factores");
        setAlertDetail("Por favor, intenta nuevamente.");
        setAlertType("error");
        setIsAlertOpen(true);
      }
    } catch (error) {
      // Manejar errores inesperados
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error desconocido al iniciar sesión";
      setError(errorMessage);
      setAlertMessage("Error al iniciar sesión");
      setAlertDetail(errorMessage);
      setAlertType("error");
      setIsAlertOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Alert
        message={alertMessage}
        detail={alertDetail}
        type={alertType}
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        duration={alertType === "success" ? 2000 : 5000}
      />
      <div className="font-display bg-background-light text-slate-900 min-h-screen h-screen flex flex-col md:flex-row antialiased overflow-hidden">
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
                &ldquo;La educación es el pasaporte hacia el futuro, el mañana
                pertenece a aquellos que se preparan para él el día de
                hoy.&rdquo;
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
        {/* Right Section: Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto h-full">
          <div className="w-full max-w-[440px] flex flex-col gap-8">
            {/* Mobile Header (Logo) */}
            <div className="md:hidden flex items-center gap-2 mb-4 text-primary">
              <span className="material-symbols-outlined text-3xl">school</span>
              <span className="text-xl font-bold text-slate-900">EduXriva</span>
            </div>
            {/* Form Header */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                Bienvenido de nuevo
              </h1>
              <p className="text-slate-500 text-base">
                Por favor ingresa tus datos para iniciar sesión.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Main Form */}
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {/* Email/Username Field */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="email"
                >
                  Correo o Usuario
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      mail
                    </span>
                  </div>
                  <input
                    className="w-full pl-10 pr-4 h-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base outline-none"
                    id="email"
                    placeholder="estudiante@universidad.edu"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      lock
                    </span>
                  </div>
                  <input
                    className="w-full pl-10 pr-10 h-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base outline-none"
                    id="password"
                    placeholder="••••••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary focus:ring-offset-0 bg-transparent"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                    Recuérdame
                  </span>
                </label>
                <a
                  className="text-sm font-semibold text-primary hover:text-blue-700 transition-colors"
                  href="#"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">
                      sync
                    </span>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <span className="material-symbols-outlined text-lg">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
            {/* Footer */}
            <div className="text-center pt-2">
              <p className="text-slate-500 text-sm">
                ¿Nuevo en la plataforma?
                <Link
                  className="font-bold text-primary hover:text-blue-700 transition-colors ml-1"
                  href="/registro"
                >
                  Crear una cuenta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
