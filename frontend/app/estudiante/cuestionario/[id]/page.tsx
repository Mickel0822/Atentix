"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import api from "@/services/api";

export default function CuestionarioPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    correct: number;
    total: number;
  } | null>(null);

  // Estado extendido para modo revisión
  const [reviewMode, setReviewMode] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null); // Info de atención y tiempo

  // Fetch Quiz Data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/sessions/quiz/${quizId}`);
        const data = res.data;

        if (data) {
          if (data.content) {
            setQuestions(data.content);
          }

          // Si el quiz ya tiene nota, activar modo revisión
          if (data.score_obtained !== null && data.score_obtained !== undefined) {
            setReviewMode(true);
            setIsSubmitted(true);
            setAnswers(data.student_answers || {});

            // Calcular correctas/total
            let correctCount = 0;
            if (data.content && data.student_answers) {
              data.content.forEach((q: any, i: number) => {
                // Comparar respuesta usuaria con correcta
                // Nota: student_answers usa keys "q0", "q1", etc. en logic anterior
                const userAns = data.student_answers[`q${i}`];
                if (userAns === q.correct_answer) correctCount++;
              });
            }

            setQuizResult({
              score: data.score_obtained,
              correct: correctCount,
              total: data.content ? data.content.length : 0
            });

            // Datos de sesión (atención, tiempo)
            if (data.activity_sessions) {
              setSessionData(data.activity_sessions);
            }
          }
        } else {
          setError("No se encontraron datos.");
        }
      } catch (err) {
        console.error("Error fetching quiz:", err);
        setError("Error cargando el cuestionario.");
      } finally {
        setLoading(false);
      }
    };
    if (quizId) fetchQuiz();
  }, [quizId]);

  const handleAnswerSelect = (index: number, answer: string) => {
    setAnswers({ ...answers, [`q${index}`]: answer });
  };

  // ... (handleNext, handlePrevious, handleSubmit se mantienen igual o similar)
  const handleNext = () => { if (currentQuestion < questions.length - 1) setCurrentQuestion(currentQuestion + 1); };
  const handlePrevious = () => { if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1); };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    try {
      const res = await api.post('/sessions/quiz/submit', {
        quiz_id: quizId,
        answers: answers
      });
      // Al enviar, recargar o setear estado para mostrar la vista de revisión
      // Para simplificar, usamos los datos devueltos o recargamos
      window.location.reload();
    } catch (err) {
      console.error("Error submitting", err);
      alert("Error al enviar.");
      setIsSubmitted(false);
    }
  };



  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  // Variables para renderizado
  const currentQ = questions[currentQuestion] || { question: "", options: [] };
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const currentAnswer = answers[`q${currentQuestion}`];
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  // VISTA DE RESUMEN (Coincide con imagen del usuario)
  if (isSubmitted && quizResult) {
    const isPassing = quizResult.score >= 14;
    const percentage = (quizResult.score / 20) * 100;

    // Calcular duración
    let durationStr = "0m 0s";
    if (sessionData && sessionData.started_at && sessionData.completed_at) {
      const start = new Date(sessionData.started_at).getTime();
      const end = new Date(sessionData.completed_at).getTime();
      const diffSecs = Math.floor((end - start) / 1000);
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      durationStr = `${mins}m ${secs}s`;
    }

    // Atención (Simulado 80% si es alto, etc. o parsear un valor real si existiera numérico)
    // El backend devuelve 'alto', 'medio', 'bajo'. Mapear a porcentaje aprox.
    let attentionPercent = 80;
    let attentionLabel = "Alta Atención";
    let attentionColor = "text-blue-600";
    let attentionBg = "bg-blue-600";

    if (sessionData) {
      if (sessionData.attention_level === 'medio') {
        attentionPercent = 50; attentionLabel = "Atención Media"; attentionColor = "text-yellow-600"; attentionBg = "bg-yellow-500";
      } else if (sessionData.attention_level === 'bajo') {
        attentionPercent = 20; attentionLabel = "Atención Baja"; attentionColor = "text-red-600"; attentionBg = "bg-red-500";
      }
    }

    return (
      <div className="bg-[#f8f9fa] min-h-screen">
        {/* Header simple similar a imagen */}
        <div className="bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (sessionData && sessionData.tasks && sessionData.tasks.class_id) {
                  router.push(`/estudiante/resultados/${sessionData.tasks.class_id}`);
                } else {
                  router.back();
                }
              }}
              className="text-[#616f89] hover:text-[#111318]"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#111318]">Resumen de Resultados</h1>
              <p className="text-xs text-[#616f89]">
                {sessionData?.tasks?.title || "Cuestionario"}
              </p>
            </div>
          </div>
          {/* Avatar example */}
          <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold text-xs">
            E
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">

          {/* Título Grande */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">COMPLETADO</span>
              <span className="text-xs text-[#616f89]">
                {sessionData?.completed_at ? new Date(sessionData.completed_at).toLocaleString() : ""}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-[#111318]">
              Resultados: {sessionData?.tasks?.title || "Evaluación"}
            </h2>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-[#616f89]">{sessionData?.tasks?.description || "Unidad de repaso"}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg text-sm font-bold text-[#111318] hover:bg-gray-50 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">refresh</span>
                Reintentar
              </button>
            </div>
          </div>

          {/* Grid de 3 Tarjetas Superiores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calificación */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] shadow-sm relative overflow-hidden">
              <p className="text-sm font-bold text-[#616f89] mb-1">Calificación Final</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#111318]">{quizResult.score.toFixed(2)}</span>
                <span className="text-xl text-[#616f89]">/ 20</span>
              </div>
              <div className="mt-4 text-xs font-bold text-green-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>+15% vs promedio</span> {/* Placeholder estático */}
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-gray-100 -z-0">school</span>
            </div>

            {/* Tiempo */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] shadow-sm relative overflow-hidden">
              <p className="text-sm font-bold text-[#616f89] mb-1">Tiempo Total</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#111318]">{durationStr}</span>
              </div>
              <div className="mt-4 text-xs font-bold text-[#616f89] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>Ritmo óptimo</span>
              </div>
              <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-gray-100 -z-0">timer</span>
            </div>

            {/* Estado */}
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb] shadow-sm relative overflow-hidden">
              <p className="text-sm font-bold text-[#616f89] mb-1">Estado</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${isPassing ? 'text-green-500' : 'text-red-500'}`}>
                  {isPassing ? 'Aprobado' : 'Reprobado'}
                </span>
              </div>
              <div className="mt-4 text-xs font-bold text-[#616f89] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">celebration</span>
                <span>{isPassing ? '¡Buen trabajo!' : 'Sigue practicando'}</span>
              </div>
              <span className={`material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] -z-0 ${isPassing ? 'text-green-50' : 'text-red-50'}`}>
                {isPassing ? 'check_circle' : 'cancel'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revisión de Respuestas (2/3 ancho) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-[#111318]">Revisión de Respuestas</h3>
                <div className="flex gap-2">
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">{quizResult.correct} Correctas</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">{quizResult.total - quizResult.correct} Incorrectas</span>
                </div>
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const userAns = answers[`q${idx}`];
                  const isCorrect = userAns === q.correct_answer;
                  return (
                    <div key={idx} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                      <div className="flex gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#111318] mb-3">{q.question}</p>

                          <div className="space-y-2">
                            {/* Respuesta del usuario */}
                            <div className={`p-3 rounded-lg border flex justify-between items-center ${isCorrect
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                              }`}>
                              <div className="flex items-center gap-2">
                                <span className={`material-symbols-outlined text-sm ${isCorrect ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                  {isCorrect ? 'check_circle' : 'cancel'}
                                </span>
                                <span className="text-sm font-medium text-[#111318]">{userAns || "Sin respuesta"}</span>
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isCorrect ? 'text-green-700' : 'text-red-700'
                                }`}>
                                TU RESPUESTA
                              </span>
                            </div>

                            {/* Respuesta correcta (si falló) */}
                            {!isCorrect && (
                              <div className="p-3 rounded-lg border border-green-200 bg-white flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-green-600">check_circle</span>
                                  <span className="text-sm font-medium text-[#111318]">{q.correct_answer}</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                                  CORRECTA
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nivel de Atención (1/3 ancho) */}
            <div className="h-fit bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6 text-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-[#111318]">Nivel de Atención Detectada</h3>
                <span className="material-symbols-outlined text-blue-600 text-sm">visibility</span>
              </div>

              <div className="relative w-40 h-40 mx-auto my-6 flex items-center justify-center">
                {/* SVG Circle Chart simple */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent"
                    className={attentionColor}
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * attentionPercent) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-[#111318]">{attentionPercent}%</span>
                  <span className="text-xs text-[#616f89]">Atención</span>
                </div>
              </div>

              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${attentionLabel.includes('Alta') ? 'bg-green-100 text-green-700' :
                (attentionLabel.includes('Media') ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')
                }`}>
                <div className={`w-2 h-2 rounded-full ${attentionLabel.includes('Alta') ? 'bg-green-500' :
                  (attentionLabel.includes('Media') ? 'bg-yellow-500' : 'bg-red-500')
                  }`}></div>
                {attentionLabel}
              </div>

              <p className="mt-4 text-xs text-[#616f89] leading-relaxed">
                Mantuviste un nivel de atención consistente durante la mayor parte del video.
              </p>

              <div className="mt-6 space-y-3 pt-6 border-t border-gray-100 text-left">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#111318]">
                    <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                    Tiempo con alta atención
                  </div>
                  <span className="font-bold">?? min</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#111318]">
                    <span className="material-symbols-outlined text-yellow-500 text-sm">warning</span>
                    Tiempo con atención media
                  </div>
                  <span className="font-bold">?? min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Cuestionario Personalizado"
        subtitle={`Pregunta ${currentQuestion + 1} de ${questions.length}`}
        user={{
          name: "Estudiante",
          email: "estudiante@demo.com",
          role: "Estudiante",
        }}
      />
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#111318]">
              Progreso: {currentQuestion + 1} / {questions.length}
            </span>
            <span className="text-sm text-[#616f89]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[#111318] mb-6">
            {currentQ.question}
          </h2>
          <div className="flex flex-col gap-3">
            {currentQ.options && currentQ.options.map((option: string, index: number) => {
              const isSelected = currentAnswer === option;
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion, option)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected
                    ? "border-primary bg-primary/5"
                    : "border-[#e5e7eb] hover:border-primary/50"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-[#dbdfe6]"
                        }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-sm">
                          check
                        </span>
                      )}
                    </div>
                    <span className="text-base text-[#111318]">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 rounded-lg border border-[#dbdfe6] text-[#111318] hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Anterior
          </button>
          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!currentAnswer}
              className="px-6 py-3 rounded-lg bg-primary hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Siguiente
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Finalizar Cuestionario
            </button>
          )}
        </div>
      </div>
    </>
  );
}

