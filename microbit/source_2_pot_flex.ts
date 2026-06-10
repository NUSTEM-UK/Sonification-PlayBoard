// =====================================================================
// PlayBoard SOURCE 2 -- analogue sensors on the edge pins  [MakeCode JS]
//
//   pot  : potentiometer wiper on P0   (0..1023) -> /play/lead_amp (brass)
//   flex : flex-sensor divider on P1   (0..1023) -> /play/drums_amp
//
// Wiring (each sensor is a voltage divider read by analogReadPin):
//   Potentiometer: outer legs to 3V and GND, wiper (middle) to P0.
//   Flex sensor  : flex + a ~47k fixed resistor in series between 3V and GND;
//                  read their junction on P1.
// Use crocodile clips to the big edge pads (P0, P1, 3V, GND).
//
// SRC must match the `src` field in the bridge mapping config. The example
// mapping (bridge/config/mapping.example.yaml) calls this device "2".
// =====================================================================
const RADIO_GROUP = 7
const SRC = "2"
const SEND_MS = 100        // ~10 readings/sec per channel

radio.setGroup(RADIO_GROUP)

function send(chan: string, value: number) {
    radio.sendString(SRC + "," + chan + "," + value)
}

basic.forever(function () {
    send("pot", pins.analogReadPin(AnalogPin.P0))
    send("flex", pins.analogReadPin(AnalogPin.P1))
    led.toggle(0, 0)       // top-left LED flickers = sending
    basic.pause(SEND_MS)
})
