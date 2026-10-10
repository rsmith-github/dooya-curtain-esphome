# Dooya DC1600 Capture + Transmit (ESP32 + CC1101)

A ready-to-flash ESPHome configuration that captures RF codes from a Dooya DC1600 (or compatible) 433 MHz remote AND transmits cloned commands to control your curtains from Home Assistant. The ESP32 listens for remote button presses, logs the `id`, `channel`, `button`, and `check` values, and can retransmit those commands to operate the curtain motor.

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

4. **Adjust travel time:** The cover entity uses placeholder durations (20 seconds). Measure your curtain's actual open and close times and update `open_duration` / `close_duration` in the YAML for accurate position tracking.

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

## License

MIT — see [LICENSE](LICENSE).
