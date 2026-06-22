"use client";

import { useState, useEffect } from "react";

export default function TestGeminiPage() {
    const [mode, setMode] = useState<"upload" | "select">("select");
    const [file, setFile] = useState<File | null>(null);
    const [videos, setVideos] = useState<any[]>([]);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");

    // Configuración
    const [difficulty, setDifficulty] = useState("Media");
    const [questionsCount, setQuestionsCount] = useState(5);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        summary: string;
        questions: any[];
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Cargar videos al iniciar
    useEffect(() => {
        fetch("http://localhost:8000/genai/videos")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setVideos(data);
                }
            })
            .catch(err => console.error("Error loading videos:", err));
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const [processStep, setProcessStep] = useState<string>(""); // 'uploading', 'transcribing', 'generating'

    const handleSubmit = async () => {
        if (mode === "upload" && !file) return;
        if (mode === "select" && !selectedVideoUrl) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setProcessStep("uploading");

        try {
            let transcriptText = "";

            // Lógica de Transcripción (Whisper) - Unificada para Upload y Select
            // 1. Iniciar tarea de transcripción
            const formData = new FormData();
            if (mode === "upload" && file) {
                formData.append("file", file);
            } else if (mode === "select" && selectedVideoUrl) {
                formData.append("video_url", selectedVideoUrl);
            }

            const uploadRes = await fetch("http://localhost:8000/transcribe/video", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Error iniciando transcripción (Whisper)");

            const { task_id } = await uploadRes.json();
            setProcessStep("transcribing");

            // 2. Polling de estado
            let attempts = 0;
            while (true) {
                await new Promise(r => setTimeout(r, 2000)); // Esperar 2s
                attempts++;
                if (attempts > 300) throw new Error("Tiempo de espera agotado (10 min)"); // 10 min timeout

                const statusRes = await fetch(`http://localhost:8000/transcribe/status/${task_id}`);
                if (!statusRes.ok) continue;

                const statusData = await statusRes.json();

                if (statusData.status === "completed") {
                    transcriptText = statusData.text;
                    break;
                }
                if (statusData.status === "failed") {
                    throw new Error(`Fallo en transcripción: ${statusData.error}`);
                }
            }

            // 3. Generar Quiz (usando transcripción)
            setProcessStep("generating");

            const quizFormData = new FormData();
            quizFormData.append("transcript_text", transcriptText);
            quizFormData.append("difficulty", difficulty);
            quizFormData.append("questions_count", questionsCount.toString());

            const response = await fetch("http://localhost:8000/genai/test-video-questions", {
                method: "POST",
                body: quizFormData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Error al procesar el video");
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setProcessStep("");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-blue-400">
                    Prueba de Generación con Gemini 2.0
                </h1>

                <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 space-y-6">

                    {/* Modo de Selección */}
                    <div className="flex gap-4 p-1 bg-gray-700 rounded-lg w-fit">
                        <button
                            onClick={() => setMode("select")}
                            className={`px-4 py-2 rounded-md transition-colors ${mode === "select" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                        >
                            Seleccionar Existente
                        </button>
                        <button
                            onClick={() => setMode("upload")}
                            className={`px-4 py-2 rounded-md transition-colors ${mode === "upload" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                        >
                            Subir Archivo
                        </button>
                    </div>

                    {/* Input de Video */}
                    <div>
                        <label className="block mb-2 text-lg font-medium text-gray-300">
                            {mode === "select" ? "Elige un video de la lista:" : "Sube un archivo .mp4:"}
                        </label>

                        {mode === "select" ? (
                            <select
                                value={selectedVideoUrl}
                                onChange={(e) => setSelectedVideoUrl(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">-- Selecciona un video --</option>
                                {videos.map(v => (
                                    <option key={v.id} value={v.video_url}>
                                        {v.title}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-600 file:text-white
                                hover:file:bg-blue-700"
                            />
                        )}
                    </div>

                    {/* Opciones Avanzadas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block mb-2 font-medium text-gray-300">Dificultad del Quiz</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-2"
                            >
                                <option value="Baja">Baja (Memoria)</option>
                                <option value="Media">Media (Comprensión)</option>
                                <option value="Alta">Alta (Análisis)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-2 font-medium text-gray-300">Cantidad de Preguntas</label>
                            <input
                                type="number"
                                min="1" max="10"
                                value={questionsCount}
                                onChange={(e) => setQuestionsCount(parseInt(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded p-2"
                            />
                        </div>
                    </div>

                    {/* Botón de Acción */}
                    <div className="pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={(!file && mode === "upload") || (!selectedVideoUrl && mode === "select") || loading}
                            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${loading || ((!file && mode === "upload") || (!selectedVideoUrl && mode === "select"))
                                ? "bg-gray-600 cursor-not-allowed opacity-50"
                                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {processStep === "uploading" && "Subiendo video..."}
                                    {processStep === "transcribing" && "Transcribiendo audio (esto puede tardar)..."}
                                    {processStep === "generating" && "Analizando con Gemini AI..."}
                                    {!processStep && "Procesando..."}
                                </span>
                            ) : "Generar Resumen y Preguntas"}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
                            Error: {error}
                        </div>
                    )}
                </div>

                {result && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Resumen Section */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                            <h2 className="text-2xl font-semibold mb-4 text-purple-400">
                                📜 Transcripción del Video (Base del Quiz)
                            </h2>
                            <div className="prose prose-invert max-w-none bg-gray-900/50 p-6 rounded-lg">
                                <p className="whitespace-pre-wrap text-gray-300 leading-relaxed text-lg">
                                    {result.summary}
                                </p>
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                            <h2 className="text-2xl font-semibold mb-6 text-yellow-400 flex items-center gap-2">
                                📝 Preguntas Generadas <span className="text-sm bg-yellow-400/20 text-yellow-200 px-2 py-1 rounded-full">{result.questions.length}</span>
                            </h2>
                            <div className="space-y-6">
                                {result.questions.map((q: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="p-5 bg-gray-700/30 hover:bg-gray-700/50 transition-colors rounded-xl border border-gray-600"
                                    >
                                        <h3 className="text-xl font-medium text-white mb-4">
                                            {idx + 1}. {q.question}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options.map((opt: string, optIdx: number) => (
                                                <div
                                                    key={optIdx}
                                                    className={`p-3 rounded-lg border transition-all ${opt === q.correct_answer
                                                        ? "bg-green-900/30 border-green-500/50 text-green-200 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                                        : "bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750"
                                                        }`}
                                                >
                                                    <span className={`inline-block w-6 h-6 rounded-full text-center text-sm mr-2 ${opt === q.correct_answer ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-500"
                                                        }`}>
                                                        {String.fromCharCode(65 + optIdx)}
                                                    </span>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
