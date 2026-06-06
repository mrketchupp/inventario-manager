# Conteo Físico · Inventario DLTA

La página principal del sitio es **`index.html`**, una aplicación web autónoma
(de un solo archivo) para el conteo físico de inventario.

## Uso

Sírvelo como sitio estático (la app usa un service worker, que requiere
`http(s)://`, no `file://`). No requiere instalación ni build.

```bash
# Ejemplo: servirlo localmente
python3 -m http.server
# luego abre http://localhost:8000
```

## Guardado automático del conteo

El progreso se guarda solo en el dispositivo (IndexedDB), de modo que **sobrevive
a recargas y cierres** —incluido cuando iOS recarga la app al volver de segundo
plano—. Se guarda al cargar el archivo, tras cada cambio (con un pequeño retardo)
y al ocultar/cerrar la página. Al reabrir, la sesión se restaura automáticamente
en el mismo contenedor y vista. El botón de **descartar** (reset) borra también
lo guardado.

## Offline / añadir a la pantalla de inicio (iOS)

Todas las dependencias están alojadas localmente (no se usa ningún CDN):

- `assets/xlsx.full.min.js` — librería SheetJS/XLSX.
- `assets/fonts.css` + `assets/fonts/*.woff2` — fuentes Oswald e IBM Plex
  (subset latin) self-hosted.

Un service worker (`sw.js`) precachea la app y estos recursos en la primera
visita, de modo que funciona **sin conexión**. Al añadirla a la pantalla de
inicio desde Safari en iOS, abre y opera offline.

> Si actualizas algún recurso, sube `CACHE_VERSION` en `sw.js` para forzar que
> los dispositivos descarguen la nueva versión.

## Código anterior

El proyecto previo en React + Vite se conserva en la carpeta
[`miselanio/`](./miselanio) por referencia. Consulta su propio README para
instrucciones de desarrollo.
