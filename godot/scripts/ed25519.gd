extends RefCounted
## Verificacion Ed25519 en GDScript puro (port de TweetNaCl, dominio publico).
## Solo verifica: la clave privada nunca esta en el juego.

static func _shr(x: int, n: int) -> int: return (x >> n) & ((1 << (64 - n)) - 1) if n > 0 else x
static func _rotr(x: int, n: int) -> int: return _shr(x, n) | (x << (64 - n))

const _K32 = [0x428a2f98,0xd728ae22,0x71374491,0x23ef65cd,0xb5c0fbcf,0xec4d3b2f,0xe9b5dba5,0x8189dbbc,0x3956c25b,0xf348b538,0x59f111f1,0xb605d019,0x923f82a4,0xaf194f9b,0xab1c5ed5,0xda6d8118,0xd807aa98,0xa3030242,0x12835b01,0x45706fbe,0x243185be,0x4ee4b28c,0x550c7dc3,0xd5ffb4e2,0x72be5d74,0xf27b896f,0x80deb1fe,0x3b1696b1,0x9bdc06a7,0x25c71235,0xc19bf174,0xcf692694,0xe49b69c1,0x9ef14ad2,0xefbe4786,0x384f25e3,0x0fc19dc6,0x8b8cd5b5,0x240ca1cc,0x77ac9c65,0x2de92c6f,0x592b0275,0x4a7484aa,0x6ea6e483,0x5cb0a9dc,0xbd41fbd4,0x76f988da,0x831153b5,0x983e5152,0xee66dfab,0xa831c66d,0x2db43210,0xb00327c8,0x98fb213f,0xbf597fc7,0xbeef0ee4,0xc6e00bf3,0x3da88fc2,0xd5a79147,0x930aa725,0x06ca6351,0xe003826f,0x14292967,0x0a0e6e70,0x27b70a85,0x46d22ffc,0x2e1b2138,0x5c26c926,0x4d2c6dfc,0x5ac42aed,0x53380d13,0x9d95b3df,0x650a7354,0x8baf63de,0x766a0abb,0x3c77b2a8,0x81c2c92e,0x47edaee6,0x92722c85,0x1482353b,0xa2bfe8a1,0x4cf10364,0xa81a664b,0xbc423001,0xc24b8b70,0xd0f89791,0xc76c51a3,0x0654be30,0xd192e819,0xd6ef5218,0xd6990624,0x5565a910,0xf40e3585,0x5771202a,0x106aa070,0x32bbd1b8,0x19a4c116,0xb8d2d0c8,0x1e376c08,0x5141ab53,0x2748774c,0xdf8eeb99,0x34b0bcb5,0xe19b48a8,0x391c0cb3,0xc5c95a63,0x4ed8aa4a,0xe3418acb,0x5b9cca4f,0x7763e373,0x682e6ff3,0xd6b2b8a3,0x748f82ee,0x5defb2fc,0x78a5636f,0x43172f60,0x84c87814,0xa1f0ab72,0x8cc70208,0x1a6439ec,0x90befffa,0x23631e28,0xa4506ceb,0xde82bde9,0xbef9a3f7,0xb2c67915,0xc67178f2,0xe372532b,0xca273ece,0xea26619c,0xd186b8c7,0x21c0c207,0xeada7dd6,0xcde0eb1e,0xf57d4f7f,0xee6ed178,0x06f067aa,0x72176fba,0x0a637dc5,0xa2c898a6,0x113f9804,0xbef90dae,0x1b710b35,0x131c471b,0x28db77f5,0x23047d84,0x32caab7b,0x40c72493,0x3c9ebe0a,0x15c9bebc,0x431d67c4,0x9c100d4c,0x4cc5d4be,0xcb3e42b6,0x597f299c,0xfc657e2a,0x5fcb6fab,0x3ad6faec,0x6c44198c,0x4a475817]
const _H32 = [0x6a09e667,0xf3bcc908,0xbb67ae85,0x84caa73b,0x3c6ef372,0xfe94f82b,0xa54ff53a,0x5f1d36f1,0x510e527f,0xade682d1,0x9b05688c,0x2b3e6c1f,0x1f83d9ab,0xfb41bd6b,0x5be0cd19,0x137e2179]

static func sha512(m: PackedByteArray) -> PackedByteArray:
	var K = []
	for i in 80: K.append((_K32[2 * i] << 32) | _K32[2 * i + 1])
	var H = []
	for i in 8: H.append((_H32[2 * i] << 32) | _H32[2 * i + 1])
	var d = m.duplicate(); var bits = m.size() * 8
	d.append(0x80)
	while d.size() % 128 != 112: d.append(0)
	for i in 8: d.append(0)
	for i in 8: d.append((bits >> (56 - 8 * i)) & 0xff)
	var w = []; w.resize(80)
	for blk in range(0, d.size(), 128):
		for t in 16:
			var x = 0
			for k in 8: x = (x << 8) | d[blk + 8 * t + k]
			w[t] = x
		for t in range(16, 80):
			var s0 = _rotr(w[t - 15], 1) ^ _rotr(w[t - 15], 8) ^ _shr(w[t - 15], 7)
			var s1 = _rotr(w[t - 2], 19) ^ _rotr(w[t - 2], 61) ^ _shr(w[t - 2], 6)
			w[t] = w[t - 16] + s0 + w[t - 7] + s1
		var a = H[0]; var b = H[1]; var c = H[2]; var dd = H[3]; var e = H[4]; var f = H[5]; var g = H[6]; var h = H[7]
		for t in 80:
			var S1 = _rotr(e, 14) ^ _rotr(e, 18) ^ _rotr(e, 41)
			var ch = (e & f) ^ (~e & g)
			var t1 = h + S1 + ch + K[t] + w[t]
			var S0 = _rotr(a, 28) ^ _rotr(a, 34) ^ _rotr(a, 39)
			var mj = (a & b) ^ (a & c) ^ (b & c)
			var t2 = S0 + mj
			h = g; g = f; f = e; e = dd + t1; dd = c; c = b; b = a; a = t1 + t2
		H[0] += a; H[1] += b; H[2] += c; H[3] += dd; H[4] += e; H[5] += f; H[6] += g; H[7] += h
	var out = PackedByteArray()
	for x in H:
		for k in 8: out.append(_shr(x, 56 - 8 * k) & 0xff)
	return out

# ---------------------------------------------------------------- campo 2^255-19
static func _gf(v := []) -> Array:
	var o = []; o.resize(16); o.fill(0)
	for i in v.size(): o[i] = v[i]
	return o
const _D = [0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]
const _D2 = [0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]
const _X = [0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]
const _Y = [0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]
const _I = [0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]
const _L = [0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]

static func _car(o: Array) -> void:
	for i in 16:
		o[i] += 1 << 16
		var c = o[i] >> 16
		if i < 15: o[i + 1] += c - 1
		else: o[0] += 38 * (c - 1)
		o[i] -= c << 16

static func _sel(p: Array, q: Array, b: int) -> void:
	var c = ~(b - 1)
	for i in 16:
		var t = c & (p[i] ^ q[i]); p[i] ^= t; q[i] ^= t

static func _pack25519(n: Array) -> PackedByteArray:
	var t = n.duplicate(); var m = _gf()
	_car(t); _car(t); _car(t)
	for j in 2:
		m[0] = t[0] - 0xffed
		for i in range(1, 15):
			m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1); m[i - 1] &= 0xffff
		m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1)
		var b = (m[15] >> 16) & 1
		m[14] &= 0xffff
		_sel(t, m, 1 - b)
	var o = PackedByteArray(); o.resize(32)
	for i in 16: o[2 * i] = t[i] & 0xff; o[2 * i + 1] = (t[i] >> 8) & 0xff
	return o

static func _neq(a: Array, b: Array) -> bool: return _pack25519(a) != _pack25519(b)
static func _par(a: Array) -> int: return _pack25519(a)[0] & 1
static func _unpack25519(n: PackedByteArray) -> Array:
	var o = _gf()
	for i in 16: o[i] = n[2 * i] + (n[2 * i + 1] << 8)
	o[15] &= 0x7fff
	return o
static func _A(a: Array, b: Array) -> Array:
	var o = _gf(); for i in 16: o[i] = a[i] + b[i]
	return o
static func _Z(a: Array, b: Array) -> Array:
	var o = _gf(); for i in 16: o[i] = a[i] - b[i]
	return o
static func _M(a: Array, b: Array) -> Array:
	var t = []; t.resize(31); t.fill(0)
	for i in 16:
		var ai = a[i]
		for j in 16: t[i + j] += ai * b[j]
	for i in 15: t[i] += 38 * t[i + 16]
	var o = t.slice(0, 16)
	_car(o); _car(o)
	return o
static func _S(a: Array) -> Array: return _M(a, a)
static func _inv(i: Array) -> Array:
	var c = i.duplicate()
	for a in range(253, -1, -1):
		c = _S(c)
		if a != 2 and a != 4: c = _M(c, i)
	return c
static func _pow2523(i: Array) -> Array:
	var c = i.duplicate()
	for a in range(250, -1, -1):
		c = _S(c)
		if a != 1: c = _M(c, i)
	return c

static func _add(p: Array, q: Array) -> void:
	var a = _M(_Z(p[1], p[0]), _Z(q[1], q[0]))
	var b = _M(_A(p[0], p[1]), _A(q[0], q[1]))
	var c = _M(_M(p[3], q[3]), _D2)
	var d = _M(p[2], q[2]); d = _A(d, d)
	var e = _Z(b, a); var f = _Z(d, c); var g = _A(d, c); var h = _A(b, a)
	p[0] = _M(e, f); p[1] = _M(h, g); p[2] = _M(g, f); p[3] = _M(e, h)

static func _cswap(p: Array, q: Array, b: int) -> void:
	for i in 4: _sel(p[i], q[i], b)

static func _pack(p: Array) -> PackedByteArray:
	var zi = _inv(p[2])
	var r = _pack25519(_M(p[1], zi))
	r[31] ^= _par(_M(p[0], zi)) << 7
	return r

static func _scalarmult(q: Array, s: PackedByteArray) -> Array:
	var p = [_gf(), _gf([1]), _gf([1]), _gf()]
	for i in range(255, -1, -1):
		var b = (s[i >> 3] >> (i & 7)) & 1
		_cswap(p, q, b); _add(q, p); _add(p, p); _cswap(p, q, b)
	return p

static func _reduce(r: PackedByteArray) -> PackedByteArray:
	var x = []
	for i in 64: x.append(r[i])
	for i in range(63, 31, -1):
		var carry = 0
		var j = i - 32
		while j < i - 12:
			x[j] += carry - 16 * x[i] * _L[j - (i - 32)]
			carry = (x[j] + 128) >> 8
			x[j] -= carry << 8
			j += 1
		x[j] += carry; x[i] = 0
	var carry2 = 0
	for j in 32:
		x[j] += carry2 - (x[31] >> 4) * _L[j]
		carry2 = x[j] >> 8; x[j] &= 255
	for j in 32: x[j] -= carry2 * _L[j]
	var o = PackedByteArray(); o.resize(32)
	for i in 32:
		x[i + 1] += x[i] >> 8; o[i] = x[i] & 255
	return o

static func _unpackneg(pk: PackedByteArray):
	var r = [_gf(), _gf(), _gf([1]), _gf()]
	r[1] = _unpack25519(pk)
	var num = _S(r[1]); var den = _M(num, _D)
	num = _Z(num, r[2]); den = _A(r[2], den)
	var den2 = _S(den); var den4 = _S(den2); var den6 = _M(den4, den2)
	var t = _M(_M(den6, num), den)
	t = _pow2523(t)
	t = _M(_M(_M(t, num), den), den)
	r[0] = _M(t, den)
	var chk = _M(_S(r[0]), den)
	if _neq(chk, num): r[0] = _M(r[0], _I)
	chk = _M(_S(r[0]), den)
	if _neq(chk, num): return null
	if _par(r[0]) == (pk[31] >> 7): r[0] = _Z(_gf(), r[0])
	r[3] = _M(r[0], r[1])
	return r

## true si 'firma' (64 bytes) de 'mensaje' es valida para 'clave_publica' (32 bytes).
static func verificar(clave_publica: PackedByteArray, mensaje: PackedByteArray, firma: PackedByteArray) -> bool:
	if clave_publica.size() != 32 or firma.size() != 64: return false
	var q = _unpackneg(clave_publica)
	if q == null: return false
	var h = _reduce(sha512(firma.slice(0, 32) + clave_publica + mensaje))
	var p = _scalarmult(q, h)
	var base = [_X.duplicate(), _Y.duplicate(), _gf([1]), _M(_X, _Y)]
	var q2 = _scalarmult(base, firma.slice(32, 64))
	_add(p, q2)
	return _pack(p) == firma.slice(0, 32)
