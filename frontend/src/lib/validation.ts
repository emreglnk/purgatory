// Input validation helpers for secure transaction building

/**
 * Validates a Sui object ID format
 * @param id - Object ID string to validate
 * @returns The validated ID
 * @throws Error if the ID format is invalid
 */
export function validateObjectId(id: string): string {
  // Sui object IDs are 32 bytes (64 hex chars) prefixed with 0x
  if (!/^0x[a-fA-F0-9]{64}$/.test(id)) {
    throw new Error(`Invalid object ID format: ${id}`);
  }
  return id;
}

/**
 * Validates a Sui address format
 * @param address - Address string to validate
 * @returns The validated address
 * @throws Error if the address format is invalid
 */
export function validateAddress(address: string): string {
  // Sui addresses are 32 bytes (64 hex chars) prefixed with 0x
  if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }
  return address;
}

/**
 * Validates a Move type string format
 * @param type - Type string to validate (e.g., "0xPACKAGE::module::Type")
 * @returns The validated type string
 * @throws Error if the type format is invalid
 */
export function validateTypeString(type: string): string {
  // Format: 0xPACKAGE::module::Type
  // Allows generics like MyType<T> and nested types
  const typeRegex = /^0x[a-fA-F0-9]+::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_<>, ]*$/;
  
  if (!typeRegex.test(type)) {
    throw new Error(`Invalid type string format: ${type}`);
  }
  
  // Additional security checks
  if (type.length > 300) {
    throw new Error("Type string too long");
  }
  
  // Check for suspicious patterns (SQL injection attempts, etc.)
  const suspiciousPatterns = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'INSERT'];
  const upperType = type.toUpperCase();
  
  for (const pattern of suspiciousPatterns) {
    if (upperType.includes(pattern)) {
      throw new Error(`Suspicious pattern detected in type string: ${pattern}`);
    }
  }
  
  return type;
}

/**
 * Validates an array of items for batch operations
 * @param items - Array of items with id and type
 * @param maxBatchSize - Maximum allowed batch size (default: 50)
 * @returns The validated items array
 * @throws Error if validation fails
 */
export function validateBatchItems(
  items: Array<{ id: string; type: string }>,
  maxBatchSize: number = 50
): Array<{ id: string; type: string }> {
  if (items.length === 0) {
    throw new Error("Batch cannot be empty");
  }
  
  if (items.length > maxBatchSize) {
    throw new Error(`Batch size (${items.length}) exceeds maximum of ${maxBatchSize} items`);
  }
  
  // Validate each item
  const validatedItems = items.map((item, index) => {
    try {
      return {
        id: validateObjectId(item.id),
        type: validateTypeString(item.type),
      };
    } catch (error) {
      throw new Error(`Invalid item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  return validatedItems;
}

/**
 * Safely parse and validate a numeric amount
 * @param amount - Amount to validate (string or number)
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The validated amount as bigint
 * @throws Error if the amount is invalid
 */
export function validateAmount(
  amount: string | number | bigint,
  min: bigint = 0n,
  max: bigint = 1_000_000_000_000_000_000n // 1 billion SUI
): bigint {
  let parsed: bigint;
  
  try {
    parsed = BigInt(amount);
  } catch {
    throw new Error(`Invalid amount: ${amount}`);
  }
  
  if (parsed < min) {
    throw new Error(`Amount ${parsed} is below minimum ${min}`);
  }
  
  if (parsed > max) {
    throw new Error(`Amount ${parsed} exceeds maximum ${max}`);
  }
  
  return parsed;
}

