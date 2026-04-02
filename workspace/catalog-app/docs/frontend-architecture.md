# Frontend Architecture - Catalog App

## Technology Stack

- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **Forms**: React Hook Form + Yup validation
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library
- **Styling**: Emotion (CSS-in-JS) + MUI Theme

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Generic components
│   │   ├── forms/           # Form components
│   │   ├── layout/          # Layout components
│   │   └── ui/              # UI-specific components
│   ├── pages/               # Page components
│   │   ├── auth/            # Authentication pages
│   │   ├── products/        # Product pages
│   │   ├── categories/      # Category pages
│   │   ├── dashboard/       # Dashboard pages
│   │   └── profile/         # User profile pages
│   ├── store/               # Redux store configuration
│   │   ├── slices/          # Redux slices
│   │   ├── api/             # RTK Query API slices
│   │   └── index.ts         # Store configuration
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services and utilities
│   ├── utils/               # Utility functions
│   ├── types/               # TypeScript type definitions
│   ├── constants/           # Application constants
│   ├── theme/               # MUI theme configuration
│   ├── assets/              # Static assets
│   ├── App.tsx              # Main App component
│   └── index.tsx            # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## Component Architecture

### Component Categories

1. **Layout Components** (`/components/layout/`)
   - `AppLayout.tsx` - Main application layout
   - `Header.tsx` - Application header with navigation
   - `Sidebar.tsx` - Navigation sidebar
   - `Footer.tsx` - Application footer
   - `Breadcrumbs.tsx` - Navigation breadcrumbs

2. **Common Components** (`/components/common/`)
   - `LoadingSpinner.tsx` - Loading indicator
   - `ErrorBoundary.tsx` - Error boundary wrapper
   - `ConfirmDialog.tsx` - Confirmation dialog
   - `DataTable.tsx` - Reusable data table
   - `SearchBox.tsx` - Search input component
   - `Pagination.tsx` - Pagination component

3. **Form Components** (`/components/forms/`)
   - `FormInput.tsx` - Text input wrapper
   - `FormSelect.tsx` - Select dropdown wrapper
   - `FormCheckbox.tsx` - Checkbox wrapper
   - `ImageUpload.tsx` - Image upload component
   - `FormValidation.tsx` - Validation utilities

4. **UI Components** (`/components/ui/`)
   - `ProductCard.tsx` - Product display card
   - `CategoryTree.tsx` - Category hierarchy tree
   - `StatsCard.tsx` - Statistics display card
   - `FilterPanel.tsx` - Advanced filtering panel
   - `ActionMenu.tsx` - Context action menu

### Component Design Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Composition over Inheritance**: Use composition patterns
3. **Props Interface**: Well-defined TypeScript interfaces
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Memoization and lazy loading where appropriate

## State Management

### Redux Store Structure

```typescript
// Store State Shape
interface RootState {
  auth: AuthState;
  products: ProductsState;
  categories: CategoriesState;
  ui: UIState;
  api: ApiState; // RTK Query
}
```

### Redux Slices

1. **Auth Slice** (`/store/slices/authSlice.ts`)
   ```typescript
   interface AuthState {
     user: User | null;
     token: string | null;
     isAuthenticated: boolean;
     loading: boolean;
     error: string | null;
   }
   ```

2. **Products Slice** (`/store/slices/productsSlice.ts`)
   ```typescript
   interface ProductsState {
     items: Product[];
     selectedProduct: Product | null;
     filters: ProductFilters;
     pagination: PaginationState;
     loading: boolean;
     error: string | null;
   }
   ```

3. **UI Slice** (`/store/slices/uiSlice.ts`)
   ```typescript
   interface UIState {
     theme: 'light' | 'dark';
     sidebarOpen: boolean;
     notifications: Notification[];
     loading: Record<string, boolean>;
   }
   ```

### RTK Query API Slices

```typescript
// API Slice Example
export const productsApi = createApi({
  reducerPath: 'productsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/products',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Product', 'Category'],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, ProductsQuery>({
      query: (params) => ({
        url: '',
        params,
      }),
      providesTags: ['Product'],
    }),
    // ... more endpoints
  }),
});
```

## Routing Structure

```typescript
// App Routes
const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'products', element: <ProductsLayout /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'products/new', element: <ProductForm /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];
```

## Custom Hooks

### Data Fetching Hooks
```typescript
// useProducts.ts
export const useProducts = (filters?: ProductFilters) => {
  const { data, error, isLoading } = useGetProductsQuery(filters);
  
  return {
    products: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
  };
};
```

### UI State Hooks
```typescript
// useLocalStorage.ts
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
};
```

## Form Management

### Form Validation Schema
```typescript
// Product form validation
export const productSchema = yup.object({
  name: yup.string().required('Name is required').min(2).max(100),
  description: yup.string().max(2000),
  price: yup.number().required('Price is required').min(0),
  category: yup.string().required('Category is required'),
  sku: yup.string().required('SKU is required'),
  stock: yup.number().min(0).integer(),
});
```

### Form Component Pattern
```typescript
const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: yupResolver(productSchema),
    defaultValues: product || defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Product Name"
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        )}
      />
      {/* More form fields */}
    </form>
  );
};
```

## Theme Configuration

```typescript
// theme/index.ts
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});
```

## Performance Optimization

### Code Splitting
```typescript
// Lazy loading pages
const ProductsPage = lazy(() => import('../pages/products/ProductsPage'));
const CategoriesPage = lazy(() => import('../pages/categories/CategoriesPage'));

// Route with Suspense
<Route
  path="/products"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <ProductsPage />
    </Suspense>
  }
/>
```

### Memoization
```typescript
// Component memoization
const ProductCard = memo<ProductCardProps>(({ product, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => onEdit(product.id), [product.id, onEdit]);
  const handleDelete = useCallback(() => onDelete(product.id), [product.id, onDelete]);

  return (
    <Card>
      {/* Card content */}
    </Card>
  );
});
```

### Virtual Scrolling
```typescript
// For large lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedProductList: React.FC = ({ products }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={products.length}
      itemSize={120}
    >
      {Row}
    </List>
  );
};
```

## Error Handling

### Error Boundary
```typescript
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Component Testing
```typescript
// ProductCard.test.tsx
describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    price: 99.99,
    // ... other properties
  };

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<ProductCard product={mockProduct} onEdit={mockOnEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProduct.id);
  });
});
```

### Hook Testing
```typescript
// useProducts.test.ts
describe('useProducts', () => {
  it('returns products data', async () => {
    const { result } = renderHook(() => useProducts());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.products).toBeDefined();
  });
});
```

## Build and Deployment

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Configuration
```typescript
// Environment variables
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_UPLOAD_URL=http://localhost:5000/uploads
REACT_APP_APP_NAME=Catalog App
REACT_APP_VERSION=1.0.0
```

This architecture provides a scalable, maintainable, and performant frontend application with modern React patterns and best practices.