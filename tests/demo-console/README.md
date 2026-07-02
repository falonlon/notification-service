# G9 Demo Console

Herramienta de demostracion para probar el servicio de notificaciones G9.

Permite seleccionar pruebas desde un menu, revisar el request HTTP, editar el JSON con `F9`, enviar el request, ver la respuesta del backend y exportar evidencia Markdown.

## Instalacion

```bash
pip install textual rich requests
```

## Ejecutar local

```bash
python demo_local.py
```

Requiere que el backend este corriendo en:

```text
http://localhost:8000
```

## Ejecutar Render

```bash
python demo_render.py
```

Usa:

```text
https://notification-service-i3bn.onrender.com
```

## Atajos

* F1: Ayuda
* F5: Restaurar request
* F8: Demo completa
* F9: Editar request actual
* F10: Exportar evidencia
* Enter: Enviar request
* Esc: Cancelar edicion / salir

## Evidencia

Los archivos Markdown se generan en:

```text
tests/demo-console/evidence/
```

El nombre sigue el formato:

```text
evidence-LOCAL-YYYYMMDD-HHMMSS.md
evidence-RENDER-YYYYMMDD-HHMMSS.md
```

## Seguridad

La herramienta no usa keys de Supabase, no lee `.env` y no se conecta directamente a la base de datos. Solo consume los endpoints HTTP del backend.
