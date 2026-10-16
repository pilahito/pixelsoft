"""Genera codigos de expansion PixelSoft (PS1-...).
La clave privada se lee de %USERPROFILE%\\.pixelsoft-license\\privada.pem y NUNCA se sube al repo.
Uso:  python firmar.py --nueva-clave            (una sola vez)
      python firmar.py mascotas espias          (imprime un codigo)
"""
import sys, os, json, base64, secrets, pathlib
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

DIR = pathlib.Path(os.path.expanduser("~")) / ".pixelsoft-license"
PRIV = DIR / "privada.pem"
b64 = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")

if sys.argv[1:] == ["--nueva-clave"]:
    if PRIV.exists(): sys.exit("Ya existe una clave; no se sobrescribe.")
    DIR.mkdir(exist_ok=True)
    k = Ed25519PrivateKey.generate()
    PRIV.write_bytes(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    pub = k.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    (DIR / "publica.txt").write_text(base64.b64encode(pub).decode())
    print("PUBLICA", base64.b64encode(pub).decode()); sys.exit()

k = serialization.load_pem_private_key(PRIV.read_bytes(), None)
carga = json.dumps({"packs": sys.argv[1:], "id": secrets.token_hex(6)}, separators=(",", ":")).encode()
print("PS1-" + b64(carga) + "." + b64(k.sign(carga)))
