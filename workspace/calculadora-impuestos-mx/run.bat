@echo off
echo ================================
echo  CALCULADORA DE IMPUESTOS MX
echo ================================
echo.
echo Compilando proyecto...
call mvn clean compile
if %ERRORLEVEL% NEQ 0 (
    echo Error en la compilacion
    pause
    exit /b 1
)

echo.
echo Ejecutando aplicacion...
call mvn javafx:run

echo.
echo Aplicacion finalizada.
pause