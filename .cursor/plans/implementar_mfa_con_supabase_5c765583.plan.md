---
name: Implementar MFA con Supabase
overview: Implementar autenticación de dos factores (MFA) usando TOTP de Supabase. Incluye activación/desactivación desde el Header del Admin, activación en la página twoauth, y manejo del flujo de login con MFA.
todos:
  - id: create-mfa-service
    content: Crear servicio MFA (mfaService.ts) con funciones enroll, verify, listFactors, unenroll, challengeAndVerify
    status: completed
  - id: create-mfa-hook
    content: Crear hook useMFA.ts para gestión reactiva del estado MFA
    status: completed
    dependencies:
      - create-mfa-service
  - id: create-user-hook
    content: Crear hook useCurrentUser.ts para obtener usuario actual de Supabase
    status: completed
  - id: create-mfa-modal
    content: Crear componente MFAActivationModal.tsx para mostrar QR y verificar código
    status: completed
    dependencies:
      - create-mfa-service
  - id: create-dropdown
    content: Crear componente MFADropdown.tsx para menú del perfil con opciones MFA
    status: completed
    dependencies:
      - create-mfa-hook
      - create-user-hook
  - id: update-header
    content: Modificar Header.tsx para integrar dropdown y lógica MFA
    status: completed
    dependencies:
      - create-dropdown
      - create-mfa-modal
  - id: update-twoauth
    content: Modificar twoauth/page.tsx para manejar activación y verificación de login con MFA
    status: completed
    dependencies:
      - create-mfa-service
  - id: update-login
    content: Modificar login/page.tsx para detectar MFA requerido y redirigir apropiadamente
    status: completed
    dependencies:
      - create-mfa-service
---

# Implementa

r MFA (Multi-Factor Authentication) con Supabase

## Resumen

Implementar autenticación de dos factores usando TOTP (Google Authenticator) con Supabase. El sistema permitirá a todos los usuarios activar/desactivar MFA desde el Header, activar MFA en la página `/twoauth`, y manejar el flujo de login cuando el usuario tiene MFA habilitado.

## Archivos a modificar

### 1. Frontend - Servicios y utilidades

**`frontend/src/services/auth/mfaService.ts`** (nuevo)

- Servicio para manejar operaciones MFA:
- `enrollMFA()`: Crear factor TOTP y obtener QR
- `verifyMFA()`: Verificar código durante activación
- `listFactors()`: Listar factores del usuario
- `unlistFactor()`: Eliminar factor (desactivar MFA)
- `challengeAndVerify()`: Verificar código durante login
- `hasActiveMFA()`: Verificar si usuario tiene MFA activo

### 2. Frontend - Componentes

**`frontend/src/components/Admin/Header.tsx`**

- Agregar estado para dropdown del perfil
- Implementar dropdown que aparece al hacer click en foto de perfil
- Mostrar estado actual de MFA (activado/desactivado)
- Botones para activar/desactivar MFA
- Integrar con `mfaService`

**`frontend/src/components/Admin/MFAActivationModal.tsx`** (nuevo)

- Modal para activar MFA:
- Mostrar QR code
- Campo para código de verificación
- Instrucciones para escanear con Google Authenticator
- Mostrar código de backup (secret)

**`frontend/src/components/Admin/MFADropdown.tsx`** (nuevo)

- Componente dropdown reutilizable para el menú del perfil
- Opciones: Ver perfil, Activar/Desactivar MFA, Cerrar sesión

### 3. Frontend - Páginas

**`frontend/app/(auth)/twoauth/page.tsx`**

- Reemplazar lógica mock con Supabase MFA real:
- Si viene desde login (con usuario autenticado parcialmente): mostrar verificación MFA para login
- Si es activación directa: mostrar flujo de enroll + verificación
- Integrar con `mfaService` para `challengeAndVerify` o `enrollMFA` + `verifyMFA`
- Manejar estados: `enrolling`, `verifying`, `activated`

**`frontend/app/(auth)/login/page.tsx`**

- Detectar cuando usuario tiene MFA activo:
- Si `data.session === null && data.user !== null`: usuario existe pero requiere MFA
- Redirigir a `/twoauth` con información necesaria (email, factorId)
- Guardar información temporal para continuar el flujo

### 4. Hooks personalizados

**`frontend/src/hooks/useMFA.ts`** (nuevo)

- Hook para gestionar estado MFA:
- `isMFAEnabled`: estado actual
- `loading`: estado de carga
- `enrollMFA`: función para activar
- `disableMFA`: función para desactivar
- `checkMFAStatus`: verificar estado actual

**`frontend/src/hooks/useCurrentUser.ts`** (nuevo)

- Hook para obtener usuario actual:
- Obtener sesión con `supabase.auth.getSession()`
- Retornar datos del usuario para Header

## Flujos de implementación

### Flujo 1: Activación de MFA desde Header

```mermaid
sequenceDiagram
    participant U as Usuario
    participant H as Header
    participant M as MFAService
    participant S as Supabase

    U->>H: Click en foto de perfil
    H->>H: Mostrar dropdown
    U->>H: Click "Activar MFA"
    H->>M: enrollMFA()
    M->>S: auth.mfa.enroll({factorType: 'totp'})
    S-->>M: {qr_code, secret, id}
    M-->>H: Datos QR
    H->>H: Mostrar modal con QR
    U->>U: Escanea QR con Google Authenticator
    U->>H: Ingresa código de 6 dígitos
    H->>M: verifyMFA(factorId, code)
    M->>S: auth.mfa.verify({factorId, code})
    S-->>M: Success
    M-->>H: MFA activado
    H->>H: Actualizar estado en dropdown
```



### Flujo 2: Login con MFA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant L as LoginPage
    participant T as TwoAuthPage
    participant M as MFAService
    participant S as Supabase

    U->>L: Ingresa email y password
    L->>S: signInWithPassword()
    S-->>L: {user: {...}, session: null}
    L->>L: Detectar MFA requerido
    L->>T: Redirigir a /twoauth
    U->>T: Ingresa código de 6 dígitos
    T->>M: challengeAndVerify(factorId, code)
    M->>S: auth.mfa.challengeAndVerify()
    S-->>M: {session: {...}}
    M-->>T: Sesión completa
    T->>T: Redirigir según rol
```



### Flujo 3: Desactivación de MFA

```mermaid
sequenceDiagram
    participant U as Usuario
    participant H as Header
    participant M as MFAService
    participant S as Supabase

    U->>H: Click en foto de perfil
    H->>H: Mostrar dropdown
    U->>H: Click "Desactivar MFA"
    H->>H: Confirmar acción
    H->>M: disableMFA(factorId)
    M->>M: listFactors()
    M->>S: auth.mfa.unenroll({factorId})
    S-->>M: Success
    M-->>H: MFA desactivado
    H->>H: Actualizar estado en dropdown
```



## Consideraciones técnicas

1. **Estado del usuario durante login con MFA**: Cuando `session === null` pero `user !== null`, el usuario está autenticado parcialmente. Necesitamos guardar esta información temporalmente (localStorage o query params).
2. **Manejo de errores**: 

- Código inválido durante verificación
- Usuario sin factores MFA activos
- Error de red

3. **Experiencia de usuario**:

- Mostrar loading states durante operaciones async
- Mensajes de error claros
- Confirmación antes de desactivar MFA

4. **Persistencia de estado MFA**: Verificar estado MFA al cargar Header usando `listFactors()`.

## Dependencias

- Ya instaladas: `@supabase/supabase-js`, `@supabase/ssr`
- No se requieren dependencias adicionales

## Pasos de implementación

1. Crear `mfaService.ts` con todas las funciones MFA
2. Crear hook `useMFA.ts` para estado reactivo
3. Crear hook `useCurrentUser.ts` para obtener usuario actual
4. Crear componente `MFAActivationModal.tsx`
5. Crear componente `MFADropdown.tsx`