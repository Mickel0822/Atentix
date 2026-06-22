"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Admin/Header";
import api from "@/services/api";
import {
  CreateClassModal,
  EditClassModal,
  CodeModal,
  DeleteClassModal,
} from "@/components/Profesor/ClassModals";

// Mock data - En producción esto vendría de una API
interface Class {
  id: string;
  name: string;
  description: string;
  status: "Activo" | "Archivado" | "Borrador";
  students: number;
  videos: number;
  schedule?: string;
  imageUrl?: string;
  accessCode?: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  uploadDate: string;
  classId: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  classId: string;
}

interface StudentVideoResult {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  videoId: string;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  attentionLevel: "alto" | "medio" | "bajo";
}

// Mock data para videos
const mockVideos: Video[] = [
  {
    id: "v1",
    title: "Introducción a las Ecuaciones Lineales",
    description: "Conceptos básicos de ecuaciones lineales y su resolución",
    duration: "45:30",
    uploadDate: "2024-01-15",
    classId: "1",
  },
  {
    id: "v2",
    title: "Sistemas de Ecuaciones",
    description: "Métodos de resolución de sistemas de ecuaciones lineales",
    duration: "52:15",
    uploadDate: "2024-01-22",
    classId: "1",
  },
  {
    id: "v3",
    title: "Desigualdades Lineales",
    description: "Resolución de desigualdades y representación gráfica",
    duration: "38:45",
    uploadDate: "2024-01-29",
    classId: "1",
  },
  {
    id: "v4",
    title: "La Revolución Industrial",
    description: "Orígenes y desarrollo de la Revolución Industrial",
    duration: "60:00",
    uploadDate: "2024-02-01",
    classId: "2",
  },
];

// Mock data para estudiantes
const mockStudents: Student[] = [
  {
    id: "s1",
    name: "Juan Pérez",
    email: "juan.perez@estudiante.com",
    classId: "1",
  },
  {
    id: "s2",
    name: "María González",
    email: "maria.gonzalez@estudiante.com",
    classId: "1",
  },
  {
    id: "s3",
    name: "Carlos Rodríguez",
    email: "carlos.rodriguez@estudiante.com",
    classId: "1",
  },
  {
    id: "s4",
    name: "Ana Martínez",
    email: "ana.martinez@estudiante.com",
    classId: "1",
  },
  {
    id: "s5",
    name: "Luis Fernández",
    email: "luis.fernandez@estudiante.com",
    classId: "1",
  },
];

// Mock data para resultados de estudiantes en videos
const mockStudentVideoResults: StudentVideoResult[] = [
  {
    studentId: "s1",
    videoId: "v1",
    score: 85,
    correctAnswers: 17,
    incorrectAnswers: 3,
    totalQuestions: 20,
    attentionLevel: "alto",
  },
  {
    studentId: "s2",
    videoId: "v1",
    score: 90,
    correctAnswers: 18,
    incorrectAnswers: 2,
    totalQuestions: 20,
    attentionLevel: "alto",
  },
  {
    studentId: "s3",
    videoId: "v1",
    score: 75,
    correctAnswers: 15,
    incorrectAnswers: 5,
    totalQuestions: 20,
    attentionLevel: "medio",
  },
  {
    studentId: "s4",
    videoId: "v1",
    score: 95,
    correctAnswers: 19,
    incorrectAnswers: 1,
    totalQuestions: 20,
    attentionLevel: "alto",
  },
  {
    studentId: "s5",
    videoId: "v1",
    score: 70,
    correctAnswers: 14,
    incorrectAnswers: 6,
    totalQuestions: 20,
    attentionLevel: "bajo",
  },
  {
    studentId: "s1",
    videoId: "v2",
    score: 80,
    correctAnswers: 16,
    incorrectAnswers: 4,
    totalQuestions: 20,
    attentionLevel: "medio",
  },
  {
    studentId: "s2",
    videoId: "v2",
    score: 88,
    correctAnswers: 18,
    incorrectAnswers: 2,
    totalQuestions: 20,
    attentionLevel: "alto",
  },
  {
    studentId: "s3",
    videoId: "v2",
    score: 72,
    correctAnswers: 14,
    incorrectAnswers: 6,
    totalQuestions: 20,
    attentionLevel: "medio",
  },
  {
    studentId: "s4",
    videoId: "v2",
    score: 92,
    correctAnswers: 18,
    incorrectAnswers: 2,
    totalQuestions: 20,
    attentionLevel: "alto",
  },
  {
    studentId: "s5",
    videoId: "v2",
    score: 65,
    correctAnswers: 13,
    incorrectAnswers: 7,
    totalQuestions: 20,
    attentionLevel: "bajo",
  },
];

import { Suspense } from "react";

function GestiónClasesContent() {
  /* 
    Refactorizado para usar API Real
  */
  const searchParams = useSearchParams();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock students y videos solo para la demo de "detalle", en real se cargarian de API tambien
  // por simplicidad mantenemos mocks para detalle por ahora, pero la lista DE CLASES es real.
  const [students, setStudents] = useState<Student[]>(mockStudents);

  const [searchTerm, setSearchTerm] = useState("");
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail" | "videoResults">("list");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "students">("videos");

  // Student Modals
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [realVideoResults, setRealVideoResults] = useState<StudentVideoResult[]>([]);
  const [isViewStudentModalOpen, setIsViewStudentModalOpen] = useState(false);
  const [isDeleteStudentModalOpen, setIsDeleteStudentModalOpen] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch de videos cuando se selecciona una clase
  useEffect(() => {
    if (selectedClass && viewMode === "detail") {
      fetchVideos(selectedClass.id);
      fetchStudents(selectedClass.id);
    }
  }, [selectedClass, viewMode]);

  const [classVideos, setClassVideos] = useState<Video[]>([]);
  const [classStudentsList, setClassStudentsList] = useState<Student[]>([]);

  const fetchStudents = async (classId: string) => {
    try {
      const res = await api.get(`/classes/${classId}/students`);
      if (res.data) {
        const mappedStudents: Student[] = res.data.map((item: any) => ({
          id: item.student_id,
          name: item.profiles?.full_name || "Sin nombre",
          email: item.profiles?.email || "Sin email",
          classId: classId
        }));
        setClassStudentsList(mappedStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setClassStudentsList([]);
    }
  };

  const fetchVideos = async (classId: string) => {
    try {
      const res = await api.get(`/tasks/class/${classId}`);
      if (res.data) {
        // Mapear respuesta del backend al formato Video del frontend
        const mappedVideos: Video[] = res.data.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          // Formatear duración (si viene en segundos o string)
          duration: task.duration_seconds ? formatDuration(task.duration_seconds) : "00:00",
          uploadDate: task.created_at || new Date().toISOString(),
          classId: task.class_id
        }));
        setClassVideos(mappedVideos);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setClassVideos([]);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes/');
      if (res.data) {
        // Mapear respuesta del backend al formato del frontend
        const mappedClasses: Class[] = res.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          status: item.is_active ? "Activo" : "Archivado",
          students: item.students_count || 0, // Mapeo count
          videos: item.videos_count || 0, // Mapeo count
          accessCode: item.code,
          imageUrl: item.image_url,
          schedule: item.schedule
        }));
        setClasses(mappedClasses);
      }
    } catch (error) {
      console.error("Failed to fetch classes", error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar parámetros de URL para navegación directa
  useEffect(() => {
    const classId = searchParams.get("classId");
    // const videoId = searchParams.get("videoId"); // Simplificado

    if (classId && classes.length > 0) {
      const classItem = classes.find((c) => c.id === classId);
      if (classItem) {
        setSelectedClass(classItem);
        setViewMode("detail");
      }
    }
  }, [searchParams, classes]);

  // Handle Create Class Navigation
  const handleNavToCreate = () => {
    router.push("/profesor/crear-clase");
  };

  const filteredClasses = classes.filter((classItem: Class) => {
    const term = searchTerm.toLowerCase();
    return (
      classItem.name.toLowerCase().includes(term) ||
      (classItem.description || "").toLowerCase().includes(term)
    );
  });

  const handleCreateClass = (classData: Partial<Class>) => {
    const newClass: Class = {
      id: Date.now().toString(),
      name: classData.name || "",
      description: classData.description || "",
      status: (classData.status as Class["status"]) || "Activo",
      students: 0,
      videos: 0,
    };
    setClasses([...classes, newClass]);
    setIsCreateModalOpen(false);
  };

  const handleEditClass = async (classData: Class) => {
    try {
      await api.put(`/classes/${classData.id}`, {
        name: classData.name,
        description: classData.description,
        schedule: classData.schedule,
        is_active: classData.status === "Activo",
      });

      // Actualizar estado local
      setClasses(
        classes.map((c) => (c.id === classData.id ? classData : c))
      );
      setIsEditModalOpen(false);
      setSelectedClass(null);
    } catch (error) {
      console.error("Error updating class:", error);
      alert("Error al actualizar la clase");
    }
  };

  const handleDeleteClass = async () => {
    if (selectedClass) {
      try {
        await api.delete(`/classes/${selectedClass.id}`);
        setClasses(classes.filter((c) => c.id !== selectedClass.id));
        setIsDeleteModalOpen(false);
        setSelectedClass(null);
      } catch (error) {
        console.error("Error deleting class:", error);
        alert("Error al eliminar la clase");
      }
    }
  };

  const handleSaveCode = async (newCode: string) => {
    if (!selectedClass) return;
    try {
      await api.put(`/classes/${selectedClass.id}`, { code: newCode });

      // Actualizar estado local
      const updated = classes.map((c) =>
        c.id === selectedClass.id ? { ...c, accessCode: newCode } : c
      );
      setClasses(updated);
      setSelectedClass({ ...selectedClass, accessCode: newCode });
    } catch (error) {
      console.error("Error updating class code:", error);
      alert("Error al guardar el código");
    }
  };


  const handleClassClick = (classItem: Class) => {
    setSelectedClass(classItem);
    setViewMode("detail");
    setActiveTab("videos");
    setSelectedVideo(null);
  };

  const handleVideoClick = async (video: Video) => {
    setSelectedVideo(video);
    setViewMode("videoResults");

    // Fetch real results
    try {
      const res = await api.get(`/stats/tasks/${video.id}/results`);
      if (res.data) {
        setRealVideoResults(res.data);
      }
    } catch (error) {
      console.error("Error fetching video results", error);
      setRealVideoResults([]);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedClass(null);
    setSelectedVideo(null);
  };

  const handleBackToDetail = () => {
    setViewMode("detail");
    setSelectedVideo(null);
  };

  const getClassVideos = (classId: string) => {
    // Retornamos los videos del estado que ya se cargaron para la clase seleccionada
    // Si estamos viendo una clase distinta a la que cargamos, retornamos vacio por seguridad
    if (selectedClass && selectedClass.id === classId) {
      return classVideos;
    }
    return [];
  };

  const getClassStudents = (classId: string) => {
    if (selectedClass && selectedClass.id === classId) {
      return classStudentsList;
    }
    return [];
  };

  const getVideoResults = (videoId: string) => {
    const results = mockStudentVideoResults.filter((r) => r.videoId === videoId);
    return results.map((result) => {
      const student = students.find((s) => s.id === result.studentId);
      return {
        ...result,
        studentName: student?.name || "Estudiante desconocido",
        studentEmail: student?.email || "",
      };
    });
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsViewStudentModalOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (selectedStudent && selectedClass) {
      try {
        await api.delete(`/classes/${selectedClass.id}/students/${selectedStudent.id}`);

        // Actualizar lista de estudiantes
        setClassStudentsList(
          classStudentsList.filter((s) => s.id !== selectedStudent.id)
        );

        // Actualizar el contador de estudiantes en la clase
        setClasses(
          classes.map((c) =>
            c.id === selectedClass.id
              ? { ...c, students: Math.max(0, c.students - 1) }
              : c
          )
        );

        // Actualizar también la clase seleccionada para reflejar el cambio inmediato en contador si se muestra
        setSelectedClass({
          ...selectedClass,
          students: Math.max(0, selectedClass.students - 1)
        });

        setIsDeleteStudentModalOpen(false);
        setSelectedStudent(null);
      } catch (error) {
        console.error("Error removing student:", error);
        alert("Error al eliminar el estudiante");
      }
    }
  };

  const getStudentVideoResults = (studentId: string) => {
    return mockStudentVideoResults
      .filter((r) => r.studentId === studentId)
      .map((result) => {
        // Buscar en classVideos en lugar de mockVideos
        const video = classVideos.find((v) => v.id === result.videoId) || mockVideos.find((v) => v.id === result.videoId);
        return {
          ...result,
          videoTitle: video?.title || "Video desconocido",
        };
      });
  };

  // Vista de resultados de estudiantes por video
  if (viewMode === "videoResults" && selectedVideo && selectedClass) {
    const videoResults = realVideoResults;

    return (
      <>
        <Header
          title={selectedVideo.title}
          subtitle={`Resultados de estudiantes - ${selectedClass.name}`}
        />
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          <button
            onClick={handleBackToDetail}
            className="flex items-center gap-2 text-[#616f89] hover:text-[#111318] transition-colors w-fit"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver a {selectedClass.name}</span>
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#111318] mb-2">
                {selectedVideo.title}
              </h2>
              <p className="text-sm text-[#616f89] mb-4">
                {selectedVideo.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-[#616f89]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    schedule
                  </span>
                  <span>{selectedVideo.duration}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    calendar_today
                  </span>
                  <span>{new Date(selectedVideo.uploadDate).toLocaleDateString("es-ES")}</span>
                </span>
              </div>
            </div>

            <div className="border-t border-[#e5e7eb] pt-6">
              <h3 className="text-lg font-semibold text-[#111318] mb-4">
                Resultados de Estudiantes
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e7eb]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#111318]">
                        Estudiante
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#111318]">
                        Nota
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#111318]">
                        Nivel de Atención
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#111318]">
                        Respuestas Correctas
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#111318]">
                        Respuestas Fallidas
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#111318]">
                        Total Preguntas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoResults.map((result) => (
                      <tr
                        key={result.studentId}
                        className="border-b border-[#e5e7eb] hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-[#111318]">
                              {result.studentName}
                            </div>
                            <div className="text-sm text-[#616f89]">
                              {result.studentEmail}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${result.score >= 80
                              ? "bg-green-50 text-green-700"
                              : result.score >= 60
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-red-50 text-red-700"
                              }`}
                          >
                            {result.score}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold capitalize ${result.attentionLevel === "alto"
                              ? "bg-green-50 text-green-700"
                              : result.attentionLevel === "medio"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-red-50 text-red-700"
                              }`}
                          >
                            {result.attentionLevel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#111318]">
                          {result.correctAnswers}
                        </td>
                        <td className="py-3 px-4 text-[#111318]">
                          {result.incorrectAnswers}
                        </td>
                        <td className="py-3 px-4 text-[#111318]">
                          {result.totalQuestions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Vista de detalle de clase con tabs
  if (viewMode === "detail" && selectedClass) {
    // Usamos el estado directo para classVideos (ya definido arriba)
    const classStudents = classStudentsList;

    return (
      <>
        <Header
          title={selectedClass.name}
          subtitle={selectedClass.description}
        />
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-[#616f89] hover:text-[#111318] transition-colors w-fit"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver a Gestión de Clases</span>
          </button>

          {/* Tabs */}
          <div className="border-b border-[#e5e7eb]">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("videos")}
                className={`pb-4 px-2 font-medium transition-colors ${activeTab === "videos"
                  ? "text-primary border-b-2 border-primary"
                  : "text-[#616f89] hover:text-[#111318]"
                  }`}
              >
                Videos ({classVideos.length})
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`pb-4 px-2 font-medium transition-colors ${activeTab === "students"
                  ? "text-primary border-b-2 border-primary"
                  : "text-[#616f89] hover:text-[#111318]"
                  }`}
              >
                Estudiantes ({classStudents.length})
              </button>
            </div>
          </div>

          {/* Tab Content - Videos */}
          {activeTab === "videos" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classVideos.length > 0 ? (
                classVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => handleVideoClick(video)}
                    className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md border border-[#e5e7eb] overflow-hidden transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative h-32 bg-gray-200 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-primary/50">
                          play_circle
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col p-4 flex-1">
                      <h3 className="text-lg font-bold text-[#111318] mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-sm text-[#616f89] line-clamp-2 mb-4">
                        {video.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-[#616f89] mt-auto">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px]">
                            schedule
                          </span>
                          <span>{video.duration}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[18px]">
                            calendar_today
                          </span>
                          <span>
                            {new Date(video.uploadDate).toLocaleDateString("es-ES")}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-[#616f89]">
                  <span className="material-symbols-outlined text-6xl mb-4 block">
                    video_library
                  </span>
                  <p>No hay videos disponibles para esta clase</p>
                </div>
              )}
            </div>
          )}

          {/* Tab Content - Estudiantes */}
          {activeTab === "students" && (
            <div className="bg-white rounded-xl shadow-sm border border-[#e5e7eb] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-gray-50">
                      <th className="text-left py-3 px-6 text-sm font-semibold text-[#111318]">
                        Nombre
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-[#111318]">
                        Email
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-[#111318]">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.length > 0 ? (
                      classStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="border-b border-[#e5e7eb] hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-6 text-[#111318]">
                            {student.name}
                          </td>
                          <td className="py-3 px-6 text-[#616f89]">
                            {student.email}
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewStudent(student)}
                                className="flex items-center justify-center p-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                                title="Ver detalles"
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  visibility
                                </span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsDeleteStudentModalOpen(true);
                                }}
                                className="flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                title="Eliminar de la clase"
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-12 text-center text-[#616f89]"
                        >
                          No hay estudiantes registrados en esta clase
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modales de Estudiante */}
        {/* Modal Ver Estudiante */}
        {isViewStudentModalOpen && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#e5e7eb]">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#111318]">
                    Detalles del Estudiante
                  </h2>
                  <button
                    onClick={() => {
                      setIsViewStudentModalOpen(false);
                      setSelectedStudent(null);
                    }}
                    className="text-[#616f89] hover:text-[#111318] transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[#111318] mb-2">
                    Información Personal
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-[#616f89]">Nombre</label>
                      <p className="text-base text-[#111318] font-medium">
                        {selectedStudent.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-[#616f89]">Email</label>
                      <p className="text-base text-[#111318] font-medium">
                        {selectedStudent.email}
                      </p>
                    </div>
                  </div>
                </div>


              </div>
              <div className="p-6 border-t border-[#e5e7eb] flex justify-end">
                <button
                  onClick={() => {
                    setIsViewStudentModalOpen(false);
                    setSelectedStudent(null);
                  }}
                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Eliminar Estudiante */}
        {isDeleteStudentModalOpen && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                    <span className="material-symbols-outlined text-red-600">
                      warning
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#111318]">
                      Eliminar Estudiante
                    </h2>
                  </div>
                </div>
                <p className="text-[#616f89] mb-6">
                  ¿Estás seguro de que deseas eliminar a{" "}
                  <span className="font-semibold text-[#111318]">
                    {selectedStudent.name}
                  </span>{" "}
                  de esta clase? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setIsDeleteStudentModalOpen(false);
                      setSelectedStudent(null);
                    }}
                    className="px-4 py-2 border border-[#e5e7eb] text-[#111318] rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteStudent}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Vista de lista de clases (por defecto)
  return (
    <>
      <Header
        title="Gestión de Clases"
        subtitle="Crea y administra tus clases, genera códigos de acceso"
      />
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#616f89]">Cargando clases...</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              <div className="w-full md:w-96 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar clases..."
                  className="w-full pl-10 pr-4 h-11 rounded-lg border border-[#dbdfe6] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-[#111318]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={handleNavToCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 whitespace-nowrap"
              >
                <span className="material-symbols-outlined">add</span>
                Crear Nueva Clase
              </button>
            </div>

            {/* Grid of Classes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((classItem) => (
                <div
                  key={classItem.id}
                  onClick={() => handleClassClick(classItem)}
                  className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md border border-[#e5e7eb] overflow-hidden transition-all duration-300 cursor-pointer"
                >
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    {classItem.imageUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${classItem.imageUrl})` }}
                      ></div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-200"></div>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="bg-white/90 text-gray-700 p-1.5 rounded-lg backdrop-blur-sm hover:bg-white">
                        <span className="material-symbols-outlined text-[20px]">
                          more_vert
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col p-5 flex-1">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-[#111318] mb-1 line-clamp-1">
                        {classItem.name}
                      </h3>
                      <p className="text-sm text-[#616f89] line-clamp-2">
                        {classItem.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mb-5 text-sm text-[#616f89]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">
                          group
                        </span>
                        <span>{classItem.students} Estudiantes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">
                          video_library
                        </span>
                        <span>{classItem.videos} Videos</span>
                      </div>
                    </div>
                    <div className="mt-auto border-t border-[#e5e7eb] pt-4 flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClass(classItem);
                            setIsCodeModalOpen(true);
                          }}
                          className="flex items-center justify-center p-2 rounded-lg text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                          title="Generar Código"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            vpn_key
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClass(classItem);
                            setIsEditModalOpen(true);
                          }}
                          className="flex items-center justify-center p-2 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors"
                          title="Editar Clase"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            edit
                          </span>
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClass(classItem);
                          setIsDeleteModalOpen(true);
                        }}
                        className="flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar Clase"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateClass}
      />
      <EditClassModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedClass(null);
        }}
        classItem={selectedClass}
        onSave={handleEditClass}
      />
      <CodeModal
        isOpen={isCodeModalOpen}
        onClose={() => {
          setIsCodeModalOpen(false);
          setSelectedClass(null);
        }}
        classItem={selectedClass}
        onSave={handleSaveCode}
      />
      <DeleteClassModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedClass(null);
        }}
        classItem={selectedClass}
        onDelete={handleDeleteClass}
      />

      {/* Modal Ver Estudiante */}
      {isViewStudentModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e5e7eb]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#111318]">
                  Detalles del Estudiante
                </h2>
                <button
                  onClick={() => {
                    setIsViewStudentModalOpen(false);
                    setSelectedStudent(null);
                  }}
                  className="text-[#616f89] hover:text-[#111318] transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#111318] mb-2">
                  Información Personal
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-[#616f89]">Nombre</label>
                    <p className="text-base text-[#111318] font-medium">
                      {selectedStudent.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-[#616f89]">Email</label>
                    <p className="text-base text-[#111318] font-medium">
                      {selectedStudent.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#e5e7eb] pt-6">
                <h3 className="text-lg font-semibold text-[#111318] mb-4">
                  Resultados por Video
                </h3>
                {getStudentVideoResults(selectedStudent.id).length > 0 ? (
                  <div className="space-y-4">
                    {getStudentVideoResults(selectedStudent.id).map(
                      (result, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 border border-[#e5e7eb]"
                        >
                          <h4 className="font-medium text-[#111318] mb-3">
                            {result.videoTitle}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <label className="text-xs text-[#616f89]">
                                Nota
                              </label>
                              <p
                                className={`text-lg font-semibold ${result.score >= 80
                                  ? "text-green-700"
                                  : result.score >= 60
                                    ? "text-yellow-700"
                                    : "text-red-700"
                                  }`}
                              >
                                {result.score}%
                              </p>
                            </div>
                            <div>
                              <label className="text-xs text-[#616f89]">
                                Nivel de Atención
                              </label>
                              <p
                                className={`text-sm font-semibold capitalize ${result.attentionLevel === "alto"
                                  ? "text-green-700"
                                  : result.attentionLevel === "medio"
                                    ? "text-yellow-700"
                                    : "text-red-700"
                                  }`}
                              >
                                {result.attentionLevel}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs text-[#616f89]">
                                Correctas
                              </label>
                              <p className="text-lg font-semibold text-[#111318]">
                                {result.correctAnswers}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs text-[#616f89]">
                                Fallidas
                              </label>
                              <p className="text-lg font-semibold text-[#111318]">
                                {result.incorrectAnswers}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs text-[#616f89]">
                                Total
                              </label>
                              <p className="text-lg font-semibold text-[#111318]">
                                {result.totalQuestions}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-[#616f89] text-center py-8">
                    El estudiante no ha completado ningún video aún.
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-[#e5e7eb] flex justify-end">
              <button
                onClick={() => {
                  setIsViewStudentModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Estudiante */}
      {isDeleteStudentModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                  <span className="material-symbols-outlined text-red-600">
                    warning
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#111318]">
                    Eliminar Estudiante
                  </h2>
                </div>
              </div>
              <p className="text-[#616f89] mb-6">
                ¿Estás seguro de que deseas eliminar a{" "}
                <span className="font-semibold text-[#111318]">
                  {selectedStudent.name}
                </span>{" "}
                de esta clase? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsDeleteStudentModalOpen(false);
                    setSelectedStudent(null);
                  }}
                  className="px-4 py-2 border border-[#e5e7eb] text-[#111318] rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteStudent}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GestiónClasesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#616f89]">Cargando...</div>}>
      <GestiónClasesContent />
    </Suspense>
  );
}

