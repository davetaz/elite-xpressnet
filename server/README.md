## Sending commands to a DCC controller

The RPi is connected to a Hornby Elite DCC controller by a USB cable. A python program sends XPressNet commands to the controller using the python serial package (python-serial).

The XPressNet protocol (developed by Lenz) allows DCC control devices such as hand-held controllers to be connected to the command station . Such connections are high-speed RS-485 links. Lenz and probably others make devices that allow PCs to be connected to the XPressNet bus via a slow speed (e.g. 9600 or 19200 Baud) serial connection. The Hornby Elite has this slow speed interface built in allowing it to be connected directly to a PC’s (or RPi’s) USB port. For further information about XPressNet including the full specification see the Lenz website

I’m only using commands that control the trains throttle, functions (e.g.sound) and accessories (e.g signals). I don’t know how fully the protocol is implemented by the Elite. There appear to be discrepancies between the documented responses and what I get back from Elite after a command has been sent. Currently, I only look for a x’05‘. If I get it, I assume the command has been executed successfully, if I don’t, I resend the command.

One problem I had, was getting Linux to correctly recognise the Elite when it was connected to the RPi. It appears that Hornby incorrectly uses product and device ids in their firmware. This results in the wrong drivers being associated with the Elite. This problem can be resolved by creating a file called :

`/etc/udev/rules.d/10-elite.rules`

containing the following command (all one line):

`ATTR{idVendor}=="04d8", ATTR{idProduct}=="000a", RUN+="/sbin/modprobe -q ftdi_sio vendor=0x04d8 product=0x000a"`

You should see a message similar to the following when Linux is restarted:

`[    7.319030] usb 1-1.3.1: FTDI USB Serial Device converter now attached to ttyUSB1`
`[    7.356074] usbcore: registered new interface driver ftdi_sio`

The application program running on the RPi should now be able to communicate with the Elite using the file id ttyUSB1.

Before python can communicate with the serial port you need to install the python serial package e.g. :

`sudo apt-get install python-serial`
`sudo apt-get install python3-serial`

## Examples

The following snippets are examples or sending commands to the controller from a python program.

To use the python serial interface import the serial package:

`import serial`

The following will open the serial port ttyUSB1 with a speed of 9600 Baud, no parity and one stop bit:

`ser = serial.Serial('/dev/ttyUSB1',9600)`

To send a command, use the write method (‘message‘ could be a string, but I’ve found easier to build a command as a bytearray):

`ser.write(message)`

To close the serial port, call the close method:

`ser.close()`

The following is an example of sending a command and waiting for a response. If a x’05’ is not received, the command will be resent up to a maximum of 5 times:

```
def send(message):
    ok = False
    trys = 1
    while (not ok and trys < 5) :
        ser.write(message)
        print 'trys = %d send:' % (trys) ,
        for byte in message:print(hex(byte)) ,
        time.sleep(.1)
        print ' receive: ',
        while ser.inWaiting() > 0 :
            enq = ser.read()
            print enq.encode('hex') ,
            if enq == '05'.decode('hex') :
                ok = True
        print
        trys += 1
```

The XPressNet protocol states that the last byte of a command is a ‘Error detection byte’. It is formed using an X-Or linkage of the proceeding bytes of the command. The following function will determine the error detection byte:

```
def parity(message):
    edb = 0
    for byte in message:
        edb ^= byte
    message.append(edb)
```

The following example shows how a function could be coded to implement the XPressNet throttle command:

```
def setThrottle(address,direction,speed):
    message = bytearray('E400000000'.decode('hex'))
    message[1] = 0x13
    message[3] = address
    message[4] = speed
    if direction  == 'f' : message[4] |= int(b'10000000',2)
    elif direction =='b' : message[4] &= int(b'01111111',2)
    parity(message)
    send  (message)
```
