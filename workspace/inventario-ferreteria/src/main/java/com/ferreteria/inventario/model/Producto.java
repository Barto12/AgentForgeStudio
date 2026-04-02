package com.ferreteria.inventario.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Clase que representa un producto en el inventario de la ferretería
 */
public class Producto {
    private Long id;
    private String codigo;
    private String nombre;
    private String descripcion;
    private Categoria categoria;
    private Proveedor proveedor;
    private BigDecimal precioCompra;
    private BigDecimal precioVenta;
    private Integer stockActual;
    private Integer stockMinimo;
    private String ubicacion;
    private String unidadMedida;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private boolean activo;

    // Constructor por defecto
    public Producto() {
        this.fechaCreacion = LocalDateTime.now();
        this.fechaActualizacion = LocalDateTime.now();
        this.activo = true;
    }

    // Constructor con parámetros principales
    public Producto(String codigo, String nombre, String descripcion, 
                   Categoria categoria, BigDecimal precioCompra, 
                   BigDecimal precioVenta, Integer stockMinimo, String unidadMedida) {
        this();
        this.codigo = codigo;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.precioCompra = precioCompra;
        this.precioVenta = precioVenta;
        this.stockActual = 0;
        this.stockMinimo = stockMinimo;
        this.unidadMedida = unidadMedida;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public Proveedor getProveedor() {
        return proveedor;
    }

    public void setProveedor(Proveedor proveedor) {
        this.proveedor = proveedor;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public BigDecimal getPrecioCompra() {
        return precioCompra;
    }

    public void setPrecioCompra(BigDecimal precioCompra) {
        this.precioCompra = precioCompra;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public BigDecimal getPrecioVenta() {
        return precioVenta;
    }

    public void setPrecioVenta(BigDecimal precioVenta) {
        this.precioVenta = precioVenta;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public Integer getStockActual() {
        return stockActual;
    }

    public void setStockActual(Integer stockActual) {
        this.stockActual = stockActual;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public Integer getStockMinimo() {
        return stockMinimo;
    }

    public void setStockMinimo(Integer stockMinimo) {
        this.stockMinimo = stockMinimo;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getUnidadMedida() {
        return unidadMedida;
    }

    public void setUnidadMedida(String unidadMedida) {
        this.unidadMedida = unidadMedida;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
        this.fechaActualizacion = LocalDateTime.now();
    }

    // Métodos de utilidad
    public boolean necesitaRestock() {
        return stockActual != null && stockMinimo != null && stockActual <= stockMinimo;
    }

    public BigDecimal calcularMargenGanancia() {
        if (precioCompra != null && precioVenta != null && 
            precioCompra.compareTo(BigDecimal.ZERO) > 0) {
            return precioVenta.subtract(precioCompra)
                    .divide(precioCompra, 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(new BigDecimal("100"));
        }
        return BigDecimal.ZERO;
    }

    public void agregarStock(Integer cantidad) {
        if (cantidad > 0) {
            this.stockActual = (this.stockActual != null ? this.stockActual : 0) + cantidad;
            this.fechaActualizacion = LocalDateTime.now();
        }
    }

    public boolean reducirStock(Integer cantidad) {
        if (cantidad > 0 && this.stockActual != null && this.stockActual >= cantidad) {
            this.stockActual -= cantidad;
            this.fechaActualizacion = LocalDateTime.now();
            return true;
        }
        return false;
    }

    @Override
    public String toString() {
        return String.format("Producto{id=%d, codigo='%s', nombre='%s', stock=%d, precio=%.2f}", 
                           id, codigo, nombre, stockActual, precioVenta);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Producto producto = (Producto) obj;
        return codigo != null ? codigo.equals(producto.codigo) : producto.codigo == null;
    }

    @Override
    public int hashCode() {
        return codigo != null ? codigo.hashCode() : 0;
    }
}