// =====================================================================
// PlayBoard Bridge  (MakeCode for micro:bit -- JavaScript view)
//
// Receives sensor messages over micro:bit radio and relays them, verbatim,
// to USB serial as PlayBoard protocol lines:   src,chan,val
//
// This is the micro:bit you plug into your PC.
//
// Every micro:bit in one PlayBoard must share the SAME radio group.
// =====================================================================
const RADIO_GROUP = 7

radio.setGroup(RADIO_GROUP)
serial.redirectToUSB()
serial.setBaudRate(BaudRate.BaudRate115200)

// "hub is up" on power-on, then a clear screen we can blink on.
basic.showIcon(IconNames.Yes)
basic.pause(400)
basic.clearScreen()

// The sources already format the whole "src,chan,val" line, so the hub is a
// dumb relay: whatever arrives on the radio goes straight out the serial port.
// (All meaning -- scaling, what-controls-what -- lives in the webapp.)
radio.onReceivedString(function (received) {
    serial.writeLine(received)
    led.toggle(2, 2)   // blink the centre LED on every relayed message
})

// Heartbeat: a comment line (the protocol ignores lines starting with '#') so
// you can see the link is alive even when every sensor is quiet.
basic.forever(function () {
    serial.writeLine("# hub alive, group " + RADIO_GROUP)
    basic.pause(5000)
})
