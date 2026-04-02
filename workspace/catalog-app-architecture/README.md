# Catálogo App - Arquitectura del Sistema

## Descripción General
Aplicación web moderna para gestión de catálogos de productos con funcionalidades CRUD, búsqueda avanzada, categorización y gestión de usuarios.

## Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Autenticación**: JWT + bcrypt
- **Almacenamiento**: AWS S3 (imágenes)
- **Testing**: Jest + React Testing Library
- **Deployment**: Docker + Docker Compose

## Estructura del Proyecto
```
catalog-app/
├── frontend/          # React TypeScript App
├── backend/           # Node.js API
├── database/          # Scripts y migraciones
├── docker/            # Configuración Docker
└── docs/              # Documentación
```

## Próximos Pasos
1. Revisar arquitectura detallada en `/docs/`
2. Implementar backend API
3. Desarrollar frontend React
4. Configurar base de datos
5. Implementar testing
6. Setup deployment