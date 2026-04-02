package com.ferreteria.inventario.dao;

import com.ferreteria.inventario.model.Producto;
import com.ferreteria.inventario.model.Categoria;
import java.util.List;
import java.util.Optional;

/**
 * Interface para el acceso a datos de productos
 */
public interface ProductoDAO {
    
    /**
     * Guarda un nuevo producto
     */
    Producto guardar(Producto producto);
    
    /**
     * Actualiza un producto existente
     */
    Producto actualizar(Producto producto);
    
    /**
     * Elimina un producto por su ID
     */
    boolean eliminar(Long id);
    
    /**
     * Busca un producto por su ID
     */
    Optional<Producto> buscarPorId(Long id);
    
    /**
     * Busca un producto por su código
     */
    Optional<Producto> buscarPorCodigo(String codigo);
    
    /**
     * Obtiene todos los productos
     */
    List<Producto> obtenerTodos();
    
    /**
     * Obtiene productos activos
     */
    List<Producto> obtenerActivos();
    
    /**
     * Busca productos por nombre (búsqueda parcial)
     */
    List<Producto> buscarPorNombre(String nombre);
    
    /**
     * Obtiene productos por categoría
     */
    List<Producto> obtenerPorCategoria(Categoria categoria);
    
    /**
     * Obtiene productos con stock bajo (menor o igual al stock mínimo)
     */
    List<Producto> obtenerProductosConStockBajo();
    
    /**
     * Obtiene productos sin stock
     */
    List<Producto> obtenerProductosSinStock();
    
    /**
     * Cuenta el total de productos
     */
    long contarProductos();
    
    /**
     * Cuenta productos activos
     */
    long contarProductosActivos();
    
    /**
     * Verifica si existe un producto con el código dado
     */
    boolean existePorCodigo(String codigo);
}