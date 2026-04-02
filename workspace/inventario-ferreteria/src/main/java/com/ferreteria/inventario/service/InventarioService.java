package com.ferreteria.inventario.service;

import com.ferreteria.inventario.dao.ProductoDAO;
import com.ferreteria.inventario.dao.impl.ProductoDAOImpl;
import com.ferreteria.inventario.model.Producto;
import com.ferreteria.inventario.model.Categoria;
import com.ferreteria.inventario.model.MovimientoInventario;
import com.ferreteria.inventario.model.MovimientoInventario.TipoMovimiento;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio principal para la gestión del inventario de la ferretería
 */
public class InventarioService {
    
    private final ProductoDAO productoDAO;
    private final List<MovimientoInventario> movimientos;
    private final Map<String, Object> configuracion;
    
    public InventarioService() {
        this.productoDAO = new ProductoDAOImpl();
        this.movimientos = new ArrayList<>();
        this.configuracion = new HashMap<>();
        inicializarConfiguracion();
    }
    
    public InventarioService(ProductoDAO productoDAO) {
        this.productoDAO = productoDAO;
        this.movimientos = new ArrayList<>();
        this.configuracion = new HashMap<>();
        inicializarConfiguracion();
    }
    
    private void inicializarConfiguracion() {
        configuracion.put("alertaStockBajo", true);
        configuracion.put("permitirStockNegativo", false);
        configuracion.put("usuario", "Sistema");
    }
    
    // ========== GESTIÓN DE PRODUCTOS ==========
    
    /**
     * Registra un nuevo producto en el inventario
     */
    public Producto registrarProducto(Producto producto) {
        if (producto == null) {
            throw new IllegalArgumentException("El producto no puede ser null");
        }
        
        validarProducto(producto);
        
        Producto productoGuardado = productoDAO.guardar(producto);
        
        // Registrar movimiento inicial si tiene stock
        if (productoGuardado.getStockActual() != null && productoGuardado.getStockActual() > 0) {
            MovimientoInventario movimiento = new MovimientoInventario(
                productoGuardado, 
                TipoMovimiento.ENTRADA, 
                productoGuardado.getStockActual(),
                "Stock inicial",
                obtenerUsuario()
            );
            registrarMovimiento(movimiento);
        }
        
        return productoGuardado;
    }
    
    /**
     * Actualiza un producto existente
     */
    public Producto actualizarProducto(Producto producto) {
        if (producto == null || producto.getId() == null) {
            throw new IllegalArgumentException("El producto y su ID no pueden ser null");
        }
        
        validarProducto(producto);
        return productoDAO.actualizar(producto);
    }
    
    /**
     * Elimina un producto (lo marca como inactivo)
     */
    public boolean eliminarProducto(Long id) {
        Optional<Producto> productoOpt = productoDAO.buscarPorId(id);
        if (productoOpt.isPresent()) {
            Producto producto = productoOpt.get();
            producto.setActivo(false);
            productoDAO.actualizar(producto);
            return true;
        }
        return false;
    }
    
    /**
     * Busca productos por diferentes criterios
     */
    public List<Producto> buscarProductos(String criterio) {
        if (criterio == null || criterio.trim().isEmpty()) {
            return productoDAO.obtenerActivos();
        }
        
        List<Producto> resultados = new ArrayList<>();
        
        // Buscar por código exacto
        Optional<Producto> porCodigo = productoDAO.buscarPorCodigo(criterio);
        if (porCodigo.isPresent()) {
            resultados.add(porCodigo.get());
            return resultados;
        }
        
        // Buscar por nombre parcial
        resultados.addAll(productoDAO.buscarPorNombre(criterio));
        
        return resultados.stream()
                .filter(Producto::isActivo)
                .collect(Collectors.toList());
    }
    
    // ========== GESTIÓN DE STOCK ==========
    
    /**
     * Registra una entrada de mercancía
     */
    public boolean registrarEntrada(String codigoProducto, Integer cantidad, 
                                  BigDecimal precioCompra, String motivo) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        
        Optional<Producto> productoOpt = productoDAO.buscarPorCodigo(codigoProducto);
        if (!productoOpt.isPresent()) {
            throw new IllegalArgumentException("No se encontró el producto con código: " + codigoProducto);
        }
        
        Producto producto = productoOpt.get();
        
        // Crear movimiento
        MovimientoInventario movimiento = new MovimientoInventario(
            producto, TipoMovimiento.ENTRADA, cantidad, motivo, obtenerUsuario()
        );
        movimiento.setPrecio(precioCompra);
        
        // Actualizar stock
        producto.agregarStock(cantidad);
        
        // Actualizar precio de compra si se proporcionó
        if (precioCompra != null) {
            producto.setPrecioCompra(precioCompra);
        }
        
        // Guardar cambios
        productoDAO.actualizar(producto);
        registrarMovimiento(movimiento);
        
        return true;
    }
    
    /**
     * Registra una salida de mercancía (venta)
     */
    public boolean registrarSalida(String codigoProducto, Integer cantidad, String motivo) {
        if (cantidad <= 0) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        
        Optional<Producto> productoOpt = productoDAO.buscarPorCodigo(codigoProducto);
        if (!productoOpt.isPresent()) {
            throw new IllegalArgumentException("No se encontró el producto con código: " + codigoProducto);
        }
        
        Producto producto = productoOpt.get();
        
        // Verificar stock disponible
        if (!permitirStockNegativo() && 
            (producto.getStockActual() == null || producto.getStockActual() < cantidad)) {
            throw new IllegalArgumentException("Stock insuficiente. Disponible: " + 
                                             (producto.getStockActual() != null ? producto.getStockActual() : 0));
        }
        
        // Crear movimiento
        MovimientoInventario movimiento = new MovimientoInventario(
            producto, TipoMovimiento.SALIDA, cantidad, motivo, obtenerUsuario()
        );
        movimiento.setPrecio(producto.getPrecioVenta());
        
        // Actualizar stock
        if (producto.reducirStock(cantidad)) {
            // Guardar cambios
            productoDAO.actualizar(producto);
            registrarMovimiento(movimiento);
            return true;
        }
        
        return false;
    }
    
    /**
     * Realiza un ajuste de inventario
     */
    public boolean ajustarInventario(String codigoProducto, Integer nuevoStock, String motivo) {
        if (nuevoStock < 0) {
            throw new IllegalArgumentException("El nuevo stock no puede ser negativo");
        }
        
        Optional<Producto> productoOpt = productoDAO.buscarPorCodigo(codigoProducto);
        if (!productoOpt.isPresent()) {
            throw new IllegalArgumentException("No se encontró el producto con código: " + codigoProducto);
        }
        
        Producto producto = productoOpt.get();
        Integer stockAnterior = producto.getStockActual() != null ? producto.getStockActual() : 0;
        
        // Crear movimiento de ajuste
        MovimientoInventario movimiento = new MovimientoInventario(
            producto, TipoMovimiento.AJUSTE, nuevoStock, motivo, obtenerUsuario()
        );
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(nuevoStock);
        
        // Actualizar stock
        producto.setStockActual(nuevoStock);
        
        // Guardar cambios
        productoDAO.actualizar(producto);
        registrarMovimiento(movimiento);
        
        return true;
    }
    
    // ========== CONSULTAS Y REPORTES ==========
    
    /**
     * Obtiene productos con stock bajo
     */
    public List<Producto> obtenerProductosStockBajo() {
        return productoDAO.obtenerProductosConStockBajo();
    }
    
    /**
     * Obtiene productos sin stock
     */
    public List<Producto> obtenerProductosSinStock() {
        return productoDAO.obtenerProductosSinStock();
    }
    
    /**
     * Obtiene el historial de movimientos de un producto
     */
    public List<MovimientoInventario> obtenerHistorialProducto(String codigoProducto) {
        Optional<Producto> productoOpt = productoDAO.buscarPorCodigo(codigoProducto);
        if (!productoOpt.isPresent()) {
            return new ArrayList<>();
        }
        
        Producto producto = productoOpt.get();
        return movimientos.stream()
                .filter(m -> m.getProducto().equals(producto))
                .sorted((m1, m2) -> m2.getFechaMovimiento().compareTo(m1.getFechaMovimiento()))
                .collect(Collectors.toList());
    }
    
    /**
     * Obtiene movimientos por rango de fechas
     */
    public List<MovimientoInventario> obtenerMovimientosPorFecha(LocalDateTime fechaInicio, 
                                                               LocalDateTime fechaFin) {
        return movimientos.stream()
                .filter(m -> m.getFechaMovimiento().isAfter(fechaInicio) && 
                           m.getFechaMovimiento().isBefore(fechaFin))
                .sorted((m1, m2) -> m2.getFechaMovimiento().compareTo(m1.getFechaMovimiento()))
                .collect(Collectors.toList());
    }
    
    /**
     * Genera reporte de inventario
     */
    public Map<String, Object> generarReporteInventario() {
        Map<String, Object> reporte = new HashMap<>();
        
        List<Producto> productos = productoDAO.obtenerActivos();
        
        // Estadísticas generales
        reporte.put("totalProductos", productos.size());
        reporte.put("productosSinStock", obtenerProductosSinStock().size());
        reporte.put("productosStockBajo", obtenerProductosStockBajo().size());
        
        // Valor total del inventario
        BigDecimal valorTotal = productos.stream()
                .filter(p -> p.getStockActual() != null && p.getPrecioCompra() != null)
                .map(p -> p.getPrecioCompra().multiply(new BigDecimal(p.getStockActual())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        reporte.put("valorTotalInventario", valorTotal);
        
        // Productos por categoría
        Map<String, Long> productosPorCategoria = productos.stream()
                .filter(p -> p.getCategoria() != null)
                .collect(Collectors.groupingBy(
                    p -> p.getCategoria().getNombre(),
                    Collectors.counting()
                ));
        
        reporte.put("productosPorCategoria", productosPorCategoria);
        
        // Últimos movimientos
        List<MovimientoInventario> ultimosMovimientos = movimientos.stream()
                .sorted((m1, m2) -> m2.getFechaMovimiento().compareTo(m1.getFechaMovimiento()))
                .limit(10)
                .collect(Collectors.toList());
        
        reporte.put("ultimosMovimientos", ultimosMovimientos);
        reporte.put("fechaReporte", LocalDateTime.now());
        
        return reporte;
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    private void validarProducto(Producto producto) {
        if (producto.getCodigo() == null || producto.getCodigo().trim().isEmpty()) {
            throw new IllegalArgumentException("El código del producto es obligatorio");
        }
        
        if (producto.getNombre() == null || producto.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del producto es obligatorio");
        }
        
        if (producto.getPrecioVenta() != null && 
            producto.getPrecioVenta().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El precio de venta no puede ser negativo");
        }
        
        if (producto.getPrecioCompra() != null && 
            producto.getPrecioCompra().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El precio de compra no puede ser negativo");
        }
        
        if (producto.getStockMinimo() != null && producto.getStockMinimo() < 0) {
            throw new IllegalArgumentException("El stock mínimo no puede ser negativo");
        }
    }
    
    private void registrarMovimiento(MovimientoInventario movimiento) {
        movimientos.add(movimiento);
    }
    
    private String obtenerUsuario() {
        return (String) configuracion.getOrDefault("usuario", "Sistema");
    }
    
    private boolean permitirStockNegativo() {
        return (Boolean) configuracion.getOrDefault("permitirStockNegativo", false);
    }
    
    // ========== CONFIGURACIÓN ==========
    
    public void configurarUsuario(String usuario) {
        configuracion.put("usuario", usuario);
    }
    
    public void configurarPermitirStockNegativo(boolean permitir) {
        configuracion.put("permitirStockNegativo", permitir);
    }
    
    public ProductoDAO getProductoDAO() {
        return productoDAO;
    }
    
    public List<MovimientoInventario> getMovimientos() {
        return new ArrayList<>(movimientos);
    }
}