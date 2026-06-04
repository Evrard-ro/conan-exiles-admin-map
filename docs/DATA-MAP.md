# DATA-MAP: Справочная карта данных Conan Exiles Admin Map

> Справочник для быстрой проверки: что вытаскивается из `game.db`, как трансформируется, что отрисовывается на карте, и что ещё можно извлечь.

---

## 1. TL;DR — все слои карты

| Слой на карте | URL endpoint | SQL-ключ | Таблицы БД | Что в попапе |
|---|---|---|---|---|
| Все объекты | `/api/all` | `all` | buildings + actor_position + guilds/characters | kind, guild_name |
| Алтари | `/api/altars` | `altars` | buildings + actor_position + guilds/characters | kind (название бога/ярус), guild_name |
| Вольеры | `/api/animalpens` | `animalpens` | buildings + actor_position + guilds/characters | kind (T1/T2/T3), guild_name |
| Кровати/подстилки | `/api/beds` | `beds` | buildings + actor_position + guilds/characters | kind, guild_name |
| Постройки | `/api/buildings` | `buildings` | buildings + actor_position + guilds/characters | kind (тип/DLC), guild_name |
| Костры | `/api/campfires` | `campfires` | buildings + actor_position + guilds/characters | kind, guild_name |
| Сундуки | `/api/chests` | `chests` | buildings + actor_position + guilds/characters | kind, guild_name |
| Ловушки для крабов | `/api/crabpots` | `crabPots` | buildings + actor_position + guilds/characters | kind, guild_name |
| Крафтовые станции | `/api/crafting` | `crafting` | buildings + actor_position + guilds/characters | kind, guild_name |
| Рыбные ловушки | `/api/fishnets` | `fishNets` | buildings + actor_position + guilds/characters | kind, guild_name |
| Комнаты карт | `/api/maprooms` | `mapRooms` | buildings + actor_position + guilds/characters | kind, guild_name |
| Питомцы | `/api/pets` | `pets` | actor_position + properties (×3 JOIN) | name, info (вид/Greater), owner |
| Тхраллы | `/api/thralls` | `thralls` | actor_position + properties (×3 JOIN) | name, info (фракция/тир), owner |
| Pippi (все) | `/api/pippi/all` | `pippiAll` | buildings + actor_position + guilds/characters | kind, guild_name |
| Pippi-тесп. | `/api/pippi/thespians` | `pippiThespians` | actor_position + properties | kind, name (имя NPC), info (профессия) |
| Игроки | `/api/players` | `players` | characters + guilds + actor_position + account | char_name, guild_name, rank, level, last_online |
| Троны | `/api/thrones` | `thrones` | buildings + actor_position + guilds/characters | kind, guild_name |
| Требушеты | `/api/trebuchets` | `trebuchets` | buildings + actor_position + guilds/characters | kind, guild_name |
| Хранилища | `/api/vaults` | `vaults` | buildings + actor_position + guilds/characters | kind, guild_name |
| Колодцы | `/api/waterwells` | `waterWells` | buildings + actor_position + guilds/characters | kind, guild_name |
| Колёса боли | `/api/wheelsofpain` | `wheelsOfPain` | buildings + actor_position + guilds/characters | kind (Lesser/Normal/Greater), guild_name |

---

## 2. Поток данных

```
Frontend (map.js)
  └─ $.getJSON('/api/<kind>')
       └─ Express route (src/routes/api/<kind>.js)
            └─ Controller.getAll(req, res)
                 ├─ [стандартный] BaseController → db.prepare(queries.<key>).all()
                 │                                 → item.kind = item.class
                 │                                 → res.send({data, update})
                 │
                 ├─ [players.js]   query → снять quote() обёртку → маппинг ранга
                 ├─ [pets.js]      query → смарт-буфер BLOB ×3 → name/info/owner/greater
                 └─ [pippi/thespians.js] query → ASCII UE4 property → name/profession

game.db (read-only, better-sqlite3, open-query-close на каждый запрос)
  ├─ actor_position   — координаты + class-имя каждого объекта
  ├─ buildings        — связь object_id ↔ owner_id
  ├─ guilds           — имена кланов
  ├─ characters       — персонажи, уровень, ранг, Steam ID
  ├─ account          — флаг online
  └─ properties       — BLOB-свойства (только для pets и pippi/thespians)
```

---

## 3. Схема `game.db` — используемые таблицы

Всего таблиц в БД: **27**. Размеры (из `game_0.db`):

| Таблица | Строк | Используется |
|---|---|---|
| actor_position | 5 881 | Да — все |
| buildings | 4 975 | Да — все |
| characters | 308 | Да — `/api/players` |
| guilds | 60 | Да — все (LEFT JOIN) |
| account | 347 | Да — online-флаг |
| properties | 47 362 | Частично — pets, pippi/thespians |
| item_inventory | 69 418 | Нет |
| buildable_health | 100 899 | Нет |
| building_instances | 40 143 | Нет |
| character_stats | 22 153 | Нет |
| follower_markers | 62 | Нет |
| events | 0 | Нет (пуста) |
| destruction_history | 0 | Нет (пуста) |

### `actor_position`
| Колонка | Тип | Используется | Описание |
|---|---|---|---|
| id | bigint | Да | PK, = `buildings.object_id` |
| class | TEXT | Да | UE4 blueprint-путь объекта (фильтр `LIKE '%pattern%'`) |
| map | TEXT | Нет | Название карты (`ConanSandbox`) |
| x, y, z | double precision | Да | Мировые координаты (Unreal units) |
| sx, sy, sz | double precision | Нет | Масштаб |
| rx, ry, rz, rw | double precision | Нет | Ротация (кватернион) |

**Sample:** `class="/Game/Systems/Building/BP_BuildFoundation.BP_BuildFoundation_C"`, `id=6415`, `x=1855052.9`, `y=148621.7`, `z=-16723.7`

### `buildings`
| Колонка | Тип | Используется | Описание |
|---|---|---|---|
| object_id | bigint | Да | FK → `actor_position.id` |
| owner_id | bigint | Да | FK → `guilds.guildId` ИЛИ `characters.id`; `> 0` отсеивает мусор |

**Sample:** `object_id=67329`, `owner_id=65835`

### `characters`
| Колонка | Тип | Используется | Описание |
|---|---|---|---|
| id | BIGINT | Да | PK, = `buildings.owner_id` для одиночек, = `actor_position.id` |
| playerId | TEXT | Да | Steam/EGS user ID (связь с `account.user`) |
| char_name | TEXT | Да | Имя персонажа |
| level | INTEGER | Да | Уровень 1–60 |
| rank | INTEGER | Да | 3=Guild master, 2=Officer, 1=Member, 0=Recruit, NULL=нет гильдии |
| guild | BIGINT | Да | FK → `guilds.guildId`; NULL = без клана |
| isAlive | BOOLEAN | Нет | 1 = жив |
| lastTimeOnline | INTEGER | Да | Unix timestamp последнего онлайна |
| killerName | TEXT | Нет | Имя убийцы |
| killerId | TEXT | Нет | Steam ID убийцы |
| lastServerTimeOnline | REAL | Нет | Серверное время |

**Sample:** `id=171`, `char_name="Ignyz"`, `level=3`, `lastTimeOnline=1778027729`

### `guilds`
| Колонка | Тип | Используется | Описание |
|---|---|---|---|
| guildId | BIGINT | Да | PK |
| name | TEXT | Да | Название клана |
| owner | BIGINT | Нет (в SQL) | ID владельца (char_id) |
| messageOfTheDay | TEXT | Нет | MOTD |
| emblemInfo | BLOB | Нет | Эмблема |

**Sample:** `guildId=343`, `name="COOP"`, `owner=301`

### `account`
| Колонка | Тип | Используется | Описание |
|---|---|---|---|
| user | TEXT | Да | ID платформы; связь с `characters.playerId` |
| online | BOOL | Да | 1 = сейчас онлайн (белая обводка маркера) |
| platformId | TEXT | Нет | Steam 64-bit ID (`76561198...`) |

**Sample:** `user="A-79JJFW4ZO"`, `online=1`, `platformId="76561198029578930"`

### `properties`
| Колонка | Тип | Используется | Описание |
|---|---|---|---|
| object_id | bigint | Да | FK → `actor_position.id` |
| name | TEXT | Да | `<ClassName>.<PropertyName>` — 2518 уникальных значений |
| value | BLOB | Да (парсинг) | UE4 binary property serialization |

Используемые паттерны `name`:
- `%petname` → имя питомца/маунта
- `%thrallinfo` → вид тралла (в т.ч. `Greater`-флаг)
- `%owner%` → numeric ID владельца
- `%mobconfig` → Pippi-тесп. имя + профессия

---

## 4. Каталог endpoint-ов

### Стандартные endpoint-ы (BaseController)

Все 17 возвращают одинаковую форму JSON:
```json
{
  "data": [
    {
      "class": "/Game/Systems/Building/..._C",
      "kind": "/Game/Systems/Building/..._C",
      "x": 185505.2, "y": 14862.1, "z": -1672.3,
      "guild_name": "COOP", "guild_id": 343,
      "char_name": null, "char_id": null,
      "owner_id": 343
    }
  ],
  "update": "2025-01-01 12:00:00"
}
```

Поле `kind` = копия `class` (BaseController:17 — `item.kind = item.class`).  
Если `owner_id` → клан, заполнены `guild_name`/`guild_id`; если → персонаж, заполнены `char_name`/`char_id`.

| Endpoint | SQL-ключ | Фильтр `ap.class LIKE` |
|---|---|---|
| `/api/all` | `all` | Все паттерны ниже объединены `OR` |
| `/api/altars` | `altars` | `%BP_PL_Altar%` |
| `/api/animalpens` | `animalpens` | `%BP_PL_Crafting_Station_AnimalPen%` |
| `/api/beds` | `beds` | `%BP_PL_Bedroll_%` OR `%BP_PL_Bed_%` |
| `/api/buildings` | `buildings` | `%BuildFoundation%` OR `%BuildTriangleFoundation%` |
| `/api/campfires` | `campfires` | `%BP_PL_Crafting_CampFire%` OR `%BP_PL_Crafting_Bonfire%` |
| `/api/chests` | `chests` | `%BP_PL_Chest%` |
| `/api/crabpots` | `crabPots` | `%BP_PL_Crafting_CrabPot%` |
| `/api/crafting` | `crafting` | `%BP_PL_Crafting%` |
| `/api/fishnets` | `fishNets` | `%BP_PL_Crafting_FishNet%` |
| `/api/maprooms` | `mapRooms` | `%BP_PL_Maproom%` |
| `/api/thrones` | `thrones` | `%BP_PL_Chair_Throne%` |
| `/api/trebuchets` | `trebuchets` | `%Trebuchet_V2%` |
| `/api/vaults` | `vaults` | `%BP_PL_Chest_Vault%` |
| `/api/waterwells` | `waterWells` | `%BP_PL_Water_Well%` |
| `/api/wheelsofpain` | `wheelsOfPain` | `%wheelofpain%` |
| `/api/pippi/all` | `pippiAll` | `%Pippi%` |

> **Осторожность с перекрытиями:** `/api/crafting` (`%BP_PL_Crafting%`) поглощает crabpots, fishnets, campfires, animalpens — они все совпадают с этим паттерном.  
> `/api/chests` (`%BP_PL_Chest%`) также захватывает вaults (`%BP_PL_Chest_Vault%`).

---

### GET `/api/players`
**Контроллер:** `src/controllers/api/players.js:9`  
**SQL-ключ:** `players` (`src/config/sql.js:131`)

**SQL-особенности:**
- `quote(g.name)`, `quote(c.char_name)` и др. — SQLite обёртка для экранирования кавычек в именах
- `CASE c.rank WHEN '3' THEN 'Guild master' … END` — маппинг числа в строку
- `datetime(c.lastTimeOnline, 'unixepoch')` → `"YYYY-MM-DD HH:MM:SS"`
- `acc.online` — 0/1 флаг онлайна

**Пост-обработка (`players.js:15`):**
- `char_name.slice(1, -1)` — снять одинарные кавычки от `quote()`
- `guild_name === 'NULL'` → `''` (без гильдии)
- `rank === 'NULL'` → `''`

**JSON-ответ:**
```json
{
  "guild_name": "COOP", "guild_id": "343",
  "char_name": "Ignyz", "rank": "Member",
  "level": 3, "steam_id": "4",
  "char_id": "171", "x": -59277.23, "y": 294054.24, "z": -20320.88,
  "online": 1, "last_online": "2025-05-02 19:35:29"
}
```

**На карте:** маркер позиции игрока; белая обводка если `online=1`; в попапе: char_name, guild_name. В таблице списка: Player, Guild, Rank, Level, Last seen online.

---

### GET `/api/pets`
**Контроллер:** `src/controllers/api/pets.js`  
**SQL-ключ:** `pets` (`src/config/sql.js:108`)

**SQL:** `actor_position` LEFT JOIN `properties` трижды:
- `petname.name LIKE '%petname'` → имя
- `petinfo.name LIKE '%thrallinfo'` → вид
- `petowner.name LIKE '%owner%'` → владелец

**Фильтр класса:** `ap.class LIKE '%wildlife%pet%' OR ap.class LIKE '%pict_wildlife%'`

**Пост-обработка (`pets.js`):**
- `name` — `SmartBuffer.fromBuffer(blob)`, skip 21 байт, читать строку, очистить от `\uXXXX`/escape/`.Imo`
- `info` — читать как UTF-8, вырезать между `_Name` и `ThrallIcon`
- `owner` — `readUInt16LE(buffer.length - 8)` → числовой char_id владельца
- `greater` — `info.indexOf('Greater') > -1`

**JSON-ответ:**
```json
{
  "x": 100000, "y": 200000, "z": -15000,
  "name": "Шарик", "info": "Wolf",
  "owner": 171, "greater": false
}
```

**Маунты:** попадают в выборку если class содержит `pict_wildlife` (лошади, верблюды).

---

### GET `/api/thralls`
**Контроллер:** `src/controllers/api/thralls.js`  
**SQL-ключ:** `thralls` (`src/config/sql.js`)

**SQL:** `actor_position` LEFT JOIN `properties` трижды:
- `thrallname.name LIKE '%ThrallName'` → кастомное имя (дал игрок)
- `thrallinfo.name LIKE '%ThrallInfo'` → фракция и тир (`Heirs_of_the_North_Lian_T4` → `Heirs of the North Lian T4`)
- `thrallowner.name LIKE '%OwnerUniqueID'` → владелец

**Фильтр класса:** `ap.class LIKE '%PersistentHumanoidNPC%'`

**Пост-обработка (`thralls.js`):**  
Идентична `pets.js` — те же смещения UE4 FString:
- `name` — offset 41: int32 LE длина (отриц = UTF-16LE кириллица, полож = ASCII), данные с offset 45
- `info` — offset 16: int32 LE длина, данные с offset 20, ASCII; подчёркивания → пробелы
- `owner` — `readUInt16LE(buffer.length - 8)` → числовой char_id владельца

**JSON-ответ:**
```json
{
  "class": "/Game/Characters/NPCs/Human/PersistentHumanoidNPC_C",
  "x": 100000, "y": 200000, "z": -15000,
  "name": "Лиан SunRise", "info": "Heirs of the North Lian T4",
  "owner": 171
}
```

> Прирученные NPC на рабочих местах (воины, лучники, развлекатели, переносчики, жрецы). В `game_0.db` — 360 записей.

---

### GET `/api/pippi/thespians`
**Контроллер:** `src/controllers/api/pippi/thespians.js`  
**SQL-ключ:** `pippiThespians` (`src/config/sql.js:117`)

**SQL:** `actor_position` LEFT JOIN `properties` (`name LIKE '%mobconfig'`)  
**Фильтр класса:** `ap.class LIKE '%pippi_mob%'`

**Пост-обработка (`pippi/thespians.js`):**
- Читать BLOB как ASCII строку (UE4 binary property format)
- `name` — найти первый `StrProperty`, сдвиг +25, до `profession`
- `info` (профессия) — найти `profession`, затем первый `StrProperty` +25, до `isInteraction`
- Очистка от `\uXXXX`/escape, `slice(0, -1)`

**JSON-ответ:**
```json
{
  "class": "/Game/Mods/Pippi/Pippi_Mob.Pippi_Mob_C",
  "kind": "/Game/Mods/Pippi/Pippi_Mob.Pippi_Mob_C",
  "x": 150000, "y": -10000, "z": -16000,
  "name": "Торговец Жан", "info": "Merchant"
}
```

> Поле `kind` здесь НЕ добавляется BaseController-ом — этот контроллер CommonJS и не наследует BaseController. `kind` приходит из SQL AS-alias в `select ap.class` — оно доступно только через `item.class`, `item.kind` будет `undefined`. Если нужен `kind` в попапе — добавить его вручную в контроллере.

---

## 5. Frontend: рендеринг

### Преобразование координат (`map.js: convertRange`)

```
Игровые координаты (Unreal units)  →  Leaflet LatLng (CRS.Simple)
X: [-296 000 .. 412 000]  →  [14.4 .. 230.7]  (lng)
Y: [-292 000 .. 353 500]  →  [-47.7 .. -245.3] (lat, инвертировано)
```

### Цвета маркеров (`colorhash.js`)

BKDR Hash (seed=131/137) от строки → HSL → RGB → hex.

| Приоритет | Входная строка | Условие |
|---|---|---|
| 1 | `guild_id + guild_name` | Есть гильдия |
| 2 | `char_id + char_name` | Нет гильдии, но есть персонаж |
| 3 | `owner + ownerName` | Для pets/pippi |
| — | Жёлтый `#FFD700` | Нет владельца, но есть `info` |

Онлайн-игрок: `stroke='white'`, остальные: `stroke='black'`.

### Попап (тултип)

Единый `getTooltipContent()` для всех слоёв. Порядок строк:
1. `kind` → перевод через `language.phrases['items.' + kind]` (см. `src/languages/{en,es}/items.js`)
2. `name` (если есть)
3. `info` (если есть)
4. `char_name` (если есть)
5. `guild_name` (если есть)

**Клик по маркеру** → копирует `TeleportPlayer X Y Z` в буфер.

---

## 6. Локализация class-имён (`src/languages/en/items.js`)

Всего ~100 записей, категории:

| Категория | Записей | Пример |
|---|---|---|
| Altars (6 богов × 3 яруса) | 18 | `Pit of Yog`, `Temple of Mitra` |
| Buildings (T1–T3 + DLC) | 16 | `Sandstone Building`, `Khitan Building` |
| Animal Pens (T1–T3) | 3 | `Animal Pen`, `Armored Animal Pen` |
| Beds + Bedrolls | 9 | `Fiber Bedroll`, `Nordheimer Bed` |
| Crafting Benches | 5 | `Armorer's Bench`, `Blacksmith's Bench` |
| Furnaces | 2 | `Furnace`, `Improved Furnace` |
| Campfires | 3 | `Campfire`, `Bonfire` |
| Wheels of Pain | 3 | `Lesser Wheel of Pain`, `Greater Wheel of Pain` |
| Trebuchets | 4 | `Siege Foundation`, `Trebuchet` |
| Pippi | 8 | `Pippi - Thespian`, `Pippi - Warper` |
| Water Wells | 3 | `Water Well`, `Statue of Refreshment` |
| Chests + Vault | 4 | `Wooden Box`, `Vault` |
| Map Room | 1 | `Map room` |
| Throne | 1 | `Throne` |
| Fish/Shellfish Traps | 2 | `Fish Trap`, `Shellfish Trap` |
| + другие (Dryer, Stove, Grinder…) | ~20 | |

Если `kind` не найден в `items.js` — на карте отображается сырой blueprint-путь.

---

## 7. Потенциальные данные (в game.db, не используются)

### Decay-таймеры построек

В `properties` есть `%.DecayTimestamp` для каждого типа фундамента.

```sql
SELECT ap.class, ap.x, ap.y, ap.z,
       p.name, p.value as decay_blob
FROM actor_position ap
JOIN properties p ON p.object_id = ap.id AND p.name LIKE '%DecayTimestamp%'
WHERE ap.class LIKE '%BuildFoundation%'
```

Значение — BLOB (16 байт, LE double). Позволяет показывать, когда постройка «сгниёт» без посещения.

**Ценность:** Фильтрация «умирающих» баз на карте.

---

### Decay State

`BP_BuildFoundation_C.DecayState` — byte, состояние гниения (0=fresh, 1=decaying, 2=critical). Позволяет красить маркер постройки в зависимости от состояния.

---

### Follower markers (`follower_markers`, 62 строки)

```
owner_id BIGINT  — char_id игрока
follower_id BIGINT  — actor_position.id последователя
```

Это список NPC, «отмеченных» игроком на карте через специальную механику. Готовый JOIN с `actor_position` даст позицию.

---

### Инвентари (`item_inventory`, 69 418 строк)

```
item_id bigint
owner_id bigint  — FK → actor_position.id (контейнер) ИЛИ characters.id (персонаж)
inv_type bigint  — тип слота
template_id bigint  — ID предмета (по внешнему item-справочнику)
data BLOB
```

Позволяет показывать, что лежит в конкретном сундуке/хранилище.  
**Осторожно:** Таблица огромная (69к строк), `data` — BLOB. Без item-справочника `template_id` — просто число.

---

### Статы персонажей (`character_stats`, 22 153 строк)

```
char_id bigint
stat_type bigint  — тип атрибута (сила, ловкость…)
stat_id bigint
stat_value double precision
```

Позволяет показывать вложенные статы (strength, agility и т.д.) в списке игроков.

---

### События (`events`, 0 строк — пуста в game_0.db)

```
eventId INTEGER
eventMessage CHAR(50)
date DATETIME
member BIGINT  — char_id
guild BIGINT   — guildId
```

При наличии данных — лог действий гильдий. В тестовой БД пуста.

---

### Настройки сервера (`dw_settings`, 8 строк)

```
name TEXT
value TEXT
```

Строки: `build`, `version` (30), `serverruntime` (416699 сек ≈ 4.8 дней), `inside_collision_check_version`, `placeable_stability_propagation_version`.

**Ценность:** Показывать uptime сервера в интерфейсе.

---

### Здоровье построек (`buildable_health`, 100 899 строк)

Хранит HP каждого элемента строения. Огромная таблица; PRAGMA не показал столбцы — требует отдельного исследования.

---

## 8. Чек-лист: объект есть в БД, но не на карте

1. **Найти `class`** — выполнить в SQLite:
   ```sql
   SELECT class, x, y, z FROM actor_position
   WHERE x BETWEEN <X-1000> AND <X+1000>
     AND y BETWEEN <Y-1000> AND <Y+1000>;
   ```

2. **Проверить SQL-фильтр** — найти нужный `LIKE`-паттерн в `src/config/sql.js`.  
   Если class не совпадает ни с одним паттерном — объект не вытаскивается.

3. **Проверить ответ API** — открыть DevTools → Network → `/api/<kind>` → найти объект по координатам в JSON.

4. **Проверить buildings** — стандартный pipeline требует записи в `buildings`:
   ```sql
   SELECT * FROM buildings WHERE object_id = <actor_position.id>;
   ```
   Если строки нет — объект не в `buildings`, а значит стандартный запрос его не найдёт (нужен запрос прямо к `actor_position`, как для `pets`).

5. **Проверить перевод** — если объект есть в ответе API, но тип не читается:
   найти полный `class`-путь в `src/languages/en/items.js`.  
   Если отсутствует — добавить запись.

---

## 9. Добавление нового типа объектов

Минимальный чек-лист (по CLAUDE.md):

- [ ] Найти class-паттерн в `actor_position` через SQLite
- [ ] Добавить SQL в `src/config/sql.js`
- [ ] Создать контроллер в `src/controllers/api/` (стандартный: extend BaseController + getSql)
- [ ] Создать route в `src/routes/api/`
- [ ] Зарегистрировать route в `src/routes/api/index.js`
- [ ] Добавить class → имя в `src/languages/en/items.js` и `src/languages/es/items.js`
- [ ] Добавить toggle/fetch в `public/assets/scripts/map.js`
