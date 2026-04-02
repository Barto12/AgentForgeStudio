package mx.impuestos.calculadoras;

import mx.impuestos.models.ResultadoImpuestos;

/**
 * Calculadora de IVA (Impuesto al Valor Agregado) para México
 * Tasa general del 16% vigente
 */
public class CalculadoraIVA {
    
    // Tasa general de IVA en México
    private static final double TASA_IVA_GENERAL = 16.0;
    
    // Tasa de IVA en zona fronteriza
    private static final double TASA_IVA_FRONTERA = 8.0;
    
    /**
     * Calcula el IVA con la tasa general (16%)
     */
    public ResultadoImpuestos calcularIVA(double montoSinIVA) {
        return calcularIVA(montoSinIVA, false);
    }
    
    /**
     * Calcula el IVA con opción de zona fronteriza
     */
    public ResultadoImpuestos calcularIVA(double montoSinIVA, boolean esZonaFronteriza) {
        if (montoSinIVA < 0) {
            return new ResultadoImpuestos(0.0, 0.0, "Monto no válido");
        }
        
        double tasa = esZonaFronteriza ? TASA_IVA_FRONTERA : TASA_IVA_GENERAL;
        double iva = montoSinIVA * (tasa / 100);
        
        String detalles = String.format("IVA calculado con tasa del %.0f%% (%s)", 
                                      tasa, 
                                      esZonaFronteriza ? "Zona fronteriza" : "Tasa general");
        
        return new ResultadoImpuestos(iva, tasa, detalles);
    }
    
    /**
     * Calcula el monto sin IVA a partir del total con IVA
     */
    public ResultadoImpuestos calcularMontoSinIVA(double totalConIVA, boolean esZonaFronteriza) {
        if (totalConIVA < 0) {
            return new ResultadoImpuestos(0.0, 0.0, "Monto no válido");
        }
        
        double tasa = esZonaFronteriza ? TASA_IVA_FRONTERA : TASA_IVA_GENERAL;
        double factor = 1 + (tasa / 100);
        double montoSinIVA = totalConIVA / factor;
        double iva = totalConIVA - montoSinIVA;
        
        String detalles = String.format("Monto sin IVA calculado desde total con IVA (tasa %.0f%%)", tasa);
        
        return new ResultadoImpuestos(iva, tasa, detalles) {
            public double getMontoSinIVA() {
                return montoSinIVA;
            }
        };
    }
    
    /**
     * Verifica si un producto o servicio está exento de IVA
     */
    public boolean estaExentoIVA(String tipoProducto) {
        // Productos y servicios exentos de IVA en México
        String[] productosExentos = {
            "medicinas", "alimentos básicos", "libros", "periódicos", "revistas",
            "suelo", "casa habitación", "servicios médicos", "servicios educativos",
            "transporte público", "espectáculos públicos"
        };
        
        for (String producto : productosExentos) {
            if (tipoProducto.toLowerCase().contains(producto.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Obtiene información detallada del cálculo de IVA
     */
    public String obtenerDetalleCalculoIVA(double montoSinIVA, boolean esZonaFronteriza) {
        StringBuilder detalle = new StringBuilder();
        
        detalle.append("=== DETALLE DEL CÁLCULO DE IVA ===\n\n");
        
        double tasa = esZonaFronteriza ? TASA_IVA_FRONTERA : TASA_IVA_GENERAL;
        double iva = montoSinIVA * (tasa / 100);
        double total = montoSinIVA + iva;
        
        detalle.append(String.format("Monto sin IVA: $%,.2f\n", montoSinIVA));
        detalle.append(String.format("Tasa de IVA: %.0f%% (%s)\n", tasa, 
                                   esZonaFronteriza ? "Zona fronteriza" : "Tasa general"));
        detalle.append(String.format("IVA: $%,.2f\n", iva));
        detalle.append(String.format("Total con IVA: $%,.2f\n\n", total));
        
        detalle.append("INFORMACIÓN ADICIONAL:\n");
        detalle.append("• La tasa general de IVA en México es del 16%\n");
        detalle.append("• En zona fronteriza la tasa es del 8%\n");
        detalle.append("• Algunos productos están exentos de IVA\n");
        detalle.append("• El IVA se debe declarar mensualmente\n");
        
        return detalle.toString();
    }
    
    /**
     * Calcula el IVA a favor o a cargo en una declaración
     */
    public ResultadoImpuestos calcularIVADeclaracion(double ivaAcreditable, double ivaTraslado) {
        double diferencia = ivaTraslado - ivaAcreditable;
        String situacion;
        
        if (diferencia > 0) {
            situacion = "IVA a cargo (a pagar)";
        } else if (diferencia < 0) {
            situacion = "IVA a favor (saldo a favor)";
            diferencia = Math.abs(diferencia);
        } else {
            situacion = "IVA neutro (sin saldo)";
        }
        
        return new ResultadoImpuestos(Math.abs(diferencia), 0.0, situacion);
    }
}