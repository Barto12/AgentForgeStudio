# Especificaciones Técnicas - Catálogo de Tenis

## Requerimientos del Sistema

### Funcionales
1. **Gestión de Usuarios**
   - Registro con email/username
   - Login/logout con JWT
   - Perfil de usuario editable
   - Sistema de roles (user/admin)

2. **Catálogo de Productos**
   - Visualización de tenis en grid/lista
   - Detalle completo del producto
   - Múltiples imágenes por producto
   - Información técnica (tallas, colores, etc.)

3. **Búsqueda y Filtrado**
   - Búsqueda por texto libre
   - Filtros por marca, precio, talla, color
   - Ordenamiento (precio, fecha, popularidad)
   - Resultados paginados

4. **Sistema de Favoritos**
   - Agregar/quitar de favoritos
   - Lista personal de favoritos
   - Contador de favoritos por producto

5. **Administración**
   - CRUD completo de productos
   - Gestión de categorías y marcas
   - Upload masivo de imágenes
   - Dashboard con estadísticas

### No Funcionales
- **Performance**: < 3s tiempo de carga inicial
- **Disponibilidad**: 99.5% uptime
- **Seguridad**: Encriptación de passwords, validación de inputs
- **Escalabilidad**: Soportar 1000+ productos, 100+ usuarios concurrentes
- **Usabilidad**: Responsive, accesible (WCAG AA)

## Arquitectura de Datos

### Esquemas MongoDB

```javascript
// Sneaker Schema
{
  _id: ObjectId,
  name: String (required, index),
  brand: String (required, index),
  model: String (required),
  colorway: String,
  sku: String (unique),
  releaseDate: Date,
  price: {
    retail: Number,
    current: Number
  },
  sizes: [{
    us: Number,
    eu: Number,
    uk: Number,
    available: Boolean
  }],
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],
  description: String,
  features: [String],
  category: String (index),
  tags: [String],
  stats: {
    views: Number (default: 0),
    favorites: Number (default: 0)
  },
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

// User Schema
{
  _id: ObjectId,
  email: String (required, unique, index),
  username: String (required, unique, index),
  password: String (required, hashed),
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String
  },
  role: String (enum: ['user', 'admin'], default: 'user'),
  favorites: [ObjectId] (ref: 'Sneaker'),
  preferences: {
    brands: [String],
    sizeRange: {
      min: Number,
      max: Number
    }
  },
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}

// Category Schema
{
  _id: ObjectId,
  name: String (required, unique),
  slug: String (required, unique, index),
  description: String,
  image: String,
  parentCategory: ObjectId (ref: 'Category'),
  isActive: Boolean (default: true),
  createdAt: Date
}
```

## API Design

### Estructura de Respuesta
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Endpoints Detallados

#### Autenticación
```
POST /api/auth/register
Body: { email, username, password, firstName?, lastName? }
Response: { user, token }

POST /api/auth/login
Body: { email, password }
Response: { user, token }

POST /api/auth/refresh
Headers: { Authorization: Bearer <token> }
Response: { token }

POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { message }
```

#### Sneakers
```
GET /api/sneakers
Query: { page?, limit?, search?, brand?, category?, minPrice?, maxPrice?, sortBy? }
Response: { sneakers[], pagination }

GET /api/sneakers/:id
Response: { sneaker }

POST /api/sneakers (Admin only)
Body: { name, brand, model, ... }
Response: { sneaker }

PUT /api/sneakers/:id (Admin only)
Body: { partial sneaker data }
Response: { sneaker }

DELETE /api/sneakers/:id (Admin only)
Response: { message }
```

#### Favorites
```
GET /api/users/favorites
Headers: { Authorization: Bearer <token> }
Response: { favorites[] }

POST /api/users/favorites/:sneakerId
Headers: { Authorization: Bearer <token> }
Response: { message }

DELETE /api/users/favorites/:sneakerId
Headers: { Authorization: Bearer <token> }
Response: { message }
```

## Configuración de Desarrollo

### Variables de Entorno
```env
# Database
MONGO_URI=mongodb://localhost:27017/sneaker-catalog

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server
PORT=5000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:5000/api
VITE_CLOUDINARY_UPLOAD_PRESET=sneaker-catalog
```

### Scripts de Desarrollo
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd backend && npm run dev",
    "client": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd backend && npm test",
    "test:client": "cd frontend && npm test",
    "seed": "cd backend && npm run seed"
  }
}
```

## Consideraciones de Seguridad

### Backend
- Validación de inputs con Joi/Yup
- Rate limiting (express-rate-limit)
- CORS configurado correctamente
- Helmet.js para headers de seguridad
- Sanitización de datos MongoDB
- Encriptación de passwords con bcrypt (12 rounds)

### Frontend
- Sanitización de HTML (DOMPurify)
- Validación client-side
- Tokens JWT en httpOnly cookies (opcional)
- CSP headers
- Input validation en formularios

## Testing Strategy

### Backend Testing
- **Unit Tests**: Funciones utilitarias, middleware
- **Integration Tests**: Endpoints API
- **Database Tests**: Modelos y queries
- **Tools**: Jest, Supertest, MongoDB Memory Server

### Frontend Testing
- **Unit Tests**: Componentes individuales
- **Integration Tests**: Flujos de usuario
- **E2E Tests**: Casos críticos
- **Tools**: Jest, React Testing Library, Cypress

### Coverage Goals
- Backend: 85%+ coverage
- Frontend: 80%+ coverage
- E2E: Flujos críticos cubiertos

## Performance Optimization

### Frontend
- Code splitting por rutas
- Lazy loading de imágenes
- Memoización de componentes pesados
- Debounce en búsquedas
- Service Worker para caché

### Backend
- Índices MongoDB optimizados
- Paginación en queries grandes
- Compresión gzip
- Caché de respuestas frecuentes
- Optimización de imágenes (Cloudinary)

### Database
- Índices compuestos para filtros comunes
- Agregation pipelines optimizados
- Connection pooling
- Query optimization

## Deployment

### Staging Environment
- Frontend: Vercel/Netlify
- Backend: Railway/Render
- Database: MongoDB Atlas
- Images: Cloudinary

### Production Considerations
- CI/CD pipeline (GitHub Actions)
- Environment-specific configs
- Database migrations
- Monitoring y logging
- Backup strategies