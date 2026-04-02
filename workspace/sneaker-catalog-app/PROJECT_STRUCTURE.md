# Estructura del Proyecto - Catálogo de Tenis

## Organización General
```
sneaker-catalog-app/
├── frontend/                 # React + TypeScript + Vite
├── backend/                  # Node.js + Express + TypeScript
├── shared/                   # Tipos compartidos
├── docs/                     # Documentación
├── scripts/                  # Scripts de automatización
├── .github/                  # GitHub Actions
├── docker-compose.yml        # Desarrollo local
├── package.json              # Scripts raíz
└── README.md
```

## Frontend Structure
```
frontend/
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/           # Componentes reutilizables
│   │   ├── common/          # Componentes genéricos
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Loading/
│   │   │   └── index.ts
│   │   ├── layout/          # Componentes de layout
│   │   │   ├── Header/
│   │   │   ├── Footer/
│   │   │   ├── Sidebar/
│   │   │   └── Layout/
│   │   └── sneaker/         # Componentes específicos
│   │       ├── SneakerCard/
│   │       ├── SneakerGrid/
│   │       ├── SneakerDetail/
│   │       ├── SneakerFilters/
│   │       └── SneakerSearch/
│   ├── pages/               # Páginas principales
│   │   ├── Home/
│   │   ├── Catalog/
│   │   ├── SneakerDetail/
│   │   ├── Profile/
│   │   ├── Favorites/
│   │   ├── Admin/
│   │   ├── Auth/
│   │   │   ├── Login/
│   │   │   └── Register/
│   │   └── NotFound/
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useSneakers.ts
│   │   ├── useFavorites.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   ├── services/            # API services
│   │   ├── api.ts          # Axios config
│   │   ├── auth.service.ts
│   │   ├── sneaker.service.ts
│   │   ├── user.service.ts
│   │   └── upload.service.ts
│   ├── stores/              # Estado global (Zustand)
│   │   ├── authStore.ts
│   │   ├── sneakerStore.ts
│   │   ├── favoriteStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript definitions
│   │   ├── auth.types.ts
│   │   ├── sneaker.types.ts
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   ├── utils/               # Utilidades
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── storage.ts
│   ├── assets/              # Recursos estáticos
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── .env.example
```

## Backend Structure
```
backend/
├── src/
│   ├── controllers/         # Controladores de rutas
│   │   ├── auth.controller.ts
│   │   ├── sneaker.controller.ts
│   │   ├── user.controller.ts
│   │   ├── category.controller.ts
│   │   └── upload.controller.ts
│   ├── models/              # Modelos de Mongoose
│   │   ├── User.model.ts
│   │   ├── Sneaker.model.ts
│   │   ├── Category.model.ts
│   │   └── index.ts
│   ├── routes/              # Definición de rutas
│   │   ├── auth.routes.ts
│   │   ├── sneaker.routes.ts
│   │   ├── user.routes.ts
│   │   ├── category.routes.ts
│   │   ├── upload.routes.ts
│   │   └── index.ts
│   ├── middleware/          # Middlewares
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── services/            # Servicios de negocio
│   │   ├── auth.service.ts
│   │   ├── sneaker.service.ts
│   │   ├── user.service.ts
│   │   ├── email.service.ts
│   │   └── cloudinary.service.ts
│   ├── utils/               # Utilidades
│   │   ├── database.ts
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── validators.ts
│   │   ├── constants.ts
│   │   └── logger.ts
│   ├── config/              # Configuraciones
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── cloudinary.config.ts
│   │   └── app.config.ts
│   ├── types/               # Tipos TypeScript
│   │   ├── auth.types.ts
│   │   ├── sneaker.types.ts
│   │   ├── user.types.ts
│   │   └── express.types.ts
│   ├── seeders/             # Datos de prueba
│   │   ├── users.seeder.ts
│   │   ├── sneakers.seeder.ts
│   │   ├── categories.seeder.ts
│   │   └── index.ts
│   ├── tests/               # Tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── helpers/
│   ├── app.ts               # Configuración Express
│   └── server.ts            # Punto de entrada
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── nodemon.json
```

## Shared Types
```
shared/
├── types/
│   ├── sneaker.types.ts     # Tipos compartidos de sneakers
│   ├── user.types.ts        # Tipos compartidos de usuarios
│   ├── api.types.ts         # Tipos de respuestas API
│   └── common.types.ts      # Tipos comunes
├── constants/
│   ├── brands.ts            # Lista de marcas
│   ├── categories.ts        # Categorías disponibles
│   └── sizes.ts             # Sistemas de tallas
└── utils/
    ├── validators.ts        # Validadores compartidos
    └── formatters.ts        # Formateadores compartidos
```

## Convenciones de Archivos

### Naming Conventions
- **Componentes React**: PascalCase (SneakerCard.tsx)
- **Hooks**: camelCase con prefijo 'use' (useAuth.ts)
- **Services**: camelCase con sufijo '.service' (auth.service.ts)
- **Types**: camelCase con sufijo '.types' (sneaker.types.ts)
- **Utils**: camelCase (formatters.ts)
- **Constants**: UPPER_SNAKE_CASE (API_ENDPOINTS.ts)

### Estructura de Componentes
```typescript
// SneakerCard/SneakerCard.tsx
import React from 'react';
import { SneakerCardProps } from './SneakerCard.types';
import './SneakerCard.styles.css'; // si es necesario

const SneakerCard: React.FC<SneakerCardProps> = ({ sneaker, onFavorite }) => {
  // Component logic
  return (
    // JSX
  );
};

export default SneakerCard;
```

```typescript
// SneakerCard/SneakerCard.types.ts
import { Sneaker } from '../../types/sneaker.types';

export interface SneakerCardProps {
  sneaker: Sneaker;
  onFavorite?: (id: string) => void;
  showFavorite?: boolean;
}
```

```typescript
// SneakerCard/index.ts
export { default } from './SneakerCard';
export type { SneakerCardProps } from './SneakerCard.types';
```

### Estructura de Páginas
```typescript
// pages/Catalog/Catalog.tsx
import React from 'react';
import { useSneakers } from '../../hooks/useSneakers';
import { SneakerGrid, SneakerFilters } from '../../components/sneaker';
import { Layout } from '../../components/layout';

const CatalogPage: React.FC = () => {
  // Page logic
  return (
    <Layout>
      {/* Page content */}
    </Layout>
  );
};

export default CatalogPage;
```

## Configuraciones Importantes

### TypeScript Config (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/pages/*": ["src/pages/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Vite Config (vite.config.ts)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

## Scripts de Automatización

### Component Generator
```bash
# scripts/generate-component.sh
#!/bin/bash
COMPONENT_NAME=$1
COMPONENT_PATH="src/components/common/$COMPONENT_NAME"

mkdir -p $COMPONENT_PATH

# Crear archivos del componente
echo "Generando componente $COMPONENT_NAME..."
# Templates para tsx, types, test, index
```

### Database Seeder
```bash
# scripts/seed-db.sh
#!/bin/bash
echo "Seeding database..."
cd backend && npm run seed
echo "Database seeded successfully!"
```

Esta estructura garantiza escalabilidad, mantenibilidad y facilita el trabajo en equipo con separación clara de responsabilidades.