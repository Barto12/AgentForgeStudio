# Especificación API REST

## Base URL
```
http://localhost:3000/api/v1
```

## Autenticación
Todas las rutas protegidas requieren header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication
```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Users
```
GET    /users              # Admin only
GET    /users/:id          # Admin or self
PUT    /users/:id          # Admin or self
DELETE /users/:id          # Admin only
GET    /users/profile      # Current user
```

### Categories
```
GET    /categories         # Public
GET    /categories/:id     # Public
POST   /categories         # Admin/Editor
PUT    /categories/:id     # Admin/Editor
DELETE /categories/:id     # Admin only
GET    /categories/tree    # Hierarchical view
```

### Products
```
GET    /products           # Public with filters
GET    /products/:id       # Public
POST   /products           # Admin/Editor
PUT    /products/:id       # Admin/Editor/Owner
DELETE /products/:id       # Admin/Owner
GET    /products/search    # Full-text search
```

### Product Images
```
GET    /products/:id/images
POST   /products/:id/images
PUT    /products/:id/images/:imageId
DELETE /products/:id/images/:imageId
```

## Request/Response Examples

### GET /products
**Query Parameters:**
```
?page=1&limit=20&category=uuid&search=text&sort=name&order=asc
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Producto 1",
      "description": "Descripción",
      "sku": "PROD001",
      "price": 29.99,
      "stock_quantity": 100,
      "category": {
        "id": "uuid",
        "name": "Categoría"
      },
      "images": [
        {
          "id": "uuid",
          "image_url": "https://...",
          "is_primary": true
        }
      ],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### POST /products
**Request:**
```json
{
  "name": "Nuevo Producto",
  "description": "Descripción del producto",
  "sku": "PROD002",
  "price": 49.99,
  "stock_quantity": 50,
  "category_id": "uuid",
  "attributes": [
    {
      "attribute_name": "Color",
      "attribute_value": "Rojo"
    }
  ]
}
```

## Error Responses
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": [
      {
        "field": "name",
        "message": "El nombre es requerido"
      }
    ]
  }
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Internal Server Error