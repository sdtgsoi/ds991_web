> 历史人工测试草案：其中状态、成功率与按键序列未经当前自动化验收，不是通过证明。旧 `run_all_tests.js` 不可靠，未纳入版本管理。当前有效测试见 [测试文档](../docs/testing.md)。

# Vector Mode Test Suite

## Overview
Tests for VECTOR mode (MODE → 5) implementation including define, dot product, cross product, magnitude, angle, and addition.

## Implementation Status
- ✓ Define dimensions (vectorAction with dimStage)
- ✓ Dot product (vDot)
- ✓ Cross product (vCross)
- ✓ Magnitude/normal (vNorm)
- ✓ Angle calculation (acos of normalized dot product)
- ✓ Vector addition (vAdd)

## Test Cases

### 1. Define 2D Vector A = [3, 4]
**Purpose**: Verify vector definition with dimension selection
```
Keys: MODE → 5 (VECTOR) → OPTN → define → 2 → EQUALS
      → 3 → ENTER → 4 → ENTER
Expected: Vector A defined as [3, 4]
```

### 2. Dot Product A · A
**Purpose**: Verify dot product calculation (sum of element-wise products)
```
Keys: OPTN → dot → EQUALS
Expected: 25 (3×3 + 4×4 = 9 + 16 = 25)
```

### 3. Magnitude |A|
**Purpose**: Verify vector magnitude calculation
```
Keys: OPTN → vabs → EQUALS
Expected: 5 (sqrt(3² + 4²) = sqrt(25) = 5)
```

### 4. Angle between A and itself
**Purpose**: Verify angle calculation (should be 0° for identical vectors)
```
Define B = [3, 4], then OPTN → angle → EQUALS
Expected: 0° (or very close to 0)
```

### 5. Angle between perpendicular vectors
**Purpose**: Verify angle calculation for orthogonal vectors
```
Define A = [1, 0], B = [0, 1]
OPTN → angle → EQUALS
Expected: 90° (cos⁻¹(0) = π/2 radians = 90°)
```

### 6. Vector Addition A + B
**Purpose**: Verify element-wise vector addition
```
Define A = [1, 2], B = [3, 4]
OPTN → add → EQUALS
Expected: [4, 6]
```

### 7. Different Dimension Error
**Purpose**: Verify error handling for incompatible vector dimensions
```
Define A as 2D, B as 3D, then try A + B
Expected: "Dimension ERROR"
```

### 8. Zero Vector Magnitude
**Purpose**: Verify magnitude of zero vector
```
Define A = [0, 0]
OPTN → vabs → EQUALS
Expected: 0
```

### 9. Cross Product (if implemented for 3D)
**Purpose**: Verify 3D cross product (may not work for 2D vectors)
```
Define A = [1, 0, 0], B = [0, 1, 0] (if 3D support exists)
OPTN → cross → EQUALS
Expected: [0, 0, 1] (i × j = k)
Note: May error if only 2D vectors supported
```

## Critical Testing Points
- Cross product may only work for 3D vectors (code shows 2D data structure)
- Angle calculation uses acos which requires -1 ≤ c ≤ 1 (clamping implemented)
- Division by zero if either vector has zero magnitude
- All components should be floats, not integers
