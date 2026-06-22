"use client";

// ... imports anteriores se mantienen si es replace file content ...
import { useState, useEffect } from "react";
import Header from "@/components/Admin/Header";
import Link from "next/link";
import api from "@/services/api"; // Importar api

// Mock Data (Se mantiene igual)
const mockStudentsGrid = [
    {
        id: "#STD-8832",
        name: "Ana López",
        email: "analopez@edu.com",
        promedio: 9.8,
        atencion: 95,
        estado: "Excelente",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d"
    },
    {
        id: "#STD-9921",
        name: "Carlos Ruiz",
        email: "cruiz@edu.com",
        promedio: 8.4,
        atencion: 75,
        estado: "Aprobado",
        avatar: "https://i.pravatar.cc/150?u=a04258a2462d826712d"
    },
    {
        id: "#STD-1182",
        name: "Sofía Méndez",
        email: "sofiam@edu.com",
        promedio: 5.2,
        atencion: 45,
        estado: "En Riesgo",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d"
    }
];

export default function ReportesPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [viewStudent, setViewStudent] = useState<any>(null); // Para el modal
    const [searchTerm, setSearchTerm] = useState(""); // Para el buscador de estudiantes

    useEffect(() => {
        // Cargar clases al inicio
        api.get('/classes/').then(res => setClasses(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (!selectedClass) {
            setReportData(null);
            return;
        }
        setLoading(true);
        api.get(`/stats/class-report/${selectedClass}`)
            .then(res => setReportData(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedClass]);

    // Filtrar estudiantes basado en el término de búsqueda
    const filteredStudents = reportData?.students?.filter((s: any) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <>
            <Header
                title="Reportes de Resultados"
                subtitle="Visualización de calificaciones y resúmenes de atención"
            />

            <div className="p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4">

                {/* Filters Section */}
                <div className="bg-white p-3 rounded-xl border border-[#e5e7eb] shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-[#111318] font-bold">
                        <span className="material-symbols-outlined text-primary text-[18px]">filter_list</span>
                        <h3 className="text-sm">Filtros</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold text-[#616f89] uppercase tracking-wider">Clase / Curso</span>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none bg-white border border-[#dbdfe6] rounded-lg h-8 px-3 pr-8 text-xs focus:ring-primary focus:border-primary text-[#111318]"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="">Seleccione una clase...</option>
                                    {classes.map((cls) => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.name} ({cls.code})
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#616f89]">
                                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                                </span>
                            </div>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold text-[#616f89] uppercase tracking-wider">Buscar Estudiante</span>
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#616f89]">
                                    <span className="material-symbols-outlined text-[16px]">search</span>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    className="w-full bg-white border border-[#dbdfe6] rounded-lg h-8 pl-8 pr-3 text-xs focus:ring-primary focus:border-primary placeholder:text-[#616f89] text-[#111318]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </label>
                    </div>
                </div>

                {/* Conditional Content */}
                {!selectedClass ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <span className="material-symbols-outlined text-3xl text-gray-400 mb-2">school</span>
                        <p className="text-sm text-gray-500">Selecciona una clase para ver el reporte.</p>
                    </div>
                ) : loading ? (
                    <div className="text-center py-16">
                        <span className="material-symbols-outlined animate-spin text-3xl text-primary">sync</span>
                        <p className="text-sm text-gray-500 mt-2">Calculando métricas...</p>
                    </div>
                ) : reportData && (
                    <>
                        {/* KPI Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Card 1 */}
                            <div className="bg-white p-3 rounded-xl border border-[#e5e7eb] shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-[#616f89] text-xs font-medium mb-0.5">Promedio General</p>
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-2xl font-bold text-[#111318]">{reportData.average}</h3>
                                        <span className="text-sm text-[#616f89] font-medium">/20</span>
                                    </div>
                                    <p className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                        Promedio de clase
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600">
                                    <span className="material-symbols-outlined text-[20px]">school</span>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-white p-3 rounded-xl border border-[#e5e7eb] shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-[#616f89] text-xs font-medium mb-0.5">Tasa de Aprobación</p>
                                    <h3 className="text-2xl font-bold text-[#111318]">{reportData.approval_rate}%</h3>
                                    <p className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                        Estudiantes aprobados
                                    </p>
                                </div>
                                <div className="bg-green-50 p-1.5 rounded-lg text-green-600">
                                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                </div>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-white p-3 rounded-xl border border-[#e5e7eb] shadow-sm flex items-start justify-between">
                                <div>
                                    <p className="text-[#616f89] text-xs font-medium mb-0.5">Tasa de Reprobación</p>
                                    <h3 className="text-2xl font-bold text-[#111318]">{reportData.failure_rate}%</h3>
                                    <p className="text-[10px] text-red-600 font-medium mt-1 flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                        {reportData.failed_count} reprobados
                                    </p>
                                </div>
                                <div className="bg-red-50 p-1.5 rounded-lg text-red-500">
                                    <span className="material-symbols-outlined text-[20px]">report_problem</span>
                                </div>
                            </div>
                        </div>

                        {/* Students Detail Table */}
                        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
                            <div className="p-3 border-b border-[#e5e7eb]">
                                <h3 className="text-sm font-bold text-[#111318]">Detalle de Estudiantes</h3>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full relative">
                                    <thead className="sticky top-0 z-10 bg-gray-50 text-left shadow-sm">
                                        <tr>
                                            <th className="py-2 px-6 text-[10px] font-bold text-[#616f89] uppercase tracking-wider">Estudiante</th>
                                            <th className="py-2 px-6 text-[10px] font-bold text-[#616f89] uppercase tracking-wider">ID (Ref)</th>
                                            <th className="py-2 px-6 text-[10px] font-bold text-[#616f89] uppercase tracking-wider text-center">Promedio</th>
                                            <th className="py-2 px-6 text-[10px] font-bold text-[#616f89] uppercase tracking-wider">Atención</th>
                                            <th className="py-2 px-6 text-[10px] font-bold text-[#616f89] uppercase tracking-wider">Estado</th>
                                            <th className="py-2 px-6 text-[10px] font-bold text-[#616f89] uppercase tracking-wider text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((student: any) => (
                                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-1.5 px-6">
                                                        <div className="flex items-center gap-2">
                                                            <img src={student.avatar} alt={student.name} className="w-6 h-6 rounded-full object-cover" />
                                                            <div>
                                                                <p className="font-bold text-[#111318] text-[11px]">{student.name}</p>
                                                                <p className="text-[9px] text-[#616f89]">{student.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-1.5 px-6 text-[10px] text-[#616f89] font-medium">
                                                        {student.id.substring(0, 8)}...
                                                    </td>
                                                    <td className="py-1.5 px-6 text-center">
                                                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${student.promedio >= 16 ? 'bg-green-100 text-green-700' :
                                                            student.promedio >= 14 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {student.promedio}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-6 min-w-[100px]">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${student.atencion >= 80 ? 'bg-green-500' :
                                                                        student.atencion >= 60 ? 'bg-blue-500' : 'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${student.atencion}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[9px] text-[#616f89] text-right">{student.atencion}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-1.5 px-6">
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${student.estado === "Excelente" ? "bg-green-50 text-green-700 border-green-200" :
                                                            student.estado === "Aprobado" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                "bg-red-50 text-red-700 border-red-200"
                                                            }`}>
                                                            <span className={`size-1 rounded-full ${student.estado === "Excelente" ? "bg-green-500" :
                                                                student.estado === "Aprobado" ? "bg-blue-500" : "bg-red-500"
                                                                }`}></span>
                                                            {student.estado}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-6 text-right">
                                                        <button onClick={() => setViewStudent(student)} className="text-[#616f89] hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))) : (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                                                    {searchTerm ? "No se encontraron estudiantes." : "No hay estudiantes matriculados."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Modal View Student - Solo si hay estudiante seleccionado */}
                {viewStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-xl font-bold text-[#111318]">Resumen Individual - {viewStudent.name}</h3>
                                <button onClick={() => setViewStudent(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[80vh]">
                                <h4 className="font-bold text-lg mb-4 text-[#111318]">Calificaciones</h4>
                                <div className="flex flex-col gap-3 mb-8">
                                    {viewStudent.evaluations && viewStudent.evaluations.length > 0 ? (
                                        viewStudent.evaluations.map((ev: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <span className="font-medium text-[#111318]">{ev.title}</span>
                                                <span className={`font-bold ${ev.score >= 14 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {Number(ev.score).toFixed(2)}/{ev.max_score}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 bg-gray-50 rounded-xl text-gray-500 italic text-center">
                                            No hay evaluaciones registradas para este estudiante.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => setViewStudent(null)}
                                    className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
