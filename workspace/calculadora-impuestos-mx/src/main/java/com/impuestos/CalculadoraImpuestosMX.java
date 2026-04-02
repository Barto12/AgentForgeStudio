package com.impuestos;

import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.Stage;
import java.text.DecimalFormat;

public class CalculadoraImpuestosMX extends Application {
    
    private TextField txtIngresoAnual;
    private TextField txtDeduccionesPersonales;
    private ComboBox<String> cmbTipoPersona;
    private TextArea txtResultados;
    private DecimalFormat df = new DecimalFormat("#,##0.00");
    
    // Tarifas ISR 2024 - Personas Físicas
    private static final double[][] TARIFAS_ISR = {
        {0.01, 8952.49, 0.00, 1.92},
        {8952.50, 75984.55, 114.29, 6.40},
        {75984.56, 133536.07, 4210.32, 10.88},
        {133536.08, 155229.80, 10572.83, 16.00},
        {155229.81, 185852.57, 14058.67, 21.36},
        {185852.58, 374837.88, 20582.84, 23.52},
        {374837.89, 590668.67, 65123.49, 30.00},
        {590668.68, 1127000.37, 129892.65, 32.00},
        {1127000.38, 1503335.03, 301507.67, 34.00},
        {1503335.04, Double.MAX_VALUE, 429553.78, 35.00}
    };
    
    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("Calculadora de Impuestos Mexicanos 2024");
        
        // Crear componentes
        crearComponentes();
        
        // Layout principal
        VBox root = new VBox(15);
        root.setPadding(new Insets(20));
        root.setAlignment(Pos.TOP_CENTER);
        
        // Título
        Label titulo = new Label("Calculadora de Impuestos Mexicanos 2024");
        titulo.setStyle("-fx-font-size: 18px; -fx-font-weight: bold;");
        
        // Panel de entrada
        GridPane panelEntrada = crearPanelEntrada();
        
        // Botones
        HBox panelBotones = crearPanelBotones();
        
        // Panel de resultados
        VBox panelResultados = crearPanelResultados();
        
        root.getChildren().addAll(titulo, panelEntrada, panelBotones, panelResultados);
        
        Scene scene = new Scene(new ScrollPane(root), 600, 700);
        primaryStage.setScene(scene);
        primaryStage.show();
    }
    
    private void crearComponentes() {
        txtIngresoAnual = new TextField();
        txtIngresoAnual.setPromptText("Ej: 500000");
        
        txtDeduccionesPersonales = new TextField();
        txtDeduccionesPersonales.setPromptText("Ej: 50000");
        
        cmbTipoPersona = new ComboBox<>();
        cmbTipoPersona.getItems().addAll("Persona Física", "Persona Moral");
        cmbTipoPersona.setValue("Persona Física");
        
        txtResultados = new TextArea();
        txtResultados.setEditable(false);
        txtResultados.setPrefRowCount(15);
        txtResultados.setStyle("-fx-font-family: monospace;");
    }
    
    private GridPane crearPanelEntrada() {
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        grid.setPadding(new Insets(10));
        grid.setStyle("-fx-border-color: #cccccc; -fx-border-width: 1px;");
        
        grid.add(new Label("Tipo de Persona:"), 0, 0);
        grid.add(cmbTipoPersona, 1, 0);
        
        grid.add(new Label("Ingreso Anual ($):"), 0, 1);
        grid.add(txtIngresoAnual, 1, 1);
        
        grid.add(new Label("Deducciones Personales ($):"), 0, 2);
        grid.add(txtDeduccionesPersonales, 1, 2);
        
        return grid;
    }
    
    private HBox crearPanelBotones() {
        HBox panel = new HBox(10);
        panel.setAlignment(Pos.CENTER);
        
        Button btnCalcular = new Button("Calcular Impuestos");
        btnCalcular.setStyle("-fx-background-color: #4CAF50; -fx-text-fill: white; -fx-font-weight: bold;");
        btnCalcular.setOnAction(e -> calcularImpuestos());
        
        Button btnLimpiar = new Button("Limpiar");
        btnLimpiar.setStyle("-fx-background-color: #f44336; -fx-text-fill: white;");
        btnLimpiar.setOnAction(e -> limpiarCampos());
        
        panel.getChildren().addAll(btnCalcular, btnLimpiar);
        return panel;
    }
    
    private VBox crearPanelResultados() {
        VBox panel = new VBox(5);
        
        Label lblResultados = new Label("Resultados del Cálculo:");
        lblResultados.setStyle("-fx-font-weight: bold;");
        
        panel.getChildren().addAll(lblResultados, txtResultados);
        return panel;
    }
    
    private void calcularImpuestos() {
        try {
            double ingresoAnual = Double.parseDouble(txtIngresoAnual.getText().replace(",", ""));
            double deducciones = txtDeduccionesPersonales.getText().isEmpty() ? 
                0 : Double.parseDouble(txtDeduccionesPersonales.getText().replace(",", ""));
            
            if (ingresoAnual <= 0) {
                mostrarError("El ingreso anual debe ser mayor a cero");
                return;
            }
            
            StringBuilder resultado = new StringBuilder();
            resultado.append("═══════════════════════════════════════════════════\n");
            resultado.append("    CÁLCULO DE IMPUESTOS MEXICANOS 2024\n");
            resultado.append("═══════════════════════════════════════════════════\n\n");
            
            resultado.append("DATOS DE ENTRADA:\n");
            resultado.append("─────────────────────────────────────────────────\n");
            resultado.append(String.format("Tipo de persona: %s\n", cmbTipoPersona.getValue()));
            resultado.append(String.format("Ingreso anual: $%s\n", df.format(ingresoAnual)));
            resultado.append(String.format("Deducciones personales: $%s\n\n", df.format(deducciones)));
            
            if (cmbTipoPersona.getValue().equals("Persona Física")) {
                calcularPersonaFisica(ingresoAnual, deducciones, resultado);
            } else {
                calcularPersonaMoral(ingresoAnual, deducciones, resultado);
            }
            
            txtResultados.setText(resultado.toString());
            
        } catch (NumberFormatException e) {
            mostrarError("Por favor ingrese valores numéricos válidos");
        } catch (Exception e) {
            mostrarError("Error en el cálculo: " + e.getMessage());
        }
    }
    
    private void calcularPersonaFisica(double ingresoAnual, double deducciones, StringBuilder resultado) {
        // Límite de deducciones personales (4 UMAs anuales)
        double limiteDeducciones = 4 * 32.70 * 365; // UMA 2024 = $32.70 diarios
        double deduccionesAplicables = Math.min(deducciones, limiteDeducciones);
        
        // Base gravable
        double baseGravable = Math.max(0, ingresoAnual - deduccionesAplicables);
        
        resultado.append("CÁLCULO ISR - PERSONA FÍSICA:\n");
        resultado.append("─────────────────────────────────────────────────\n");
        resultado.append(String.format("Límite deducciones personales: $%s\n", df.format(limiteDeducciones)));
        resultado.append(String.format("Deducciones aplicables: $%s\n", df.format(deduccionesAplicables)));
        resultado.append(String.format("Base gravable: $%s\n\n", df.format(baseGravable)));
        
        // Calcular ISR
        double isr = calcularISR(baseGravable);
        
        // Calcular otros impuestos
        double iva = 0; // Las personas físicas no siempre causan IVA
        double imss = calcularIMSS(ingresoAnual);
        double infonavit = calcularInfonavit(ingresoAnual);
        
        resultado.append("IMPUESTOS CALCULADOS:\n");
        resultado.append("─────────────────────────────────────────────────\n");
        resultado.append(String.format("ISR anual: $%s\n", df.format(isr)));
        resultado.append(String.format("ISR mensual: $%s\n", df.format(isr / 12)));
        resultado.append(String.format("IMSS (estimado): $%s\n", df.format(imss)));
        resultado.append(String.format("INFONAVIT (estimado): $%s\n\n", df.format(infonavit)));
        
        double totalImpuestos = isr + imss + infonavit;
        double ingresoNeto = ingresoAnual - totalImpuestos;
        
        resultado.append("RESUMEN FINAL:\n");
        resultado.append("─────────────────────────────────────────────────\n");
        resultado.append(String.format("Ingreso bruto anual: $%s\n", df.format(ingresoAnual)));
        resultado.append(String.format("Total impuestos: $%s\n", df.format(totalImpuestos)));
        resultado.append(String.format("Ingreso neto anual: $%s\n", df.format(ingresoNeto)));
        resultado.append(String.format("Ingreso neto mensual: $%s\n", df.format(ingresoNeto / 12)));
        resultado.append(String.format("Tasa efectiva: %.2f%%\n", (totalImpuestos / ingresoAnual) * 100));
    }
    
    private void calcularPersonaMoral(double ingresoAnual, double deducciones, StringBuilder resultado) {
        double baseGravable = Math.max(0, ingresoAnual - deducciones);
        
        resultado.append("CÁLCULO ISR - PERSONA MORAL:\n");
        resultado.append("─────────────────────────────────────────────────\n");
        resultado.append(String.format("Deducciones aplicables: $%s\n", df.format(deducciones)));
        resultado.append(String.format("Base gravable: $%s\n\n", df.format(baseGravable)));
        
        // ISR Personas Morales = 30%
        double isr = baseGravable * 0.30;
        
        // IVA (16% sobre ingresos)
        double iva = ingresoAnual * 0.16;
        
        resultado.append("IMPUESTOS CALCULADOS:\n");
        resultado.append("─────────────────────────────────────────────────\n");
        resultado.append(String.format("ISR (30%%): $%s\n", df.format(isr)));
        resultado.append(String.format("IVA por pagar (16%%): $%s\n\n", df.format(iva)));
        
        double totalImpuestos = isr;
        double utilidadNeta = baseGravable - isr;
        
        resultado.append("RESUMEN FINAL:\n");
        resultado.append("─────────────────────────────────────────────────\n");
        resultado.append(String.format("Ingresos totales: $%s\n", df.format(ingresoAnual)));
        resultado.append(String.format("Deducciones: $%s\n", df.format(deducciones)));
        resultado.append(String.format("Base gravable: $%s\n", df.format(baseGravable)));
        resultado.append(String.format("ISR a pagar: $%s\n", df.format(isr)));
        resultado.append(String.format("Utilidad neta: $%s\n", df.format(utilidadNeta)));
        resultado.append(String.format("Tasa efectiva ISR: %.2f%%\n", (isr / ingresoAnual) * 100));
    }
    
    private double calcularISR(double baseGravable) {
        if (baseGravable <= 0) return 0;
        
        for (double[] tarifa : TARIFAS_ISR) {
            if (baseGravable >= tarifa[0] && baseGravable <= tarifa[1]) {
                double excedente = baseGravable - tarifa[0] + 0.01;
                double impuestoMarginal = excedente * (tarifa[3] / 100);
                return tarifa[2] + impuestoMarginal;
            }
        }
        return 0;
    }
    
    private double calcularIMSS(double ingresoAnual) {
        // Estimación IMSS para trabajador (aproximadamente 2.5% del salario)
        double salarioMensual = ingresoAnual / 12;
        double uma = 32.70 * 30.4; // UMA mensual 2024
        double salarioBase = Math.min(salarioMensual, uma * 25); // Tope 25 UMAs
        return salarioBase * 12 * 0.025; // 2.5% anual estimado
    }
    
    private double calcularInfonavit(double ingresoAnual) {
        // INFONAVIT 5% sobre salario
        double salarioMensual = ingresoAnual / 12;
        double uma = 32.70 * 30.4; // UMA mensual 2024
        double salarioBase = Math.min(salarioMensual, uma * 25); // Tope 25 UMAs
        return salarioBase * 12 * 0.05; // 5% anual
    }
    
    private void limpiarCampos() {
        txtIngresoAnual.clear();
        txtDeduccionesPersonales.clear();
        txtResultados.clear();
        cmbTipoPersona.setValue("Persona Física");
    }
    
    private void mostrarError(String mensaje) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle("Error");
        alert.setHeaderText(null);
        alert.setContentText(mensaje);
        alert.showAndWait();
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}