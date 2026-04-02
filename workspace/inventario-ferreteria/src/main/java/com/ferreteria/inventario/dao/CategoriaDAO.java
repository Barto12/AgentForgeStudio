package com.ferreteria.inventario.dao;

import com.ferreteria.inventario.model.Categoria;
import java.util.List;
import java.util.Optional;

/**
 * Interface para el acceso a datos de categorías
 */
public interface CategoriaDAO {
    
    /**
     * Guarda una nueva categoría
     */
    Categoria guardar(Categoria categoria);
    
    /**
     * Actualiza una categoría existente
     */
    Categoria actualizar(Categoria categoria);
    
    /**
     * Elimina una categoría por su ID
     */
    boolean eliminar(Long id);
    
    /**
     * Busca una categoría por su ID
     */
    Optional<Categoria> buscarPorId(Long id);
    
    /**
     * Busca una categoría por su nombre
     */
    Optional<Categoria> buscarPorNombre(String nombre);
    
    /**
     * Obtiene todas las categorías
     */
    List<Categoria> obtenerTodas();
    
    /**
     * Obtiene categorías activas
     */
    List<Categoria> obtenerActivas();
    
    /**
     * Obtiene categorías principales (sin padre)
     */
    List<Categoria> obtenerPrincipales();
    
    /**
     * Obtiene subcategorías de una categoría padre
     */
    List<Categoria> obtenerSubcategorias(Categoria categoriaPadre);
    
    /**
     * Cuenta el total de categorías
     */
    long contarCategorias();
    
    /**
     * Verifica si existe una categoría con el nombre dado
     */
    boolean existePorNombre(String nombre);
}