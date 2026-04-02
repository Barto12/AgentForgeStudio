# Arquitectura Frontend

## Stack Tecnológico
- **React 18** con TypeScript
- **Vite** como bundler
- **Zustand** para estado global
- **React Query** para data fetching
- **React Router** para navegación
- **Tailwind CSS** para estilos
- **React Hook Form** para formularios
- **Zod** para validación

## Estructura de Carpetas
```
src/
├── components/
│   ├── ui/              # Componentes base (Button, Input, etc.)
│   ├── forms/           # Formularios específicos
│   ├── layout/          # Layout components
│   └── features/        # Componentes por feature
├── pages/
│   ├── auth/            # Login, Register
│   ├── catalog/         # Lista de productos
│   ├── product/         # Detalle de producto
│   ├── admin/           # Panel administrativo
│   └── profile/         # Perfil de usuario
├── hooks/
│   ├── useAuth.ts       # Autenticación
│   ├── useProducts.ts   # Productos
│   └── useCategories.ts # Categorías
├── services/
│   ├── api.ts           # Cliente HTTP
│   ├── auth.ts          # Servicios de auth
│   ├── products.ts      # Servicios de productos
│   └── categories.ts    # Servicios de categorías
├── store/
│   ├── authStore.ts     # Estado de autenticación
│   ├── cartStore.ts     # Carrito de compras
│   └── uiStore.ts       # Estado de UI
├── types/
│   ├── auth.ts          # Tipos de autenticación
│   ├── product.ts       # Tipos de productos
│   └── api.ts           # Tipos de API
├── utils/
│   ├── constants.ts     # Constantes
│   ├── helpers.ts       # Funciones auxiliares
│   └── validators.ts    # Esquemas de validación
└── styles/
    ├── globals.css      # Estilos globales
    └── components.css   # Estilos de componentes
```

## Componentes Principales

### Layout Components
```typescript
// components/layout/AppLayout.tsx
export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
};
```

### Feature Components
```typescript
// components/features/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={product.primaryImage} alt={product.name} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="text-gray-600 text-sm">{product.description}</p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xl font-bold">${product.price}</span>
          <Button onClick={() => onAddToCart?.(product)}>Agregar</Button>
        </div>
      </div>
    </div>
  );
};
```

## Estado Global (Zustand)
```typescript
// store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  login: async (credentials) => {
    const response = await authService.login(credentials);
    set({ user: response.user, token: response.token, isAuthenticated: true });
    localStorage.setItem('token', response.token);
  },
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('token');
  },
  register: async (userData) => {
    const response = await authService.register(userData);
    set({ user: response.user, token: response.token, isAuthenticated: true });
    localStorage.setItem('token', response.token);
  }
}));
```

## Custom Hooks
```typescript
// hooks/useProducts.ts
export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.getProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProduct(id),
    enabled: !!id,
  });
};
```

## Routing
```typescript
// App.tsx
function App() {
  return (
    <BrowserRouter>
      <QueryClient client={queryClient}>
        <Routes>
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/catalog" element={<AppLayout><CatalogPage /></AppLayout>} />
          <Route path="/product/:id" element={<AppLayout><ProductPage /></AppLayout>} />
          <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
          <Route path="/admin/*" element={<ProtectedRoute><AdminLayout><AdminRoutes /></AdminLayout></ProtectedRoute>} />
        </Routes>
      </QueryClient>
    </BrowserRouter>
  );
}
```