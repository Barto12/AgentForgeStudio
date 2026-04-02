package mx.impuestos.models;

/**
 * Clase que representa un tramo de la tarifa de ISR
 */
public class TramoISR {
    private double limiteInferior;
    private double limiteSuperior;
    private double cuotaFija;
    private double tasa;
    
    public TramoISR(double limiteInferior, double limiteSuperior, double cuotaFija, double tasa) {
        this.limiteInferior = limiteInferior;
        this.limiteSuperior = limiteSuperior;
        this.cuotaFija = cuotaFija;
        this.tasa = tasa;
    }
    
    public double getLimiteInferior() {
        return limiteInferior;
    }
    
    public void setLimiteInferior(double limiteInferior) {
        this.limiteInferior = limiteInferior;
    }
    
    public double getLimiteSuperior() {
        return limiteSuperior;
    }
    
    public void setLimiteSuperior(double limiteSuperior) {
        this.limiteSuperior = limiteSuperior;
    }
    
    public double getCuotaFija() {
        return cuotaFija;
    }
    
    public void setCuotaFija(double cuotaFija) {
        this.cuotaFija = cuotaFija;
    }
    
    public double getTasa() {
        return tasa;
    }
    
    public void setTasa(double tasa) {
        this.tasa = tasa;
    }
    
    @Override
    public String toString() {
        return String.format("Tramo: $%.2f - $%.2f | Cuota: $%.2f | Tasa: %.2f%%",
                           limiteInferior, limiteSuperior, cuotaFija, tasa);
    }
}