# Dooya DC1600 Capture (ESP32 + CC1101)

A ready-to-flash ESPHome configuration that captures RF codes from a Dooya DC1600 (or compatible) 433 MHz remote. Use this to clone your existing remote's codes for Home Assistant integration—the ESP32 listens for remote button presses and logs the `id`, `channel`, `button`, and `check` values needed to retransmit those commands later.

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
| `dooya-dc1600-capture.yaml` | ESPHome capture node config |
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
ota_password: "choose-a-strong-password"
```

Or edit the YAML directly and replace the `!secret` lines with the commented `REPLACE_ME_*` placeholders.

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

## Capturing Codes

1. **Boot / SPI OK** — no `FF0F` / `0000` / `FFFF` on CC1101 setup (those indicate bad SPI wiring).
2. **RX active** — after boot, `cc1101.begin_rx` runs automatically (see `on_boot`).
3. **Dooya dumps** — press OPEN / STOP / CLOSE on the physical remote near the node. With `logger.level: DEBUG` you'll see:

   ```text
   [D][remote.dooya:…] Received Dooya: id=0x........ channel=... button=... check=...
   ```

4. Record **id**, **channel**, **button**, and **check** for each key. Typical button values: `1` = open/up, `5` = stop, `3` = close/down (confirm from your dumps; `check` often matches on a short press).

5. Uncomment the `button:` (or `api.services`) block at the bottom of the YAML, paste the captured values, reflash, and test transmit. This **clones** the remote codes—it does not pair a new remote with the motor.

## Tips

- Keep the node within a few meters of the remote while capturing; concrete walls hurt 433 MHz range.
- If dumps never appear: raise logger to `VERBOSE`, double-check GDO2→GPIO16, try `dump: all` briefly, and confirm frequency is 433.92 MHz ASK/OOK.
- Idle is set to `7ms` and filter to `250us` with `tolerance: 50%` for Dooya timing; only change these if you see truncated or noisy frames.

## Resources

- [ESPHome CC1101 Component Documentation](https://esphome.io/components/cc1101.html)
- [ESPHome Remote Transmitter](https://esphome.io/components/remote_transmitter.html)
- [ESPHome Remote Receiver](https://esphome.io/components/remote_receiver.html)

## License

MIT — see [LICENSE](LICENSE).
