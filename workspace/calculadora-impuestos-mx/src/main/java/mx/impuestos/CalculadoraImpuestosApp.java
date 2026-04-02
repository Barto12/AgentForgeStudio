package mx.impuestos;

import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.Stage;
import mx.impuestos.calculadoras.CalculadoraISR;
import mx.impuestos.calculadoras.CalculadoraIVA;
import mx.impuestos.models.ResultadoImpuestos;

/**
 * Aplicación principal de la Calculadora de Impuestos Mexicanos
 * Permite calcular ISR, IVA y otros impuestos según la legislación mexicana
 */
public class CalculadoraImpuestosApp extends Application {
    
    private TextField txtIngresoMensual;
    private TextField txtIngresoAnual;
    private TextField txtMontoIVA;
    private ComboBox<String> cmbTipoPersona;
    private ComboBox<String> cmbRegimenFiscal;
    private TextArea txtResultados;
    private CalculadoraISR calculadoraISR;
    private CalculadoraIVA calculadoraIVA;
    
    @Override
    public void start(Stage primaryStage) {
        inicializarCalculadoras();
        
        primaryStage.setTitle("Calculadora de Impuestos Mexicanos 2024");
        primaryStage.setScene(new Scene(crearInterfaz(), 800, 700));
        primaryStage.setResizable(false);
        primaryStage.show();
    }
    
    private void inicializarCalculadoras() {
        calculadoraISR = new CalculadoraISR();
        calculadoraIVA = new CalculadoraIVA();
    }
    
    private VBox crearInterfaz() {
        VBox root = new VBox(15);
        root.setPadding(new Insets(20));
        root.setAlignment(Pos.TOP_CENTER);
        
        // Título
        Label titulo = new Label("Calculadora de Impuestos Mexicanos 2024");
        titulo.setStyle("-fx-font-size: 24px; -fx-font-weight: bold; -fx-text-fill: #2c5282;");
        
        // Sección de configuración
        VBox seccionConfiguracion = crearSeccionConfiguracion();
        
        // Sección de cálculo ISR
        VBox seccionISR = crearSeccionISR();
        
        // Sección de cálculo IVA
        VBox seccionIVA = crearSeccionIVA();
        
        // Botones de acción
        HBox botones = crearBotones();
        
        // Área de resultados
        VBox seccionResultados = crearSeccionResultados();
        
        root.getChildren().addAll(
            titulo,
            new Separator(),
            seccionConfiguracion,
            new Separator(),
            seccionISR,
            new Separator(), 
            seccionIVA,
            new Separator(),
            botones,
            seccionResultados
        );
        
        return root;
    }
    
    private VBox crearSeccionConfiguracion() {
        VBox seccion = new VBox(10);
        seccion.setStyle("-fx-background-color: #f7fafc; -fx-padding: 15; -fx-background-radius: 5;");
        
        Label titulo = new Label("Configuración General");
        titulo.setStyle("-fx-font-size: 16px; -fx-font-weight: bold;");
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        
        // Tipo de persona
        grid.add(new Label("Tipo de Persona:"), 0, 0);
        cmbTipoPersona = new ComboBox<>();
        cmbTipoPersona.getItems().addAll("Persona Física", "Persona Moral");
        cmbTipoPersona.setValue("Persona Física");
        grid.add(cmbTipoPersona, 1, 0);
        
        // Régimen fiscal
        grid.add(new Label("Régimen Fiscal:"), 0, 1);
        cmbRegimenFiscal = new ComboBox<>();
        cmbRegimenFiscal.getItems().addAll(
            "Sueldos y Salarios",
            "Honorarios",
            "Actividad Empresarial",
            "Régimen de Incorporación Fiscal",
            "Régimen Simplificado de Confianza"
        );
        cmbRegimenFiscal.setValue("Sueldos y Salarios");
        grid.add(cmbRegimenFiscal, 1, 1);
        
        seccion.getChildren().addAll(titulo, grid);
        return seccion;
    }
    
    private VBox crearSeccionISR() {
        VBox seccion = new VBox(10);
        seccion.setStyle("-fx-background-color: #edf2f7; -fx-padding: 15; -fx-background-radius: 5;");
        
        Label titulo = new Label("Cálculo de ISR (Impuesto Sobre la Renta)");
        titulo.setStyle("-fx-font-size: 16px; -fx-font-weight: bold;");
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        
        // Ingreso mensual
        grid.add(new Label("Ingreso Mensual ($):"), 0, 0);
        txtIngresoMensual = new TextField();
        txtIngresoMensual.setPromptText("Ej: 25000.00");
        grid.add(txtIngresoMensual, 1, 0);
        
        // Ingreso anual
        grid.add(new Label("Ingreso Anual ($):"), 0, 1);
        txtIngresoAnual = new TextField();
        txtIngresoAnual.setPromptText("Ej: 300000.00");
        grid.add(txtIngresoAnual, 1, 1);
        
        // Sincronizar campos
        txtIngresoMensual.textProperty().addListener((obs, oldText, newText) -> {
            if (!newText.isEmpty() && newText.matches("\\d*\\.?\\d*")) {
                try {
                    double mensual = Double.parseDouble(newText);
                    txtIngresoAnual.setText(String.format("%.2f", mensual * 12));
                } catch (NumberFormatException e) {
                    // Ignorar errores de formato
                }
            }
        });
        
        seccion.getChildren().addAll(titulo, grid);
        return seccion;
    }
    
    private VBox crearSeccionIVA() {
        VBox seccion = new VBox(10);
        seccion.setStyle("-fx-background-color: #f0fff4; -fx-padding: 15; -fx-background-radius: 5;");
        
        Label titulo = new Label("Cálculo de IVA (Impuesto al Valor Agregado)");
        titulo.setStyle("-fx-font-size: 16px; -fx-font-weight: bold;");
        
        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(10);
        
        // Monto para IVA
        grid.add(new Label("Monto sin IVA ($):"), 0, 0);
        txtMontoIVA = new TextField();
        txtMontoIVA.setPromptText("Ej: 10000.00");
        grid.add(txtMontoIVA, 1, 0);
        
        seccion.getChildren().addAll(titulo, grid);
        return seccion;
    }
    
    private HBox crearBotones() {
        HBox botones = new HBox(15);
        botones.setAlignment(Pos.CENTER);
        
        Button btnCalcular = new Button("Calcular Impuestos");
        btnCalcular.setStyle("-fx-background-color: #3182ce; -fx-text-fill: white; -fx-padding: 10 20; -fx-font-size: 14px;");
        btnCalcular.setOnAction(e -> calcularImpuestos());
        
        Button btnLimpiar = new Button("Limpiar");
        btnLimpiar.setStyle("-fx-background-color: #e53e3e; -fx-text-fill: white; -fx-padding: 10 20; -fx-font-size: 14px;");
        btnLimpiar.setOnAction(e -> limpiarCampos());
        
        botones.getChildren().addAll(btnCalcular, btnLimpiar);
        return botones;
    }
    
    private VBox crearSeccionResultados() {
        VBox seccion = new VBox(10);
        
        Label titulo = new Label("Resultados del Cálculo");
        titulo.setStyle("-fx-font-size: 16px; -fx-font-weight: bold;");
        
        txtResultados = new TextArea();
        txtResultados.setPrefRowCount(12);
        txtResultados.setEditable(false);
        txtResultados.setStyle("-fx-font-family: 'Courier New'; -fx-font-size: 12px;");
        txtResultados.setText("Ingrese los datos y presione 'Calcular Impuestos' para ver los resultados.");
        
        seccion.getChildren().addAll(titulo, txtResultados);
        return seccion;
    }
    
    private void calcularImpuestos() {
        try {
            StringBuilder resultados = new StringBuilder();
            resultados.append("=== CALCULADORA DE IMPUESTOS MEXICANOS 2024 ===\n\n");
            
            // Obtener datos de entrada
            String tipoPersona = cmbTipoPersona.getValue();
            String regimenFiscal = cmbRegimenFiscal.getValue();
            
            resultados.append("CONFIGURACIÓN:\n");
            resultados.append(String.format("• Tipo de Persona: %s\n", tipoPersona));
            resultados.append(String.format("• Régimen Fiscal: %s\n\n", regimenFiscal));
            
            // Calcular ISR si hay datos
            if (!txtIngresoAnual.getText().isEmpty()) {
                double ingresoAnual = Double.parseDouble(txtIngresoAnual.getText());
                ResultadoImpuestos resultadoISR = calculadoraISR.calcularISRAnual(ingresoAnual, tipoPersona, regimenFiscal);
                
                resultados.append("CÁLCULO DE ISR (IMPUESTO SOBRE LA RENTA):\n");
                resultados.append(String.format("• Ingreso Anual: $%,.2f\n", ingresoAnual));
                resultados.append(String.format("• ISR Anual: $%,.2f\n", resultadoISR.getImpuesto()));
                resultados.append(String.format("• ISR Mensual: $%,.2f\n", resultadoISR.getImpuesto() / 12));
                resultados.append(String.format("• Tasa Efectiva: %.2f%%\n", resultadoISR.getTasaEfectiva()));
                resultados.append(String.format("• Ingreso Neto Anual: $%,.2f\n", ingresoAnual - resultadoISR.getImpuesto()));
                resultados.append(String.format("• Ingreso Neto Mensual: $%,.2f\n\n", (ingresoAnual - resultadoISR.getImpuesto()) / 12));
            }
            
            // Calcular IVA si hay datos
            if (!txtMontoIVA.getText().isEmpty()) {
                double montoSinIVA = Double.parseDouble(txtMontoIVA.getText());
                ResultadoImpuestos resultadoIVA = calculadoraIVA.calcularIVA(montoSinIVA);
                
                resultados.append("CÁLCULO DE IVA (IMPUESTO AL VALOR AGREGADO):\n");
                resultados.append(String.format("• Monto sin IVA: $%,.2f\n", montoSinIVA));
                resultados.append(String.format("• IVA (16%%): $%,.2f\n", resultadoIVA.getImpuesto()));
                resultados.append(String.format("• Total con IVA: $%,.2f\n\n", montoSinIVA + resultadoIVA.getImpuesto()));
            }
            
            // Información adicional
            resultados.append("INFORMACIÓN ADICIONAL:\n");
            resultados.append("• Los cálculos son aproximados y para fines informativos\n");
            resultados.append("• Consulte a un contador para cálculos oficiales\n");
            resultados.append("• Tarifas vigentes para el ejercicio fiscal 2024\n");
            
            txtResultados.setText(resultados.toString());
            
        } catch (NumberFormatException e) {
            mostrarError("Error en los datos", "Por favor, ingrese valores numéricos válidos.");
        } catch (Exception e) {
            mostrarError("Error de cálculo", "Ocurrió un error al calcular los impuestos: " + e.getMessage());
        }
    }
    
    private void limpiarCampos() {
        txtIngresoMensual.clear();
        txtIngresoAnual.clear();
        txtMontoIVA.clear();
        cmbTipoPersona.setValue("Persona Física");
        cmbRegimenFiscal.setValue("Sueldos y Salarios");
        txtResultados.setText("Ingrese los datos y presione 'Calcular Impuestos' para ver los resultados.");
    }
    
    private void mostrarError(String titulo, String mensaje) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(titulo);
        alert.setHeaderText(null);
        alert.setContentText(mensaje);
        alert.showAndWait();
    }
    
    public static void main(String[] args) {
        launch(args);
    }
}