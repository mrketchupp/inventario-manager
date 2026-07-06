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

## Vista Lista (tipo Notion)

Además de la vista Tarjeta, la vista **Lista** muestra cada ítem compacto
(código AX · dimensión · cantidad) y se expande al tocarlo para editar
descripción, NP, UM, dimensión y conteo. Desde el panel expandido se puede:

- **Reordenar** ítems (arrastrando el asa `⠿` o con los botones ↑/↓).
- **Modo selección** (`☑ Selec.`): marca varios ítems y muévelos juntos con la
  barra inferior — ↑/↓ (mantener presionado repite el movimiento), ⤒ al inicio,
  ⤓ al final, o ⇄ a otro contenedor en bloque.
- **Deshacer / rehacer** (↶ / ↷ en la barra de controles, o Ctrl+Z /
  Ctrl+Shift+Z): cubre ediciones, validaciones, etiquetas, reordenados,
  movimientos entre contenedores y altas/bajas de ítems.
- **Añadir ítems nuevos** (botón `➕ Ítem`); al exportar se añaden al final de
  la hoja de su contenedor y quedan registrados como `NUEVO` en `CAMBIOS`.
- **Mover ítems a otro contenedor**; al exportar, la fila del origen se
  elimina (celdas vaciadas y fila oculta) y el ítem se añade a la hoja del
  contenedor destino (registrado como `MOVIDO`).
- **Marcar corrección de etiqueta** 🏷 (modificar etiqueta / falta etiquetar /
  cantidad de etiquetas, con nota). Tiene su propio filtro y contador; se
  consulta en el sitio y no se incluye en la exportación.

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
