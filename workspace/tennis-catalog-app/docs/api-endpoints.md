# API Endpoints

## Autenticación
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

## Productos
```
GET    /api/products              # Lista paginada con filtros
GET    /api/products/:id          # Detalle de producto
GET    /api/products/:id/variants # Variantes del producto
GET    /api/products/:id/reviews  # Reviews del producto
POST   /api/products/:id/reviews  # Crear review (auth)

# Admin only
POST   /api/products              # Crear producto
PUT    /api/products/:id          # Actualizar producto
DELETE /api/products/:id          # Eliminar producto
```

## Búsqueda
```
GET /api/search                   # Búsqueda general
GET /api/search/suggestions       # Autocompletado
GET /api/search/filters           # Filtros disponibles
```

## Categorías y Marcas
```
GET /api/categories               # Lista de categorías
GET /api/brands                   # Lista de marcas
GET /api/brands/:id/products      # Productos por marca
```

## Usuario
```
GET    /api/user/profile          # Perfil del usuario
PUT    /api/user/profile          # Actualizar perfil
GET    /api/user/favorites        # Lista de favoritos
POST   /api/user/favorites/:id    # Agregar a favoritos
DELETE /api/user/favorites/:id    # Quitar de favoritos
GET    /api/user/orders           # Historial de órdenes
```

## Carrito
```
GET    /api/cart                  # Obtener carrito
POST   /api/cart/items            # Agregar item
PUT    /api/cart/items/:id        # Actualizar cantidad
DELETE /api/cart/items/:id        # Remover item
DELETE /api/cart                  # Vaciar carrito
```

## Órdenes
```
POST /api/orders                  # Crear orden
GET  /api/orders/:id              # Detalle de orden
PUT  /api/orders/:id/cancel       # Cancelar orden
```

## Admin
```
GET    /api/admin/dashboard       # Estadísticas
GET    /api/admin/orders          # Gestión de órdenes
PUT    /api/admin/orders/:id      # Actualizar estado
GET    /api/admin/inventory       # Gestión de inventario
PUT    /api/admin/inventory/:id   # Actualizar stock
GET    /api/admin/users           # Gestión de usuarios
```

## Estructura de Respuesta
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

## Códigos de Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```