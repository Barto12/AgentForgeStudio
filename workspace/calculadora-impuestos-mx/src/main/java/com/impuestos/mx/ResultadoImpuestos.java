package com.impuestos.mx;

/**
 * Clase que encapsula todos los resultados del cálculo de impuestos
 */
public class ResultadoImpuestos {
    
    // Datos de entrada
    private double ingresoMensual;
    private double ventas;
    private double compras;
    private String tipoPersona;
    private String regimenFiscal;
    
    // Cálculos de ISR
    private double ingresoAnual;
    private double limiteInferior;
    private double cuotaFija;
    private double tasaISR;
    private double excedente;
    private double isrMarginal;
    private double isrAnual;
    private double isrMensual;
    
    // Cálculos de IVA
    private double ivaCausado;
    private double ivaAcreditable;
    private double ivaPorPagar;
    
    // Totales
    private double totalImpuestos;
    private double ingresoNeto;
    
    // Constructores
    public ResultadoImpuestos() {}
    
    // Getters y Setters
    public double getIngresoMensual() {
        return ingresoMensual;
    }
    
    public void setIngresoMensual(double ingresoMensual) {
        this.ingresoMensual = ingresoMensual;
    }
    
    public double getVentas() {
        return ventas;
    }
    
    public void setVentas(double ventas) {
        this.ventas = ventas;
    }
    
    public double getCompras() {
        return compras;
    }
    
    public void setCompras(double compras) {
        this.compras = compras;
    }
    
    public String getTipoPersona() {
        return tipoPersona;
    }
    
    public void setTipoPersona(String tipoPersona) {
        this.tipoPersona = tipoPersona;
    }
    
    public String getRegimenFiscal() {
        return regimenFiscal;
    }
    
    public void setRegimenFiscal(String regimenFiscal) {
        this.regimenFiscal = regimenFiscal;
    }
    
    public double getIngresoAnual() {
        return ingresoAnual;
    }
    
    public void setIngresoAnual(double ingresoAnual) {
        this.ingresoAnual = ingresoAnual;
    }
    
    public double getLimiteInferior() {
        return limiteInferior;
    }
    
    public void setLimiteInferior(double limiteInferior) {
        this.limiteInferior = limiteInferior;
    }
    
    public double getCuotaFija() {
        return cuotaFija;
    }
    
    public void setCuotaFija(double cuotaFija) {
        this.cuotaFija = cuotaFija;
    }
    
    public double getTasaISR() {
        return tasaISR;
    }
    
    public void setTasaISR(double tasaISR) {
        this.tasaISR = tasaISR;
    }
    
    public double getExcedente() {
        return excedente;
    }
    
    public void setExcedente(double excedente) {
        this.excedente = excedente;
    }
    
    public double getIsrMarginal() {
        return isrMarginal;
    }
    
    public void setIsrMarginal(double isrMarginal) {
        this.isrMarginal = isrMarginal;
    }
    
    public double getIsrAnual() {
        return isrAnual;
    }
    
    public void setIsrAnual(double isrAnual) {
        this.isrAnual = isrAnual;
    }
    
    public double getIsrMensual() {
        return isrMensual;
    }
    
    public void setIsrMensual(double isrMensual) {
        this.isrMensual = isrMensual;
    }
    
    public double getIvaCausado() {
        return ivaCausado;
    }
    
    public void setIvaCausado(double ivaCausado) {
        this.ivaCausado = ivaCausado;
    }
    
    public double getIvaAcreditable() {
        return ivaAcreditable;
    }
    
    public void setIvaAcreditable(double ivaAcreditable) {
        this.ivaAcreditable = ivaAcreditable;
    }
    
    public double getIvaPorPagar() {
        return ivaPorPagar;
    }
    
    public void setIvaPorPagar(double ivaPorPagar) {
        this.ivaPorPagar = ivaPorPagar;
    }
    
    public double getTotalImpuestos() {
        return totalImpuestos;
    }
    
    public void setTotalImpuestos(double totalImpuestos) {
        this.totalImpuestos = totalImpuestos;
    }
    
    public double getIngresoNeto() {
        return ingresoNeto;
    }
    
    public void setIngresoNeto(double ingresoNeto) {
        this.ingresoNeto = ingresoNeto;
    }
    
    @Override
    public String toString() {
        return "ResultadoImpuestos{" +
                "ingresoMensual=" + ingresoMensual +
                ", isrMensual=" + isrMensual +
                ", ivaPorPagar=" + ivaPorPagar +
                ", totalImpuestos=" + totalImpuestos +
                ", ingresoNeto=" + ingresoNeto +
                '}';
    }
}