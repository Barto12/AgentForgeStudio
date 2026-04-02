#!/bin/bash
echo "================================"
echo "  CALCULADORA DE IMPUESTOS MX"
echo "================================"
echo
echo "Compilando proyecto..."
mvn clean compile
if [ $? -ne 0 ]; then
    echo "Error en la compilación"
    exit 1
fi

echo
echo "Ejecutando aplicación..."
mvn javafx:run

echo
echo "Aplicación finalizada."