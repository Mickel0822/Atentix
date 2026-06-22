"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api";

export default function ResultadosClasePage() {
    const params = useParams();
    const router = useRouter();
    const classId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";

    const [classInfo, setClassInfo] = useState<any>({ name: "Cargando..." });
    const [loading, setLoading] = useState(true);

    const [evaluations, setEvaluations] = useState<any[]>([]);

    useEffect(() => {
        if (classId) {
            setLoading(true);
            // 1. Fetch class info
            api.get(`/classes/${classId}`).then(res => {
                setClassInfo(res.data);
            }).catch(err => console.error("Error class", err));

            // 2. Fetch results
            api.get(`/sessions/student/class/${classId}`).then(res => {
                if (res.data) {
                    const mapped = res.data.map((session: any) => {
                        const quiz = session.generated_quizzes && session.generated_quizzes.length > 0
                            ? session.generated_quizzes[0]
                            : null;

                        let status = "Pendiente";
                        let scoreDisplay = "-";
                        let dateDisplay = "Sin evaluación";

                        if (quiz && quiz.score_obtained !== null) {
                            const score = quiz.score_obtained || 0;
                            scoreDisplay = score.toFixed(1) + "/20";
                            // Lógica de aprobación simple
                            status = score >= 14 ? "Aprobado" : "Reprobado";
                            const dateToUse = quiz.completed_at || quiz.created_at;
                            if (dateToUse) {
                                dateDisplay = new Date(dateToUse).toLocaleDateString("es-ES", {
                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                });
                            }
                        } else if (session.status === 'completed' && !quiz) {
                            // Caso raro: Session completada pero sin quiz?
                            status = "Pendiente Quiz";
                        }

                        return {
                            id: session.id,
                            taskId: session.task_id,
                            quizId: quiz ? quiz.id : null,
                            videoTitle: session.tasks?.title || "Video sin título",
                            duration: "10:00 min",
                            date: dateDisplay,
                            score: scoreDisplay,
                            status: status,
                            hasSummary: !!quiz
                        };
                    });
                    setEvaluations(mapped);
                }
                setLoading(false);
            }).catch(err => {
                console.error("Error loading results", err);
                setLoading(false);
            });
        }
    }, [classId]);

    const handleViewSummary = (quizId: string) => {
        router.push(`/estudiante/cuestionario/${quizId}`);
    };

    const handleViewVideo = (videoId: string) => {
        router.push(`/estudiante/clases/${classId}/videos/${videoId}`);
    };

    return (
        <>
            <Header
                title={classInfo.name}
                subtitle="Resultados de evaluaciones"
                user={{
                    name: "Estudiante",
                    email: "estudiante@demo.com",
                    role: "Estudiante",
                }}
            />
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[#616f89] hover:text-[#111318] transition-colors self-start"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    <span>Volver</span>
                </button>

                <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm p-6">
                    <h2 className="text-xl font-bold text-[#111318] mb-6">Videos y Resultados de Evaluación</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#e5e7eb] text-xs uppercase tracking-wider text-[#616f89] font-bold">
                                    <th className="px-6 py-4 text-left">VIDEO</th>
                                    <th className="px-6 py-4 text-center">FECHA EVALUACIÓN</th>
                                    <th className="px-6 py-4 text-center">CALIFICACIÓN</th>
                                    <th className="px-6 py-4 text-center">ESTADO</th>
                                    <th className="px-6 py-4 text-center">ACCIÓN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e5e7eb]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="flex justify-center items-center">
                                                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                                            </div>
                                            <p className="mt-2 text-sm text-gray-400">Cargando resultados...</p>
                                        </td>
                                    </tr>
                                ) : evaluations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <span className="material-symbols-outlined text-4xl text-gray-300">assignment_late</span>
                                                <p className="font-medium">No hay evaluaciones disponibles en esta clase.</p>
                                                <p className="text-sm text-gray-400">Completa las tareas asignadas para ver tus resultados aquí.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    evaluations.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors bg-white">
                                            <td className="px-6 py-5">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${item.status === 'Aprobado' ? 'bg-green-100 text-green-600' : (item.status === 'Reprobado' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600')}`}>
                                                        <span className="material-symbols-outlined text-[24px]">
                                                            {item.status === 'Aprobado' ? 'check_circle' : (item.status === 'Reprobado' ? 'cancel' : 'play_circle')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-bold text-[#111318]">{item.videoTitle}</h3>
                                                        <p className="text-sm text-[#616f89]">{item.duration}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center text-sm text-[#616f89]">
                                                {item.date}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {item.score !== '-' ? (
                                                    <span className={`inline-block px-3 py-1 rounded-lg font-bold text-sm border ${item.status === 'Aprobado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                        {item.score}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#616f89]">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${item.status === 'Aprobado'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : (item.status === 'Reprobado' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200')
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {item.hasSummary && item.quizId ? (
                                                    <button
                                                        onClick={() => handleViewSummary(item.quizId)}
                                                        className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto shadow-md shadow-blue-500/20 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                        Ver Resumen
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleViewVideo(item.taskId)}
                                                        className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto shadow-md shadow-blue-500/20 transition-all">
                                                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                        Ver Video
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
