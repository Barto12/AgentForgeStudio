# Testing Suite

Suite completa de testing que incluye pruebas unitarias, de integración y end-to-end (E2E) con Jest y Cypress.

## 🚀 Características

- **Pruebas Unitarias** con Jest
- **Pruebas de Integración** con Supertest
- **Pruebas E2E** con Cypress
- **Cobertura de código** completa
- **Linting** con ESLint
- **API REST** de ejemplo para testing

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Inicializar Cypress (primera vez)
npx cypress install
```

## 🧪 Comandos de Testing

### Pruebas Unitarias
```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

### Pruebas E2E
```bash
# Ejecutar pruebas E2E en modo headless
npm run test:e2e

# Abrir Cypress UI
npm run test:e2e:open
```

### Calidad de Código
```bash
# Ejecutar linter
npm run lint

# Corregir errores automáticamente
npm run lint:fix
```

## 🏃‍♂️ Ejecutar la Aplicación

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## 📁 Estructura del Proyecto

```
testing-suite/
├── src/
│   ├── index.js              # Servidor Express
│   └── utils/
│       ├── calculator.js     # Clase Calculator para tests
│       └── validator.js      # Utilidades de validación
├── tests/
│   ├── setup.js             # Configuración global de Jest
│   ├── unit/                # Pruebas unitarias
│   │   ├── calculator.test.js
│   │   └── validator.test.js
│   └── integration/         # Pruebas de integración
│       └── api.test.js
├── cypress/
│   ├── e2e/                 # Pruebas E2E
│   │   └── api.cy.js
│   └── support/             # Configuración de Cypress
│       ├── e2e.js
│       └── commands.js
├── jest.config.js           # Configuración de Jest
├── cypress.config.js        # Configuración de Cypress
└── .eslintrc.js            # Configuración de ESLint
```

## 🎯 Tipos de Pruebas Incluidas

### 1. Pruebas Unitarias
- **Calculator**: Operaciones matemáticas básicas
- **Validator**: Validación de emails, teléfonos, contraseñas

### 2. Pruebas de Integración
- **API REST**: Endpoints de usuarios y salud
- **Middleware**: Manejo de errores y validaciones

### 3. Pruebas E2E
- **Flujos completos** de la API
- **Validación de respuestas** HTTP
- **Comandos personalizados** de Cypress

## 📊 Cobertura de Código

El proyecto está configurado para generar reportes de cobertura en:
- **Terminal**: Resumen en consola
- **HTML**: Reporte detallado en `coverage/lcov-report/index.html`
- **LCOV**: Para integración con herramientas CI/CD

## 🔧 Configuración Avanzada

### Jest
- Configurado para Node.js
- Setup personalizado con mocks globales
- Cobertura configurada para archivos relevantes

### Cypress
- Configurado para pruebas E2E y de componentes
- Comandos personalizados para API testing
- Screenshots y videos automáticos en fallos

### ESLint
- Reglas estándar de JavaScript
- Configurado para Jest y Node.js
- Auto-fix disponible

## 🚀 Mejores Prácticas Implementadas

1. **Separación de concerns**: Unit, Integration, E2E
2. **Mocks y stubs** apropiados
3. **Assertions específicas** y descriptivas
4. **Setup y teardown** consistente
5. **Comandos personalizados** reutilizables
6. **Configuración centralizada**

## 📈 Métricas de Calidad

- ✅ Cobertura de código > 90%
- ✅ Pruebas automatizadas
- ✅ Linting sin errores
- ✅ Documentación completa
- ✅ CI/CD ready

---

**¡Suite de testing lista para usar en cualquier proyecto!** 🎉