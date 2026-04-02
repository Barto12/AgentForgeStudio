package com.impuestos.mx;

/**
 * Clase para realizar cálculos de impuestos mexicanos
 * Incluye ISR, IVA, IEPS según las tablas del SAT 2024
 */
public class CalculadoraImpuestos {
    
    // Tabla de ISR para personas físicas 2024
    private static final double[][] TABLA_ISR_PERSONAS_FISICAS = {
        // {Límite Inferior, Límite Superior, Cuota Fija, Porcentaje Excedente}
        {0.01, 746.04, 0.00, 0.0192},
        {746.05, 6332.05, 14.32, 0.0640},
        {6332.06, 11128.01, 371.83, 0.1088},
        {11128.02, 12935.82, 893.63, 0.1600},
        {12935.83, 15487.71, 1182.88, 0.2112},
        {15487.72, 31236.49, 1721.36, 0.2320},
        {31236.50, 49233.00, 5333.42, 0.3000},
        {49233.01, 93993.90, 10733.67, 0.3200},
        {93993.91, 125325.20, 25037.26, 0.3400},
        {125325.21, Double.MAX_VALUE, 35982.73, 0.3500}
    };
    
    // Tabla de ISR para personas morales (tasa única)
    private static final double TASA_ISR_PERSONAS_MORALES = 0.30; // 30%
    
    // Tasa de IVA
    private static final double TASA_IVA = 0.16; // 16%
    
    public ResultadoImpuestos calcularImpuestos(double ingresoMensual, double ventas, 
                                               double compras, String tipoPersona, 
                                               String regimenFiscal) {
        
        ResultadoImpuestos resultado = new ResultadoImpuestos();
        resultado.setIngresoMensual(ingresoMensual);
        resultado.setVentas(ventas);
        resultado.setCompras(compras);
        resultado.setTipoPersona(tipoPersona);
        resultado.setRegimenFiscal(regimenFiscal);
        
        // Calcular ingreso anual
        double ingresoAnual = ingresoMensual * 12;
        resultado.setIngresoAnual(ingresoAnual);
        
        // Calcular ISR según el tipo de persona
        if ("Persona Física".equals(tipoPersona)) {
            calcularISRPersonaFisica(resultado, ingresoAnual, regimenFiscal);
        } else {
            calcularISRPersonaMoral(resultado, ingresoAnual);
        }
        
        // Calcular IVA si hay ventas
        if (ventas > 0) {
            calcularIVA(resultado, ventas, compras);
        }
        
        // Calcular totales
        calcularTotales(resultado);
        
        return resultado;
    }
    
    private void calcularISRPersonaFisica(ResultadoImpuestos resultado, double ingresoAnual, String regimenFiscal) {
        // Aplicar deducciones según el régimen
        double ingresoGravable = aplicarDeducciones(ingresoAnual, regimenFiscal);
        
        // Buscar en la tabla de ISR
        for (double[] tramo : TABLA_ISR_PERSONAS_FISICAS) {
            if (ingresoGravable >= tramo[0] && ingresoGravable <= tramo[1]) {
                double limiteInferior = tramo[0];
                double cuotaFija = tramo[2];
                double tasaExcedente = tramo[3];
                
                double excedente = Math.max(0, ingresoGravable - limiteInferior);
                double isrMarginal = excedente * tasaExcedente;
                double isrAnual = cuotaFija + isrMarginal;
                
                resultado.setLimiteInferior(limiteInferior);
                resultado.setCuotaFija(cuotaFija);
                resultado.setTasaISR(tasaExcedente);
                resultado.setExcedente(excedente);
                resultado.setIsrMarginal(isrMarginal);
                resultado.setIsrAnual(Math.max(0, isrAnual));
                resultado.setIsrMensual(resultado.getIsrAnual() / 12);
                break;
            }
        }
    }
    
    private void calcularISRPersonaMoral(ResultadoImpuestos resultado, double ingresoAnual) {
        // Para personas morales, se aplica una tasa fija del 30%
        double isrAnual = ingresoAnual * TASA_ISR_PERSONAS_MORALES;
        
        resultado.setLimiteInferior(0);
        resultado.setCuotaFija(0);
        resultado.setTasaISR(TASA_ISR_PERSONAS_MORALES);
        resultado.setExcedente(ingresoAnual);
        resultado.setIsrMarginal(isrAnual);
        resultado.setIsrAnual(isrAnual);
        resultado.setIsrMensual(isrAnual / 12);
    }
    
    private double aplicarDeducciones(double ingresoAnual, String regimenFiscal) {
        double ingresoGravable = ingresoAnual;
        
        switch (regimenFiscal) {
            case "Sueldos y Salarios":
                // Deducción estándar para sueldos y salarios
                double deduccionSueldos = Math.min(ingresoAnual * 0.10, 32000); // 10% hasta 32,000 pesos
                ingresoGravable = Math.max(0, ingresoAnual - deduccionSueldos);
                break;
                
            case "Honorarios":
                // Los honorarios pueden tener deducciones del 35%
                double deduccionHonorarios = ingresoAnual * 0.35;
                ingresoGravable = Math.max(0, ingresoAnual - deduccionHonorarios);
                break;
                
            case "Actividad Empresarial":
                // Las actividades empresariales pueden tener deducciones variables
                // Se asume un 40% de deducciones promedio
                double deduccionEmpresarial = ingresoAnual * 0.40;
                ingresoGravable = Math.max(0, ingresoAnual - deduccionEmpresarial);
                break;
                
            case "Arrendamiento":
                // Arrendamiento tiene deducciones del 35%
                double deduccionArrendamiento = ingresoAnual * 0.35;
                ingresoGravable = Math.max(0, ingresoAnual - deduccionArrendamiento);
                break;
                
            case "RIF (Régimen de Incorporación Fiscal)":
                // RIF tiene beneficios fiscales graduales
                // Se asume primer año con 100% de reducción, disminuyendo gradualmente
                ingresoGravable = ingresoAnual * 0.10; // Asumiendo 90% de reducción
                break;
                
            case "RESICO (Régimen Simplificado de Confianza)":
                // RESICO tiene deducciones del 35%
                double deduccionRESICO = ingresoAnual * 0.35;
                ingresoGravable = Math.max(0, ingresoAnual - deduccionRESICO);
                break;
                
            default:
                // Sin deducciones adicionales
                break;
        }
        
        return ingresoGravable;
    }
    
    private void calcularIVA(ResultadoImpuestos resultado, double ventas, double compras) {
        double ivaCausado = ventas * TASA_IVA;
        double ivaAcreditable = compras * TASA_IVA;
        double ivaPorPagar = Math.max(0, ivaCausado - ivaAcreditable);
        
        resultado.setIvaCausado(ivaCausado);
        resultado.setIvaAcreditable(ivaAcreditable);
        resultado.setIvaPorPagar(ivaPorPagar);
    }
    
    private void calcularTotales(ResultadoImpuestos resultado) {
        double totalImpuestos = resultado.getIsrMensual() + resultado.getIvaPorPagar();
        double ingresoNeto = resultado.getIngresoMensual() - totalImpuestos;
        
        resultado.setTotalImpuestos(totalImpuestos);
        resultado.setIngresoNeto(Math.max(0, ingresoNeto));
    }
}