# Arquitectura del Sistema - Catálogo App

## Patrón Arquitectónico
**Arquitectura en Capas (Layered Architecture)** con separación clara entre:
- Presentación (React Frontend)
- Lógica de Negocio (Express API)
- Acceso a Datos (Prisma + PostgreSQL)

## Componentes Principales

### 1. Frontend (React + TypeScript)
```
src/
├── components/        # Componentes reutilizables
├── pages/            # Páginas/Vistas principales
├── hooks/            # Custom hooks
├── services/         # API calls
├── store/            # Estado global (Zustand)
├── types/            # TypeScript definitions
├── utils/            # Utilidades
└── styles/           # Estilos globales
```

### 2. Backend (Node.js + Express)
```
src/
├── controllers/      # Controladores de rutas
├── services/         # Lógica de negocio
├── repositories/     # Acceso a datos
├── middleware/       # Middlewares
├── models/           # Modelos de datos
├── routes/           # Definición de rutas
├── utils/            # Utilidades
└── config/           # Configuraciones
```

### 3. Base de Datos
- **PostgreSQL** como base principal
- **Prisma** como ORM
- **Redis** para caché (opcional)

## Patrones de Diseño Aplicados

### Backend
- **Repository Pattern**: Abstracción del acceso a datos
- **Service Layer**: Lógica de negocio separada
- **Dependency Injection**: Inyección de dependencias
- **Factory Pattern**: Creación de objetos complejos

### Frontend
- **Component Pattern**: Componentes reutilizables
- **Custom Hooks**: Lógica reutilizable
- **Provider Pattern**: Gestión de estado
- **Observer Pattern**: Reactividad con Zustand

## Principios SOLID Aplicados
- **SRP**: Cada clase/función tiene una responsabilidad
- **OCP**: Abierto para extensión, cerrado para modificación
- **LSP**: Sustitución de Liskov en interfaces
- **ISP**: Interfaces segregadas
- **DIP**: Dependencias invertidas