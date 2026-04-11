# Implementación de Mensajes Directos (DMs) - GigaChat

## 📋 Resumen

Se ha implementado completamente la funcionalidad de **Mensajes Directos (DMs)** entre amigos usando Socket.io en tiempo real, siguiendo la arquitectura existente del proyecto sin hardcodeo y aplicando buenas prácticas de programación.

---

## 🔄 Flujo de Funcionamiento

### 1. **Crear DM automáticamente al aceptar amistad**
   - Cuando el usuario A acepta la solicitud de amistad del usuario B
   - Se ejecuta el trigger `trg_friendships_create_dm` en la BD
   - Se crea automáticamente un chat tipo `dm` con ambos usuarios
   - Ambos usuarios se agregan como miembros del DM

### 2. **Cargar lista de DMs**
   - El frontend carga los DMs del usuario al montar el componente
   - Se llama a `GET /chats/dms` que retorna todos los DMs activos
   - Los DMs se muestran en el sidebar junto a los canales

### 3. **Abrir una conversación directa**
   - Usuario hace click en el botón 💬 de un amigo
   - Se llama a `GET /chats/dms/:friendId` 
   - El backend obtiene o crea el DM entre los dos amigos
   - Se cargan los mensajes históricos
   - Se suscribe al socket.io en tiempo real

### 4. **Enviar mensajes en tiempo real**
   - El evento `message:send` valida que sea DM válido con `isActiveParticipant`
   - Se crea el mensaje en la BD con el mismo sistema de chat global
   - Se emite en tiempo real a través de `io.to(chatRoom(chatId))`
   - Se usa deduplicación por `clientMessageId` igual que en canales

---

## 📂 Archivos Modificados

### Backend

#### **Nueva migración:**
- `backend/db/migrations/04102026_0000_create_dm_on_friendship_accepted.sql`
  - Función trigger que crea DMs automáticamente
  - Mantiene consistencia: siempre user1_id < user2_id
  - Índice único para evitar duplicados

#### **Backend - Servicio (`backend/src/chats/service.js`):**
```javascript
// Nuevas funciones:
- isAcceptedFriend(userId1, userId2)           // Valida amistad aceptada
- getOrCreateDMWithFriend(userId, friendId)   // Obtiene o crea DM
- listUserDMs(userId)                          // Lista todos los DMs del usuario
- isDMChatBetweenFriends(userId, chatId)       // Valida si es DM válido
- isActiveParticipant(userId, chatId)          // Valida acceso a chat (genérico)
```

#### **Backend - Controlador (`backend/src/chats/controller.js`):**
```javascript
// Nuevas funciones:
- getDMChats()                    // GET /chats/dms
- openOrCreateDMWithFriend()      // GET /chats/dms/:friendId
```

#### **Backend - Rutas (`backend/src/chats/routes.js`):**
```
GET  /chats/dms              → Listar DMs del usuario
GET  /chats/dms/:friendId    → Obtener o crear DM con amigo
```

#### **Backend - Socket (`backend/src/chats/socket.handlers.js`):**
- Actualizado `chat:subscribe` para usar `isActiveParticipant`
- Actualizado `message:send` para usar `isActiveParticipant`
- Socket.io valida automáticamente acceso a DMs

### Frontend

#### **Servicio de Chat (`frontend/src/services/chatService.js`):**
```javascript
// Nuevos métodos:
- getDMs()                       // Cargar lista de DMs
- openDMWithFriend(friendId)    // Obtener o crear DM con amigo
```

#### **Composable (`frontend/src/composables/useDashboardView.js`):**
```javascript
// Nuevas variables:
- dms                    // Array de DM conversations
- loadingDMs            // Estado de carga de DMs

// Nuevas funciones:
- createDMConversation()       // Crear objeto conversation para DM
- loadDMs()                    // Cargar DMs del usuario
- openDMWithFriend()           // Abrir DM con un amigo
- loadConversationMessages()   // Cargar mensajes de una conversación
- selectConversation()         // Actualizado para soportar DMs

// Actualizado:
- onMounted()           // Ahora carga DMs al iniciar
```

#### **Componente (`frontend/src/components/DashboardView.vue`):**
- Nueva sección "Mensajes Directos" en el sidebar
- Botón 💬 en la lista de amigos para iniciar DM
- Los DMs se muestran al lado de los Canales
- Mismo componente de chat para ambos tipos de conversación

---

## 🔐 Seguridad

### Validaciones implementadas:

1. **Solo amigos aceptados pueden chatear:**
   - Validación en `isAcceptedFriend()` en backend
   - Validación en `getOrCreateDMWithFriend()` antes de crear
   - Socket.io rechaza mensajes en DMs no válidos

2. **Permiso de acceso bidireccional:**
   - `isDMChatBetweenFriends()` valida que el usuario esté en el DM
   - `isActiveParticipant()` permite acceso a canales Y DMs

3. **No hay hardcodeo:**
   - Todas las IDs se pasan dinámicamente desde el cliente
   - Backend valida cada acción
   - Usuario solo puede ver sus propios DMs

4. **Validación de amistad antes de crear:**
   ```sql
   -- En la migración:
   SELECT * FROM friendships 
   WHERE status = 'accepted' AND user_pair_is_valid
   ```

---

## 🌐 Arquitectura

### Diagrama de flujo:

```
Usuario A                                  Usuario B
    |                                           |
    ├─ Envía solicitud amistad ─────────────────┤
    |                                           |
    |                                      [Verifica]
    |    [Acepta solicitud] ◄────────────────┤
    |           |
    |        [Trigger BD]
    |    Crea DM chat
    |    - Ambos como miembros
    |
    ├─ GET /chats/dms (Carga DMs)
    |    └─ Backend retorna: {id, friend_name, friend_username}
    |
    ├─ Click en Amigo 💬
    |    └─ openDMWithFriend(friendId)
    |    └─ GET /chats/dms/:friendId
    |    └─ Backend: getOrCreateDMWithFriend()
    |    └─ Retorna chat ID
    |
    ├─ GET /chats/:chatId/messages (Cargar histórico)
    |
    ├─ Socket.subscribe(chatId)
    |    └─ Backend valida: isActiveParticipant()
    |    └─ Join a room: io.to(chatRoom(chatId))
    |
    ├─ message:send {chatId, body, clientMessageId}
    |    └─ Backend valida: isActiveParticipant()
    |    └─ Guarda en BD
    |    └─ Emite a room: io.to(chatRoom(chatId)).emit("message:new")
    |    └─ Ambos usuarios reciben en tiempo real
```

---

## 💾 Base de Datos

### Tablas utilizadas:

```sql
-- chats (existente, con soporte para DMs)
type = 'dm'
dm_user1_id UUID         -- Usuario con ID menor
dm_user2_id UUID         -- Usuario con ID mayor

-- chat_members (existente)
-- Ambos usuarios se agregan con role='member'

-- chat_messages (existente)
-- Mismos mensajes que canales, sin diferencia

-- friendships (existente)
status = 'accepted'      -- Solo amigos aceptados pueden DM
```

### Índices:
```sql
-- Índice único para evitar duplicados:
CREATE UNIQUE INDEX ux_chats_dm_pair
  ON chats (LEAST(dm_user1_id, dm_user2_id), GREATEST(dm_user1_id, dm_user2_id))
  WHERE type = 'dm';
```

---

## 📡 Socket.io Events

### Eventos existentes (trabajan para DMs):
- `chat:subscribe` → Suscribir a conversación (panel + DM)
- `chat:unsubscribe` → Desuscribir de conversación
- `message:send` → Enviar mensaje (global, grupo, o DM)
- `message:edit` → Editar mensaje (solo si es el autor)
- `message:delete` → Eliminar mensaje (solo si es el autor)
- `message:new` → Evento en tiempo real cuando llega mensaje

**Nota:** No fue necesario crear nuevos eventos. El sistema existente soporta DMs transparentemente.

---

## ✅ Buenas Prácticas Aplicadas

1. **Separación de responsabilidades:**
   - Lógica de BD en service.js
   - Validaciones en controlador
   - UI en componentes Vue

2. **Reutilización de código:**
   - Mismo sistema de mensajes para chats y DMs
   - Mismo socket.io para ambos tipos
   - Mismo formato de conversaciones

3. **Validaciones en múltiples capas:**
   - Frontend: Validación de UI
   - Rutas: requireAuth middleware
   - Controlador: Validación básica
   - Service: Validaciones de negocio
   - Socket.io: Validaciones de acceso

4. **Sin hardcodeo:**
   - Todas las IDs dinámicas
   - Configuración centralizada
   - Datos desde BD, no hardcodeados

5. **Escalabilidad:**
   - Estructura facilita agregar más tipos de chat
   - Socket.io usa salas genéricas
   - Lógica de negocio separada de transporte

6. **Manejo de errores:**
   - Try-catch en funciones async
   - Mensajes de error descriptivos
   - Fallback en caso de fallo

---

## 🚀 Cómo Usar

### 1. **Ejecutar las migraciones:**
```bash
npm run migrate
```
Esto ejecutará la migración que crea la función trigger para DMs.

### 2. **Iniciar la aplicación:**
```bash
npm run dev:back    # Terminal 1
npm run dev:front   # Terminal 2
```

### 3. **Flujo de usuario:**

1. **Agregar amigo:**
   - Panel Social → Tab "Solicitudes"
   - Ingresa username del amigo
   - Click "Enviar"

2. **Aceptar solicitud:**
   - Panel Social → Verifica solicitudes entrantes
   - Click "Aceptar" (se crea DM automáticamente)

3. **Enviar DM:**
   - Panel Social → Tab "Amigos"
   - Click botón 💬 junto a un amigo
   - Se abre el DM en el sidebar
   - Escribe y envía mensaje

4. **Ver histórico:**
   - Los mensajes se cargan automáticamente
   - Funciona igual que en canales

---

## 🔍 Testing recomendado

```javascript
// Test 1: Crear DM al aceptar amistad
1. Usuario A envía solicitud a Usuario B
2. Usuario B acepta
3. Verificar que se creó chat tipo 'dm' en BD
4. Verificar que ambos usuarios están en chat_members

// Test 2: Cargar DMs
1. GET /chats/dms (auth como Usuario A)
2. Debe retornar el DM con info del Usuario B

// Test 3: Enviar mensaje
1. Socket.subscribe al DM chatId
2. message:send con body
3. Ambos usuarios reciben "message:new" en tiempo real

// Test 4: Validaciones
1. Intentar enviar DM a usuario que no es amigo → Error 404
2. Intentar suscribirse a DM sin permisos → Error 403
3. Intentar editar/eliminar mensaje de otro → Error 403
```

---

## 📝 Notas Técnicas

- **Deduplicación de mensajes:** El frontend genera `clientMessageId` (UUID) para deduplicar mensajes optimistas
- **Ordenamiento de usuarios:** Siempre user1_id < user2_id para consistencia
- **Trigger en BD:** Se ejecuta automáticamente, no requiere lógica en backend
- **Socket.io rooms:** Formato genérico `chatId` funciona para ambos tipos
- **Índices únicos:** Previenen creación de múltiples DMs entre mismo par

---

## 🎯 Próximas mejoras opcionales

1. Indicador de "escribiendo..."
2. Marcar como leído/no leído
3. Notificaciones de nuevos DMs
4. Avatar del usuario en DM
5. Typing indicators
6. Reacciones a mensajes
7. Pins en DMs
8. Búsqueda en DMs
9. Exportar conversación

---

**Implementación completada:** ✅  
**Fecha:** 10 de April de 2026  
**Desarrollador:** GitHub Copilot
