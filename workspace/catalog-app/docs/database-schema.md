# Database Schema - Catalog App

## MongoDB Collections

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String, // required, min: 2, max: 50
  email: String, // required, unique, lowercase
  password: String, // required, hashed with bcrypt
  role: String, // enum: ['admin', 'editor', 'user'], default: 'user'
  avatar: String, // URL to avatar image
  isActive: Boolean, // default: true
  lastLogin: Date,
  refreshTokens: [{
    token: String,
    createdAt: Date,
    expiresAt: Date
  }],
  preferences: {
    theme: String, // 'light' | 'dark'
    language: String, // default: 'en'
    notifications: {
      email: Boolean, // default: true
      push: Boolean // default: true
    }
  },
  createdAt: Date, // default: Date.now
  updatedAt: Date // default: Date.now
}
```

### Products Collection
```javascript
{
  _id: ObjectId,
  name: String, // required, min: 2, max: 100
  description: String, // max: 2000
  slug: String, // unique, auto-generated from name
  sku: String, // unique, required
  barcode: String, // optional, unique if provided
  price: {
    current: Number, // required, min: 0
    original: Number, // for discounts
    currency: String // default: 'USD'
  },
  category: {
    type: ObjectId,
    ref: 'Category',
    required: true
  },
  subcategories: [{
    type: ObjectId,
    ref: 'Category'
  }],
  images: [{
    url: String, // required
    alt: String,
    isPrimary: Boolean, // default: false
    order: Number // for sorting
  }],
  stock: {
    quantity: Number, // required, min: 0, default: 0
    reserved: Number, // default: 0
    threshold: Number, // low stock alert threshold, default: 10
    trackInventory: Boolean // default: true
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: String // 'cm', 'in', 'kg', 'lb'
  },
  specifications: Map, // flexible key-value pairs
  tags: [String], // for search and filtering
  status: String, // enum: ['active', 'inactive', 'discontinued'], default: 'active'
  visibility: String, // enum: ['public', 'private', 'draft'], default: 'public'
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  ratings: {
    average: Number, // default: 0
    count: Number, // default: 0
    distribution: {
      1: Number, // default: 0
      2: Number,
      3: Number,
      4: Number,
      5: Number
    }
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User'
  },
  createdAt: Date, // default: Date.now
  updatedAt: Date // default: Date.now
}
```

### Categories Collection
```javascript
{
  _id: ObjectId,
  name: String, // required, min: 2, max: 50
  description: String, // max: 500
  slug: String, // unique, auto-generated
  parent: {
    type: ObjectId,
    ref: 'Category',
    default: null // null for root categories
  },
  children: [{
    type: ObjectId,
    ref: 'Category'
  }],
  level: Number, // 0 for root, 1 for first level, etc.
  path: String, // full path like "Electronics > Computers > Laptops"
  image: {
    url: String,
    alt: String
  },
  icon: String, // icon class or URL
  color: String, // hex color for UI
  order: Number, // for sorting, default: 0
  isActive: Boolean, // default: true
  productCount: Number, // denormalized count, default: 0
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: Date, // default: Date.now
  updatedAt: Date // default: Date.now
}
```

### Activity Logs Collection
```javascript
{
  _id: ObjectId,
  user: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  action: String, // 'create', 'update', 'delete', 'login', 'logout'
  resource: String, // 'product', 'category', 'user'
  resourceId: ObjectId, // ID of the affected resource
  details: {
    before: Object, // previous state (for updates)
    after: Object, // new state
    changes: [String] // array of changed fields
  },
  ip: String,
  userAgent: String,
  timestamp: Date // default: Date.now
}
```

### Settings Collection
```javascript
{
  _id: ObjectId,
  key: String, // unique, required
  value: Mixed, // can be any type
  type: String, // 'string', 'number', 'boolean', 'object', 'array'
  description: String,
  category: String, // 'general', 'email', 'upload', 'security'
  isPublic: Boolean, // default: false (whether to expose in frontend)
  updatedBy: {
    type: ObjectId,
    ref: 'User'
  },
  updatedAt: Date // default: Date.now
}
```

## Indexes

### Users Collection Indexes
```javascript
// Unique indexes
db.users.createIndex({ email: 1 }, { unique: true })

// Compound indexes
db.users.createIndex({ role: 1, isActive: 1 })
db.users.createIndex({ lastLogin: -1 })
```

### Products Collection Indexes
```javascript
// Unique indexes
db.products.createIndex({ sku: 1 }, { unique: true })
db.products.createIndex({ slug: 1 }, { unique: true })
db.products.createIndex({ barcode: 1 }, { unique: true, sparse: true })

// Text search index
db.products.createIndex({
  name: "text",
  description: "text",
  tags: "text"
}, {
  weights: {
    name: 10,
    tags: 5,
    description: 1
  }
})

// Compound indexes for filtering
db.products.createIndex({ category: 1, status: 1, visibility: 1 })
db.products.createIndex({ "price.current": 1 })
db.products.createIndex({ "stock.quantity": 1 })
db.products.createIndex({ createdAt: -1 })
db.products.createIndex({ updatedAt: -1 })

// Geospatial index (if location-based features needed)
// db.products.createIndex({ location: "2dsphere" })
```

### Categories Collection Indexes
```javascript
// Unique indexes
db.categories.createIndex({ slug: 1 }, { unique: true })

// Compound indexes
db.categories.createIndex({ parent: 1, order: 1 })
db.categories.createIndex({ level: 1, order: 1 })
db.categories.createIndex({ isActive: 1, order: 1 })
```

### Activity Logs Collection Indexes
```javascript
// Compound indexes for queries
db.activitylogs.createIndex({ user: 1, timestamp: -1 })
db.activitylogs.createIndex({ resource: 1, resourceId: 1, timestamp: -1 })
db.activitylogs.createIndex({ action: 1, timestamp: -1 })

// TTL index to auto-delete old logs (optional)
db.activitylogs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }) // 90 days
```

## Data Relationships

### One-to-Many Relationships
- User → Products (createdBy)
- Category → Products
- Category → Categories (parent-child)
- User → ActivityLogs

### Many-to-Many Relationships
- Products ↔ Categories (through subcategories array)
- Products ↔ Tags (through tags array)

## Data Validation Rules

### Business Rules
1. **SKU uniqueness**: Each product must have a unique SKU
2. **Category hierarchy**: Categories can have maximum 5 levels deep
3. **Stock management**: Reserved stock cannot exceed available quantity
4. **Price validation**: Current price must be positive, original price must be >= current price
5. **User roles**: Only admins can delete products, editors can create/update
6. **Image limits**: Maximum 10 images per product

### Data Integrity
1. **Referential integrity**: Use MongoDB references with proper validation
2. **Cascade operations**: When deleting categories, handle child categories and products
3. **Audit trail**: All modifications logged in ActivityLogs
4. **Soft deletes**: Important entities marked as inactive rather than deleted

## Performance Considerations

1. **Denormalization**: Store product count in categories for quick access
2. **Caching**: Implement Redis caching for frequently accessed data
3. **Pagination**: Always paginate large result sets
4. **Aggregation**: Use MongoDB aggregation pipeline for complex queries
5. **Connection pooling**: Configure proper connection pool size

## Backup Strategy

1. **Daily backups**: Automated daily MongoDB dumps
2. **Point-in-time recovery**: Enable MongoDB oplog
3. **Testing**: Regular backup restoration tests
4. **Retention**: Keep backups for 30 days

## Migration Scripts

Create migration scripts in `/backend/migrations/` for:
- Schema changes
- Data transformations
- Index updates
- Seed data