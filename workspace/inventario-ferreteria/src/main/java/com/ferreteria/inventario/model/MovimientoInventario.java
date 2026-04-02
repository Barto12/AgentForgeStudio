package com.ferreteria.inventario.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Clase que representa un movimiento de inventario (entrada o salida)
 */
public class MovimientoInventario {
    
    public enum TipoMovimiento {
        ENTRADA("Entrada"),
        SALIDA("Salida"),
        AJUSTE("Ajuste"),
        DEVOLUCION("Devolución");
        
        private final String descripcion;
        
        TipoMovimiento(String descripcion) {
            this.descripcion = descripcion;
        }
        
        public String getDescripcion() {
            return descripcion;
        }
    }
    
    private Long id;
    private Producto producto;
    private TipoMovimiento tipoMovimiento;
    private Integer cantidad;
    private Integer stockAnterior;
    private Integer stockNuevo;
    private BigDecimal precio;
    private String motivo;
    private String usuario;
    private LocalDateTime fechaMovimiento;
    private String numeroDocumento;
    private String observaciones;

    // Constructor por defecto
    public MovimientoInventario() {
        this.fechaMovimiento = LocalDateTime.now();
    }

    // Constructor con parámetros principales
    public MovimientoInventario(Producto producto, TipoMovimiento tipoMovimiento, 
                              Integer cantidad, String motivo, String usuario) {
        this();
        this.producto = producto;
        this.tipoMovimiento = tipoMovimiento;
        this.cantidad = cantidad;
        this.motivo = motivo;
        this.usuario = usuario;
        
        if (producto != null) {
            this.stockAnterior = producto.getStockActual();
            calcularStockNuevo();
        }
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
        if (producto != null) {
            this.stockAnterior = producto.getStockActual();
            calcularStockNuevo();
        }
    }

    public TipoMovimiento getTipoMovimiento() {
        return tipoMovimiento;
    }

    public void setTipoMovimiento(TipoMovimiento tipoMovimiento) {
        this.tipoMovimiento = tipoMovimiento;
        calcularStockNuevo();
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
        calcularStockNuevo();
    }

    public Integer getStockAnterior() {
        return stockAnterior;
    }

    public void setStockAnterior(Integer stockAnterior) {
        this.stockAnterior = stockAnterior;
    }

    public Integer getStockNuevo() {
        return stockNuevo;
    }

    public void setStockNuevo(Integer stockNuevo) {
        this.stockNuevo = stockNuevo;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public LocalDateTime getFechaMovimiento() {
        return fechaMovimiento;
    }

    public void setFechaMovimiento(LocalDateTime fechaMovimiento) {
        this.fechaMovimiento = fechaMovimiento;
    }

    public String getNumeroDocumento() {
        return numeroDocumento;
    }

    public void setNumeroDocumento(String numeroDocumento) {
        this.numeroDocumento = numeroDocumento;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    // Métodos de utilidad
    private void calcularStockNuevo() {
        if (stockAnterior != null && cantidad != null && tipoMovimiento != null) {
            switch (tipoMovimiento) {
                case ENTRADA:
                    this.stockNuevo = stockAnterior + cantidad;
                    break;
                case SALIDA:
                    this.stockNuevo = stockAnterior - cantidad;
                    break;
                case AJUSTE:
                    this.stockNuevo = cantidad; // En ajuste, la cantidad es el nuevo stock
                    break;
                case DEVOLUCION:
                    this.stockNuevo = stockAnterior + cantidad;
                    break;
                default:
                    this.stockNuevo = stockAnterior;
            }
        }
    }

    public BigDecimal calcularValorTotal() {
        if (precio != null && cantidad != null) {
            return precio.multiply(new BigDecimal(cantidad));
        }
        return BigDecimal.ZERO;
    }

    public boolean esMovimientoPositivo() {
        return tipoMovimiento == TipoMovimiento.ENTRADA || 
               tipoMovimiento == TipoMovimiento.DEVOLUCION;
    }

    public boolean esMovimientoNegativo() {
        return tipoMovimiento == TipoMovimiento.SALIDA;
    }

    public String getDescripcionCompleta() {
        StringBuilder descripcion = new StringBuilder();
        descripcion.append(tipoMovimiento.getDescripcion())
                  .append(" - ")
                  .append(cantidad)
                  .append(" unidades");
        
        if (motivo != null && !motivo.isEmpty()) {
            descripcion.append(" (").append(motivo).append(")");
        }
        
        return descripcion.toString();
    }

    @Override
    public String toString() {
        return String.format("MovimientoInventario{id=%d, producto='%s', tipo=%s, cantidad=%d, fecha=%s}", 
                           id, 
                           producto != null ? producto.getNombre() : "N/A", 
                           tipoMovimiento, 
                           cantidad, 
                           fechaMovimiento);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        MovimientoInventario that = (MovimientoInventario) obj;
        return id != null ? id.equals(that.id) : that.id == null;
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}