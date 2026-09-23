package com.pixelsoft.juego;

import android.app.Activity;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;

/**
 * Sirve el juego leyendolo de los assets del propio APK.
 *
 * Tres cosas que conviene entender de esta clase:
 *
 * 1) POR QUE SE INTERCEPTA EN VEZ DE USAR file://
 *    El juego son modulos ES (import/export) y esos NO cargan si la pagina
 *    viene de file://. Asi que la pagina se pide como una web normal
 *    (https://pixelsoft.local) y aqui se intercepta cada peticion para
 *    devolverla desde los assets. El navegador cree que es una web de verdad,
 *    los modulos cargan bien, y no hace falta ningun servidor local.
 *
 * 2) POR QUE SE PRUEBAN DOS SEPARADORES
 *    Al empaquetar en Windows, la herramienta aapt2 mete los nombres de los
 *    assets con barra invertida (assets/www\js\app.js) en vez de con barra
 *    normal. Segun la version de Android, el AssetManager normaliza eso o no.
 *    Probando las dos formas funciona siempre, en cualquier version.
 *
 * 3) POR QUE HAY UNA CLASE APARTE Y NO UNA CLASE ANONIMA
 *    Las clases anonimas generan un fichero MainActivity$1.class que a la
 *    herramienta d8 de este SDK le sentaba mal (petaba con un
 *    NullPointerException interno). Con una clase normal, se compila sin
 *    problemas.
 */
public class ClienteWeb extends WebViewClient {

    private static final String CARPETA = "www";
    private static final String TIPO_POR_DEFECTO = "application/octet-stream";

    private final Activity actividad;

    public ClienteWeb(Activity actividad) {
        this.actividad = actividad;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView vista, WebResourceRequest peticion) {
        String camino = peticion.getUrl().getPath();
        if (camino == null || camino.isEmpty() || camino.equals("/")) {
            camino = "/index.html";
        }

        // Seguridad: que nadie intente salirse de la carpeta www.
        if (camino.contains("..")) {
            return noEncontrado(camino);
        }

        // Primero con barra normal (lo correcto) y, si falla, con la
        // barra invertida que mete aapt2 en Windows.
        InputStream flujo = abrir(CARPETA + camino);
        if (flujo == null) {
            flujo = abrir(CARPETA + camino.replace('/', '\\'));
        }
        if (flujo == null) {
            return noEncontrado(camino);
        }

        return respuesta(camino, tipoMime(camino), flujo);
    }

    /**
     * Envuelve el flujo en una respuesta con las cabeceras que hacen falta.
     *
     * Las de Cross-Origin son para que el navegador active SharedArrayBuffer,
     * que es lo que permite al motor de IA usar VARIOS NUCLEOS del movil. Sin
     * esto, el modelo iria a un solo hilo y tardaria cuatro veces mas.
     *
     * OJO, y esto esta comprobado en el emulador: el WebView de Android NO
     * respeta estas cabeceras puestas desde el interceptor. Da igual
     * "credentialless" que "require-corp": el resultado siempre es
     * crossOriginIsolated=false, o sea, sin SharedArrayBuffer. Se quedan
     * puestas por si algun dia lo arreglan (y porque en el PC si funcionan),
     * pero el motor de IA del movil va a UN SOLO HILO. Por eso se empaquetan
     * tambien las variantes "asyncify" y "jspi" del .wasm: son las que ONNX
     * Runtime usa cuando no puede repartir el trabajo entre varios nucleos.
     *
     * Con "require-corp" ademas se rompe la descarga del modelo, asi que se
     * usa "credentialless", que al menos la deja pasar.
     *
     * La codificacion se deja a null para los binarios (.wasm): decirle utf-8 a
     * un fichero binario lo corrompe.
     */
    private WebResourceResponse respuesta(String camino, String mime, InputStream flujo) {
        Map<String, String> cabeceras = new HashMap<String, String>();
        cabeceras.put("Cross-Origin-Opener-Policy", "same-origin");
        cabeceras.put("Cross-Origin-Embedder-Policy", "credentialless");
        cabeceras.put("Cross-Origin-Resource-Policy", "cross-origin");

        boolean binario = camino.toLowerCase().endsWith(".wasm");
        String codificacion = binario ? null : "utf-8";
        return new WebResourceResponse(mime, codificacion, 200, "OK", cabeceras, flujo);
    }

    /** Devuelve el flujo del asset, o null si no existe. */
    private InputStream abrir(String ruta) {
        try {
            return actividad.getAssets().open(ruta);
        } catch (IOException e) {
            return null;
        }
    }

    /**
     * Importante: SIEMPRE hay que devolver un cuerpo, aunque sea un error.
     * Un WebResourceResponse con el flujo a null hace que el navegador se
     * queje con ERR_INVALID_RESPONSE y no se ve nada de nada.
     */
    private WebResourceResponse noEncontrado(String camino) {
        String html = "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\">"
                + "<body style=\"background:#0d1017;color:#e6ebf5;font-family:monospace;padding:24px\">"
                + "<h2 style=\"color:#e05a4a\">No encuentro ese fichero</h2>"
                + "<p style=\"color:#8b98b0\">" + escapar(camino) + "</p>"
                + "</body></html>";

        return new WebResourceResponse("text/html", "utf-8", 404, "Not Found",
                new HashMap<String, String>(), flujoDe(html));
    }

    private InputStream flujoDe(String texto) {
        try {
            return new ByteArrayInputStream(texto.getBytes("UTF-8"));
        } catch (UnsupportedEncodingException e) {
            return new ByteArrayInputStream(new byte[0]);
        }
    }

    private String escapar(String texto) {
        return texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * El tipo MIME importa de verdad: si los .js no se sirven como
     * text/javascript, el navegador se niega a cargarlos como modulos.
     */
    private String tipoMime(String camino) {
        String c = camino.toLowerCase();
        if (c.endsWith(".html") || c.endsWith(".htm")) return "text/html";
        if (c.endsWith(".js") || c.endsWith(".mjs")) return "text/javascript";
        if (c.endsWith(".css")) return "text/css";
        if (c.endsWith(".json")) return "application/json";
        if (c.endsWith(".webmanifest")) return "application/manifest+json";
        if (c.endsWith(".png")) return "image/png";
        if (c.endsWith(".jpg") || c.endsWith(".jpeg")) return "image/jpeg";
        if (c.endsWith(".svg")) return "image/svg+xml";
        if (c.endsWith(".woff2")) return "font/woff2";
        if (c.endsWith(".ico")) return "image/x-icon";
        // El motor de IA: si el .wasm no se sirve como application/wasm, el
        // navegador se niega a ejecutarlo.
        if (c.endsWith(".wasm")) return "application/wasm";
        return TIPO_POR_DEFECTO;
    }
}
