# Estrategia de Testing

## Pirámide de Testing

### Unit Tests (70%)
**Framework**: Jest + Testing Library

```typescript
// Ejemplo: utils/formatPrice.test.ts
describe('formatPrice', () => {
  it('should format price with currency symbol', () => {
    expect(formatPrice(29.99, 'USD')).toBe('$29.99');
  });
  
  it('should handle zero price', () => {
    expect(formatPrice(0, 'USD')).toBe('$0.00');
  });
  
  it('should throw error for negative prices', () => {
    expect(() => formatPrice(-10, 'USD')).toThrow('Price cannot be negative');
  });
});
```

**Cobertura Requerida**:
- Utils/Helpers: 100%
- Custom Hooks: 95%
- Services/API: 90%
- Components: 80%

### Integration Tests (20%)
**Framework**: Jest + MSW (Mock Service Worker)

```typescript
// Ejemplo: ProductList integration test
describe('ProductList Integration', () => {
  beforeEach(() => {
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.json(mockProductsResponse));
      })
    );
  });
  
  it('should load and display products', async () => {
    render(<ProductList />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Nike Air Max')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (10%)
**Framework**: Cypress

```typescript
// cypress/e2e/product-purchase.cy.ts
describe('Product Purchase Flow', () => {
  it('should complete purchase successfully', () => {
    cy.visit('/products');
    cy.get('[data-testid="product-card"]').first().click();
    cy.get('[data-testid="add-to-cart"]').click();
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="checkout-button"]').click();
    
    // Fill checkout form
    cy.get('[data-testid="email"]').type('test@example.com');
    cy.get('[data-testid="submit-order"]').click();
    
    cy.url().should('include', '/order-confirmation');
    cy.get('[data-testid="order-number"]').should('be.visible');
  });
});
```

## Testing por Funcionalidad

### Autenticación
```typescript
// Tests críticos para auth
describe('Authentication', () => {
  describe('Login', () => {
    it('should login with valid credentials');
    it('should show error with invalid credentials');
    it('should handle network errors gracefully');
    it('should redirect to intended page after login');
  });
  
  describe('JWT Token', () => {
    it('should refresh token automatically');
    it('should logout when token expires');
    it('should handle concurrent requests during refresh');
  });
});
```

### Búsqueda y Filtros
```typescript
describe('Product Search', () => {
  it('should search products by name');
  it('should show suggestions while typing');
  it('should apply multiple filters correctly');
  it('should handle empty search results');
  it('should debounce search input');
  it('should persist search state in URL');
});
```

### Carrito de Compras
```typescript
describe('Shopping Cart', () => {
  it('should add product to cart');
  it('should update quantity');
  it('should remove items');
  it('should persist cart in localStorage');
  it('should sync cart with server when logged in');
  it('should handle out of stock scenarios');
});
```

## Performance Testing

### Load Testing con k6
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200
    { duration: '5m', target: 200 }, // Stay at 200
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function() {
  // Test product listing
  let response = http.get('http://localhost:3000/api/products');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // Test product search
  response = http.get('http://localhost:3000/api/search?q=nike');
  check(response, {
    'search response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  sleep(1);
}
```

## Security Testing

### Automated Security Tests
```typescript
describe('Security Tests', () => {
  describe('Input Validation', () => {
    it('should sanitize HTML in reviews', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeHtml(maliciousInput);
      expect(sanitized).not.toContain('<script>');
    });
    
    it('should validate email format', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('valid@example.com')).toBe(true);
    });
  });
  
  describe('Authentication', () => {
    it('should reject requests without valid token');
    it('should validate token signature');
    it('should handle token expiration');
  });
});
```

### Penetration Testing Checklist
- [ ] SQL Injection en endpoints de búsqueda
- [ ] XSS en campos de texto libre
- [ ] CSRF en formularios críticos
- [ ] Rate limiting en APIs
- [ ] File upload vulnerabilities
- [ ] Session management

## Accessibility Testing

### Automated a11y Tests
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<ProductCard product={mockProduct} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Manual Testing Checklist
- [ ] Navegación con teclado
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Focus management
- [ ] ARIA labels y roles
- [ ] Responsive design en dispositivos móviles

## CI/CD Pipeline Testing

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          start: npm start
          wait-on: 'http://localhost:3000'
  
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level high
      - uses: securecodewarrior/github-action-add-sarif@v1
```

## Métricas de Calidad

### Coverage Targets
- **Statements**: >= 80%
- **Branches**: >= 75%
- **Functions**: >= 85%
- **Lines**: >= 80%

### Performance Benchmarks
- **API Response Time**: < 200ms (p95)
- **Page Load Time**: < 3s (First Contentful Paint)
- **Search Response**: < 500ms
- **Image Load Time**: < 2s

### Quality Gates
- ✅ All tests passing
- ✅ Coverage above thresholds
- ✅ No high/critical security vulnerabilities
- ✅ Lighthouse score > 90
- ✅ No accessibility violations