// Configuración global para Jest

// Mock de console para tests silenciosos
global.console = {
  ...console,
  // Uncomment to silence console during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Variables globales para tests
global.testUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com'
};

// Timeout por defecto para tests
jest.setTimeout(30000);

// Cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
});