# Dooya DC1600 Capture + Transmit (ESP32 + CC1101)

A ready-to-flash ESPHome configuration that captures RF codes from a Dooya DC1600 (or compatible) 433 MHz remote AND transmits cloned commands to control your curtains. Works standalone (no Home Assistant required) with a built-in morning schedule. The ESP32 listens for remote button presses, logs the `id`, `channel`, `button`, and `check` values, and can retransmit those commands to operate the curtain motor.

**Requires ESPHome ≥ 2025.12** with native [`cc1101` component](https://esphome.io/components/cc1101.html) support.

## Shopping List

| Qty | Part | Notes |
|-----|------|-------|
| 1 | ESP32 DevKit V1 (30-pin) | Any 30-pin clone works; verify silkscreen |
| 1 | CC1101 8-pin 433 MHz module | Must be 433 MHz variant |
| 1 | Antenna or ~17.3 cm wire | Required before transmitting |
| — | Jumper wires | For breadboard or direct solder |

## Files

| File | Purpose |
|------|---------|
| `dooya-dc1600-capture.yaml` | ESPHome capture + transmit node config |
| `secrets.yaml` | **Create this yourself** (not in repo) |
| `web/` | Next.js web app for remote control via MQTT |
| `web/.env.example` | Template for web app environment variables |

## Wiring (3V3 only — never 5V!)

| CC1101 | ESP32 |
|--------|-------|
| VCC | **3V3** |
| GND | GND |
| SCK | GPIO18 |
| MOSI | GPIO23 |
| MISO | GPIO19 |
| CS | GPIO5 |
| GDO0 | GPIO4 (TX) |
| GDO2 | GPIO16 (RX) |

Verify pin labels on your DevKit clone—they vary. Attach the antenna before transmitting.

## Secrets

Create `secrets.yaml` next to the YAML (or in your ESPHome config directory):

```yaml
wifi_ssid: "YourSSID"
wifi_password: "YourPassword"
api_encryption_key: "paste-from-dashboard-or-openssl-rand-base64-32"

# MQTT broker (EMQX Cloud Serverless or compatible)
mqtt_broker: "abc123.ala.us-east-1.emqxsl.com"
mqtt_username: "your-mqtt-username"
mqtt_password: "your-mqtt-password"
```

The API encryption key is also used for OTA updates (no separate OTA password needed).

Or edit the YAML directly and replace the `!secret` lines with the commented `REPLACE_ME_*` placeholders.

**Important:** The ESP32 only supports 2.4 GHz Wi-Fi networks. 5 GHz networks will not work.

## Captured Codes

The following codes were captured from a real DC1600 remote and are pre-configured in the YAML:

| Remote ID | Channel | Command | Button | Check |
|-----------|---------|---------|--------|-------|
| 0x009C4B85 | 5 | OPEN | 1 | 1 |
| 0x009C4B85 | 5 | STOP | 5 | 5 |
| 0x009C4B85 | 5 | CLOSE | 3 | 3 |

Frames with `check` values 12–15 appear at the tail of button-hold bursts; these are long-press frames and are ignored.

If your remote has different values, capture them using the `dump: dooya` log output and update the `substitutions:` section in the YAML.

## Flash

### ESPHome Dashboard

1. Copy `dooya-dc1600-capture.yaml` into your ESPHome config folder.
2. Ensure `secrets.yaml` is present.
3. Install / Upload (USB for first flash, then OTA).
4. Open **Logs**.

### CLI

```bash
# From the directory containing the YAML + secrets.yaml
esphome run dooya-dc1600-capture.yaml

# Or compile only:
esphome compile dooya-dc1600-capture.yaml
```

First flash usually needs USB; later updates can use OTA.

## Testing Transmit

After flashing the updated configuration:

1. **ESPHome Web Interface:** Open the device's web UI (find the IP in your router or ESPHome dashboard). Press the **Curtain Open**, **Curtain Stop**, or **Curtain Close** buttons and confirm the curtain moves.

2. **Home Assistant:** The device exposes:
   - Three button entities: `Curtain Open`, `Curtain Stop`, `Curtain Close`
   - One cover entity: `Curtains` with open/close/stop controls and position slider

3. **Verify original remote still works:** After testing transmit, press buttons on your physical DC1600 remote. The motor should still respond (cloning does not interfere with the original remote).

4. **Adjust travel time:** The cover entity uses configured travel times (currently 40 seconds). Measure your curtain's actual open and close times and update `open_duration` / `close_duration` in the YAML for accurate position tracking.

## Position Tracking with Confidence

The system tracks curtain position with honest uncertainty:

**When position is KNOWN:**
- After a full OPEN runs uninterrupted for 40s → position = 100%
- After a full CLOSE runs uninterrupted for 40s → position = 0%
- After a STOP from a known starting position → position calculated from elapsed time

**When position is UNKNOWN:**
- After boot (default state)
- After any movement from an unknown starting position
- Position becomes known only after the next full-travel event

**UI states:**
- **Known %** — Shows position number and curtain illustration
- **Moving** — Shows "Opening..." or "Closing..." while in motion
- **Standby** — Shows listening icon when position is unknown, awaiting commands

**RF tracking:** The CC1101 receiver also detects physical remote button presses. Commands from the web app, schedule, local web UI, AND physical remote all update the position tracker. Own transmissions are filtered to avoid double-counting.

## Schedule

The ESP32 runs a standalone morning schedule (no Home Assistant required):

| Time (default) | Action |
|----------------|--------|
| 07:00 | Open curtains to ~50% (halfway) |
| 09:30 | Open curtains fully |

**How it works:**

- Uses SNTP to sync time on boot (servers: `pool.ntp.org`)
- Timezone: `Asia/Bangkok` (UTC+7)
- Partial open: sends OPEN, waits configured seconds (default 20s = 50%), then sends STOP
- Full open: sends OPEN (motor has built-in endstop)
- Curtains never close automatically; closing is always manual via remote, web UI, or app

**Configurable settings:**

All schedule settings are stored persistently on the ESP32 and survive reboots:

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Partial Open Hour | 0-23 | 7 | Hour for partial open |
| Partial Open Minute | 0-59 | 0 | Minute for partial open |
| Partial Open Seconds | 1-40 | 20 | Duration to open (20s = 50% of 40s travel) |
| Full Open Hour | 0-23 | 9 | Hour for full open |
| Full Open Minute | 0-59 | 30 | Minute for full open |

Adjust these via:
- **ESPHome local web UI** (http://device-ip) — number sliders
- **Web app Settings page** — if deployed
- **MQTT** — publish to `dooya/schedule/*/set` topics
- **Home Assistant** — number entities (if connected)

**Assumptions:**

- The curtain is normally fully closed at partial open time. If already open, the motor reaches its endstop quickly and stops; the configured wait still completes before STOP is sent.
- After a reboot, the time-based cover doesn't know the true position, so the schedule sends raw RF commands rather than using the cover's position logic.

**Enable/Disable:**

A "Morning Schedule" switch is exposed in the ESPHome web UI, the remote web app, and Home Assistant (if connected). Toggle it off to disable the automatic schedule. The setting persists across reboots (`RESTORE_DEFAULT_ON`).

## MQTT Setup (EMQX Cloud Serverless)

The ESP32 connects to an MQTT broker for remote control from the web app. [EMQX Cloud Serverless](https://www.emqx.com/en/cloud/serverless-mqtt) offers a free tier with 1M session minutes/month.

### 1. Create a Deployment

1. Sign up at [EMQX Cloud Console](https://cloud.emqx.com/)
2. Click **New Deployment** → **Serverless**
3. Choose a region close to you
4. Wait for the deployment to start (takes ~1 minute)

### 2. Get Connection Details

1. Go to **Overview** in your deployment
2. Copy the **Connection Address** (e.g., `abc123.ala.us-east-1.emqxsl.com`)
3. Note the ports: `8883` (MQTTS) and `8084` (WSS)

### 3. Create Authentication

1. Go to **Access Control** → **Authentication**
2. Click **Add**
3. Enter a username and password
4. Click **Confirm**

### 4. Update secrets.yaml

Add to your `secrets.yaml`:

```yaml
mqtt_broker: "abc123.ala.us-east-1.emqxsl.com"
mqtt_username: "your-username"
mqtt_password: "your-password"
```

### 5. Reflash the ESP32

```bash
esphome run dooya-dc1600-capture.yaml --device 192.168.1.168
```

Replace `192.168.1.168` with your ESP32's IP address (for OTA update over Wi-Fi).

## Web App Deployment (Vercel)

A Next.js web app in `web/` provides remote curtain control from any browser.

### Features

- Mobile-first, modern UI
- Big Open / Stop / Close buttons
- Device online/offline indicator
- Morning schedule toggle
- Settings page for schedule times
- Password-protected login
- MQTT credentials stay server-side

### Deploy to Vercel

1. **Import the GitHub repo** at [vercel.com/new](https://vercel.com/new)

2. **Set Root Directory** to `web`

3. **Add Environment Variables:**

   | Variable | Description |
   |----------|-------------|
   | `APP_PASSWORD` | Password to log in to the web UI |
   | `SESSION_SECRET` | Min 32 chars; generate with `openssl rand -base64 32` |
   | `MQTT_BROKER` | Your EMQX address (e.g., `abc123.ala.us-east-1.emqxsl.com`) |
   | `MQTT_USERNAME` | EMQX authentication username |
   | `MQTT_PASSWORD` | EMQX authentication password |
   | `MQTT_WSS_PORT` | WebSocket port (default: `8084`) |

4. **Deploy** — Vercel builds and hosts the app

5. **Log in** at your Vercel URL with the `APP_PASSWORD`

### MQTT Topics

The ESP32 and web app communicate via these MQTT topics:

| Topic | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `dooya/curtain/command` | → ESP32 | `OPEN`, `STOP`, `CLOSE` | Curtain commands |
| `dooya/curtain/availability` | ← ESP32 | `online`, `offline` | Device status (retained) |
| `dooya/curtain/position` | ← ESP32 | `0`-`100` | Position % (retained) |
| `dooya/curtain/position_known` | ← ESP32 | `true`, `false` | Position confidence (retained) |
| `dooya/curtain/movement` | ← ESP32 | `stopped`, `opening`, `closing` | Movement state (retained) |
| `dooya/schedule/command` | → ESP32 | `ON`, `OFF` | Enable/disable schedule |
| `dooya/schedule/state` | ← ESP32 | `ON`, `OFF` | Schedule status (retained) |
| `dooya/schedule/partial_hour` | ← ESP32 | `0`-`23` | Partial open hour (retained) |
| `dooya/schedule/partial_hour/set` | → ESP32 | `0`-`23` | Set partial open hour |
| `dooya/schedule/partial_minute` | ← ESP32 | `0`-`59` | Partial open minute (retained) |
| `dooya/schedule/partial_minute/set` | → ESP32 | `0`-`59` | Set partial open minute |
| `dooya/schedule/partial_seconds` | ← ESP32 | `1`-`40` | Partial open duration (retained) |
| `dooya/schedule/partial_seconds/set` | → ESP32 | `1`-`40` | Set partial open duration |
| `dooya/schedule/full_hour` | ← ESP32 | `0`-`23` | Full open hour (retained) |
| `dooya/schedule/full_hour/set` | → ESP32 | `0`-`23` | Set full open hour |
| `dooya/schedule/full_minute` | ← ESP32 | `0`-`59` | Full open minute (retained) |
| `dooya/schedule/full_minute/set` | → ESP32 | `0`-`59` | Set full open minute |

## Capturing Your Own Codes

If you need to capture codes from a different remote:

1. **Boot / SPI OK** — no `FF0F` / `0000` / `FFFF` on CC1101 setup (those indicate bad SPI wiring).
2. **RX active** — after boot, `cc1101.begin_rx` runs automatically (see `on_boot`).
3. **Dooya dumps** — press OPEN / STOP / CLOSE on the physical remote near the node. With `logger.level: DEBUG` you'll see:

   ```text
   [D][remote.dooya:…] Received Dooya: id=0x........ channel=... button=... check=...
   ```

4. Record **id**, **channel**, **button**, and **check** for each key. Typical button values: `1` = open/up, `5` = stop, `3` = close/down (confirm from your dumps; `check` often matches button on a short press).

5. Update the `substitutions:` section in the YAML with your captured values.

## Tips

- Keep the node within a few meters of the remote while capturing; concrete walls hurt 433 MHz range.
- If dumps never appear: raise logger to `VERBOSE`, double-check GDO2→GPIO16, try `dump: all` briefly, and confirm frequency is 433.92 MHz ASK/OOK.
- Idle is set to `7ms` and filter to `250us` with `tolerance: 50%` for Dooya timing; only change these if you see truncated or noisy frames.
- The repeat count is set to 3 with 15ms wait between transmissions. Do not exceed ~5 repeats, as too many can look like a pairing/programming sequence to the motor.

## Resources

- [ESPHome CC1101 Component Documentation](https://esphome.io/components/cc1101.html)
- [ESPHome Remote Transmitter](https://esphome.io/components/remote_transmitter.html)
- [ESPHome Remote Receiver](https://esphome.io/components/remote_receiver.html)
- [ESPHome Time-Based Cover](https://esphome.io/components/cover/time_based/)
- [ESPHome Time / SNTP](https://esphome.io/components/time/sntp.html)
- [ESPHome MQTT Component](https://esphome.io/components/mqtt.html)
- [EMQX Cloud Serverless](https://www.emqx.com/en/cloud/serverless-mqtt)
- [EMQX Cloud Connection Guide](https://docs.emqx.com/en/cloud/latest/deployments/port_guide_serverless.html)

## License

MIT — see [LICENSE](LICENSE).
