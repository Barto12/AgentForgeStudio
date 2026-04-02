# API Specification - Catalog App

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Error Format
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

#### POST /auth/login
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST /auth/refresh
Refresh JWT token
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### POST /auth/logout
Logout user (invalidate token)

### Products

#### GET /products
Get all products with pagination and filters

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term
- `category` (string): Category ID
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `inStock` (boolean): Filter by stock availability
- `sortBy` (string): Sort field (name, price, createdAt)
- `sortOrder` (string): Sort order (asc, desc)

#### GET /products/:id
Get single product by ID

#### POST /products
Create new product (Admin/Editor only)
```json
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "category": "category_id",
  "sku": "SKU001",
  "stock": 100,
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["tag1", "tag2"],
  "specifications": {
    "weight": "1kg",
    "dimensions": "10x10x10cm"
  }
}
```

#### PUT /products/:id
Update product (Admin/Editor only)

#### DELETE /products/:id
Delete product (Admin only)

#### POST /products/:id/images
Upload product images

### Categories

#### GET /categories
Get all categories (hierarchical)

#### GET /categories/:id
Get single category

#### POST /categories
Create new category (Admin only)
```json
{
  "name": "Category Name",
  "description": "Category description",
  "parent": "parent_category_id",
  "image": "category-image.jpg"
}
```

#### PUT /categories/:id
Update category (Admin only)

#### DELETE /categories/:id
Delete category (Admin only)

### Users

#### GET /users
Get all users (Admin only)

#### GET /users/profile
Get current user profile

#### PUT /users/profile
Update current user profile

#### PUT /users/:id/role
Update user role (Admin only)
```json
{
  "role": "admin" // admin, editor, user
}
```

#### DELETE /users/:id
Delete user (Admin only)

### Analytics

#### GET /analytics/dashboard
Get dashboard metrics
```json
{
  "totalProducts": 1250,
  "totalCategories": 45,
  "lowStockProducts": 23,
  "totalValue": 125000.50,
  "recentActivity": [],
  "topCategories": [],
  "stockStatus": {
    "inStock": 1100,
    "lowStock": 100,
    "outOfStock": 50
  }
}
```

#### GET /analytics/products
Get product analytics

#### GET /analytics/inventory
Get inventory reports

### File Upload

#### POST /upload/images
Upload images
- Supports multiple files
- Max file size: 5MB
- Allowed formats: JPEG, PNG, GIF, WebP

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- File Upload: 10 requests per hour

## Pagination

All list endpoints support pagination:
```
GET /products?page=2&limit=20
```

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```