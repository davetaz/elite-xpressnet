import logging
import struct
import sys
import serial  # Import pySerial module
import time  # Import time module for retry delays

from enum import IntEnum
from functools import reduce


class Command(IntEnum):
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
        self.track_status = None

    def connection_open(self, device, baudrate):
        logging.debug("Opening serial connection")
        self.serial_port = serial.Serial(device, baudrate, timeout=1)
        self.serial_port.flushInput()  # Clear input buffer

    def close(self):
        if self.serial_port and self.serial_port.is_open:
            logging.debug("Closing serial connection")
            self.serial_port.close()

    def send(self, data):
        buffer = bytearray([0xFF, 0xFE])
        buffer.extend(data)
        buffer.append(reduce(lambda r, v: r ^ v, data))
        if self.debug_line:
            logging.debug(f"Sending {len(buffer)}: {self.__hex(buffer)}")
        self.serial_port.write(buffer)

    def __read(self, length, retries=3, retry_delay=1):
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

    def __checksum(self, data, sum):
        if reduce(lambda r, v: r ^ v, data) != sum:
            raise XpressNetException(f"Checksum error: 0x{sum:02X} for 0x{self.__hex(data)}")

    def __hex(self, data):
        return ''.join(f'{c:02X}' for c in data)

    def cmd(self, cmd, params=None, expected=None, send_retries=3, receive_retries=3, retry_delay=1):
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
                    return data
                if data.code != expected:
                    raise XpressNetException(f"Response code 0x{data.code:02X} != 0x{expected:02X}")
                return data
            except XpressNetException as e:
                logging.warning(f"Attempt {attempt + 1} failed with error: {e}")
                time.sleep(retry_delay)
        raise XpressNetException(f"Failed to get response after {send_retries} attempts")

    def __handle_response(self, cmd, retries=3, retry_delay=1):
        for attempt in range(retries):
            try:
                bytes = self.__read(3)
                (preamble, header) = struct.unpack("!HB", bytes)
                code = Command(header & 0xF0)
                length = header & 0x0F
                data = self.__recv_checksummed_data(header, length)
                if preamble == 0xFFFE:
                    return self.__get_status(cmd, False, code, length, data)
                if preamble == 0xFFFD:
                    return self.__get_status(cmd, True, code, length, data)
                raise XpressNetException(f"Unknown response data 0x{preamble:04X}")
            except (struct.error, XpressNetException) as e:
                logging.warning(f"Attempt {attempt + 1} failed with error: {e}")
                time.sleep(retry_delay)
        raise XpressNetException(f"Failed to handle response after {retries} attempts")

    def __recv_checksummed_data(self, previous, length):
        length = length + 1
        data = self.__read(length)
        if len(data) != length:
            raise XpressNetException(f"Expected {length} bytes, got {len(data)}")
        if type(previous) == int:
            previous = bytearray([previous])
        self.__checksum(previous + data[0:-1], data[-1])
        return data[0:-1]

    def __get_status(self, cmd, is_broadcast, code, length, data):
        if code == Command.INTERFACE_STATUS:
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
                return XpressNetProgrammingResult(cv, value)
            elif subcode == 0x14:
                if cv == 0:
                    return XpressNetProgrammingResult(1024, value)
                else:
                    return XpressNetProgrammingResult(cv, value)
            elif subcode == 0x15:
                return XpressNetProgrammingResult(cv + 256, value)
            elif subcode == 0x16:
                return XpressNetProgrammingResult(cv + 512, value)
            elif subcode == 0x17:
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

    def set_loco_function(self, address, function, state):
        command = Command.LOCO | 0x04

        params = [
            (address >> 8) & 0x3F,
            address & 0xFF,
            0x80 | ((function & 0x1F) << 1) | (state & 0x01)
        ]

        return self.cmd(command, params)


class AccessoryStateMessage:
    def __init__(self, bytes=None):
        self.address = 0
        self.undetermined = True
        self.kind = None
        self.nibble = 0
        self.state = [0, 0, 0, 0]

        if bytes is not None:
            self.address = bytes[0]
            self.undetermined = bytes[1] & 0b1000000 != 0
            self.kind = (bytes[1] >> 5) & 0b11
            self.nibble = (bytes[1] >> 4) & 0b1
            self.state = list(1 if ((bytes[1] & (1 << i)) != 0) else 0 for i in range(4))

    def __repr__(self):
        return f"{type(self).__name__}<addr={self.address}, kind={self.kind}, nibble={self.nibble}, state={self.state}>"


class TrackStatus(IntEnum):
    TRACK_OFF = 0x00,
    TRACK_ON = 0x01,
    PROGRAMMING = 0x02


class TrackStatusMessage:
    def __init__(self, state):
        self.state = TrackStatus(state)

    def __repr__(self):
        return f"{type(self).__name__}<{str(self.state)}>"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    x = XpressNet()
    x.connection_open('/dev/ttyACM0', 9600)  # Open the serial connection

    try:
        # Attempt to turn function 0 (usually lights) on for loco address 3
        result = x.set_loco_function(3, 0, 1)

        # Log the result of the command
        logging.info(f"Command Result: {result}")

    except XpressNetException as e:
        logging.error(f"Failed to execute command: {e}")

    finally:
        x.close()  # Close the connection when done