package com.ferreteria.inventario.dao.impl;

import com.ferreteria.inventario.dao.ProductoDAO;
import com.ferreteria.inventario.model.Producto;
import com.ferreteria.inventario.model.Categoria;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Implementación en memoria del DAO de productos
 */
public class ProductoDAOImpl implements ProductoDAO {
    
    private final Map<Long, Producto> productos;
    private final Map<String, Long> codigoIndex;
    private final AtomicLong idGenerator;
    
    public ProductoDAOImpl() {
        this.productos = new ConcurrentHashMap<>();
        this.codigoIndex = new ConcurrentHashMap<>();
        this.idGenerator = new AtomicLong(1);
    }
    
    @Override
    public Producto guardar(Producto producto) {
        if (producto == null) {
            throw new IllegalArgumentException("El producto no puede ser null");
        }
        
        if (producto.getCodigo() == null || producto.getCodigo().trim().isEmpty()) {
            throw new IllegalArgumentException("El código del producto es obligatorio");
        }
        
        if (existePorCodigo(producto.getCodigo())) {
            throw new IllegalArgumentException("Ya existe un producto con el código: " + producto.getCodigo());
        }
        
        Long id = idGenerator.getAndIncrement();
        producto.setId(id);
        
        productos.put(id, producto);
        codigoIndex.put(producto.getCodigo(), id);
        
        return producto;
    }
    
    @Override
    public Producto actualizar(Producto producto) {
        if (producto == null || producto.getId() == null) {
            throw new IllegalArgumentException("El producto y su ID no pueden ser null");
        }
        
        if (!productos.containsKey(producto.getId())) {
            throw new IllegalArgumentException("No existe un producto con el ID: " + producto.getId());
        }
        
        Producto productoExistente = productos.get(producto.getId());
        
        // Si el código cambió, verificar que no exista otro producto con ese código
        if (!productoExistente.getCodigo().equals(producto.getCodigo())) {
            if (existePorCodigo(producto.getCodigo())) {
                throw new IllegalArgumentException("Ya existe otro producto con el código: " + producto.getCodigo());
            }
            // Actualizar el índice de códigos
            codigoIndex.remove(productoExistente.getCodigo());
            codigoIndex.put(producto.getCodigo(), producto.getId());
        }
        
        productos.put(producto.getId(), producto);
        return producto;
    }
    
    @Override
    public boolean eliminar(Long id) {
        if (id == null) {
            return false;
        }
        
        Producto producto = productos.get(id);
        if (producto != null) {
            productos.remove(id);
            codigoIndex.remove(producto.getCodigo());
            return true;
        }
        
        return false;
    }
    
    @Override
    public Optional<Producto> buscarPorId(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(productos.get(id));
    }
    
    @Override
    public Optional<Producto> buscarPorCodigo(String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            return Optional.empty();
        }
        
        Long id = codigoIndex.get(codigo);
        if (id != null) {
            return Optional.ofNullable(productos.get(id));
        }
        
        return Optional.empty();
    }
    
    @Override
    public List<Producto> obtenerTodos() {
        return new ArrayList<>(productos.values());
    }
    
    @Override
    public List<Producto> obtenerActivos() {
        return productos.values().stream()
                .filter(Producto::isActivo)
                .collect(Collectors.toList());
    }
    
    @Override
    public List<Producto> buscarPorNombre(String nombre) {
        if (nombre == null || nombre.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        String nombreLower = nombre.toLowerCase();
        return productos.values().stream()
                .filter(p -> p.getNombre() != null && 
                           p.getNombre().toLowerCase().contains(nombreLower))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<Producto> obtenerPorCategoria(Categoria categoria) {
        if (categoria == null) {
            return new ArrayList<>();
        }
        
        return productos.values().stream()
                .filter(p -> p.getCategoria() != null && 
                           p.getCategoria().equals(categoria))
                .collect(Collectors.toList());
    }
    
    @Override
    public List<Producto> obtenerProductosConStockBajo() {
        return productos.values().stream()
                .filter(p -> p.isActivo() && p.necesitaRestock())
                .collect(Collectors.toList());
    }
    
    @Override
    public List<Producto> obtenerProductosSinStock() {
        return productos.values().stream()
                .filter(p -> p.isActivo() && 
                           (p.getStockActual() == null || p.getStockActual() <= 0))
                .collect(Collectors.toList());
    }
    
    @Override
    public long contarProductos() {
        return productos.size();
    }
    
    @Override
    public long contarProductosActivos() {
        return productos.values().stream()
                .filter(Producto::isActivo)
                .count();
    }
    
    @Override
    public boolean existePorCodigo(String codigo) {
        if (codigo == null || codigo.trim().isEmpty()) {
            return false;
        }
        return codigoIndex.containsKey(codigo);
    }
    
    // Método adicional para limpiar todos los datos (útil para testing)
    public void limpiarTodos() {
        productos.clear();
        codigoIndex.clear();
        idGenerator.set(1);
    }
    
    // Método adicional para obtener estadísticas
    public Map<String, Object> obtenerEstadisticas() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProductos", contarProductos());
        stats.put("productosActivos", contarProductosActivos());
        stats.put("productosSinStock", obtenerProductosSinStock().size());
        stats.put("productosStockBajo", obtenerProductosConStockBajo().size());
        
        return stats;
    }
}