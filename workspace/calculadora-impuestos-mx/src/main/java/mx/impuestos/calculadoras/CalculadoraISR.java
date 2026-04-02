package mx.impuestos.calculadoras;

import mx.impuestos.models.ResultadoImpuestos;
import mx.impuestos.models.TramoISR;

import java.util.Arrays;
import java.util.List;

/**
 * Calculadora de ISR (Impuesto Sobre la Renta) para México
 * Implementa las tarifas vigentes para el ejercicio fiscal 2024
 */
public class CalculadoraISR {
    
    // Tarifas de ISR 2024 para personas físicas (artículo 152 LISR)
    private static final List<TramoISR> TARIFAS_PERSONAS_FISICAS = Arrays.asList(
        new TramoISR(0.01, 8952.49, 0.00, 1.92),
        new TramoISR(8952.50, 75984.55, 171.88, 6.40),
        new TramoISR(75984.56, 133536.07, 4461.94, 10.88),
        new TramoISR(133536.08, 155229.80, 10723.55, 16.00),
        new TramoISR(155229.81, 185852.57, 14194.54, 21.36),
        new TramoISR(185852.58, 374837.88, 20734.69, 23.52),
        new TramoISR(374837.89, 590668.67, 65094.45, 30.00),
        new TramoISR(590668.68, 1127926.84, 129778.84, 32.00),
        new TramoISR(1127926.85, 1503902.46, 301710.45, 34.00),
        new TramoISR(1503902.47, Double.MAX_VALUE, 429572.67, 35.00)
    );
    
    // Subsidio al empleo 2024
    private static final List<TramoISR> SUBSIDIO_EMPLEO = Arrays.asList(
        new TramoISR(0.01, 1768.96, 407.02, 0.00),
        new TramoISR(1768.97, 2653.38, 406.83, 1.92),
        new TramoISR(2653.39, 3472.84, 406.62, 6.40),
        new TramoISR(3472.85, 3537.87, 392.77, 10.88),
        new TramoISR(3537.88, 4446.15, 382.46, 16.00),
        new TramoISR(4446.16, 4717.18, 354.23, 21.36),
        new TramoISR(4717.19, 5335.42, 324.87, 23.52),
        new TramoISR(5335.43, 6224.67, 265.20, 30.00),
        new TramoISR(6224.68, 7113.90, 124.67, 32.00),
        new TramoISR(7113.91, 7382.33, 0.00, 34.00)
    );
    
    /**
     * Calcula el ISR anual para una persona física
     */
    public ResultadoImpuestos calcularISRAnual(double ingresoAnual, String tipoPersona, String regimenFiscal) {
        if (ingresoAnual <= 0) {
            return new ResultadoImpuestos(0.0, 0.0, "Ingreso no válido");
        }
        
        double isr = 0.0;
        double tasaEfectiva = 0.0;
        String detalles = "";
        
        if ("Persona Física".equals(tipoPersona)) {
            isr = calcularISRPersonaFisica(ingresoAnual, regimenFiscal);
            tasaEfectiva = (isr / ingresoAnual) * 100;
            detalles = String.format("ISR calculado para %s en régimen %s", tipoPersona, regimenFiscal);
        } else {
            // Persona Moral - tasa fija del 30%
            isr = ingresoAnual * 0.30;
            tasaEfectiva = 30.0;
            detalles = "ISR calculado para Persona Moral (tasa fija 30%)"; 
        }
        
        return new ResultadoImpuestos(isr, tasaEfectiva, detalles);
    }
    
    /**
     * Calcula el ISR mensual
     */
    public ResultadoImpuestos calcularISRMensual(double ingresoMensual, String tipoPersona, String regimenFiscal) {
        double ingresoAnual = ingresoMensual * 12;
        ResultadoImpuestos resultadoAnual = calcularISRAnual(ingresoAnual, tipoPersona, regimenFiscal);
        
        double isrMensual = resultadoAnual.getImpuesto() / 12;
        return new ResultadoImpuestos(isrMensual, resultadoAnual.getTasaEfectiva(), 
                                    "ISR mensual basado en proyección anual");
    }
    
    private double calcularISRPersonaFisica(double ingresoAnual, String regimenFiscal) {
        // Para sueldos y salarios aplicamos subsidio al empleo
        if ("Sueldos y Salarios".equals(regimenFiscal)) {
            return calcularISRSueldosYSalarios(ingresoAnual);
        }
        
        // Para otros regímenes aplicamos tarifa general
        return calcularISRTarifaGeneral(ingresoAnual);
    }
    
    private double calcularISRSueldosYSalarios(double ingresoAnual) {
        // Calcular ISR según tarifa
        double isrCalculado = calcularISRTarifaGeneral(ingresoAnual);
        
        // Calcular subsidio al empleo mensual y anualizar
        double ingresoMensual = ingresoAnual / 12;
        double subsidioMensual = calcularSubsidioEmpleo(ingresoMensual);
        double subsidioAnual = subsidioMensual * 12;
        
        // ISR a pagar es la diferencia
        double isrAPagar = Math.max(0, isrCalculado - subsidioAnual);
        
        return isrAPagar;
    }
    
    private double calcularISRTarifaGeneral(double ingresoAnual) {
        for (TramoISR tramo : TARIFAS_PERSONAS_FISICAS) {
            if (ingresoAnual >= tramo.getLimiteInferior() && ingresoAnual <= tramo.getLimiteSuperior()) {
                double excedente = ingresoAnual - tramo.getLimiteInferior();
                double impuestoMarginal = excedente * (tramo.getTasa() / 100);
                return tramo.getCuotaFija() + impuestoMarginal;
            }
        }
        return 0.0;
    }
    
    private double calcularSubsidioEmpleo(double ingresoMensual) {
        for (TramoISR tramo : SUBSIDIO_EMPLEO) {
            if (ingresoMensual >= tramo.getLimiteInferior() && ingresoMensual <= tramo.getLimiteSuperior()) {
                double excedente = ingresoMensual - tramo.getLimiteInferior();
                double reduccionSubsidio = excedente * (tramo.getTasa() / 100);
                return Math.max(0, tramo.getCuotaFija() - reduccionSubsidio);
            }
        }
        return 0.0;
    }
    
    /**
     * Obtiene información detallada del cálculo de ISR
     */
    public String obtenerDetalleCalculo(double ingresoAnual, String tipoPersona, String regimenFiscal) {
        StringBuilder detalle = new StringBuilder();
        
        detalle.append("=== DETALLE DEL CÁLCULO DE ISR ===\n\n");
        detalle.append(String.format("Ingreso Anual: $%,.2f\n", ingresoAnual));
        detalle.append(String.format("Tipo de Persona: %s\n", tipoPersona));
        detalle.append(String.format("Régimen Fiscal: %s\n\n", regimenFiscal));
        
        if ("Persona Física".equals(tipoPersona)) {
            // Encontrar el tramo aplicable
            for (TramoISR tramo : TARIFAS_PERSONAS_FISICAS) {
                if (ingresoAnual >= tramo.getLimiteInferior() && ingresoAnual <= tramo.getLimiteSuperior()) {
                    detalle.append("Tramo aplicable:\n");
                    detalle.append(String.format("• Límite inferior: $%,.2f\n", tramo.getLimiteInferior()));
                    detalle.append(String.format("• Límite superior: $%,.2f\n", tramo.getLimiteSuperior()));
                    detalle.append(String.format("• Cuota fija: $%,.2f\n", tramo.getCuotaFija()));
                    detalle.append(String.format("• Tasa marginal: %.2f%%\n\n", tramo.getTasa()));
                    
                    double excedente = ingresoAnual - tramo.getLimiteInferior();
                    double impuestoMarginal = excedente * (tramo.getTasa() / 100);
                    double isrCalculado = tramo.getCuotaFija() + impuestoMarginal;
                    
                    detalle.append("Cálculo:\n");
                    detalle.append(String.format("• Excedente: $%,.2f\n", excedente));
                    detalle.append(String.format("• Impuesto marginal: $%,.2f\n", impuestoMarginal));
                    detalle.append(String.format("• ISR calculado: $%,.2f\n", isrCalculado));
                    
                    if ("Sueldos y Salarios".equals(regimenFiscal)) {
                        double ingresoMensual = ingresoAnual / 12;
                        double subsidioMensual = calcularSubsidioEmpleo(ingresoMensual);
                        double subsidioAnual = subsidioMensual * 12;
                        double isrAPagar = Math.max(0, isrCalculado - subsidioAnual);
                        
                        detalle.append(String.format("• Subsidio al empleo anual: $%,.2f\n", subsidioAnual));
                        detalle.append(String.format("• ISR a pagar: $%,.2f\n", isrAPagar));
                    }
                    break;
                }
            }
        } else {
            detalle.append("Persona Moral - Tasa fija del 30%\n");
            detalle.append(String.format("ISR: $%,.2f\n", ingresoAnual * 0.30));
        }
        
        return detalle.toString();
    }
}