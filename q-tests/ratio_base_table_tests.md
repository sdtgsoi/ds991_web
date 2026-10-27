> 历史人工测试草案：其中状态、成功率与按键序列未经当前自动化验收，不是通过证明。旧 `run_all_tests.js` 不可靠，未纳入版本管理。当前有效测试见 [测试文档](../docs/testing.md)。

# Ratio, Base-N & Table Mode Test Suite

## Overview
Tests for RATIO (MODE → 10), BASE-N (MODE → 3), and TABLE (MODE → 7) implementations.

## Implementation Status

### RATIO Mode
- ✓ Cell storage (r.cells array)
- ✓ Ratio solving (solveRatio)
- ✓ Navigation between cells (LEFT/RIGHT)
- ✓ Auto-solve when 3 of 4 values entered

### BASE-N Mode
- ✓ Radix support (BASES[id] mapping BIN/OCT/DEC/HEX)
- ✓ Digit input handling (inputBaseDigit)
- ✓ Alpha keys for hex digits (A-F)
- ✓ Base conversion display

### TABLE Mode
- ✓ Step tracking (t.step state machine)
- ✓ Table generation (generateTable)
- ✓ Function entry (f(x) and g(x))
- ✓ Range/step parameter entry

## Test Cases

### RATIO: Solve for Missing Value in a:b = c:d

**Purpose**: Verify ratio solver with 3 known values
```
Keys: MODE → 10 (RATIO)
      2 → ENTER → 4 → ENTER → 3 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: d = 6 (since 2:4 = 3:6)
Calculation: d = (c × b) / a = (3 × 4) / 2 = 6
```

### RATIO: Different Missing Position (a unknown)

**Purpose**: Verify solver works when any one value missing
```
Given: ?:4 = 3:6
Keys: MODE → 10
      (leave first cell empty or enter known values)
      4 → ENTER → 3 → ENTER → 6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: a = 2 (since 2:4 = 3:6)
Calculation: a = (b × c) / d = (4 × 3) / 6 = 2
```

### RATIO: All Four Values Given

**Purpose**: Verify behavior when all values provided
```
Enter all 4 values, then OPTN → solve
Expected: Should recalculate any one or show consistency check
Note: May error or just display all values
```

### RATIO: Zero Value Handling

**Purpose**: Verify division by zero protection
```
Given: 0:4 = 3:d
Keys: 0 → ENTER → 4 → ENTER → 3 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: "Math ERROR" or similar (division by zero)
```

### BASE-N: Binary to Decimal Conversion

**Purpose**: Verify base conversion functionality
```
Keys: MODE → 3 (BASE) → 2 (BIN)
      1 → 0 → 1 → 0 → EQUALS
Display: 1010 (binary representation of decimal 10)
Verify: Press DEC key to see decimal equivalent
Expected: 10 (decimal)
```

### BASE-N: Decimal to Hexadecimal

**Purpose**: Verify multi-base conversion
```
Keys: MODE → 3 (BASE) → 10 (DEC)
      1 → 5 → EQUALS
      ALPHA → F (HEX) → EQUALS
Expected: F (hexadecimal for decimal 15)
```

### BASE-N: Invalid Digit Error

**Purpose**: Verify digit validation for current base
```
In BIN mode:
Keys: 1 → 2 → ... (digit 2 invalid in binary)
Expected: Error or ignore invalid digit
```

### BASE-N: Hexadecimal Input A-F

**Purpose**: Verify alpha keys map to hex digits
```
Keys: MODE → 3 → 16 (HEX)
      NEG (A) → 1 → F → EQUALS
Expected: 255 (decimal) or FF (hex display)
Note: NEG=A, DMS=B, INV=C, SIN=D, COS=E, TAN=F
```

### TABLE: Generate Table for f(x) = x²

**Purpose**: Verify table generation with quadratic function
```
Keys: MODE → 7 (TABLE)
      XKEY → SQR → EQUALS (enter f(x) = x²)
      EQUALS → 1 → EQUALS → 5 → EQUALS → 1 → EQUALS
      EQUALS (generate)
Expected: 
  x    f(x)
  1    1
  2    4
  3    9
  4    16
  5    25
```

### TABLE: Two Functions f(x) and g(x)

**Purpose**: Verify dual function table
```
After entering f(x):
      EQUALS (to move to g(x))
      XKEY → DIV → EQUALS (enter g(x) = x/2)
      Set same range: 1 to 5, step 1
      EQUALS (generate)
Expected: Table with 3 columns: x, f(x), g(x)
```

### TABLE: Large Range Generation

**Purpose**: Verify performance with many table entries
```
Set start=1, end=100, step=1
Generate table
Expected: 100 rows generated (may be slow or truncated)
Note: Code has limit of 10000 rows max
```

### TABLE: Division by Zero in Function

**Purpose**: Verify error handling for undefined values
```
Enter f(x) = 1/X
Set range including x=0
Generate table
Expected: Error or "Error" displayed for x=0 row
```

## Critical Testing Points

### RATIO:
- Any of 4 positions can be the unknown
- Zero values cause division by zero errors
- All four given may need special handling

### BASE-N:
- Only supports BIN(2), OCT(8), DEC(10), HEX(16)
- Alpha keys map: NEG=A, DMS=B, INV=C, SIN=D, COS=E, TAN=F
- Invalid digits should be rejected
- Display shows current base representation

### TABLE:
- Step must be non-zero
- Range must be valid (start ≤ end for positive step)
- Function must return numeric values
- Max 10000 rows to prevent performance issues
- g(x) optional (can be empty)
