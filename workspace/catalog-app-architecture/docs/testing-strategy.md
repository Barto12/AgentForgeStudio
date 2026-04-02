# Estrategia de Testing

## Pirámide de Testing
1. **Unit Tests** (70%): Funciones, servicios, componentes aislados
2. **Integration Tests** (20%): APIs, base de datos, servicios externos
3. **E2E Tests** (10%): Flujos completos de usuario

## Backend Testing

### Stack de Testing
- **Jest** como test runner
- **Supertest** para testing de APIs
- **@testcontainers/postgresql** para tests de integración
- **Factory Bot** para crear datos de prueba

### Estructura de Tests
```
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   ├── controllers/
│   └── database/
├── e2e/
│   └── api/
├── fixtures/
│   └── data/
└── helpers/
    ├── testDb.ts
    ├── factories.ts
    └── setup.ts
```

### Unit Tests - Services
```typescript
// tests/unit/services/productService.test.ts
import { ProductService } from '../../../src/services/productService';
import { mockProductRepository } from '../../helpers/mocks';

describe('ProductService', () => {
  let productService: ProductService;
  let mockRepo: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepo = mockProductRepository();
    productService = new ProductService(mockRepo);
  });

  describe('getProducts', () => {
    it('should return paginated products', async () => {
      // Arrange
      const filters = { page: 1, limit: 10 };
      const expectedResult = {
        data: [createMockProduct()],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      };
      mockRepo.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await productService.getProducts(filters);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockRepo.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('createProduct', () => {
    it('should create product with valid data', async () => {
      // Arrange
      const productData = createProductData();
      const userId = 'user-123';
      const expectedProduct = createMockProduct();
      mockRepo.create.mockResolvedValue(expectedProduct);

      // Act
      const result = await productService.createProduct(productData, userId);

      // Assert
      expect(result).toEqual(expectedProduct);
      expect(mockRepo.create).toHaveBeenCalledWith({
        ...productData,
        created_by: userId
      });
    });

    it('should throw error for duplicate SKU', async () => {
      // Arrange
      const productData = createProductData({ sku: 'EXISTING-SKU' });
      mockRepo.findBySku.mockResolvedValue(createMockProduct());

      // Act & Assert
      await expect(productService.createProduct(productData, 'user-123'))
        .rejects.toThrow('SKU ya existe');
    });
  });
});
```

### Integration Tests - API
```typescript
// tests/integration/controllers/productController.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { setupTestDb, cleanupTestDb } from '../../helpers/testDb';
import { createUser, createProduct, createCategory } from '../../helpers/factories';

describe('Product API', () => {
  let authToken: string;
  let testUser: User;
  let testCategory: Category;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    testUser = await createUser({ role: 'admin' });
    testCategory = await createCategory();
    authToken = generateJWT(testUser.id);
  });

  describe('GET /api/v1/products', () => {
    it('should return paginated products', async () => {
      // Arrange
      await createProduct({ category_id: testCategory.id });
      await createProduct({ category_id: testCategory.id });

      // Act
      const response = await request(app)
        .get('/api/v1/products')
        .query({ page: 1, limit: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    it('should filter products by category', async () => {
      // Arrange
      const otherCategory = await createCategory();
      await createProduct({ category_id: testCategory.id });
      await createProduct({ category_id: otherCategory.id });

      // Act
      const response = await request(app)
        .get('/api/v1/products')
        .query({ category: testCategory.id });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category.id).toBe(testCategory.id);
    });
  });

  describe('POST /api/v1/products', () => {
    it('should create product with valid data', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        description: 'Test Description',
        sku: 'TEST-001',
        price: 29.99,
        stock_quantity: 100,
        category_id: testCategory.id
      };

      // Act
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: productData.name,
        sku: productData.sku,
        price: productData.price
      });
    });

    it('should return 401 without authentication', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/products')
        .send({ name: 'Test' });

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 400 with invalid data', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }); // Invalid: empty name

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });
  });
});
```

## Frontend Testing

### Stack de Testing
- **Jest** + **React Testing Library**
- **MSW** para mocking de APIs
- **Playwright** para E2E tests

### Unit Tests - Components
```typescript
// src/components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { createMockProduct } from '../../__mocks__/product';

describe('ProductCard', () => {
  const mockProduct = createMockProduct();
  const mockOnAddToCart = jest.fn();

  beforeEach(() => {
    mockOnAddToCart.mockClear();
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price}`)).toBeInTheDocument();
  });

  it('calls onAddToCart when button is clicked', () => {
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);

    const addButton = screen.getByText('Agregar');
    fireEvent.click(addButton);

    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
  });

  it('displays product image with correct alt text', () => {
    render(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText(mockProduct.name);
    expect(image).toHaveAttribute('src', mockProduct.primaryImage);
  });
});
```

### Integration Tests - Pages
```typescript
// src/pages/__tests__/CatalogPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { CatalogPage } from '../CatalogPage';
import { server } from '../../__mocks__/server';
import { rest } from 'msw';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CatalogPage', () => {
  it('displays products when loaded successfully', async () => {
    // Arrange
    server.use(
      rest.get('/api/v1/products', (req, res, ctx) => {
        return res(ctx.json({
          data: [
            { id: '1', name: 'Product 1', price: 29.99 },
            { id: '2', name: 'Product 2', price: 39.99 }
          ],
          pagination: { page: 1, limit: 20, total: 2, pages: 1 }
        }));
      })
    );

    // Act
    renderWithProviders(<CatalogPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithProviders(<CatalogPage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('displays error message when API fails', async () => {
    // Arrange
    server.use(
      rest.get('/api/v1/products', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    // Act
    renderWithProviders(<CatalogPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## E2E Tests con Playwright
```typescript
// e2e/catalog.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Catalog Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/catalog');
  });

  test('should display product catalog', async ({ page }) => {
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(20);
    await expect(page.locator('h1')).toContainText('Catálogo');
  });

  test('should filter products by category', async ({ page }) => {
    await page.selectOption('[data-testid="category-filter"]', 'electronics');
    await page.waitForLoadState('networkidle');
    
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toContainText('Electrónicos');
  });

  test('should search products', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.press('[data-testid="search-input"]', 'Enter');
    await page.waitForLoadState('networkidle');
    
    const products = page.locator('[data-testid="product-card"]');
    await expect(products.first()).toContainText('laptop', { ignoreCase: true });
  });

  test('should navigate to product detail', async ({ page }) => {
    await page.click('[data-testid="product-card"]:first-child');
    await expect(page).toHaveURL(/\/product\/[a-f0-9-]+/);
    await expect(page.locator('[data-testid="product-title"]')).toBeVisible();
  });
});
```

## Scripts de Testing
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

## Configuración Jest
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts']
};
```