#!/usr/bin/env python

import logging
import struct
import sys
import serial  # Import pySerial module
import time

from enum import IntEnum
from functools import reduce


class Command(IntEnum):
    """
    Command and response identifiers. Note that this is encoded in the header byte, with the command code being
    the upper nibble, and the number of bytes in the message the lower nibble. To avoid confusion, this enum is defined
    as a whole byte, with values from 0x00 to 0xF0.
    """
    INTERFACE_STATUS = 0x00
    PROGRAMMING = 0x20
    ACCESSORY_REPORT = 0x40
    ACCESSORY_CONTROL = 0x50
    STATUS = 0x60
    ALL_LOCOS = 0x80
    LOCO = 0xE0
    INTERFACE = 0xF0

    def __repr__(self):
        return self.value


class Status(IntEnum):
    """
    Commands will receive certain status responses. See page 7, section 1.5 (header code 0x00),
    and page 16, section 3.1.2 (header code 0x60)
    """
    OK = 0x00
    WRONG_NUMBER_OF_BYTES = 0x01
    TIMEOUT = 0x02
    SENT = 0x04
    NOT_ADDRESSING = 0x05
    BUFFER_OVERFLOW = 0x06
    ADDRESSING_AGAIN = 0x07
    UNABLE_TO_RECEIVE = 0x08
    INVALID_PARAMETER = 0x09
    UNKNOWN_ERROR = 0x0A
    READY = 0x11
    SHORT_CIRCUIT = 0x12
    NOT_FOUND = 0x13
    BUSY = 0x1F


class AccessoryKind(IntEnum):
    OUTPUT_WITHOUT_FEEDBACK = 0
    OUTPUT_WITH_FEEDBACK = 1
    INPUT = 2
    RESERVED = 3


class AccessoryStateMessage:
    def __init__(self, bytes=None):
        self.address = 0
        self.undetermined = True
        self.kind = AccessoryKind.RESERVED
        self.nibble = 0
        self.state = [0, 0, 0, 0]

        if bytes is not None:
            self.address = bytes[0]
            self.undetermined = bytes[1] & 0b1000000 != 0
            self.kind = AccessoryKind(bytes[1] >> 5 & 0b11)
            self.nibble = (bytes[1] >> 4) & 0b1
            self.state = list(1 if ((bytes[1] & (1 << i)) != 0) else 0 for i in range(4))

    def __repr__(self):
        return f"{type(self).__name__}<addr={self.address}, {self.kind}, nibble={self.nibble}, {self.state}>"


class TrackStatus(IntEnum):
    TRACK_OFF = 0x00,
    TRACK_ON = 0x01,
    PROGRAMMING = 0x02


class TrackStatusMessage:
    def __init__(self, state):
        self.state = TrackStatus(state)

    def __repr__(self):
        return f"{type(self).__name__}<{str(self.state)}>"


class XpressNetException(Exception):
    pass


class XpressNetCommandResult:
    def __init__(self, code, status, data=None):
        self.code = Command(code)
        self.status = Status(status)
        self.data = data if data else bytearray()

    def __repr__(self):
        return f"{type(self).__name__}<{str(self.code)}({str(self.status)})>"


class XpressNetProgrammingResult:
    def __init__(self, cv, value):
        self.cv = cv
        self.value = value


class XpressNet:
    def __init__(self):
        self.serial_port = None
        self.last_broadcast = None
        self.debug_line = False
        self.track_status = TrackStatus.TRACK_OFF

    def connection_open(self, device, baudrate):
        """
        Open a connection to the XpressNet controller over serial.
        :param device: The serial device (e.g., '/dev/ttyACM0')
        :param baudrate: The baud rate for the serial connection (e.g., 9600)
        """
        logging.debug("Opening serial connection")
        self.serial_port = serial.Serial(device, baudrate, timeout=1)
        self.serial_port.flushInput()  # Clear input buffer

    def close(self):
        """
        Close the serial connection.
        """
        if self.serial_port and self.serial_port.is_open:
            logging.debug("Closing serial connection")
            self.serial_port.close()

    def send(self, data):
        """
        Send data to the XpressNet controller over serial.
        :param data: Bytearray of data to send
        """
        buffer = bytearray([0xFF, 0xFE])
        buffer.extend(data)
        buffer.append(reduce(lambda r, v: r ^ v, data))
        if self.debug_line:
            logging.debug(f"Sending {len(buffer)}: {self.__hex(buffer)}")
        self.serial_port.write(buffer)

    def __read(self, length, retries=3, retry_delay=1):
        """
        Read a specified number of bytes from the serial port with retries.
        :param length: Number of bytes to read.
        :param retries: Number of times to retry if the read fails.
        :param retry_delay: Delay in seconds between retries.
        :return: Bytearray of received data.
        """
        for attempt in range(retries):
            data = self.serial_port.read(length)
            if len(data) == length:
                if self.debug_line:
                    logging.debug(f"Received {len(data)}: {self.__hex(data)}")
                return data
            else:
                logging.warning(f"Expected {length} bytes, got {len(data)} on attempt {attempt + 1}")
                time.sleep(retry_delay)

        raise XpressNetException(f"Expected {length} bytes, got {len(data)} after {retries} attempts")

    def __get_status(self, cmd, is_broadcast, code, length, data):
        # response is a regular message
        if code == Command.INTERFACE_STATUS:
            # communication error: page 7, section 1.5
            # interface version number: page 9, section 1.6
            if cmd == Command.INTERFACE:
                return XpressNetCommandResult(code, Status.OK, data)
            if len(data) != 1:
                raise XpressNetException(f"unexpected response data 0x{self.__hex(data)}")
            return XpressNetCommandResult(code, data[0])
        elif code == Command.STATUS:
            if is_broadcast:
                if len(data) != 1:
                    raise XpressNetException(f"Unknown response 0x{self.__hex(data)}")
                return TrackStatusMessage(data[0])
            if not len(data) == 3:
                raise XpressNetException(f"Invalid programming response 0x{self.__hex(data)}")
            (subcode, cv, value) = data[0:3]
            if subcode == 0x10:
                # programming mode response data 3 bytes: page 17, section 3.1.2.5
                return XpressNetProgrammingResult(cv, value)
            elif subcode == 0x14:
                # programming mode response data 4 bytes, CV 1-255, CV1024: page 18, section 3.1.2.6
                if cv == 0:
                    return XpressNetProgrammingResult(1024, value)
                else:
                    return XpressNetProgrammingResult(cv, value)
            elif subcode == 0x15:
                # programming mode response data 4 bytes, CV 256-511: page 19, section 3.1.2.7
                return XpressNetProgrammingResult(cv + 256, value)
            elif subcode == 0x16:
                # programming mode response data 4 bytes, CV 512-767: page 19, section 3.1.2.8
                return XpressNetProgrammingResult(cv + 512, value)
            elif subcode == 0x17:
                # programming mode response data 4 bytes, CV 768-1023: page 20, section 3.1.2.9
                return XpressNetProgrammingResult(cv + 768, value)
            else:
                raise XpressNetException(f"Unknown programming response code 0x{code:02X}/{subcode:02X}")
        elif code == Command.INTERFACE:
            (subcode,) = data[0:1]
            if subcode in (0x01, 0x02, 0x03):
                return XpressNetCommandResult(code, Status.OK, data[1:])
            else:
                raise XpressNetException(f"Unknown interface status response 0x{subcode:02X}")
        elif code == Command.ACCESSORY_REPORT:
            return AccessoryStateMessage(data)
        else:
            raise XpressNetException(f"Unknown response code 0x{code:02X}")

    def __handle_response(self, cmd, retries=3, retry_delay=1):
        for attempt in range(retries):
            try:
                bytes = self.__read(3)
                (preamble, header) = struct.unpack("!HB", bytes)
                code = Command(header & 0xF0)
                length = header & 0x0F  # the length, without the command code
                data = self.__recv_checksummed_data(header, length)
                if preamble == 0xFFFE:
                    return self.__get_status(cmd, False, code, length, data)
                if preamble == 0xFFFD:
                    # broadcast message: page 13, chapter 3
                    s = self.__get_status(cmd, True, code, length, data)
                    if type(s) == TrackStatusMessage:
                        self.track_status = s.state
                    logging.debug(f"broadcast: {self.last_broadcast}")
                    self.last_broadcast = s
                    return s
                raise XpressNetException(f"Unknown response data 0x{preamble:04X}")
            except (struct.error, XpressNetException) as e:
                logging.warning(f"Attempt {attempt + 1} failed with error: {e}")
                time.sleep(retry_delay)
        raise XpressNetException(f"Failed to handle response after {retries} attempts")

    def __recv_checksummed_data(self, previous, length):
        """
        Receive the desired amount of data bytes. Raises exception if the checksum is not correct.
        :param previous: previous bytearray data to include in checksum calculation
        :param length: data bytes (excluding checksum byte)
        :return: bytearray of received data
        """
        length = length + 1
        data = self.__read(length)
        if len(data) != length:
            raise XpressNetException(f"Expected {length} bytes, got {len(data)}")
        if type(previous) == int:
            previous = bytearray([previous])
        self.__checksum(previous + data[0:-1], data[-1])
        return data[0:-1]

    def __checksum(self, data, sum):
        if reduce(lambda r, v: r ^ v, data) != sum:
            raise XpressNetException(f"Checksum error: 0x{sum:02X} for 0x{self.__hex(data)}")

    def __hex(self, data):
        return ''.join(f'{c:02X}' for c in data)

    def __bcd(self, data):
        return f"{data >> 4}.{data & 0x0F}"

    def cmd(self, cmd, params=None, expected=None, send_retries=3, receive_retries=3, retry_delay=1):
        """
        Send a command and handle response with retries.
        :param cmd: The command to send.
        :param params: The parameters for the command.
        :param expected: The expected command response.
        :param send_retries: Number of times to retry sending the command if no response is received.
        :param receive_retries: Number of times to retry reading the response if no data is received.
        :param retry_delay: Delay in seconds between retries.
        :return: The response data.
        """
        cmd = Command(cmd & 0xF0)
        params = params if params else bytearray()
        if expected is None:
            expected = cmd

        for attempt in range(send_retries):
            self.send(bytearray([cmd | len(params)]) + bytearray(params))
            try:
                data = self.__handle_response(cmd, retries=receive_retries, retry_delay=retry_delay)
                logging.debug(f"{str(cmd)}({self.__hex(params)}): {str(data.status)} = {self.__hex(data.data)}")

                if data.code == 0:
                    # non-immediate response, data contains specifics
                    return data
                if data.code != expected:
                    raise XpressNetException(f"Response code 0x{data.code:02X} != 0x{expected:02X}")
                return data
            except XpressNetException as e:
                logging.warning(f"Attempt {attempt + 1} failed with error: {e}")
                time.sleep(retry_delay)
        raise XpressNetException(f"Failed to get response after {send_retries} attempts")

    def receive_one(self):
        self.__handle_response(None)

    def get_xpressnet_interface_version(self):
        """
        The version of XpressNet supported by the interface
        page 9, section 1.6
        :return: string from the BCD encoded version number
        """
        r = self.cmd(Command.INTERFACE, expected=0x00)
        if len(r.data) != 2:
            raise XpressNetException("Invalid response")
        return f"{self.__bcd(r.data[0])}, {self.__bcd(r.data[1])}"

    def get_xpressnet_interface_status(self):
        """
        Is the interface communicating with the command station?
        page 11, section 2.1
        :return:
        """
        r = self.cmd(Command.INTERFACE, [0x01])
        if len(r.data) != 1:
            raise XpressNetException("Invalid response")
        return r.data[0] & 0x01 == 1

    def get_xpressnet_version(self):
        """
        The version of XpressNet supported by the interface.
        page 11, section 2.1
        :return: string from the BCD encoded version number
        """
        r = self.cmd(Command.INTERFACE, [0x02])
        if len(r.data) != 1:
            raise XpressNetException("Invalid response")
        return self.__bcd(r.data[0])

    def get_xpressnet_available_connections(self):
        """
        The number of concurrent network connections that can be made to this interface.
        page 11, section 2.1
        :return: string from the BCD encoded version number
        """
        r = self.cmd(Command.INTERFACE, [0x03])
        if len(r.data) != 1:
            raise XpressNetException("Invalid response")
        return r.data[0]

    def get_xpressnet_interface_address(self):
        """
        The number of concurrent network connections that can be made to this interface.
        page 10, section 1.7
        :return: address as integer
        """
        r = self.cmd(Command.INTERFACE, [0x01, 0])
        if len(r.data) != 1:
            raise XpressNetException("Invalid response")
        return r.data[0]

    def get_last_broadcast(self):
        return self.last_broadcast

    def set_all_off(self):
        """
        Turn off power to the tracks.
        :return:
        """
        self.cmd(Command.PROGRAMMING, [0x80])

    def set_all_on(self):
        """
        Turn power on to the tracks.
        :return:
        """
        self.cmd(Command.PROGRAMMING, [0x81])

    def set_loco_function(self, address, function, state):
        """
        Set a locomotive function on or off.
        :param address: The locomotive address (e.g., 3)
        :param function: The function number (e.g., 1)
        :param state: The state to set (0 for off, 1 for on)
        """
        command = Command.LOCO | 0x04  # LOCO function command

        # Function command data format: [address high byte, address low byte, function command byte]
        params = [
            (address >> 8) & 0x3F,  # High byte of address
            address & 0xFF,          # Low byte of address
            0x80 | ((function & 0x1F) << 1) | (state & 0x01)  # Function command
        ]

        # Send the command
        return self.cmd(command, params)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    x = XpressNet()
    x.connection_open('/dev/ttyACM0', 9600)  # Open the serial connection

    logging.info(f"Interface version: {x.get_xpressnet_interface_version()}")
    logging.info(f"Interface address: {x.get_xpressnet_interface_address()}")
    logging.info(f"Interface is connected to Command Station: {x.get_xpressnet_interface_status()}")
    logging.info(f"Interface supports XpressNet version: {x.get_xpressnet_version()}")
    logging.info(f"Interface available connections: {x.get_xpressnet_available_connections()}")

    while True:
        x.receive_one()  # Example of listening for responses

    x.close()  # Close the connection when done