package com.pixelsoft.juego;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * PixelSoft en el movil: una ventana que carga el juego que va dentro del APK.
 *
 * El APK es autonomo. No necesita PC ni conexion: los empleados piensan con el
 * cerebro simulado (reglas y frases escritas a mano), porque un movil no puede
 * ejecutar un modelo de 9B.
 *
 * El trabajo de servir los ficheros lo hace ClienteWeb.
 */
public class MainActivity extends Activity {

    private static final String DOMINIO = "https://pixelsoft.local";
    private static final int COLOR_FONDO = 0xFF0D1017;

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        web = new WebView(this);

        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true);
        ajustes.setAllowFileAccess(false);
        ajustes.setAllowContentAccess(false);
        ajustes.setSupportZoom(false);
        ajustes.setBuiltInZoomControls(false);
        ajustes.setTextZoom(100);
        ajustes.setCacheMode(WebSettings.LOAD_NO_CACHE);
        ajustes.setMediaPlaybackRequiresUserGesture(false);

        web.setBackgroundColor(COLOR_FONDO);
        web.setKeepScreenOn(true);
        web.setWebViewClient(new ClienteWeb(this));

        setContentView(web);
        // ?local fuerza el modo autonomo (motor y cerebro simulado dentro del
        // navegador). Sin el, la pagina intentaria hablar con un servidor que
        // aqui no existe, aunque tambien sabe reaccionar y pasar a local solo.
        web.loadUrl(DOMINIO + "/index.html?local");
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        web = null;
        super.onDestroy();
    }
}
