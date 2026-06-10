// =====================================================================
// PlayBoard SOURCE 1 -- built-in sensors (no wiring needed)  [MakeCode JS]
//
//   light   : on-board light sensor      (0..255)       -> /play/cutoff
//   accel_x : accelerometer X / tilt     (~-1024..1024)  -> /play/reverb
//
// Reads the micro:bit's own sensors and broadcasts the raw numbers over
// radio to the hub. It does NO scaling -- that is the bridge's job.
//
// SRC must match the `src` field in the bridge mapping config. The example
// mapping (bridge/config/mapping.example.yaml) calls this device "1".
// =====================================================================
const RADIO_GROUP = 7
const SRC = "1"
const SEND_MS = 100        // ~10 readings/sec per channel

radio.setGroup(RADIO_GROUP)

// Build and broadcast one protocol line: "SRC,chan,value".
// Keep channel names short -- a radio string is limited to ~19 characters,
// and "1,accel_x,-1024" (15) is the longest line we send.
function send(chan: string, value: number) {
    radio.sendString(SRC + "," + chan + "," + value)
}

basic.forever(function () {
    send("light", input.lightLevel())
    send("accel_x", input.acceleration(Dimension.X))
    led.toggle(0, 0)       // top-left LED flickers = sending
    basic.pause(SEND_MS)
})
