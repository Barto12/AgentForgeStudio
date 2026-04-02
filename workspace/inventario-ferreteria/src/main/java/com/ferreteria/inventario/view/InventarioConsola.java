package com.ferreteria.inventario.view;

import com.ferreteria.inventario.model.Categoria;
import com.ferreteria.inventario.model.Producto;
import com.ferreteria.inventario.model.Proveedor;
import com.ferreteria.inventario.model.MovimientoInventario;
import com.ferreteria.inventario.service.InventarioService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz de consola para el sistema de inventario de la ferretería
 */
public class InventarioConsola {
    
    private final InventarioService inventarioService;
    private final Scanner scanner;
    private final DateTimeFormatter formatter;
    
    public InventarioConsola() {
        this.inventarioService = new InventarioService();
        this.scanner = new Scanner(System.in);
        this.formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        inicializarDatosPrueba();
    }
    
    public void iniciar() {
        System.out.println("===========================================");
        System.out.println("    SISTEMA DE INVENTARIO - FERRETERÍA    ");
        System.out.println("===========================================");
        
        boolean continuar = true;
        while (continuar) {
            mostrarMenuPrincipal();
            int opcion = leerOpcion();
            
            try {
                switch (opcion) {
                    case 1:
                        menuProductos();
                        break;
                    case 2:
                        menuMovimientos();
                        break;
                    case 3:
                        menuConsultas();
                        break;
                    case 4:
                        menuReportes();
                        break;
                    case 5:
                        configurarSistema();
                        break;
                    case 0:
                        continuar = false;
                        System.out.println("¡Gracias por usar el sistema de inventario!");
                        break;
                    default:
                        System.out.println("Opción no válida. Intente nuevamente.");
                }
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
            }
            
            if (continuar) {
                System.out.println("\nPresione Enter para continuar...");
                scanner.nextLine();
            }
        }
    }
    
    private void mostrarMenuPrincipal() {
        System.out.println("\n=== MENÚ PRINCIPAL ===");
        System.out.println("1. Gestión de Productos");
        System.out.println("2. Movimientos de Inventario");
        System.out.println("3. Consultas");
        System.out.println("4. Reportes");
        System.out.println("5. Configuración");
        System.out.println("0. Salir");
        System.out.print("Seleccione una opción: ");
    }
    
    private void menuProductos() {
        System.out.println("\n=== GESTIÓN DE PRODUCTOS ===");
        System.out.println("1. Registrar nuevo producto");
        System.out.println("2. Buscar producto");
        System.out.println("3. Listar todos los productos");
        System.out.println("4. Actualizar producto");
        System.out.println("5. Eliminar producto");
        System.out.println("0. Volver al menú principal");
        System.out.print("Seleccione una opción: ");
        
        int opcion = leerOpcion();
        
        switch (opcion) {
            case 1:
                registrarProducto();
                break;
            case 2:
                buscarProducto();
                break;
            case 3:
                listarProductos();
                break;
            case 4:
                actualizarProducto();
                break;
            case 5:
                eliminarProducto();
                break;
            case 0:
                return;
            default:
                System.out.println("Opción no válida.");
        }
    }
    
    private void menuMovimientos() {
        System.out.println("\n=== MOVIMIENTOS DE INVENTARIO ===");
        System.out.println("1. Registrar entrada (compra)");
        System.out.println("2. Registrar salida (venta)");
        System.out.println("3. Ajustar inventario");
        System.out.println("4. Ver historial de producto");
        System.out.println("0. Volver al menú principal");
        System.out.print("Seleccione una opción: ");
        
        int opcion = leerOpcion();
        
        switch (opcion) {
            case 1:
                registrarEntrada();
                break;
            case 2:
                registrarSalida();
                break;
            case 3:
                ajustarInventario();
                break;
            case 4:
                verHistorialProducto();
                break;
            case 0:
                return;
            default:
                System.out.println("Opción no válida.");
        }
    }
    
    private void menuConsultas() {
        System.out.println("\n=== CONSULTAS ===");
        System.out.println("1. Productos con stock bajo");
        System.out.println("2. Productos sin stock");
        System.out.println("3. Buscar productos");
        System.out.println("0. Volver al menú principal");
        System.out.print("Seleccione una opción: ");
        
        int opcion = leerOpcion();
        
        switch (opcion) {
            case 1:
                mostrarProductosStockBajo();
                break;
            case 2:
                mostrarProductosSinStock();
                break;
            case 3:
                buscarProducto();
                break;
            case 0:
                return;
            default:
                System.out.println("Opción no válida.");
        }
    }
    
    private void menuReportes() {
        System.out.println("\n=== REPORTES ===");
        System.out.println("1. Reporte general de inventario");
        System.out.println("2. Movimientos recientes");
        System.out.println("0. Volver al menú principal");
        System.out.print("Seleccione una opción: ");
        
        int opcion = leerOpcion();
        
        switch (opcion) {
            case 1:
                generarReporteInventario();
                break;
            case 2:
                mostrarMovimientosRecientes();
                break;
            case 0:
                return;
            default:
                System.out.println("Opción no válida.");
        }
    }
    
    // ========== IMPLEMENTACIÓN DE FUNCIONALIDADES ==========
    
    private void registrarProducto() {
        System.out.println("\n--- Registrar Nuevo Producto ---");
        
        System.out.print("Código del producto: ");
        String codigo = scanner.nextLine().trim();
        
        System.out.print("Nombre del producto: ");
        String nombre = scanner.nextLine().trim();
        
        System.out.print("Descripción: ");
        String descripcion = scanner.nextLine().trim();
        
        System.out.print("Precio de compra: ");
        BigDecimal precioCompra = new BigDecimal(scanner.nextLine().trim());
        
        System.out.print("Precio de venta: ");
        BigDecimal precioVenta = new BigDecimal(scanner.nextLine().trim());
        
        System.out.print("Stock inicial: ");
        Integer stockInicial = Integer.parseInt(scanner.nextLine().trim());
        
        System.out.print("Stock mínimo: ");
        Integer stockMinimo = Integer.parseInt(scanner.nextLine().trim());
        
        System.out.print("Unidad de medida: ");
        String unidadMedida = scanner.nextLine().trim();
        
        // Crear categoría por defecto
        Categoria categoria = new Categoria("General", "Categoría general");
        
        Producto producto = new Producto(codigo, nombre, descripcion, categoria, 
                                       precioCompra, precioVenta, stockMinimo, unidadMedida);
        producto.setStockActual(stockInicial);
        
        try {
            Producto productoGuardado = inventarioService.registrarProducto(producto);
            System.out.println("Producto registrado exitosamente:");
            mostrarDetalleProducto(productoGuardado);
        } catch (Exception e) {
            System.err.println("Error al registrar producto: " + e.getMessage());
        }
    }
    
    private void buscarProducto() {
        System.out.print("\nIngrese código o nombre del producto: ");
        String criterio = scanner.nextLine().trim();
        
        List<Producto> productos = inventarioService.buscarProductos(criterio);
        
        if (productos.isEmpty()) {
            System.out.println("No se encontraron productos.");
        } else {
            System.out.println("\n--- Productos Encontrados ---");
            for (Producto producto : productos) {
                mostrarProductoResumido(producto);
                System.out.println();
            }
        }
    }
    
    private void listarProductos() {
        List<Producto> productos = inventarioService.getProductoDAO().obtenerActivos();
        
        if (productos.isEmpty()) {
            System.out.println("\nNo hay productos registrados.");
        } else {
            System.out.println("\n--- Lista de Productos ---");
            System.out.printf("%-10s %-30s %-10s %-12s %-12s%n", 
                            "Código", "Nombre", "Stock", "P.Compra", "P.Venta");
            System.out.println("-".repeat(80));
            
            for (Producto producto : productos) {
                System.out.printf("%-10s %-30s %-10d $%-11.2f $%-11.2f%n",
                    producto.getCodigo(),
                    producto.getNombre().length() > 30 ? 
                        producto.getNombre().substring(0, 27) + "..." : producto.getNombre(),
                    producto.getStockActual() != null ? producto.getStockActual() : 0,
                    producto.getPrecioCompra() != null ? producto.getPrecioCompra() : BigDecimal.ZERO,
                    producto.getPrecioVenta() != null ? producto.getPrecioVenta() : BigDecimal.ZERO
                );
            }
        }
    }
    
    private void registrarEntrada() {
        System.out.println("\n--- Registrar Entrada de Mercancía ---");
        
        System.out.print("Código del producto: ");
        String codigo = scanner.nextLine().trim();
        
        System.out.print("Cantidad: ");
        Integer cantidad = Integer.parseInt(scanner.nextLine().trim());
        
        System.out.print("Precio de compra (opcional): ");
        String precioStr = scanner.nextLine().trim();
        BigDecimal precio = precioStr.isEmpty() ? null : new BigDecimal(precioStr);
        
        System.out.print("Motivo: ");
        String motivo = scanner.nextLine().trim();
        
        try {
            boolean exito = inventarioService.registrarEntrada(codigo, cantidad, precio, motivo);
            if (exito) {
                System.out.println("Entrada registrada exitosamente.");
            } else {
                System.out.println("No se pudo registrar la entrada.");
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
    
    private void registrarSalida() {
        System.out.println("\n--- Registrar Salida de Mercancía ---");
        
        System.out.print("Código del producto: ");
        String codigo = scanner.nextLine().trim();
        
        System.out.print("Cantidad: ");
        Integer cantidad = Integer.parseInt(scanner.nextLine().trim());
        
        System.out.print("Motivo: ");
        String motivo = scanner.nextLine().trim();
        
        try {
            boolean exito = inventarioService.registrarSalida(codigo, cantidad, motivo);
            if (exito) {
                System.out.println("Salida registrada exitosamente.");
            } else {
                System.out.println("No se pudo registrar la salida.");
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
    
    private void ajustarInventario() {
        System.out.println("\n--- Ajustar Inventario ---");
        
        System.out.print("Código del producto: ");
        String codigo = scanner.nextLine().trim();
        
        System.out.print("Nuevo stock: ");
        Integer nuevoStock = Integer.parseInt(scanner.nextLine().trim());
        
        System.out.print("Motivo del ajuste: ");
        String motivo = scanner.nextLine().trim();
        
        try {
            boolean exito = inventarioService.ajustarInventario(codigo, nuevoStock, motivo);
            if (exito) {
                System.out.println("Ajuste de inventario registrado exitosamente.");
            } else {
                System.out.println("No se pudo realizar el ajuste.");
            }
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
    
    private void mostrarProductosStockBajo() {
        List<Producto> productos = inventarioService.obtenerProductosStockBajo();
        
        if (productos.isEmpty()) {
            System.out.println("\nNo hay productos con stock bajo.");
        } else {
            System.out.println("\n--- Productos con Stock Bajo ---");
            for (Producto producto : productos) {
                System.out.printf("⚠️  %s - %s | Stock: %d | Mínimo: %d%n",
                    producto.getCodigo(),
                    producto.getNombre(),
                    producto.getStockActual(),
                    producto.getStockMinimo()
                );
            }
        }
    }
    
    private void mostrarProductosSinStock() {
        List<Producto> productos = inventarioService.obtenerProductosSinStock();
        
        if (productos.isEmpty()) {
            System.out.println("\nNo hay productos sin stock.");
        } else {
            System.out.println("\n--- Productos Sin Stock ---");
            for (Producto producto : productos) {
                System.out.printf("❌ %s - %s | Stock: %d%n",
                    producto.getCodigo(),
                    producto.getNombre(),
                    producto.getStockActual() != null ? producto.getStockActual() : 0
                );
            }
        }
    }
    
    private void generarReporteInventario() {
        System.out.println("\n--- Reporte General de Inventario ---");
        
        Map<String, Object> reporte = inventarioService.generarReporteInventario();
        
        System.out.println("📊 ESTADÍSTICAS GENERALES");
        System.out.println("Total de productos: " + reporte.get("totalProductos"));
        System.out.println("Productos sin stock: " + reporte.get("productosSinStock"));
        System.out.println("Productos con stock bajo: " + reporte.get("productosStockBajo"));
        System.out.println("Valor total del inventario: $" + reporte.get("valorTotalInventario"));
        
        @SuppressWarnings("unchecked")
        Map<String, Long> productosPorCategoria = (Map<String, Long>) reporte.get("productosPorCategoria");
        if (productosPorCategoria != null && !productosPorCategoria.isEmpty()) {
            System.out.println("\n📦 PRODUCTOS POR CATEGORÍA");
            productosPorCategoria.forEach((categoria, cantidad) -> 
                System.out.println("- " + categoria + ": " + cantidad + " productos")
            );
        }
        
        System.out.println("\nFecha del reporte: " + 
            ((LocalDateTime) reporte.get("fechaReporte")).format(formatter));
    }
    
    private void verHistorialProducto() {
        System.out.print("\nIngrese el código del producto: ");
        String codigo = scanner.nextLine().trim();
        
        List<MovimientoInventario> movimientos = inventarioService.obtenerHistorialProducto(codigo);
        
        if (movimientos.isEmpty()) {
            System.out.println("No se encontraron movimientos para este producto.");
        } else {
            System.out.println("\n--- Historial de Movimientos ---");
            System.out.printf("%-20s %-10s %-8s %-15s %-20s%n", 
                            "Fecha", "Tipo", "Cantidad", "Stock Nuevo", "Motivo");
            System.out.println("-".repeat(80));
            
            for (MovimientoInventario mov : movimientos) {
                System.out.printf("%-20s %-10s %-8d %-15d %-20s%n",
                    mov.getFechaMovimiento().format(formatter),
                    mov.getTipoMovimiento().getDescripcion(),
                    mov.getCantidad(),
                    mov.getStockNuevo(),
                    mov.getMotivo() != null ? 
                        (mov.getMotivo().length() > 20 ? mov.getMotivo().substring(0, 17) + "..." : mov.getMotivo()) 
                        : ""
                );
            }
        }
    }
    
    private void mostrarMovimientosRecientes() {
        List<MovimientoInventario> movimientos = inventarioService.getMovimientos();
        
        if (movimientos.isEmpty()) {
            System.out.println("\nNo hay movimientos registrados.");
        } else {
            System.out.println("\n--- Movimientos Recientes ---");
            movimientos.stream()
                .sorted((m1, m2) -> m2.getFechaMovimiento().compareTo(m1.getFechaMovimiento()))
                .limit(10)
                .forEach(mov -> {
                    System.out.printf("%s | %s | %s | %s unidades | %s%n",
                        mov.getFechaMovimiento().format(formatter),
                        mov.getProducto().getCodigo(),
                        mov.getTipoMovimiento().getDescripcion(),
                        mov.getCantidad(),
                        mov.getMotivo() != null ? mov.getMotivo() : ""
                    );
                });
        }
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    private void mostrarDetalleProducto(Producto producto) {
        System.out.println("📦 " + producto.getNombre());
        System.out.println("Código: " + producto.getCodigo());
        System.out.println("Descripción: " + producto.getDescripcion());
        System.out.println("Stock actual: " + producto.getStockActual());
        System.out.println("Stock mínimo: " + producto.getStockMinimo());
        System.out.println("Precio compra: $" + producto.getPrecioCompra());
        System.out.println("Precio venta: $" + producto.getPrecioVenta());
        System.out.println("Unidad: " + producto.getUnidadMedida());
        
        if (producto.necesitaRestock()) {
            System.out.println("⚠️  NECESITA RESTOCK");
        }
    }
    
    private void mostrarProductoResumido(Producto producto) {
        System.out.printf("📦 %s - %s | Stock: %d | Precio: $%.2f",
            producto.getCodigo(),
            producto.getNombre(),
            producto.getStockActual() != null ? producto.getStockActual() : 0,
            producto.getPrecioVenta() != null ? producto.getPrecioVenta() : BigDecimal.ZERO
        );
        
        if (producto.necesitaRestock()) {
            System.out.print(" ⚠️ STOCK BAJO");
        }
    }
    
    private int leerOpcion() {
        try {
            String input = scanner.nextLine().trim();
            return Integer.parseInt(input);
        } catch (NumberFormatException e) {
            return -1;
        }
    }
    
    private void configurarSistema() {
        System.out.println("\n--- Configuración del Sistema ---");
        System.out.print("Nombre de usuario: ");
        String usuario = scanner.nextLine().trim();
        
        if (!usuario.isEmpty()) {
            inventarioService.configurarUsuario(usuario);
            System.out.println("Usuario configurado: " + usuario);
        }
    }
    
    private void actualizarProducto() {
        System.out.println("Funcionalidad de actualización - En desarrollo");
    }
    
    private void eliminarProducto() {
        System.out.print("Ingrese el ID del producto a eliminar: ");
        try {
            Long id = Long.parseLong(scanner.nextLine().trim());
            boolean eliminado = inventarioService.eliminarProducto(id);
            
            if (eliminado) {
                System.out.println("Producto eliminado (marcado como inactivo).");
            } else {
                System.out.println("No se encontró el producto con ID: " + id);
            }
        } catch (NumberFormatException e) {
            System.out.println("ID no válido.");
        }
    }
    
    private void inicializarDatosPrueba() {
        // Crear algunas categorías
        Categoria herramientas = new Categoria("Herramientas", "Herramientas manuales y eléctricas");
        Categoria tornilleria = new Categoria("Tornillería", "Tornillos, tuercas y elementos de fijación");
        Categoria pintura = new Categoria("Pintura", "Pinturas y accesorios para pintar");
        
        // Crear algunos productos de prueba
        try {
            Producto martillo = new Producto("MART001", "Martillo de Garra 16oz", 
                "Martillo con mango de madera", herramientas, 
                new BigDecimal("15.50"), new BigDecimal("25.00"), 5, "Unidad");
            martillo.setStockActual(20);
            inventarioService.registrarProducto(martillo);
            
            Producto tornillos = new Producto("TORN001", "Tornillos Autorroscantes 1\"", 
                "Caja x100 tornillos autorroscantes", tornilleria,
                new BigDecimal("8.00"), new BigDecimal("12.50"), 10, "Caja");
            tornillos.setStockActual(5);
            inventarioService.registrarProducto(tornillos);
            
            Producto pintura1 = new Producto("PINT001", "Pintura Látex Blanco 1 Galón", 
                "Pintura látex para interiores", pintura,
                new BigDecimal("22.00"), new BigDecimal("35.00"), 3, "Galón");
            pintura1.setStockActual(2);
            inventarioService.registrarProducto(pintura1);
            
        } catch (Exception e) {
            System.err.println("Error inicializando datos de prueba: " + e.getMessage());
        }
    }
}