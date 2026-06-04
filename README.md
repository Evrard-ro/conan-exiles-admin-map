# Conan Exiles Admin Map

An admin dashboard for Conan Exiles servers — view players, structures and thralls on an interactive map.

![https://germix.net/conan-exiles-admin-map.jpg](https://germix.net/conan-exiles-admin-map.jpg)

## Features

- Interactive map with support for both **Exiled Lands** and **Isle of Siptah**
- Markers for all major entity types:
  - Players (online players highlighted)
  - Pets
  - Thralls
  - Buildings (Foundations)
  - Crafting placeables
  - Altars
  - Thrones
  - Animal Pens
  - Bedrolls / Beds
  - Campfires / Bonfires
  - Chests
  - Map rooms
  - Trebuchets
  - Vaults
  - Water wells
  - Wheels of Pain
  - Fish traps / Shellfish traps
  - All Pippi placeables & Thespians
- **Global search** (Ctrl+F) — find any marker by name
- **Clan panel** — list of guilds with member counts and activity indicators
- **Marker tooltips** with tier/alpha badges and one-click `TeleportPlayer` command
- Filter markers by guild or show lone players
- Switch between Exiled Lands and Isle of Siptah maps
- Dark fantasy sidebar UI
- Fast tile loading via WebP tiles and long-term browser caching
- Password-protect access via config file (Basic Auth)

## Installation

1. Grab the latest `.zip` from the [Releases](https://github.com/Evrard-ro/conan-exiles-admin-map/releases) page.
2. Unzip into your Conan Exiles `Saved/` folder (next to `game.db`).
3. Edit `conan-exiles-admin-map.ini` to set your database path, port, language and optional credentials.
4. Run `conan-exiles-admin-map.exe`.
5. Open `http://localhost:3001/` in a browser (replace `localhost` with your server IP if remote).

### Configuration (`conan-exiles-admin-map.ini`)

```ini
[SETTINGS]
language = en       ; en or es
port     = 3001

[CONAN_EXILES]
database = game.db  ; path to your game.db

[USERS]
admin = secret      ; omit this section entirely to disable auth
```

## Development

Requirements: Node.js 20+

```bash
npm install
npm start        # transpile + run via babel-node on port 3001
```

Place `game.db` (or point `conan-exiles-admin-map.ini` at it) in the project root before starting.

### Build Windows .exe

Requires bash / WSL:

```bash
npm run build    # outputs build/conan-exiles-admin-map-vX.Y.Z.zip
```

## Changelog

#### v0.4.0 (June 2026)

- Added Isle of Siptah map support with calibrated coordinates
- Added Thralls layer
- Global search with Ctrl+F and result navigation
- Clan panel with member counts, activity indicators and sorting
- Marker tooltips with tier/alpha badges and teleport hint
- Dark fantasy sidebar UI — removed Bootstrap dependency
- Converted all map tiles from PNG to WebP (~30–50% smaller)
- Regenerated zoom 2–5 tiles from zoom-6 source for coordinate accuracy
- 365-day browser cache for tile assets
- GitHub Actions release workflow (builds Windows .exe automatically)

#### v0.2.0 (November 2018)

- Added more structure filters: Altars, Animal pens, Chests, Map rooms, Trebuchets, Vaults, Water wells, All Crafting Placeables, All Pippi Placeables
- Removed player/guild id from legend

#### v0.1.0 (October 2018)

- Spanish (es) and English (en) translations
- Basic Auth support
- Config file for language, port, database path and users

#### v0.0.1 (October 2018)

- First release
