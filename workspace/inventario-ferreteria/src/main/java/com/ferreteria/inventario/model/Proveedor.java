package com.ferreteria.inventario.model;

import java.time.LocalDateTime;

/**
 * Clase que representa un proveedor de productos para la ferretería
 */
public class Proveedor {
    private Long id;
    private String nombre;
    private String razonSocial;
    private String ruc;
    private String telefono;
    private String email;
    private String direccion;
    private String ciudad;
    private String pais;
    private String contactoPrincipal;
    private String telefonoContacto;
    private String emailContacto;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private boolean activo;

    // Constructor por defecto
    public Proveedor() {
        this.fechaCreacion = LocalDateTime.now();
        this.fechaActualizacion = LocalDateTime.now();
        this.activo = true;
    }

    // Constructor con parámetros principales
    public Proveedor(String nombre, String razonSocial, String ruc, 
                    String telefono, String email) {
        this();
        this.nombre = nombre;
        this.razonSocial = razonSocial;
        this.ruc = ruc;
        this.telefono = telefono;
        this.email = email;
    }

    // Getters y Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getRazonSocial() {
        return razonSocial;
    }

    public void setRazonSocial(String razonSocial) {
        this.razonSocial = razonSocial;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getRuc() {
        return ruc;
    }

    public void setRuc(String ruc) {
        this.ruc = ruc;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getCiudad() {
        return ciudad;
    }

    public void setCiudad(String ciudad) {
        this.ciudad = ciudad;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getPais() {
        return pais;
    }

    public void setPais(String pais) {
        this.pais = pais;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getContactoPrincipal() {
        return contactoPrincipal;
    }

    public void setContactoPrincipal(String contactoPrincipal) {
        this.contactoPrincipal = contactoPrincipal;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getTelefonoContacto() {
        return telefonoContacto;
    }

    public void setTelefonoContacto(String telefonoContacto) {
        this.telefonoContacto = telefonoContacto;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public String getEmailContacto() {
        return emailContacto;
    }

    public void setEmailContacto(String emailContacto) {
        this.emailContacto = emailContacto;
        this.fechaActualizacion = LocalDateTime.now();
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) {
        this.activo = activo;
        this.fechaActualizacion = LocalDateTime.now();
    }

    // Métodos de utilidad
    public String getDireccionCompleta() {
        StringBuilder direccionCompleta = new StringBuilder();
        if (direccion != null && !direccion.isEmpty()) {
            direccionCompleta.append(direccion);
        }
        if (ciudad != null && !ciudad.isEmpty()) {
            if (direccionCompleta.length() > 0) {
                direccionCompleta.append(", ");
            }
            direccionCompleta.append(ciudad);
        }
        if (pais != null && !pais.isEmpty()) {
            if (direccionCompleta.length() > 0) {
                direccionCompleta.append(", ");
            }
            direccionCompleta.append(pais);
        }
        return direccionCompleta.toString();
    }

    public boolean tieneContacto() {
        return contactoPrincipal != null && !contactoPrincipal.isEmpty();
    }

    @Override
    public String toString() {
        return String.format("Proveedor{id=%d, nombre='%s', ruc='%s', telefono='%s'}", 
                           id, nombre, ruc, telefono);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Proveedor proveedor = (Proveedor) obj;
        return ruc != null ? ruc.equals(proveedor.ruc) : proveedor.ruc == null;
    }

    @Override
    public int hashCode() {
        return ruc != null ? ruc.hashCode() : 0;
    }
}