> 历史人工测试草案：其中状态、成功率与按键序列未经当前自动化验收，不是通过证明。旧 `run_all_tests.js` 不可靠，未纳入版本管理。当前有效测试见 [测试文档](../docs/testing.md)。

# Matrix Mode Test Suite

## Overview
Tests for MATRIX mode (MODE → 4) implementation including define, determinant, inverse, transpose, and arithmetic operations.

## Implementation Status
- ✓ Define dimensions (promptMatrixDim)
- ✓ Determinant calculation (matDet)
- ✓ Matrix inverse (matInv)
- ✓ Transpose (matTrn)
- ✓ Add/Sub/Multiply (matAdd/matSub/matMul)

## Test Cases

### 1. Define 2x2 Matrix A
**Purpose**: Verify matrix definition with dimension selection and value entry
```
Keys: MODE → 4 (MATRIX) → OPTN → define → 2 → EQUALS → 2 → EQUALS
      → 1 → ENTER → 2 → ENTER → 3 → ENTER → 4 → ENTER
Expected: Matrix A defined as [[1,2],[3,4]]
```

### 2. Calculate Determinant det(A)
**Purpose**: Verify determinant calculation using formula ad-bc
```
Keys: OPTN → det → EQUALS
Expected: -2 (1×4 - 2×3 = -2)
```

### 3. Matrix Inverse A⁻¹
**Purpose**: Verify inverse calculation exists when det ≠ 0
```
Keys: OPTN → inv → EQUALS
Expected: A⁻¹ = [[-2,1],[1.5,-0.5]] (or equivalent display)
Note: Should error if det=0 (singular matrix)
```

### 4. Transpose Trn(A)
**Purpose**: Verify transpose operation
```
Keys: OPTN → trn → EQUALS
Expected: [[1,3],[2,4]]
```

### 5. Matrix Addition A + A
**Purpose**: Verify element-wise addition
```
Keys: OPTN → add → EQUALS
Expected: [[2,4],[6,8]]
```

### 6. Matrix Subtraction A - A
**Purpose**: Verify element-wise subtraction
```
Keys: OPTN → sub → EQUALS
Expected: [[0,0],[0,0]]
```

### 7. Matrix Multiplication A × A
**Purpose**: Verify matrix multiplication (not element-wise)
```
Keys: OPTN → mul → EQUALS
Expected: [[7,10],[15,22]]
Calculation: 
  [1,2]   [1,2]   [1×1+2×3, 1×2+2×4]   [7,10]
  [3,4] × [3,4] = [3×1+4×3, 3×2+4×4] = [15,22]
```

### 8. Dimension Mismatch Error
**Purpose**: Verify error handling for incompatible dimensions
```
Define B as 2x3, then try A + B (A is 2x2)
Expected: "Dimension ERROR"
```

### 9. Singular Matrix Inverse
**Purpose**: Verify error when attempting inverse of singular matrix
```
Define C = [[1,2],[1,2]] (det=0), then OPTN → inv → EQUALS
Expected: "Dimension ERROR" or similar error message
```

## Critical Testing Points
- Non-square matrices should error on inverse/transpose operations
- Dimension matching required for add/sub/mul
- Inverse only valid when det ≠ 0
- Large matrix operations may have performance issues
