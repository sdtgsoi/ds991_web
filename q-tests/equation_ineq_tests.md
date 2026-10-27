> 历史人工测试草案：其中状态、成功率与按键序列未经当前自动化验收，不是通过证明。旧 `run_all_tests.js` 不可靠，未纳入版本管理。当前有效测试见 [测试文档](../docs/testing.md)。

# Equation & Inequality Mode Test Suite

## Overview
Tests for EQUATION (MODE → 8) and INEQ (MODE → 9) implementations including polynomial solvers, linear systems, and inequality solvers.

## Implementation Status

### EQUATION Mode
- ✓ Polynomial root finding (polyRoots)
- ✓ Linear system solver (solveLinear)
- ✓ Equation solving (solveEquation)
- ✓ Degree selection (n=2,3,4 for poly; n×n for sim)

### INEQ Mode
- ✓ Degree selection (deg2/deg3/deg4)
- ✓ Inequality signs (>, <, ≥, ≤)
- ✓ Inequality solving (solveIneq)
- ✓ Real root filtering and interval testing

## Test Cases

### EQUATION: Quadratic Equation x² - 5x + 6 = 0

**Purpose**: Verify polynomial root finding for degree 2
```
Keys: MODE → 8 (EQUATION) → 2 (degree 2)
      1 → ENTER → -5 → ENTER → 6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: x1 = 2, x2 = 3
```

### EQUATION: Quadratic with Complex Roots x² + 1 = 0

**Purpose**: Verify complex root handling
```
Keys: MODE → 8 → 2
      1 → ENTER → 0 → ENTER → 1 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: x1 = i, x2 = -i (or equivalent display)
Note: Should show imaginary parts
```

### EQUATION: No Real Roots x² + 2x + 5 = 0

**Purpose**: Verify case with no real solutions
```
Keys: MODE → 8 → 2
      1 → ENTER → 2 → ENTER → 5 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: "No real roots" or complex solution display
```

### EQUATION: Linear System (2 equations, 2 unknowns)

**Purpose**: Verify simultaneous equation solving
```
Keys: MODE → 8 → 1 (sim)
      Enter coefficients for:
        2x + y = 5
        x - y = 1
      OPTN → solve → EQUALS
Expected: x = 2, y = 1
```

### EQUATION: Cubic Equation x³ - 6x² + 11x - 6 = 0

**Purpose**: Verify degree 3 polynomial solving
```
Keys: MODE → 8 → 3 (degree 3)
      1 → ENTER → -6 → ENTER → 11 → ENTER → -6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: x1 = 1, x2 = 2, x3 = 3
```

### EQUATION: Quartic Equation (if supported)

**Purpose**: Verify degree 4 polynomial solving
```
Keys: MODE → 8 → 4 (degree 4)
      Enter 5 coefficients
      OPTN → solve → EQUALS
Expected: Up to 4 real/complex roots
```

### INEQ: Quadratic Inequality x² - 5x + 6 > 0

**Purpose**: Verify inequality solving with > sign
```
Keys: MODE → 9 (INEQ) → 2 (deg2) → > (gt)
      1 → ENTER → -5 → ENTER → 6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: x < 2 or x > 3
```

### INEQ: Quadratic Inequality x² - 5x + 6 ≥ 0

**Purpose**: Verify weak inequality (≥) handling
```
Keys: MODE → 9 → 2 → ≥ (ge)
      1 → ENTER → -5 → ENTER → 6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: x ≤ 2 or x ≥ 3 (includes boundary points)
```

### INEQ: Quadratic Inequality x² - 5x + 6 < 0

**Purpose**: Verify < inequality direction
```
Keys: MODE → 9 → 2 → < (lt)
      1 → ENTER → -5 → ENTER → 6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: 2 < x < 3
```

### INEQ: Quadratic Inequality x² - 5x + 6 ≤ 0

**Purpose**: Verify ≤ weak inequality
```
Keys: MODE → 9 → 2 → ≤ (le)
      1 → ENTER → -5 → ENTER → 6 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: 2 ≤ x ≤ 3
```

### INEQ: No Solution Case x² + 1 > 0

**Purpose**: Verify case where inequality always true or always false
```
Keys: MODE → 9 → 2 → > 
      1 → ENTER → 0 → ENTER → 1 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: All real numbers (or "All real x")
```

### INEQ: No Solution Case x² + 1 < 0

**Purpose**: Verify case with no solution
```
Keys: MODE → 9 → 2 → <
      1 → ENTER → 0 → ENTER → 1 → ENTER → EQUALS
      OPTN → solve → EQUALS
Expected: "No solution"
```

## Critical Testing Points
- Polynomial roots may use numerical methods (not analytical for deg>2)
- Complex roots displayed as a+bi format
- Inequality solving uses test point method between roots
- Weak inequalities (≥, ≤) include boundary points
- Higher degree (3, 4) may have limited accuracy
- Coefficient entry order: highest degree first
