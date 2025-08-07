import sys
import base64
import struct
import binascii
from typing import List, Optional, Tuple, Literal
from urllib.parse import unquote

# --- Configuration ---
DEBUG_PRINTING = True

# --- Classes ---
class MigrationPayload:
    """
    Represents the overall migration payload structure.
    Contains a list of accounts.
    """
    def __init__(self, accounts: List['Account']):
        self.accounts = accounts

    def __repr__(self):
        return f"MigrationPayload(accounts={self.accounts})"

class Account:
    """
    Represents an individual account (OtpParameters) within the migration payload.
    """
    def __init__(self, secret: bytes, name: Optional[str], issuer: Optional[str], algorithm: int, digits: int, type: int, counter: Optional[int]):
        self.secret = secret          # Tag 1: bytes
        self.name = name              # Tag 2: string (account name/email)
        self.issuer = issuer          # Tag 3: string (service name)
        self.algorithm = algorithm    # Tag 4: enum (0:SHA1, 1:SHA256, 2:SHA512)
        self.digits = digits          # Tag 5: enum (0: unspecified, 1: SIX, 2: EIGHT) -> map to 6/8 digits
        self.type = type              # Tag 6: enum (0: unspecified, 1: TOTP, 2: HOTP) -> map to 0/1 internal type
        self.counter = counter        # Tag 7: int64 (only for HOTP)

    def __repr__(self):
        # Map enums to more descriptive names for representation
        algo_map = {0: "SHA1", 1: "SHA256", 2: "SHA512"}
        # Map internal enum to actual digit count
        digits_map = {1: 6, 2: 8}
        # Map internal enum to type name
        type_map = {1: "TOTP", 2: "HOTP"}

        # Get mapped values or provide defaults/unknown placeholders
        algo_str = algo_map.get(self.algorithm, f"Unknown ({self.algorithm})")
        digits_val = digits_map.get(self.digits, f"Unknown ({self.digits})") # Protobuf uses 1 for 6, 2 for 8
        type_str = type_map.get(self.type, f"Unknown ({self.type})") # Protobuf uses 1 for TOTP, 2 for HOTP

        return (f"Account(name='{self.name}', issuer='{self.issuer}', secret=..., "
                f"algorithm={algo_str}, digits={digits_val}, type={type_str}, "
                f"counter={self.counter if self.counter is not None else 'N/A'})")

# --- Parsing Functions ---
def _decode_varint(data: bytes, offset: int) -> Tuple[int, int]:
    """
    Decodes a variable-length integer (varint) from the given byte array.
    Varints are a method of serializing integers using one or more bytes.
    Smaller numbers take a smaller number of bytes.

    Args:
        data: The byte array containing the varint.
        offset: The starting offset within the byte array.

    Returns:
        A tuple containing the decoded integer and the new offset after the varint.

    Raises:
        ValueError: If the varint is malformed or exceeds 10 bytes (max for 64-bit).
    """
    result = 0
    shift = 0
    i = offset
    start_offset = offset # Keep track for error messages
    while i < len(data):
        byte = data[i]
        # Take the lower 7 bits of the byte and shift them into the result
        result |= (byte & 0x7f) << shift
        shift += 7
        i += 1
        # Check the most significant bit (MSB). If it's 0, this is the last byte.
        if not (byte & 0x80):
            if DEBUG_PRINTING: print(f"    _decode_varint: Read {i-start_offset} bytes from offset {start_offset}, value={result}, new_offset={i}")
            return result, i
        # Protect against excessively long varints (more than 10 bytes for 64-bit)
        if shift >= 70:
            raise ValueError(f"Varint starting at offset {start_offset} is too long (max 10 bytes)")
    # If we reach here, the data ended unexpectedly mid-varint
    raise ValueError(f"Incomplete varint starting at offset {start_offset}")

def _parse_account(data: bytes, offset: int, length: int) -> Tuple[Account, int]:
    """
    Parses a single account's data (OtpParameters message) from the byte array
    based on its protobuf structure. Each account is represented as a sequence
    of tagged fields.

    Args:
        data: The byte array containing the account data.
        offset: The starting offset of the account data within the larger payload.
        length: The length of this specific account's data.

    Returns:
        A tuple containing the parsed Account object and the new offset after this account.

    Raises:
        ValueError: If required fields (like secret) are missing or if a field's
                    length extends beyond the account's boundary.
        UnicodeDecodeError: If name or issuer fields contain invalid UTF-8 data.
    """
    end_offset = offset + length
    if DEBUG_PRINTING: print(f"  _parse_account: Parsing account from offset {offset} to {end_offset} (length {length})")

    # Initialize fields with defaults or None
    secret = None
    name = None
    issuer = None
    # Use Protobuf enum values as defaults (0 often means unspecified)
    algorithm = 0  # Algorithm.ALGO_UNSPECIFIED
    digits = 1     # DigitCount.DIGIT_COUNT_SIX (default if not specified)
    type = 1       # OtpType.OTP_TYPE_TOTP (default if not specified)
    counter = None # Only relevant for HOTP

    # Iterate through the fields within the account data
    current_offset = offset
    while current_offset < end_offset:
        field_start_offset = current_offset
        if DEBUG_PRINTING: print(f"    Field loop: current_offset={current_offset}, end_offset={end_offset}")
        # Each field starts with a tag (field number + wire type) encoded as a varint
        tag_val, current_offset = _decode_varint(data, current_offset)
        field_number = tag_val >> 3
        wire_type = tag_val & 0x07
        if DEBUG_PRINTING: print(f"      Read tag: value={tag_val} (field={field_number}, wire_type={wire_type}) at offset {field_start_offset}")

        # Process based on field number and wire type
        # Most fields in OtpParameters are wire type 2 (length-delimited) or 0 (varint)
        field_data = b''
        field_length = 0 # For length-delimited fields

        if wire_type == 2: # Length-delimited (string, bytes)
            field_length, current_offset = _decode_varint(data, current_offset)
            field_end = current_offset + field_length
            if DEBUG_PRINTING: print(f"      Wire type 2: field_length={field_length}, field_end={field_end}")

            # Sanity check: ensure the field doesn't overrun the account's boundary
            if field_end > end_offset:
                raise ValueError(f"Field {field_number} length {field_length} exceeds account boundary ({end_offset}) at offset {current_offset}")

            # Extract the actual data for this field
            field_data = data[current_offset:field_end]
            # Move the offset past this field's data
            current_offset = field_end
            if DEBUG_PRINTING: print(f"      Extracted {field_length} bytes for field {field_number}. New offset={current_offset}")

        elif wire_type == 0: # Varint (enum, int32, int64)
            varint_val, current_offset = _decode_varint(data, current_offset)
            if DEBUG_PRINTING: print(f"      Wire type 0: varint_value={varint_val}. New offset={current_offset}")
            # Store the varint value directly for processing below
            field_data = varint_val # Use the decoded integer

        else:
            # Handle other wire types if necessary, or raise error for unexpected types
            raise ValueError(f"Unsupported wire type {wire_type} for field {field_number} at offset {field_start_offset}")


        # Process the extracted data based on the field number
        if field_number == 1:  # Secret (bytes, wire type 2)
            secret = field_data
            if DEBUG_PRINTING: print(f"        -> Field 1 (Secret): {len(field_data)} bytes")
        elif field_number == 2:  # Name (string, wire type 2)
            try:
                name = field_data.decode('utf-8')
                if DEBUG_PRINTING: print(f"        -> Field 2 (Name): '{name}'")
            except UnicodeDecodeError:
                print(f"Warning: Could not decode name field as UTF-8. Raw bytes: {field_data}")
                name = f"Invalid UTF-8 ({len(field_data)} bytes)"
        elif field_number == 3:  # Issuer (string, wire type 2)
            try:
                issuer = field_data.decode('utf-8')
                if DEBUG_PRINTING: print(f"        -> Field 3 (Issuer): '{issuer}'")
            except UnicodeDecodeError:
                print(f"Warning: Could not decode issuer field as UTF-8. Raw bytes: {field_data}")
                issuer = f"Invalid UTF-8 ({len(field_data)} bytes)"
        elif field_number == 4:  # Algorithm (enum, wire type 0 - varint)
             algorithm = field_data # field_data holds the varint value
             if DEBUG_PRINTING: print(f"        -> Field 4 (Algorithm): {algorithm}")
        elif field_number == 5:  # Digits (enum, wire type 0 - varint)
             digits = field_data # field_data holds the varint value
             if DEBUG_PRINTING: print(f"        -> Field 5 (Digits): {digits}")
        elif field_number == 6:  # Type (enum, wire type 0 - varint)
             type = field_data # field_data holds the varint value
             if DEBUG_PRINTING: print(f"        -> Field 6 (Type): {type}")
        elif field_number == 7:  # Counter (int64, wire type 0 - varint)
             counter = field_data # field_data holds the varint value
             if DEBUG_PRINTING: print(f"        -> Field 7 (Counter): {counter}")
        else:
             print(f"Warning: Unknown field number {field_number} encountered.")

    # After loop, check if offset matches expected end
    if current_offset != end_offset:
         print(f"Warning: Parsing account ended at offset {current_offset}, but expected end was {end_offset}")

    # The secret is essential for generating OTP codes
    if secret is None:
        raise ValueError("Missing required field: secret (field 1) in account data")

    internal_algo_map = {1: 0, 2: 1, 3: 2}
    internal_digits = digits
    internal_type_map = {1: 1, 2: 0}

    final_algorithm = internal_algo_map.get(algorithm, 0)
    final_digits = internal_digits
    final_type = internal_type_map.get(type, 0)

    return Account(secret, name, issuer, final_algorithm, final_digits, final_type, counter), current_offset


def parse_migration_payload(data: bytes) -> MigrationPayload:
    """
    Parses the entire migration payload (MigrationPayload message), which contains
    a list of OtpParameters messages (accounts).

    Args:
        data: The byte array containing the complete migration payload.

    Returns:
        A MigrationPayload object containing a list of parsed Account objects.

    Raises:
        ValueError: If the data is empty, malformed (e.g., unexpected tags),
                    or doesn't contain any valid accounts.
        Exception: For other unexpected errors during parsing.
    """
    try:
        if not data:
            raise ValueError("Cannot parse empty input data")
        if DEBUG_PRINTING: print(f"parse_migration_payload: Starting parse of {len(data)} bytes.")

        offset = 0
        accounts = []
        payload_end = len(data)
        # Loop through the payload data, expecting repeated OtpParameters fields
        while offset < payload_end:
            field_start_offset = offset
            if DEBUG_PRINTING: print(f"Outer loop: current_offset={offset}, payload_end={payload_end}")
            # Expect tag for field 1 (otp_parameters), wire type 2 (length-delimited)
            # Tag value = (field_number << 3) | wire_type = (1 << 3) | 2 = 8 | 2 = 10 (0x0a)
            tag_val, offset = _decode_varint(data, offset)
            field_number = tag_val >> 3
            wire_type = tag_val & 0x07
            if DEBUG_PRINTING: print(f"  Read outer tag: value={tag_val} (field={field_number}, wire_type={wire_type}) at offset {field_start_offset}")

            # Check if the tag indicates an OtpParameters message
            if field_number == 1 and wire_type == 2:
                # Get the length of the embedded OtpParameters message data
                length, offset = _decode_varint(data, offset)
                if DEBUG_PRINTING: print(f"  Found Account (OtpParameters) message of length {length} at offset {offset}")

                # Parse the individual account using the dedicated function
                account, account_end_offset = _parse_account(data, offset, length)
                accounts.append(account)
                # Ensure the offset is correctly updated past the parsed account
                offset = account_end_offset # Use the offset returned by _parse_account
                if DEBUG_PRINTING: print(f"  Finished parsing account. New offset={offset}")
            elif field_number == 2 and wire_type == 0: # Field 2: version (int32)
                 version, offset = _decode_varint(data, offset) # Read version varint
                 if DEBUG_PRINTING: print(f"  Found Version field: {version}. New offset={offset}")
            elif field_number == 3 and wire_type == 0: # Field 3: batch_size (int32)
                 batch_size, offset = _decode_varint(data, offset) # Read batch_size varint
                 if DEBUG_PRINTING: print(f"  Found Batch Size field: {batch_size}. New offset={offset}")
            elif field_number == 4 and wire_type == 0: # Field 4: batch_index (int32)
                 batch_index, offset = _decode_varint(data, offset) # Read batch_index varint
                 if DEBUG_PRINTING: print(f"  Found Batch Index field: {batch_index}. New offset={offset}")
            elif field_number == 5 and wire_type == 0: # Field 5: batch_id (int32)
                 batch_id, offset = _decode_varint(data, offset) # Read batch_id varint
                 if DEBUG_PRINTING: print(f"  Found Batch ID field: {batch_id}. New offset={offset}")
            else:
                 # If it's not an expected field, we might have corrupt data or a different structure
                 raise ValueError(f"Unexpected tag value {tag_val} (field {field_number}, wire type {wire_type}) found at offset {field_start_offset} in outer payload.")


        # If after parsing, no accounts were found, the payload might be invalid or empty
        if not accounts:
            # Check if other fields like version were present but no accounts
             print("Warning: Payload parsed but contained no account entries.")
             # Depending on requirements, this could be an error or just an empty payload
             # raise ValueError("No accounts found in the provided migration payload")

        if DEBUG_PRINTING: print(f"parse_migration_payload: Finished parsing. Found {len(accounts)} accounts.")
        return MigrationPayload(accounts)
    except ValueError as ve:
        print(f"Value error during parsing: {ve}")
        raise
    except Exception as e:
        # Catch and report parsing errors for easier debugging
        print(f"Error parsing migration payload: {e}")
        # Re-raise the exception to signal failure
        raise

# --- Input Decoding ---
def decode_input(encoded_data: str) -> Tuple[bytes, Literal['base32', 'base64']]:
    """
    Decodes the input string, attempting Base32 first, then Base64.
    Handles URL decoding and padding.

    Args:
        encoded_data: The potentially URL-encoded, Base32 or Base64 string.

    Returns:
        A tuple containing the decoded bytes and the detected format ('base32' or 'base64').

    Raises:
        ValueError: If the input cannot be decoded as either Base32 or Base64.
    """
    if DEBUG_PRINTING: print(f"decode_input: Original encoded data: {encoded_data}")
    url_decoded_data = unquote(encoded_data)
    if DEBUG_PRINTING: print(f"decode_input: URL decoded data: {url_decoded_data}")

    decoded_bytes = None
    decoded_format = None

    # --- Attempt Base32 Decoding ---
    try:
        # Base32 requires padding to a multiple of 8 characters ('=')
        missing_padding_b32 = len(url_decoded_data) % 8
        if missing_padding_b32:
            padded_data_b32 = url_decoded_data + '=' * (8 - missing_padding_b32)
        else:
            padded_data_b32 = url_decoded_data
        if DEBUG_PRINTING: print(f"decode_input: Attempting Base32 decode on: {padded_data_b32}")
        # Decode the base32 string into raw bytes. `casefold=True` handles mixed case.
        decoded_bytes = base64.b32decode(padded_data_b32, casefold=True)
        decoded_format = 'base32'
        if DEBUG_PRINTING: print(f"decode_input: Successfully decoded as Base32 ({len(decoded_bytes)} bytes).")
    except (binascii.Error, ValueError) as e_b32: # Catch potential errors like non-alphabet chars
        if DEBUG_PRINTING: print(f"decode_input: Base32 decoding failed: {e_b32}. Trying Base64...")
        # --- Attempt Base64 Decoding ---
        try:
            # Base64 requires padding to a multiple of 4 characters ('=')
            missing_padding_b64 = len(url_decoded_data) % 4
            if missing_padding_b64:
                padded_data_b64 = url_decoded_data + '=' * (4 - missing_padding_b64)
            else:
                padded_data_b64 = url_decoded_data
            if DEBUG_PRINTING: print(f"decode_input: Attempting Base64 decode on: {padded_data_b64}")
            # Base64 is case-sensitive, no casefold=True
            decoded_bytes = base64.b64decode(padded_data_b64)
            decoded_format = 'base64'
            if DEBUG_PRINTING: print(f"decode_input: Successfully decoded as Base64 ({len(decoded_bytes)} bytes).")
        except (binascii.Error, ValueError) as e_b64:
            if DEBUG_PRINTING: print(f"decode_input: Base64 decoding also failed: {e_b64}")
            raise ValueError("Input data is not valid Base32 or Base64") from e_b64
        except Exception as e_other_b64: # Catch other potential errors during b64 decode
             if DEBUG_PRINTING: print(f"decode_input: An unexpected error occurred during Base64 decoding: {e_other_b64}")
             raise ValueError("Input data is not valid Base32 or Base64") from e_other_b64

    if decoded_bytes is None or decoded_format is None:
         # This case should theoretically not be reached due to error handling above
         raise ValueError("Decoding failed unexpectedly.")

    if DEBUG_PRINTING:
        try:
            import hexdump
            print("--- Decoded Bytes Hexdump ---")
            hexdump.hexdump(decoded_bytes)
            print("-----------------------------")
        except ImportError:
            print("--- Decoded Bytes (Hex) ---")
            print(decoded_bytes.hex())
            print("---------------------------")


    return decoded_bytes, decoded_format

# --- Main Execution ---
def main(encoded_data: str):
    """
    Main execution function: decodes the input string (Base32 or Base64)
    and prints parsed Google Authenticator accounts.

    Args:
        encoded_data: The base32-or-base64-encoded migration data string,
                      potentially URL-encoded. Should *not* include the
                      "otpauth-migration://" prefix.
    """
    try:
        # --- Decoding Step (Handles Base32/Base64/URL) ---
        decoded_bytes, detected_format = decode_input(encoded_data)
        print(f"\nInput decoded using: {detected_format.upper()}")

        # --- Payload Parsing Step ---
        # Parse the raw bytes according to the protobuf structure
        print("Parsing migration payload...")
        payload = parse_migration_payload(decoded_bytes)
        print("Payload parsed successfully.")

        # --- Output Results ---
        print("\nParsed Accounts:")
        # Mappings based on Google's protobuf definition
        algo_map = {0: "SHA1", 1: "SHA256", 2: "SHA512"} # Mapped from internal 0/1/2
        digits_map = {1: 6, 2: 8} # Mapped from proto 1/2
        type_map = {0: "TOTP", 1: "HOTP"} # Mapped from internal 0/1

        if not payload.accounts:
             print("No accounts found in the payload.")
             return

        for i, account in enumerate(payload.accounts):
            print(f"--- Account {i+1} ---")
            print(f"  Name: {account.name if account.name else 'N/A'}")
            print(f"  Issuer: {account.issuer if account.issuer else 'N/A'}")
            # Encode the secret back to base32 for display consistency, regardless of input format
            # (NEVER expose raw secrets carelessly in production)
            secret_b32 = base64.b32encode(account.secret).decode('utf-8').rstrip('=')
            print(f"  Secret (Base32): {secret_b32}")
            print(f"  Algorithm: {algo_map.get(account.algorithm, f'Unknown ({account.algorithm})')}")
            print(f"  Digits: {digits_map.get(account.digits, f'Unknown ({account.digits})')}")
            print(f"  Type: {type_map.get(account.type, f'Unknown ({account.type})')}")
            # Only show counter if it's relevant (HOTP) and present
            if account.type == 1 and account.counter is not None: # Type 1 is HOTP internally now
                print(f"  Counter: {account.counter}")
            print("-" * 20)

    except (ValueError, binascii.Error) as e:
        # Handle specific errors related to decoding or parsing logic
        print(f"\nError: {e}")
        print("Please ensure the input is valid Google Authenticator migration data (Base32 or Base64 encoded, without the otpauth-migration:// prefix) and follows the expected format.")
        if DEBUG_PRINTING:
             import traceback
             traceback.print_exc() # Print full traceback for debugging
        sys.exit(1)
    except Exception as e:
        # Catch any other unexpected errors
        print(f"\nAn unexpected error occurred: {e}")
        import traceback
        traceback.print_exc() # Print full traceback for debugging
        sys.exit(1)

if __name__ == "__main__":
    # Ensure the script is called with exactly one argument (the encoded data)
    if len(sys.argv) != 2:
        print("Usage: python extract_otp_secret.py <encoded_data>")
        print("       <encoded_data> can be Base32 or Base64.")
        print("       Set DEBUG_PRINTING = True in the script for detailed logs.")
        print("Example (Base32): python extract_otp_secret.py GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")
        print("Example (Base64): python extract_otp_secret.py ClEKHGV4YW1wbGU6YWxpY2VAZXhhbXBsZS5jb20aB0V4YW1wbGUgASgBMAIQARgBIAEoAQ==") # Example B64
        sys.exit(1)

    # Get the encoded data from the command line argument
    encoded_data_arg = sys.argv[1]

    # Optional: Install hexdump for better debug output
    # try:
    #     import hexdump
    # except ImportError:
    #     print("Note: 'hexdump' module not found. Install with 'pip install python-hexdump' for better debug output.")

    main(encoded_data_arg)