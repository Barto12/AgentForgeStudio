package com.impuestos.mx;

import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;

import java.text.DecimalFormat;

/**
 * Calculadora de Impuestos Mexicanos
 * Aplicación JavaFX para calcular ISR, IVA, IEPS y otros impuestos
 */
public class CalculadoraImpuestosApp extends Application {
    
    private TextField txtIngresoMensual;
    private TextField txtVentas;
    private TextField txtCompras;
    private ComboBox<String> cmbTipoPersona;
    private ComboBox<String> cmbRegimenFiscal;
    private TextArea txtResultados;
    private CalculadoraImpuestos calculadora;
    
    @Override
    public void start(Stage primaryStage) {
        calculadora = new CalculadoraImpuestos();
        
        primaryStage.setTitle("Calculadora de Impuestos Mexicanos - SAT");
        
        // Layout principal
        VBox root = new VBox(15);
        root.setPadding(new Insets(20));
        root.setStyle("-fx-background-color: #f5f5f5;");
        
        // Título
        Label lblTitulo = new Label("🇲🇽 CALCULADORA DE IMPUESTOS MEXICANOS");
        lblTitulo.setFont(Font.font("Arial", FontWeight.BOLD, 18));
        lblTitulo.setTextFill(Color.DARKGREEN);
        lblTitulo.setAlignment(Pos.CENTER);
        
        // Panel de entrada de datos
        VBox panelEntrada = crearPanelEntrada();
        
        // Panel de resultados
        VBox panelResultados = crearPanelResultados();
        
        // Botones
        HBox panelBotones = crearPanelBotones();
        
        root.getChildren().addAll(lblTitulo, panelEntrada, panelBotones, panelResultados);
        
        Scene scene = new Scene(new ScrollPane(root), 800, 700);
        primaryStage.setScene(scene);
        primaryStage.setResizable(true);
        primaryStage.show();
    }
    
    private VBox crearPanelEntrada() {
        VBox panel = new VBox(10);
        panel.setStyle("-fx-background-color: white; -fx-padding: 15; -fx-background-radius: 10;");
        
        Label lblSeccion = new Label("📊 DATOS PARA CÁLCULO");
        lblSeccion.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        lblSeccion.setTextFill(Color.DARKBLUE);
        
        // Tipo de persona
        HBox hboxPersona = new HBox(10);
        hboxPersona.setAlignment(Pos.CENTER_LEFT);
        Label lblPersona = new Label("Tipo de Persona:");
        lblPersona.setPrefWidth(150);
        cmbTipoPersona = new ComboBox<>();
        cmbTipoPersona.getItems().addAll("Persona Física", "Persona Moral");
        cmbTipoPersona.setValue("Persona Física");
        cmbTipoPersona.setPrefWidth(200);
        hboxPersona.getChildren().addAll(lblPersona, cmbTipoPersona);
        
        // Régimen fiscal
        HBox hboxRegimen = new HBox(10);
        hboxRegimen.setAlignment(Pos.CENTER_LEFT);
        Label lblRegimen = new Label("Régimen Fiscal:");
        lblRegimen.setPrefWidth(150);
        cmbRegimenFiscal = new ComboBox<>();
        cmbRegimenFiscal.getItems().addAll(
            "Sueldos y Salarios",
            "Honorarios",
            "Actividad Empresarial",
            "Arrendamiento",
            "RIF (Régimen de Incorporación Fiscal)",
            "RESICO (Régimen Simplificado de Confianza)"
        );
        cmbRegimenFiscal.setValue("Sueldos y Salarios");
        cmbRegimenFiscal.setPrefWidth(250);
        hboxRegimen.getChildren().addAll(lblRegimen, cmbRegimenFiscal);
        
        // Ingreso mensual
        HBox hboxIngreso = new HBox(10);
        hboxIngreso.setAlignment(Pos.CENTER_LEFT);
        Label lblIngreso = new Label("Ingreso Mensual ($):");
        lblIngreso.setPrefWidth(150);
        txtIngresoMensual = new TextField();
        txtIngresoMensual.setPromptText("Ej: 25000");
        txtIngresoMensual.setPrefWidth(200);
        hboxIngreso.getChildren().addAll(lblIngreso, txtIngresoMensual);
        
        // Ventas (para IVA)
        HBox hboxVentas = new HBox(10);
        hboxVentas.setAlignment(Pos.CENTER_LEFT);
        Label lblVentas = new Label("Ventas Mensuales ($):");
        lblVentas.setPrefWidth(150);
        txtVentas = new TextField();
        txtVentas.setPromptText("Ej: 50000 (opcional)");
        txtVentas.setPrefWidth(200);
        hboxVentas.getChildren().addAll(lblVentas, txtVentas);
        
        // Compras (para IVA acreditable)
        HBox hboxCompras = new HBox(10);
        hboxCompras.setAlignment(Pos.CENTER_LEFT);
        Label lblCompras = new Label("Compras Mensuales ($):");
        lblCompras.setPrefWidth(150);
        txtCompras = new TextField();
        txtCompras.setPromptText("Ej: 30000 (opcional)");
        txtCompras.setPrefWidth(200);
        hboxCompras.getChildren().addAll(lblCompras, txtCompras);
        
        panel.getChildren().addAll(
            lblSeccion,
            new Separator(),
            hboxPersona,
            hboxRegimen,
            hboxIngreso,
            hboxVentas,
            hboxCompras
        );
        
        return panel;
    }
    
    private HBox crearPanelBotones() {
        HBox panel = new HBox(15);
        panel.setAlignment(Pos.CENTER);
        
        Button btnCalcular = new Button("🧮 CALCULAR IMPUESTOS");
        btnCalcular.setStyle("-fx-background-color: #4CAF50; -fx-text-fill: white; -fx-font-weight: bold; -fx-padding: 10 20;");
        btnCalcular.setOnAction(e -> calcularImpuestos());
        
        Button btnLimpiar = new Button("🗑️ LIMPIAR");
        btnLimpiar.setStyle("-fx-background-color: #f44336; -fx-text-fill: white; -fx-font-weight: bold; -fx-padding: 10 20;");
        btnLimpiar.setOnAction(e -> limpiarCampos());
        
        panel.getChildren().addAll(btnCalcular, btnLimpiar);
        return panel;
    }
    
    private VBox crearPanelResultados() {
        VBox panel = new VBox(10);
        panel.setStyle("-fx-background-color: white; -fx-padding: 15; -fx-background-radius: 10;");
        
        Label lblResultados = new Label("💰 RESULTADOS DEL CÁLCULO");
        lblResultados.setFont(Font.font("Arial", FontWeight.BOLD, 14));
        lblResultados.setTextFill(Color.DARKRED);
        
        txtResultados = new TextArea();
        txtResultados.setPrefRowCount(15);
        txtResultados.setEditable(false);
        txtResultados.setStyle("-fx-font-family: 'Courier New'; -fx-font-size: 12px;");
        txtResultados.setText("Ingrese los datos y presione 'CALCULAR IMPUESTOS' para ver los resultados...");
        
        panel.getChildren().addAll(lblResultados, new Separator(), txtResultados);
        return panel;
    }
    
    private void calcularImpuestos() {
        try {
            double ingresoMensual = parseDouble(txtIngresoMensual.getText());
            double ventas = parseDouble(txtVentas.getText());
            double compras = parseDouble(txtCompras.getText());
            
            String tipoPersona = cmbTipoPersona.getValue();
            String regimenFiscal = cmbRegimenFiscal.getValue();
            
            ResultadoImpuestos resultado = calculadora.calcularImpuestos(
                ingresoMensual, ventas, compras, tipoPersona, regimenFiscal
            );
            
            mostrarResultados(resultado);
            
        } catch (NumberFormatException e) {
            mostrarError("Por favor, ingrese valores numéricos válidos.");
        } catch (Exception e) {
            mostrarError("Error en el cálculo: " + e.getMessage());
        }
    }
    
    private double parseDouble(String text) {
        if (text == null || text.trim().isEmpty()) {
            return 0.0;
        }
        return Double.parseDouble(text.trim().replace(",", ""));
    }
    
    private void mostrarResultados(ResultadoImpuestos resultado) {
        DecimalFormat df = new DecimalFormat("#,##0.00");
        
        StringBuilder sb = new StringBuilder();
        sb.append("═══════════════════════════════════════════════════════════════\n");
        sb.append("                    CÁLCULO DE IMPUESTOS MEXICANOS\n");
        sb.append("═══════════════════════════════════════════════════════════════\n\n");
        
        sb.append("📋 DATOS INGRESADOS:\n");
        sb.append("   • Tipo de Persona: ").append(cmbTipoPersona.getValue()).append("\n");
        sb.append("   • Régimen Fiscal: ").append(cmbRegimenFiscal.getValue()).append("\n");
        sb.append("   • Ingreso Mensual: $").append(df.format(resultado.getIngresoMensual())).append("\n");
        if (resultado.getVentas() > 0) {
            sb.append("   • Ventas Mensuales: $").append(df.format(resultado.getVentas())).append("\n");
        }
        if (resultado.getCompras() > 0) {
            sb.append("   • Compras Mensuales: $").append(df.format(resultado.getCompras())).append("\n");
        }
        
        sb.append("\n💸 CÁLCULO DE ISR (Impuesto Sobre la Renta):\n");
        sb.append("   • Ingreso Anual: $").append(df.format(resultado.getIngresoAnual())).append("\n");
        sb.append("   • Límite Inferior: $").append(df.format(resultado.getLimiteInferior())).append("\n");
        sb.append("   • Excedente: $").append(df.format(resultado.getExcedente())).append("\n");
        sb.append("   • Tasa Aplicable: ").append(String.format("%.2f%%", resultado.getTasaISR() * 100)).append("\n");
        sb.append("   • ISR Marginal: $").append(df.format(resultado.getIsrMarginal())).append("\n");
        sb.append("   • Cuota Fija: $").append(df.format(resultado.getCuotaFija())).append("\n");
        sb.append("   ➤ ISR ANUAL: $").append(df.format(resultado.getIsrAnual())).append("\n");
        sb.append("   ➤ ISR MENSUAL: $").append(df.format(resultado.getIsrMensual())).append("\n");
        
        if (resultado.getVentas() > 0) {
            sb.append("\n🏪 CÁLCULO DE IVA (Impuesto al Valor Agregado):\n");
            sb.append("   • IVA por Ventas (16%): $").append(df.format(resultado.getIvaCausado())).append("\n");
            sb.append("   • IVA Acreditable (16%): $").append(df.format(resultado.getIvaAcreditable())).append("\n");
            sb.append("   ➤ IVA A PAGAR: $").append(df.format(resultado.getIvaPorPagar())).append("\n");
        }
        
        sb.append("\n📊 RESUMEN MENSUAL:\n");
        sb.append("   • Ingreso Bruto: $").append(df.format(resultado.getIngresoMensual())).append("\n");
        sb.append("   • ISR Mensual: $").append(df.format(resultado.getIsrMensual())).append("\n");
        if (resultado.getIvaPorPagar() > 0) {
            sb.append("   • IVA por Pagar: $").append(df.format(resultado.getIvaPorPagar())).append("\n");
        }
        sb.append("   ➤ TOTAL IMPUESTOS: $").append(df.format(resultado.getTotalImpuestos())).append("\n");
        sb.append("   ➤ INGRESO NETO: $").append(df.format(resultado.getIngresoNeto())).append("\n");
        
        double porcentajeImpuestos = (resultado.getTotalImpuestos() / resultado.getIngresoMensual()) * 100;
        sb.append("   ➤ % DE IMPUESTOS: ").append(String.format("%.2f%%", porcentajeImpuestos)).append("\n");
        
        sb.append("\n📅 PROYECCIÓN ANUAL:\n");
        sb.append("   • ISR Anual: $").append(df.format(resultado.getIsrAnual())).append("\n");
        sb.append("   • Total Impuestos Anuales: $").append(df.format(resultado.getTotalImpuestos() * 12)).append("\n");
        
        sb.append("\n═══════════════════════════════════════════════════════════════\n");
        sb.append("⚠️  NOTA: Este cálculo es una estimación. Consulte a un contador\n");
        sb.append("   público certificado para cálculos precisos y obligaciones\n");
        sb.append("   fiscales específicas.\n");
        sb.append("═══════════════════════════════════════════════════════════════");
        
        txtResultados.setText(sb.toString());
    }
    
    private void mostrarError(String mensaje) {
        txtResultados.setText("❌ ERROR: " + mensaje);
    }
    
    private void limpiarCampos() {
        txtIngresoMensual.clear();
        txtVentas.clear();
        txtCompras.clear();
        cmbTipoPersona.setValue("Persona Física");
        cmbRegimenFiscal.setValue("Sueldos y Salarios");
        txtResultados.setText("Ingrese los datos y presione 'CALCULAR IMPUESTOS' para ver los resultados...");
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}