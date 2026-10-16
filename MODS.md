# Mods de PixelSoft

Un mod es un `.zip` con un `mod.json` dentro (y, si quieres, imágenes `.png`/`.webp` y sonidos `.ogg`/`.wav`/`.mp3`).
**Los mods son solo datos:** el juego nunca ejecuta código de un mod. Todo se valida y se recorta al cargar.

## PixelSoft 2 (Godot)
Ajustes → Mods → **Instalar .zip** (en PC también puedes arrastrar el .zip a la ventana). Los mods se copian en `user://mods/<id>/`. Además de `objetos`, se admiten `edificios`: `{ "id", "nombre", "ancho", "fondo", "coste", "lugar": casa|super|cafeteria|parque|gimnasio, "necesidad", "modelo": casa|super|cafeteria|gimnasio|biblioteca|arcade }`. Las IAs los propondrán en el pueblo.

## Instalar (versión web 1.x)
Ajustes → Mods → **📦 Instalar .zip** (en PC y en Android abre el selector de archivos).
Desde ahí puedes activar, desactivar, quitar y cambiar el **orden de carga** (▲▼). Si dos mods tocan el mismo `id`, gana el que va más abajo y el juego te avisa.
Los mods se guardan aparte de la partida y **sobreviven a las actualizaciones**.

## mod.json
```json
{
  "id": "mi-mod",
  "nombre": "Mi mod",
  "version": "1.0.0",
  "autor": "tu nombre",
  "descripcion": "Qué añade.",
  "contenido": {
    "objetos": [
      { "id": "sofa", "nombre": "🛋️ Sofá", "precio": 200, "tipo": "mueble", "bono": { "sueno": 1.2, "diversion": 1.1 } },
      { "id": "tortilla", "nombre": "🥚 Tortilla (2)", "precio": 10, "tipo": "consumible", "cantidad": 2 },
      { "id": "gorra", "nombre": "🧢 Gorra", "precio": 30, "tipo": "ropa", "moral": 5 }
    ],
    "eventos": [
      { "id": "fiesta", "texto": "🎉 Fiesta en la oficina", "probabilidad": 0.01, "efectos": { "moral": 10, "dinero": -100 } }
    ],
    "clientes": ["Bar Manolo"],
    "trabajos": ["app de tapas"],
    "investigacion": [
      { "id": "prompting", "nombre": "Prompt engineering", "coste": 400, "requiere": ["tokens"], "efecto": "solo enseña", "leccion": "Cómo pides importa." }
    ],
    "textos": { "Supermercado": "Súper" }
  }
}
```

### Campos
| Sección | Campos | Límites |
|---|---|---|
| objetos | id, nombre, precio, tipo (`mueble`/`consumible`/`ropa`), cantidad, moral, bono | bono por necesidad: 0,5–2 |
| eventos | id, texto, probabilidad, efectos | probabilidad ≤ 0,05 por hora; efectos: dinero, reputacion, clientes, calidad, energia, moral |
| investigacion | id, nombre, coste, requiere, efecto, leccion | hasta 20 nodos |
| clientes / trabajos | lista de textos | 50 |
| textos | traducciones `"original": "nuevo"` | 300 |

Necesidades: `hambre`, `sueno`, `diversion`, `higiene`, `social`. Un `icono.png` en el zip se muestra en la lista de mods.

Límites: zip ≤ 10 MB, cada recurso ≤ 2 MB. No se admiten rutas con `..`.

Ejemplo completo: [`mods/ejemplo-cafeteria/`](mods/ejemplo-cafeteria/mod.json) y `mods/ejemplo-cafeteria.zip`.
