"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { register } from "@/services/auth";
import { getErrorMessage, getErrorMessages } from "@/services/error";
import Alert from "@/components/Alert";

export default function RegistroPage() {
  const [role, setRole] = useState<"student" | "professor">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
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

    // Validaciones
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (!acceptTerms) {
      setError("Debes aceptar los términos de servicio.");
      return;
    }

    setIsLoading(true);

    try {
      // Convertir role de string a número: student = 2, professor = 3
      let roleNumber: number;
      if (role === "student") {
        roleNumber = 3;
      } else if (role === "professor") {
        roleNumber = 2;
      } else {
        roleNumber = 3; // Por defecto estudiante
      }

      const response = await register({
        email,
        password,
        full_name: fullName,
        role: roleNumber,
      });

      // Mostrar mensaje de éxito
      setAlertMessage(response.message);
      setAlertDetail(undefined);
      setAlertType("success");
      setIsAlertOpen(true);

      // Registro exitoso, redirigir al login después de un breve delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const { message: errorMessage, detail: errorDetail } =
        getErrorMessages(error);
      const fallbackMessage = getErrorMessage(error);
      setError(errorDetail || errorMessage || fallbackMessage);
      setAlertMessage(errorMessage);
      setAlertDetail(errorDetail);
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
      <div className="bg-background-light font-display antialiased text-slate-900 min-h-screen h-screen flex flex-col md:flex-row overflow-hidden">
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
        {/* Right Section: Registration Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto h-full">
          {/* Mobile Header (Logo) */}
          <div className="md:hidden absolute top-6 left-6 flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-3xl">school</span>
            <span className="text-xl font-bold text-slate-900">EduXriva</span>
          </div>
          <div className="w-full max-w-[440px] flex flex-col gap-8">
            {/* Form Header */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                Crea tu Cuenta
              </h1>
              <p className="text-slate-500 text-base">
                Comienza tu viaje con EduXriva hoy.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Soy un:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="cursor-pointer relative">
                    <input
                      className="peer sr-only"
                      name="role"
                      type="radio"
                      value="student"
                      checked={role === "student"}
                      onChange={(e) =>
                        setRole(e.target.value as "student" | "professor")
                      }
                    />
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-primary/50 transition-all peer-checked:border-primary peer-checked:bg-primary/5">
                      <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center mb-2 peer-checked:bg-primary peer-checked:text-white text-primary transition-colors">
                        <span className="material-symbols-outlined text-2xl">
                          school
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        Estudiante
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 peer-checked:opacity-100 transition-opacity text-primary">
                      <span className="material-symbols-outlined text-xl">
                        check_circle
                      </span>
                    </div>
                  </label>
                  <label className="cursor-pointer relative">
                    <input
                      className="peer sr-only"
                      name="role"
                      type="radio"
                      value="professor"
                      checked={role === "professor"}
                      onChange={(e) =>
                        setRole(e.target.value as "student" | "professor")
                      }
                    />
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-primary/50 transition-all peer-checked:border-primary peer-checked:bg-primary/5">
                      <div className="size-10 rounded-full bg-purple-50 flex items-center justify-center mb-2 peer-checked:bg-primary peer-checked:text-white text-purple-600 transition-colors">
                        <span className="material-symbols-outlined text-2xl">
                          cast_for_education
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        Profesor
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 opacity-0 peer-checked:opacity-100 transition-opacity text-primary">
                      <span className="material-symbols-outlined text-xl">
                        check_circle
                      </span>
                    </div>
                  </label>
                </div>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Nombre Completo
                </span>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      person
                    </span>
                  </div>
                  <input
                    className="w-full pl-10 pr-4 h-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base outline-none"
                    placeholder="Juan Perez"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Correo Electrónico
                </span>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      mail
                    </span>
                  </div>
                  <input
                    className="w-full pl-10 pr-4 h-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base outline-none"
                    placeholder="juan@universidad.edu"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </label>
              <div className="flex flex-col md:flex-row gap-5">
                <label className="flex-1 flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Contraseña
                  </span>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">
                        lock
                      </span>
                    </div>
                    <input
                      className="w-full pl-10 pr-4 h-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base outline-none"
                      placeholder="••••••••"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </label>
                <label className="flex-1 flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    Confirmar Contraseña
                  </span>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">
                        lock_reset
                      </span>
                    </div>
                    <input
                      className="w-full pl-10 pr-4 h-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-base outline-none"
                      placeholder="••••••••"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-3 mt-2">
                <input
                  className="mt-1 h-4 w-4 rounded text-primary border-slate-300 focus:ring-primary focus:ring-offset-0 bg-transparent"
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                <label
                  className="text-sm text-slate-600 leading-normal"
                  htmlFor="terms"
                >
                  Acepto los{" "}
                  <a
                    className="font-semibold text-primary hover:text-blue-700 transition-colors"
                    href="#"
                  >
                    Términos de Servicio
                  </a>{" "}
                  y la{" "}
                  <a
                    className="font-semibold text-primary hover:text-blue-700 transition-colors"
                    href="#"
                  >
                    Política de Privacidad
                  </a>
                  .
                </label>
              </div>
              <button
                className="w-full h-12 bg-primary hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">
                      sync
                    </span>
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    Crear Cuenta
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
                ¿Ya tienes una cuenta?
                <Link
                  className="font-bold text-primary hover:text-blue-700 transition-colors ml-1"
                  href="/login"
                >
                  Iniciar Sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
