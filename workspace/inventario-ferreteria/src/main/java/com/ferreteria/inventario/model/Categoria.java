package com.ferreteria.inventario.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Clase que representa una categoría de productos en la ferretería
 */
public class Categoria {
    private Long id;
    private String nombre;
    private String descripcion;
    private Categoria categoriaPadre;
    private List<Categoria> subcategorias;
    private LocalDateTime fechaCreacion;
    private boolean activo;

    // Constructor por defecto
    public Categoria() {
        this.subcategorias = new ArrayList<>();
        this.fechaCreacion = LocalDateTime.now();
        this.activo = true;
    }

    // Constructor con parámetros
    public Categoria(String nombre, String descripcion) {
        this();
        this.nombre = nombre;
        this.descripcion = descripcion;
    }

    public Categoria(String nombre, String descripcion, Categoria categoriaPadre) {
        this(nombre, descripcion);
        this.categoriaPadre = categoriaPadre;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Categoria getCategoriaPadre() {
        return categoriaPadre;
    }

    public void setCategoriaPadre(Categoria categoriaPadre) {
        this.categoriaPadre = categoriaPadre;
    }

    public List<Categoria> getSubcategorias() {
        return subcategorias;
    }

    public void setSubcategorias(List<Categoria> subcategorias) {
        this.subcategorias = subcategorias;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
    }

    // Métodos de utilidad
    public void agregarSubcategoria(Categoria subcategoria) {
        if (subcategoria != null && !this.subcategorias.contains(subcategoria)) {
            this.subcategorias.add(subcategoria);
            subcategoria.setCategoriaPadre(this);
        }
    }

    public void removerSubcategoria(Categoria subcategoria) {
        if (subcategoria != null) {
            this.subcategorias.remove(subcategoria);
            subcategoria.setCategoriaPadre(null);
        }
    }

    public boolean esSubcategoria() {
        return categoriaPadre != null;
    }

    public String getRutaCompleta() {
        if (categoriaPadre != null) {
            return categoriaPadre.getRutaCompleta() + " > " + nombre;
        }
        return nombre;
    }

    @Override
    public String toString() {
        return String.format("Categoria{id=%d, nombre='%s', subcategorias=%d}", 
                           id, nombre, subcategorias.size());
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Categoria categoria = (Categoria) obj;
        return nombre != null ? nombre.equals(categoria.nombre) : categoria.nombre == null;
    }

    @Override
    public int hashCode() {
        return nombre != null ? nombre.hashCode() : 0;
    }
}