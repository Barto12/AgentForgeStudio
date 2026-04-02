# Arquitectura Backend

## Stack Tecnológico
- **Node.js** con TypeScript
- **Express.js** como framework web
- **Prisma** como ORM
- **PostgreSQL** como base de datos
- **JWT** para autenticación
- **Multer** para upload de archivos
- **Joi** para validación
- **Winston** para logging

## Estructura de Carpetas
```
src/
├── controllers/         # Controladores de rutas
│   ├── authController.ts
│   ├── userController.ts
│   ├── productController.ts
│   └── categoryController.ts
├── services/           # Lógica de negocio
│   ├── authService.ts
│   ├── userService.ts
│   ├── productService.ts
│   └── categoryService.ts
├── repositories/       # Acceso a datos
│   ├── userRepository.ts
│   ├── productRepository.ts
│   └── categoryRepository.ts
├── middleware/         # Middlewares
│   ├── auth.ts
│   ├── validation.ts
│   ├── errorHandler.ts
│   └── upload.ts
├── routes/            # Definición de rutas
│   ├── auth.ts
│   ├── users.ts
│   ├── products.ts
│   └── categories.ts
├── models/            # Tipos y interfaces
│   ├── User.ts
│   ├── Product.ts
│   └── Category.ts
├── utils/             # Utilidades
│   ├── logger.ts
│   ├── jwt.ts
│   ├── bcrypt.ts
│   └── validators.ts
├── config/            # Configuraciones
│   ├── database.ts
│   ├── jwt.ts
│   └── upload.ts
└── app.ts             # Configuración principal
```

## Patrón Repository
```typescript
// repositories/productRepository.ts
export interface IProductRepository {
  findAll(filters: ProductFilters): Promise<PaginatedResult<Product>>;
  findById(id: string): Promise<Product | null>;
  create(data: CreateProductData): Promise<Product>;
  update(id: string, data: UpdateProductData): Promise<Product>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Product[]>;
}

export class ProductRepository implements IProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: ProductFilters): Promise<PaginatedResult<Product>> {
    const { page = 1, limit = 20, category, search } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      is_active: true,
      ...(category && { category_id: category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { where: { is_primary: true } }
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.product.count({ where })
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sort_order: 'asc' } },
        attributes: true,
        created_by_user: { select: { id: true, first_name: true, last_name: true } }
      }
    });
  }

  async create(data: CreateProductData): Promise<Product> {
    return this.prisma.product.create({
      data: {
        ...data,
        images: data.images ? {
          create: data.images.map((img, index) => ({
            ...img,
            sort_order: index,
            is_primary: index === 0
          }))
        } : undefined,
        attributes: data.attributes ? {
          create: data.attributes
        } : undefined
      },
      include: {
        category: true,
        images: true,
        attributes: true
      }
    });
  }
}
```

## Service Layer
```typescript
// services/productService.ts
export class ProductService {
  constructor(
    private productRepository: IProductRepository,
    private categoryRepository: ICategoryRepository,
    private uploadService: IUploadService
  ) {}

  async getProducts(filters: ProductFilters): Promise<PaginatedResult<Product>> {
    return this.productRepository.findAll(filters);
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }
    return product;
  }

  async createProduct(data: CreateProductData, userId: string): Promise<Product> {
    // Validar categoría
    const category = await this.categoryRepository.findById(data.category_id);
    if (!category) {
      throw new ValidationError('Categoría no válida');
    }

    // Validar SKU único
    const existingSku = await this.productRepository.findBySku(data.sku);
    if (existingSku) {
      throw new ValidationError('SKU ya existe');
    }

    return this.productRepository.create({
      ...data,
      created_by: userId
    });
  }

  async updateProduct(id: string, data: UpdateProductData, userId: string): Promise<Product> {
    const product = await this.getProduct(id);
    
    // Verificar permisos
    if (product.created_by !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenError('Sin permisos para editar este producto');
    }

    return this.productRepository.update(id, data);
  }

  async uploadProductImages(productId: string, files: Express.Multer.File[]): Promise<ProductImage[]> {
    const product = await this.getProduct(productId);
    
    const uploadPromises = files.map(async (file, index) => {
      const imageUrl = await this.uploadService.uploadFile(file, 'products');
      return {
        product_id: productId,
        image_url: imageUrl,
        alt_text: `${product.name} - Imagen ${index + 1}`,
        sort_order: index,
        is_primary: index === 0
      };
    });

    const imageData = await Promise.all(uploadPromises);
    return this.productRepository.addImages(productId, imageData);
  }
}
```

## Controllers
```typescript
// controllers/productController.ts
export class ProductController {
  constructor(private productService: ProductService) {}

  getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = this.parseFilters(req.query);
      const result = await this.productService.getProducts(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const product = await this.productService.getProduct(id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const productData = req.body;
      const userId = req.user!.id;
      const product = await this.productService.createProduct(productData, userId);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  };

  private parseFilters(query: any): ProductFilters {
    return {
      page: parseInt(query.page) || 1,
      limit: Math.min(parseInt(query.limit) || 20, 100),
      category: query.category,
      search: query.search,
      sort: query.sort || 'created_at',
      order: query.order || 'desc'
    };
  }
}
```

## Middleware de Autenticación
```typescript
// middleware/auth.ts
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await userRepository.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos suficientes' });
    }
    next();
  };
};
```