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

## Sesiones guardadas (multi-inventario)

Cada archivo `.xlsx` cargado crea una **sesión** independiente que se guarda
sola en el dispositivo (IndexedDB): el avance sobrevive a recargas y cierres
—incluido cuando iOS recarga la app al volver de segundo plano— y **cargar un
archivo nuevo no borra la sesión anterior**. Desde el panel **🗂 Sesiones**
(en el encabezado o en la pantalla inicial) puedes volver a cualquier "partida
guardada", renombrarla o eliminarla. El botón **↺** descarta solo la sesión
actual. El guardado antiguo de una sola sesión se migra automáticamente.

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
