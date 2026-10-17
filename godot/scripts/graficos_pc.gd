extends RefCounted
## Extras de PC (Forward+, Alto/Ultra): cielo dinamico con nubes, AgX, SDFGI,
## SSR, SSAO/SSIL y sombras afinados, bloom suave, viento en los arboles y
## agua con reflejos. En movil y en Bajo/Medio no se usa nada de esto.

const SKY = """
shader_type sky;
uniform vec3 cenit : source_color = vec3(0.24, 0.47, 0.85);
uniform vec3 horizonte : source_color = vec3(0.70, 0.82, 0.95);
uniform vec3 suelo : source_color = vec3(0.32, 0.36, 0.30);
uniform vec3 color_nube : source_color = vec3(1.0);
uniform float nubes : hint_range(0.0, 1.0) = 0.45;
uniform float noche : hint_range(0.0, 1.0) = 0.0;
uniform vec2 viento = vec2(0.0);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
	vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * ruido(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }

void sky() {
	vec3 d = EYEDIR;
	float h = clamp(d.y, 0.0, 1.0);
	vec3 col = mix(horizonte, cenit, pow(h, 0.45));
	if (d.y < 0.0) col = mix(horizonte, suelo, clamp(-d.y * 4.0, 0.0, 1.0));
	float s = max(dot(d, LIGHT0_DIRECTION), 0.0);
	if (LIGHT0_ENABLED) col += LIGHT0_COLOR * LIGHT0_ENERGY * (pow(s, 1200.0) * 6.0 + pow(s, 10.0) * 0.18) * (1.0 - noche);
	if (d.y > 0.0) {
		vec2 uv = d.xz / (d.y + 0.12) * 0.9 + viento;
		float n = fbm(uv * 1.3);
		float c = smoothstep(1.0 - nubes, 1.0 - nubes + 0.35, n) * smoothstep(0.0, 0.18, d.y);
		float borde = fbm(uv * 1.3 + vec2(0.08, 0.05));
		vec3 nube = color_nube * mix(0.72, 1.05, clamp(n - borde + 0.6, 0.0, 1.0));
		col = mix(col, nube, c * 0.92);
		// estrellas de noche
		float e = step(0.9975, h21(floor(d.xz / (d.y + 0.3) * 260.0))) * noche * (1.0 - c);
		col += vec3(e);
	}
	COLOR = col;
}
"""

const ARBOL = """
shader_type spatial;
uniform vec3 color : source_color = vec3(0.3, 0.62, 0.3);
uniform float viento = 0.05;
void vertex() {
	vec3 w = MODEL_MATRIX[3].xyz;
	float k = clamp(VERTEX.y + 0.5, 0.0, 1.0);
	VERTEX.x += sin(TIME * 1.4 + w.x * 0.37 + w.z * 0.21) * viento * k;
	VERTEX.z += cos(TIME * 1.1 + w.x * 0.23) * viento * 0.6 * k;
}
void fragment() { ALBEDO = color; ROUGHNESS = 0.8; SSS_STRENGTH = 0.2; }
"""

const AGUA = """
shader_type spatial;
render_mode cull_disabled;
uniform vec3 color : source_color = vec3(0.10, 0.32, 0.45);
void fragment() {
	vec3 w = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float t = TIME;
	vec2 n = vec2(sin(w.x * 6.0 + t * 1.7) + sin((w.x + w.z) * 9.0 - t * 2.3) * 0.5, cos(w.z * 7.0 + t * 1.3) + cos((w.x - w.z) * 8.0 + t * 1.9) * 0.5) * 0.08;
	NORMAL_MAP = normalize(vec3(n, 1.0)) * 0.5 + 0.5;
	ALBEDO = color; ROUGHNESS = 0.03; METALLIC = 0.0; SPECULAR = 0.8;
}
"""

var cielo_mat: ShaderMaterial
var _sky: Sky
var _t := 0.0

func _init() -> void:
	cielo_mat = ShaderMaterial.new(); cielo_mat.shader = Shader.new(); cielo_mat.shader.code = SKY
	_sky = Sky.new(); _sky.sky_material = cielo_mat
	_sky.process_mode = Sky.PROCESS_MODE_INCREMENTAL; _sky.radiance_size = Sky.RADIANCE_SIZE_256

## Se llama desde aplicar_graficos(). 'activo' = PC Forward+ con v.cielo.
func aplicar(entorno: Environment, sol: DirectionalLight3D, v: Dictionary, activo: bool, ultra: bool) -> void:
	if not activo:
		entorno.background_mode = Environment.BG_COLOR
		entorno.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		entorno.reflected_light_source = Environment.REFLECTION_SOURCE_BG
		return
	entorno.sky = _sky
	entorno.background_mode = Environment.BG_SKY
	entorno.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	entorno.ambient_light_sky_contribution = 0.75
	entorno.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	# Tonemapping filmico (AgX) y gradacion suave
	entorno.tonemap_mode = Environment.TONE_MAPPER_AGX
	entorno.tonemap_exposure = 1.25
	entorno.tonemap_white = 6.0
	entorno.adjustment_saturation = maxf(entorno.adjustment_saturation, 1.12) * v.get("saturacion_pc", 1.0)
	entorno.adjustment_contrast = v.gamma * 1.04
	# Bloom suave: solo lo que de verdad brilla (ventanas de noche, sol)
	entorno.glow_enabled = v.bloom
	entorno.glow_hdr_threshold = 1.0; entorno.glow_intensity = 0.55; entorno.glow_bloom = 0.0; entorno.glow_strength = 0.9
	entorno.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	for i in 7: entorno.set_glow_level(i, 1.0 if i in [2, 3, 4] else 0.0)
	# SDFGI (luz rebotada) afinado para un pueblo pequeno
	if entorno.sdfgi_enabled:
		entorno.sdfgi_cascades = 4; entorno.sdfgi_min_cell_size = 0.15; entorno.sdfgi_use_occlusion = true
		entorno.sdfgi_bounce_feedback = 0.45; entorno.sdfgi_read_sky_light = true; entorno.sdfgi_energy = 0.9
		entorno.sdfgi_y_scale = Environment.SDFGI_Y_SCALE_75_PERCENT
		RenderingServer.environment_set_sdfgi_ray_count(RenderingServer.ENV_SDFGI_RAY_COUNT_64 if ultra else RenderingServer.ENV_SDFGI_RAY_COUNT_32)
	# Reflejos en pantalla (charcos, agua, cristales)
	entorno.ssr_max_steps = 96 if ultra else 64; entorno.ssr_fade_in = 0.15; entorno.ssr_fade_out = 2.0; entorno.ssr_depth_tolerance = 0.25
	# Oclusion ambiental y luz indirecta en pantalla
	entorno.ssao_radius = 1.1; entorno.ssao_intensity = 2.0; entorno.ssao_power = 1.6; entorno.ssao_detail = 0.6; entorno.ssao_horizon = 0.06
	entorno.ssao_light_affect = 0.15
	RenderingServer.environment_set_ssao_quality(RenderingServer.ENV_SSAO_QUALITY_HIGH if ultra else RenderingServer.ENV_SSAO_QUALITY_MEDIUM, not ultra, 0.5, 2, 50, 300)
	entorno.ssil_radius = 4.0; entorno.ssil_intensity = 0.9; entorno.ssil_sharpness = 0.98
	# Niebla volumetrica ligera (rayos de sol, ambiente al atardecer)
	if entorno.volumetric_fog_enabled:
		entorno.volumetric_fog_density = 0.006; entorno.volumetric_fog_albedo = Color(0.93, 0.94, 1.0)
		entorno.volumetric_fog_anisotropy = 0.45; entorno.volumetric_fog_length = 90; entorno.volumetric_fog_detail_spread = 2.0
		entorno.volumetric_fog_sky_affect = 0.15; entorno.volumetric_fog_ambient_inject = 0.3
		sol.light_volumetric_fog_energy = 1.2
	# Sombras: mas cascadas, mezcladas, penumbra fina (sin emborronar)
	if sol.shadow_enabled:
		sol.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
		sol.directional_shadow_blend_splits = true
		sol.directional_shadow_split_1 = 0.06; sol.directional_shadow_split_2 = 0.16; sol.directional_shadow_split_3 = 0.4
		sol.shadow_bias = 0.03; sol.shadow_normal_bias = 1.2
		if v.sombras_suaves: sol.light_angular_distance = 0.6
		RenderingServer.directional_soft_shadow_filter_set_quality(RenderingServer.SHADOW_QUALITY_SOFT_ULTRA if ultra else RenderingServer.SHADOW_QUALITY_SOFT_HIGH)
		RenderingServer.positional_soft_shadow_filter_set_quality(RenderingServer.SHADOW_QUALITY_SOFT_HIGH)

## Colores del cielo segun la hora (se llama al cambiar la hora).
func hora(h: float, nublado: float) -> void:
	var dia = clampf(1.0 - absf(h - 13.0) / 7.5, 0.0, 1.0)
	var tarde = clampf(1.0 - absf(h - 19.0) / 1.6, 0.0, 1.0) + clampf(1.0 - absf(h - 6.8) / 1.2, 0.0, 1.0) * 0.7
	var noche = 1.0 - clampf(dia * 3.0 + tarde, 0.0, 1.0)
	var cen = Color(0.22, 0.45, 0.85).lerp(Color(0.32, 0.36, 0.62), tarde * 0.6).lerp(Color(0.02, 0.03, 0.09), noche)
	var hor = Color(0.72, 0.84, 0.96).lerp(Color(1.0, 0.62, 0.42), tarde).lerp(Color(0.06, 0.08, 0.16), noche)
	var gris = Color(0.62, 0.65, 0.7)
	cielo_mat.set_shader_parameter("cenit", cen.lerp(gris, nublado * 0.7))
	cielo_mat.set_shader_parameter("horizonte", hor.lerp(gris, nublado * 0.6))
	cielo_mat.set_shader_parameter("suelo", Color(0.3, 0.34, 0.28).lerp(Color(0.03, 0.04, 0.05), noche))
	cielo_mat.set_shader_parameter("color_nube", Color(1, 1, 1).lerp(Color(1.0, 0.78, 0.66), tarde).lerp(Color(0.12, 0.13, 0.18), noche).lerp(gris, nublado * 0.5))
	cielo_mat.set_shader_parameter("nubes", lerpf(0.42, 0.85, nublado))
	cielo_mat.set_shader_parameter("noche", noche)

## Nubes que se mueven despacio (pocas actualizaciones: el cielo se recalcula incremental).
func paso(delta: float) -> void:
	_t += delta
	if fmod(_t, 0.5) < delta: cielo_mat.set_shader_parameter("viento", Vector2(_t * 0.004, _t * 0.0016))

func material_arbol(color: Color) -> ShaderMaterial:
	var m = ShaderMaterial.new(); m.shader = Shader.new(); m.shader.code = ARBOL
	m.set_shader_parameter("color", color); return m

static func material_agua() -> ShaderMaterial:
	var m = ShaderMaterial.new(); m.shader = Shader.new(); m.shader.code = AGUA; return m
