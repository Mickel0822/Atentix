// Datos mockeados de usuarios - después se cambiará por datos reales
export interface MockUser {
  id: string;
  email: string;
  username: string;
  password: string;
  fullName: string;
  role: "student" | "professor" | "admin";
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: "1",
    email: "estudiante@universidad.edu",
    username: "estudiante1",
    password: "password123",
    fullName: "Juan Pérez",
    role: "student",
    twoFactorEnabled: true,
    twoFactorSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "2",
    email: "profesor@universidad.edu",
    username: "profesor1",
    password: "password123",
    fullName: "María García",
    role: "professor",
    twoFactorEnabled: true,
    twoFactorSecret: "JBSWY3DPEHPK3PXP",
  },
  {
    id: "3",
    email: "admin@universidad.edu",
    username: "admin1",
    password: "password123",
    fullName: "Carlos Rodríguez",
    role: "admin",
    twoFactorEnabled: false,
  },
  {
    id: "4",
    email: "estudiante2@universidad.edu",
    username: "estudiante2",
    password: "password123",
    fullName: "Ana López",
    role: "student",
    twoFactorEnabled: false,
  },
];

// Función helper para buscar usuario por email o username
export function findUserByEmailOrUsername(
  emailOrUsername: string
): MockUser | undefined {
  return mockUsers.find(
    (user) =>
      user.email.toLowerCase() === emailOrUsername.toLowerCase() ||
      user.username.toLowerCase() === emailOrUsername.toLowerCase()
  );
}

// Función helper para validar credenciales
export function validateCredentials(
  emailOrUsername: string,
  password: string
): MockUser | null {
  const user = findUserByEmailOrUsername(emailOrUsername);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

