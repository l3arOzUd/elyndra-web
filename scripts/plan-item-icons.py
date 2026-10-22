"""Plans the painted item icons v3 (art-source/items-v3/).

Rule (user, 2026-10-22): every item gets real painted art in the style of
public/ui/painted/items-v2.png; no recoloured copies. Items that are the same
type in another tier or grade (Worn/Bronze/... Saber, Lesser/Greater/Grand
Clover Charm) share one painting and differ only by the frame colour the UI
draws round the icon (src/ui/art.ts gradeOf).

Writes art-source/items-v3/manifest.json (sheet, cell, item ids, brief per
painting) and one prompt per sheet (sheet-NN.prompt.txt) for the image
generator. Paintings the v2 atlas already covers are kept, not redrawn.

    python scripts/plan-item-icons.py
"""
import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "art-source", "items-v3")
TIER = r"^(Worn|Bronze|Iron|Steel|Cobalt|Runic|Mythril|Ember|Star|Sovereign|Lesser|Greater|Grand|Minor) "

# v2 atlas cells that already depict these items (src/ui/art.ts paintedItem).
KEEP_V2 = {"Copper Saber": 0, "Surveyor Bow": 1, "Aether Rod": 2, "Leafweave Coat": 3, "Traveler Boots": 4,
           "Vital Tonic": 6, "Focus Tonic": 7, "Field Ration": 9}

GEAR = {
    ("weapon", "Saber"): "a curved single-edged steel saber with a brass cog-shaped guard and wrapped leather grip, Vanguard sword",
    ("weapon", "Bow"): "a recurve hunting bow of dark briar wood with brass tips and an ivory string, Strider bow",
    ("weapon", "Rod"): "a slender mage rod of pale blue scaled wood topped with a glowing teal Aetherite crystal in a brass claw",
    ("weapon", "Gauntlet"): "a single mechanical battle gauntlet of brass and riveted steel plates with exposed gears and a small piston on the wrist, Machinist weapon",
    ("head", "Helm"): "a heavy steel great helm with a rounded dome, cheek guards and a small teal crest gem",
    ("head", "Hood"): "a dark green leather ranger hood with a stitched edge and a short cowl",
    ("head", "Circlet"): "a thin gold circlet set with a glowing blue Aether gem at the brow",
    ("head", "Sallet"): "a steel sallet helmet with a swept back neck guard and a leather chin strap",
    ("head", "Warcrown"): "a battle crown of steel plates with a runic gold band and blue Aether gems",
    ("head", "Mask"): "a dark half-face mask of leather with silver filigree and violet Aether eyes",
    ("armor", "Plate"): "a full steel breastplate cuirass with pauldrons and a brass trim",
    ("armor", "Leathers"): "a brown studded leather jerkin with buckled straps and a hood folded at the collar",
    ("armor", "Robe"): "a long deep-blue mage robe with gold embroidered hems and a glowing Aether clasp",
    ("armor", "Brigandine"): "a brigandine coat of riveted steel plates under red-brown cloth with leather straps",
    ("armor", "Runeplate"): "a steel breastplate engraved with glowing blue runes and gold trim",
    ("armor", "Duskcloak"): "a dark violet hooded cloak over light leather, with silver clasps and faint Aether glow",
    ("gloves", "Handguards"): "a pair of steel plate handguards with articulated finger plates and brass knuckle rivets",
    ("gloves", "Gloves"): "a pair of supple brown leather gloves with stitched cuffs and a buckle strap",
    ("gloves", "Wraps"): "blue cloth hand wraps bound with gold thread and a small glowing Aether stone on the back of the hand",
    ("gloves", "Grips"): "leather gloves reinforced with steel knuckle plates and studded fingers",
    ("gloves", "Wargloves"): "heavy steel gauntlet gloves with runic gold inlay and a blue gem on each cuff",
    ("gloves", "Mitts"): "fingerless dark leather mitts with violet cloth wrapping and silver studs",
    ("boots", "Sabatons"): "armored steel sabatons with layered toe plates and greaves to the knee",
    ("boots", "Boots"): "tall brown leather travel boots with laced fronts and folded cuffs",
    ("boots", "Slippers"): "elegant blue cloth mage slippers with gold embroidery and curled toes",
    ("boots", "Greaves"): "leather boots with steel shin greaves and knee guards",
    ("boots", "Warboots"): "heavy steel war boots with runic gold bands and a blue gem at the ankle",
    ("boots", "Treads"): "soft dark leather treads wrapped with violet cloth bands, light and silent",
    ("accessory", "Talisman"): "a bronze diamond talisman on a cord with a teal Aether gem in the centre",
}
UNIQUE = {
    "Hollowroot Crown": "a crown of living twisted roots and bark with glowing green sap gems",
    "Emberwake Treads": "light leather boots with glowing ember-orange soles trailing small flames",
    "Lattice Heart": "a violet crystal heart inside a lattice cage of silver wire, softly glowing",
    "Harvester's Knot": "a charm of braided golden wheat stalks tied in a knot with a sickle-shaped bronze pin",
    "Brawler's Oath": "a charm of a clenched bronze fist wrapped in red cloth bandage",
    "Aether Conduit": "a charm of a glass tube full of swirling cyan Aether energy capped with brass",
    "Blood Pact": "a charm of a dark red droplet gem in a black iron thorned setting",
    "Lodestone": "a charm of a heavy dark magnetic stone with iron filings standing up like spikes",
    "Glass Ember": "a charm of a cracked glass sphere holding a fierce orange ember",
    "Stormcaller Rod": "a mage rod of silver metal crowned with a crackling blue storm crystal and small lightning arcs",
    "Wildwood Longbow": "a living green longbow grown from wildwood with leaves sprouting along the limbs",
    "Gearheart Gauntlet": "a brass mechanical gauntlet with a glowing red gear heart turning in the palm",
    "Executioner's Edge": "a huge black steel greatsword with a blood-red edge and a skull pommel",
    "Bastion Plate": "a massive tower-like steel breastplate with a lion crest and gold rivets",
    "Windrunner Boots": "light pale green boots with small feathered wings at the heels",
    "Frostwake Circlet": "a silver circlet of ice crystals with a frost-blue gem breathing cold mist",
    "Heart of Embers": "an amulet of a glowing coal-red heart stone in a blackened bronze frame",
    "Echo Stone": "a smooth grey river stone with concentric glowing blue ripples carved into it",
    "Bloodgrip Wraps": "crimson cloth hand wraps soaked dark red with a black thorn clasp",
    "Ironclasp Handguards": "black iron handguards with clawed fingertips and a gold clasp at the wrist",
}
CHARM = {
    "fang": "a charm of a large curved beast fang bound with red thread to a bronze ring",
    "clover": "a charm of a four-leaf clover pressed in amber in a gold ring",
    "razor": "a charm of a tiny razor-sharp obsidian blade on a silver chain loop",
    "hourglass": "a charm of a small brass hourglass with glowing sand",
    "quill": "a charm of a blue feather quill with an ink-dark tip on a silver ring",
    "tempo": "a charm of a brass metronome pendulum with a small bell",
    "expanse": "a charm of a round compass rose disc of bronze with an earth-brown gem",
    "viper": "a charm of a coiled green viper biting its tail in jade",
    "wellspring": "a charm of a small silver vial of clear spring water with a blue glow",
    "heart": "a charm of a red heart-shaped garnet in a leaf-wrapped bronze frame",
    "bastion": "a charm of a tiny steel tower shield with a stone-grey gem",
    "prism": "a charm of a clear triangular prism splitting light into a rainbow",
    "sigil_pow": "a round bronze sigil token embossed with a flaming fist",
    "sigil_luk": "a round bronze sigil token embossed with a four-leaf clover",
    "sigil_agi": "a round bronze sigil token embossed with a winged feather",
    "sigil_dex": "a round bronze sigil token embossed with an arrow through a target",
    "sigil_int": "a round bronze sigil token embossed with a glowing orb",
    "sigil_vit": "a round bronze sigil token embossed with a heart and leaves",
}
TOTEM = {
    "fury": "a small carved wooden totem post with a red flame gem and an angry face",
    "haste": "a small carved wooden totem post with a spinning brass wing and a green gem",
    "focus": "a small carved wooden totem post with a single blue eye gem",
    "precision": "a small carved wooden totem post topped with a gold crosshair ring",
    "wildfire": "a small carved wooden totem post wreathed in orange wildfire",
    "bloodrush": "a small carved wooden totem post dripping with a crimson blood gem",
    "surge": "a small carved wooden totem post crackling with a cyan energy crystal",
    "bulwark": "a small carved stone totem post shaped like a shield with iron bands",
    "aegis": "a small carved wooden totem post inside a translucent blue shield bubble",
    "mending": "a small carved wooden totem post wrapped in healing green vines with a white blossom",
    "gale": "a small carved wooden totem post with swirling wind ribbons",
    "hunt": "a small carved wooden totem post with antlers and a hunting horn",
    "echo_slaughter": "a dark carved totem post with a crimson skull gem and echo rings",
    "echo_fury": "a dark carved totem post with a yellow lightning bolt gem and echo rings",
    "echo_spite": "a dark carved totem post with a green thorn gem and echo rings",
}
CONSUMABLE = {
    "Lure Bell": "a large brass hand bell with a red ribbon",
    "Return Feather": "a white courier feather with a blue Guild ribbon",
    "Camp Feather": "a brown feather tied to a tiny campfire charm",
    "Haste Draught": "a green bubbling potion in a tall thin bottle with a wing-shaped stopper",
    "Scholar's Tea": "a steaming porcelain teacup with tea leaves on a saucer",
    "Fortune Incense": "a smoking stick of incense in a small gold holder with golden smoke",
    "Reset Scroll": "a rolled parchment scroll with a glowing blue wax seal of six stat runes",
}
QUEST = {
    "Guild Pass": "a stamped leather Guild warrant card on a cord, with a brass Guild seal",
    "Heliostat Key Prism": "a cut golden prism key that focuses a beam of sunlight",
    "Meridian Keysigil": "a violet glyph key carved from a mask fragment, glowing lines",
}

STYLE = ("Use case: stylized-concept. Asset type: production inventory icon atlas for an original hand-painted fantasy MMORPG named "
         "Elyndra, in the painterly richness and miniature object rendering tradition of Ragnarok Online and Tree of Savior, with "
         "original designs. Match the attached style reference items-v2.png exactly: same painting technique, lighting, outline weight "
         "and background. Generate ONE precisely regular atlas, {w}x{h}, with exactly {cols} columns and {rows} rows, equal size square "
         "cells, no gutters, no text, no labels, no numbers, no UI frames. Each cell has a completely uniform very dark warm brown "
         "background #211d1a, with a single colorful richly hand-painted object centered within its own cell and a 12% empty margin. "
         "Strong silhouettes legible at 48 pixels; colorful material highlights, chunky illustrated forms, warm brass and amber "
         "lighting, deep contact shadows on each object, not flat vector icons, not line drawings. Do not merge cells or add grid "
         "lines. Read left-to-right, top-to-bottom, EXACT contents:\n")


def visual(desc):
    """First sentence of an item description: what it looks like."""
    return re.split(r"(?<=[.!?])\s", desc.strip())[0].rstrip(".")


def main():
    items = json.load(open(os.path.join(ROOT, "public", "data", "items.json"), encoding="utf-8"))
    groups = {}
    for it in items:
        e = it.get("equip") or {}
        name = re.sub(TIER, "", it["name"])
        if it["name"] in KEEP_V2 or name in KEEP_V2:
            key, brief = ("v2", KEEP_V2.get(it["name"], KEEP_V2.get(name))), None
        elif e.get("unique"):
            key, brief = ("unique", it["name"]), UNIQUE[it["name"]]
        elif e.get("charm"):
            key, brief = ("charm", e["charm"]["type"]), CHARM[e["charm"]["type"]]
        elif e.get("totem"):
            key, brief = ("totem", e["totem"]["type"]), TOTEM[e["totem"]["type"]]
        elif e:
            key, brief = ("gear", e["slot"], name), GEAR[(e["slot"], name)]
        elif it.get("use"):
            key, brief = ("consumable", name), CONSUMABLE[name]
        elif it["category"] == "quest":
            key, brief = ("quest", it["name"]), QUEST[it["name"]]
        elif 1 <= int(it["id"][4:]) <= 22:
            key, brief = ("v2", int(it["id"][4:]) + 11), None
        else:
            key, brief = ("material", it["name"]), it["name"] + ": " + (lambda v: v[:1].lower() + v[1:])(visual(it["description"]))
        g = groups.setdefault(key, {"key": "/".join(map(str, key)), "brief": brief, "items": []})
        g["items"].append(it["id"])
    order = ["gear", "consumable", "unique", "quest", "charm", "totem", "material"]
    todo = sorted((g for k, g in groups.items() if k[0] != "v2"), key=lambda g: order.index(g["key"].split("/")[0]))
    kept = [g for k, g in groups.items() if k[0] == "v2"]
    sheets, n = [], 0
    while n < len(todo):
        left = len(todo) - n
        cols, rows = (6, 6) if left >= 36 else (5, 2) if left <= 10 else (6, -(-left // 6))
        chunk = todo[n:n + cols * rows]
        n += len(chunk)
        # Pad a short last sheet so every row is full (the generator needs a regular grid); spare cells map to no item.
        chunk += [{"key": "spare", "brief": "a small brass Guild medallion engraved with a compass rose", "items": []}] * (cols * rows - len(chunk))
        sheets.append({"sheet": len(sheets) + 1, "cols": cols, "rows": rows, "cells": chunk})
    os.makedirs(OUT, exist_ok=True)
    for s in sheets:
        w, h = s["cols"] * 256, s["rows"] * 256
        lines = []
        for r in range(s["rows"]):
            row = s["cells"][r * s["cols"]:(r + 1) * s["cols"]]
            lines.append(f"row{r + 1}: " + "; ".join(c["brief"] for c in row) + ".")
        prompt = STYLE.format(w=w, h=h, cols=s["cols"], rows=s["rows"]) + "\n".join(lines)
        open(os.path.join(OUT, f"sheet-{s['sheet']:02d}.prompt.txt"), "w", encoding="utf-8", newline="\n").write(prompt + "\n")
    manifest = {
        "about": "Painted item icons v3. scripts/plan-item-icons.py writes this; scripts/import-item-icons.py packs sheet-NN.png.",
        "kept_v2": [{"cell": g["key"].split("/")[1], "items": g["items"]} for g in kept],
        "sheets": [{"sheet": s["sheet"], "cols": s["cols"], "rows": s["rows"],
                    "cells": [{"cell": i, "key": c["key"], "brief": c["brief"], "items": c["items"]} for i, c in enumerate(s["cells"])]} for s in sheets],
    }
    json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
    print(len(todo), "paintings in", len(sheets), "sheets;", len(kept), "kept from v2")


if __name__ == "__main__":
    main()
