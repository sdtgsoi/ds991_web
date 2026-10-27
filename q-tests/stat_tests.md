> 历史人工测试草案：其中状态、成功率与按键序列未经当前自动化验收，不是通过证明。旧 `run_all_tests.js` 不可靠，未纳入版本管理。当前有效测试见 [测试文档](../docs/testing.md)。

# Statistics Mode Test Suite

## Overview
Tests for STAT mode (MODE → 6) implementation including 1-variable and 2-variable statistics, data entry, and calculations.

## Implementation Status
- ✓ Type selection (1var/2var)
- ✓ Data entry handler (handleStatInput)
- ✓ Statistical calculations (statCalc)
- ✓ Clear function (clr)
- ✓ Row/column navigation

## Test Cases

### 1. Select 1-Variable Statistics
**Purpose**: Verify mode selection
```
Keys: MODE → 6 (STAT) → 1
Expected: 1-variable statistics mode active
```

### 2. Enter Dataset: 10, 20, 30, 40, 50
**Purpose**: Verify data entry process
```
Keys: 10 → ENTER → 20 → ENTER → 30 → ENTER → 40 → ENTER → 50 → ENTER
Expected: All 5 values entered successfully
```

### 3. Calculate Mean (x̄)
**Purpose**: Verify mean calculation
```
Keys: OPTN → calc → 1 → EQUALS
Expected: 30 (sum=150, count=5, mean=30)
```

### 4. Calculate Standard Deviation (sx)
**Purpose**: Verify sample standard deviation
```
Keys: OPTN → calc → 2 → EQUALS
Expected: ~15.81 (sample SD of [10,20,30,40,50])
Formula: sqrt(sum((x-x̄)²)/(n-1)) = sqrt(400/4) = sqrt(100) = 10
Note: May be population SD (sigma) = 10 if n used instead of n-1
```

### 5. Calculate Sum (Σx)
**Purpose**: Verify sum calculation
```
Keys: OPTN → calc → 3 → EQUALS (or appropriate key)
Expected: 150
```

### 6. Calculate Minimum (minx)
**Purpose**: Verify minimum value
```
Keys: OPTN → calc → minx → EQUALS
Expected: 10
```

### 7. Calculate Maximum (maxx)
**Purpose**: Verify maximum value
```
Keys: OPTN → calc → maxx → EQUALS
Expected: 50
```

### 8. Select 2-Variable Statistics
**Purpose**: Verify 2-variable mode selection
```
Keys: MODE → 6 (STAT) → 2
Expected: 2-variable statistics mode active
Data format: pairs (x, y) in table
```

### 9. Enter 2-Variable Data
**Purpose**: Verify paired data entry
```
Keys: 10 → ENTER → 20 → ENTER → 20 → ENTER → 40 → ENTER → ...
Expected: Pairs stored as [(10,20), (20,40), ...]
```

### 10. Linear Regression (ax+b)
**Purpose**: Verify regression calculation
```
After entering 2-var data:
OPTN → calc → reg → a → EQUALS
Expected: Slope coefficient
```

### 11. Clear Data (clr)
**Purpose**: Verify data clearing
```
Keys: OPTN → clr → EQUALS
Expected: All data cleared, ready for new input
```

## Critical Testing Points
- 1-var vs 2-var data structure differences
- Sample SD (n-1) vs Population SD (n) distinction
- Large dataset handling (>1000 points)
- Non-numeric input should error
- Navigation between rows/columns with UP/DOWN/LEFT/RIGHT
