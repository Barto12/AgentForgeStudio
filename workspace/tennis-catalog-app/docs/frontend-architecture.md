# Arquitectura Frontend

## Stack Tecnológico
- **React 18** con TypeScript
- **Vite** como bundler
- **React Router** para navegación
- **React Query** para state management y cache
- **Zustand** para estado global
- **Tailwind CSS** para estilos
- **React Hook Form** para formularios
- **Zod** para validación

## Estructura de Carpetas
```
src/
├── components/           # Componentes reutilizables
│   ├── ui/              # Componentes básicos (Button, Input, etc.)
│   ├── forms/           # Componentes de formularios
│   ├── layout/          # Layout components (Header, Footer, etc.)
│   └── product/         # Componentes específicos de productos
├── pages/               # Páginas de la aplicación
├── hooks/               # Custom hooks
├── services/            # API calls y servicios
├── stores/              # Zustand stores
├── types/               # TypeScript types
├── utils/               # Utilidades y helpers
├── constants/           # Constantes de la aplicación
└── assets/              # Imágenes, iconos, etc.
```

## Componentes Principales

### ProductCard
```typescript
interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list';
  showQuickActions?: boolean;
  onAddToCart?: (productId: string) => void;
  onAddToFavorites?: (productId: string) => void;
}
```

### ProductFilters
```typescript
interface ProductFiltersProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}
```

### SearchBar
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  suggestions?: string[];
  isLoading?: boolean;
  placeholder?: string;
}
```

## Estado Global (Zustand)

### AuthStore
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

### CartStore
```typescript
interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}
```

## React Query Keys
```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: ProductFilters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    favorites: () => [...queryKeys.user.all, 'favorites'] as const,
    orders: () => [...queryKeys.user.all, 'orders'] as const,
  },
} as const;
```

## Routing
```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:id', element: <ProductDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'cart', element: <CartPage /> },
      {
        path: 'account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <ProfilePage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'favorites', element: <FavoritesPage /> },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'users', element: <AdminUsersPage /> },
    ],
  },
]);
```

## Performance Optimizations

### Code Splitting
```typescript
// Lazy loading de páginas
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'));
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));

// Lazy loading de componentes pesados
const ProductComparison = lazy(() => import('../components/ProductComparison'));
```

### Image Optimization
```typescript
const OptimizedImage: React.FC<ImageProps> = ({ src, alt, ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};
```

### Virtual Scrolling
```typescript
// Para listas largas de productos
import { FixedSizeList as List } from 'react-window';

const VirtualizedProductList: React.FC<Props> = ({ products }) => {
  return (
    <List
      height={600}
      itemCount={products.length}
      itemSize={200}
      itemData={products}
    >
      {ProductRow}
    </List>
  );
};
```