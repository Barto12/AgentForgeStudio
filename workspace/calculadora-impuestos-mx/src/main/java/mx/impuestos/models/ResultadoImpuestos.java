package mx.impuestos.models;

/**
 * Clase que representa el resultado de un cálculo de impuestos
 */
public class ResultadoImpuestos {
    private double impuesto;
    private double tasaEfectiva;
    private String detalles;
    
    public ResultadoImpuestos(double impuesto, double tasaEfectiva, String detalles) {
        this.impuesto = impuesto;
        this.tasaEfectiva = tasaEfectiva;
        this.detalles = detalles;
    }
    
    public double getImpuesto() {
        return impuesto;
    }
    
    public void setImpuesto(double impuesto) {
        this.impuesto = impuesto;
    }
    
    public double getTasaEfectiva() {
        return tasaEfectiva;
    }
    
    public void setTasaEfectiva(double tasaEfectiva) {
        this.tasaEfectiva = tasaEfectiva;
    }
    
    public String getDetalles() {
        return detalles;
    }
    
    public void setDetalles(String detalles) {
        this.detalles = detalles;
    }
    
    @Override
    public String toString() {
        return String.format("Impuesto: $%,.2f | Tasa: %.2f%% | %s", 
                           impuesto, tasaEfectiva, detalles);
    }
}