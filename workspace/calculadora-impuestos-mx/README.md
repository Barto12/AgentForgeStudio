# Calculadora de Impuestos Mexicanos 2024

Aplicación JavaFX para calcular impuestos mexicanos tanto para personas físicas como morales.

## Características

- ✅ Cálculo de ISR para Personas Físicas (tarifas 2024)
- ✅ Cálculo de ISR para Personas Morales (30%)
- ✅ Estimación de IMSS e INFONAVIT
- ✅ Interfaz gráfica intuitiva
- ✅ Validación de datos
- ✅ Resultados detallados

## Requisitos

- Java 11 o superior
- Maven 3.6+
- JavaFX 17+

## Instalación y Ejecución

### Opción 1: Con Maven y JavaFX Plugin
```bash
# Instalar dependencias
mvn clean install

# Ejecutar la aplicación
mvn javafx:run
```

### Opción 2: Ejecutar JAR
```bash
# Compilar y crear JAR
mvn clean package

# Ejecutar (requiere JavaFX en el classpath)
java --module-path /path/to/javafx/lib --add-modules javafx.controls,javafx.fxml -jar target/calculadora-impuestos-mx-1.0.0.jar
```

### Opción 3: Desarrollo con IDE
1. Importar como proyecto Maven
2. Configurar JavaFX en el classpath
3. Ejecutar la clase principal: `com.impuestos.CalculadoraImpuestosMX`

## Uso

1. **Seleccionar tipo de persona**: Física o Moral
2. **Ingresar datos**:
   - Ingreso anual bruto
   - Deducciones personales (opcional)
3. **Calcular**: Presionar el botón "Calcular Impuestos"
4. **Revisar resultados**: Se muestran todos los cálculos detallados

## Cálculos Incluidos

### Personas Físicas
- ISR según tarifas progresivas 2024
- Límite de deducciones personales (4 UMAs anuales)
- Estimación IMSS (2.5%)
- Estimación INFONAVIT (5%)
- Tasa efectiva total

### Personas Morales
- ISR fijo del 30%
- IVA estimado (16%)
- Utilidad neta después de impuestos

## Estructura del Proyecto

```
calculadora-impuestos-mx/
├── src/main/java/
│   ├── com/impuestos/
│   │   └── CalculadoraImpuestosMX.java
│   └── module-info.java
├── pom.xml
└── README.md
```

## Notas Importantes

- Los cálculos son estimaciones basadas en las tarifas 2024
- Para cálculos oficiales, consulte con un contador público
- La UMA 2024 utilizada es de $32.70 pesos diarios
- Los porcentajes de IMSS e INFONAVIT son estimaciones

## Licencia

Este proyecto es de código abierto para fines educativos y de referencia.