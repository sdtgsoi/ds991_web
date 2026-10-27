> 指数编辑设计历史，不代表当前全部实现状态。可执行基线见 `tools/power_test.js`，实际架构见 [架构说明](../991-docs/03_architecture.md)。

# DS991 指数编辑系统错误分析与重构开发方案

版本：v3.0（重写版，取代 v2.0）  
目标模块：Expression Tree / Cursor Navigation / Power Operation / Delete System  
配套代码：`ds991_pow3.html`

---

## 0. 文档沿革与范围

本文档取代 v2.0。v2.0 的问题归因（幂规则分散、删除函数过载）方向正确，但存在三处根本问题，本版予以修正：

1. **误诊**：v2.0 声称"光标是 arr/pos、无法表达当前位于哪个数学槽"，并以此为前提提出重写光标模型。经逐行核对代码，光标帧 ` {arr, pos, node, slot} ` **始终携带 node 与 slot**，v2.0 提议的 `Cursor{node, slot, offset}` 与现有结构同构，不构成能力升级。
2. **缺层**：v2.0 没有先把既有行为固化为测试与规格，直接提出"Phase 1 替换 cursor stack"——这是全计划风险最高的一步，等于在没有安全网的情况下动地基。
3. **失真**：v2.0 对若干现有行为的描述与代码不符（详见第 2 节逐条勘误），且完全未提及渲染层已有的指数塔解决方案，照其方案重写必然引入显示回归。

本版文档的全部行为描述均以 `ds991_pow3.html` 实测代码为准；所有重构步骤以第 3 章"行为基线"和第 7 章测试网为通过标准。

**范围声明**：本文档只覆盖指数（幂）编辑链路及其直接耦合的光标导航与删除系统。不求值器重写、不类化 AST、不引入 Command/undo、不拆分为大规模模块树（不做清单见第 8 章）。

---

## 1. 现状架构（事实基线）

### 1.1 处理管线

```
按键（鼠标/触摸/物理键盘）
  → dispatch(id)                    唯一入口，SHIFT/ALPHA 在此消费
  → input*() / do*() / handle*()   修改表达式或状态
  → render()                        从状态重绘 LCD
```

### 1.2 表达式模型

`root` 是 token 数组；每个 token 是 `{t: 类型, ...}` 的 plain object。复合节点以命名数组持有子槽，例如：

```
2^3^4  ⇔  {t:"pow", base:[{t:"num",v:"2"}],
                     exp:[{t:"pow", base:[{t:"num",v:"3"}],
                                   exp:[{t:"num",v:"4"}]}]}
```

### 1.3 光标模型（事实澄清）

光标是 `stack` 帧的栈，根帧为 `{arr: root, pos: 0}`，深入模板时压入 `{arr, pos, node, slot}`。`pos` 是该槽内的**数字偏移**（一个多字符数字 token 内部可停留）。关键事实：

- 槽的归属（node/slot）**一直可知**，`descendAtCursor()`、`slotKeys()`、`enter()/leaveField()` 均围绕树路径工作；
- 真正的问题不在"是否树位置"，而在**幂的边界位置存在三种表示**（见 2.2）。

### 1.4 幂相关代码完整清单

`T_pow` 只是入口。与幂行为直接相关的代码实际分布在五处：

| 类别 | 函数 |
|---|---|
| 上下文判定 | `expFrames / inExponent / afterPower / atBaseExpBoundary / getPowerContext / emptyExpRect` |
| 输入操作 | `handlePowerOperation / opExpEnd / opBaseExpBoundary / opNumberMiddle / raisePower / inputPow / inputSquare / inputCube` |
| 测量 | `digitsIn`（pow 分支）、`powExpStartsWithPower` |
| 导航 | `doLeft / doRight` 的幂特判、`descendAtCursor` 的 pow 分支 |
| 删除 | `doDel` 的 powCtx 段、`mergeExponentIntoBase / detachExponent / splitBaseTokens` |
| 渲染 | `renderNodeAt` 的 `at===bd` 特判、`renderPow / renderExponent / expCtx / expStyle` |

---

## 2. 问题分析

### 2.1 问题一：幂规则存在五个事实来源

同一条"幂的语义"由五组代码独立解释：输入（`handlePowerOperation` 一族）、左移、右移、删除、测量（`powExpStartsWithPower` 条件性改变 `digitsIn`）。每组都是历史上真实 bug 的修复沉淀（代码注释里留有记录），但彼此不共享判定逻辑。

**后果**：任何新增幂场景（更深层嵌套、新模板进入指数等）需要同步修改五处，漏一处即出现"输入正确但导航/删除错误"的畸形状态。这是维护性问题，不是某条规则写错。

### 2.2 问题二：幂边界位置存在三种表示

`2|^4` 这个屏幕位置在数字偏移模型中有三个坐标：

1. base 帧内 `pos = arrDigits(base)`（base 末尾）；
2. 父帧内的 `^` 偏移（`digitsIn(pow)` 中那个 `+1`）；
3. exp 帧内 `pos = 0`。

且第 2 种表示**条件性存在**：当 exp 首 token 是幂时（`powExpStartsWithPower`），`^` 偏移被删除。这导致：

- 同一位置的光标状态取决于树的形状而非用户意图（代码注释："一个位置两种光标状态""每层多按一次"）；
- `renderNodeAt` 需要专门的 `at===bd` 分支才能把光标画在 `^` 上；
- 边界行为只能用特判修复，特判又成为问题一的素材。

**勘误（对 v2.0）**：v2.0 将此诊断为"光标不知道自己在哪个槽"并建议"取消 `^` 字符位置"。两点修正：其一，槽归属可知，不知的是**边界的唯一身份**；其二，`^` 边界是承重结构——`BASE_EXP_BOUNDARY` 上下文（`2|^4` 按 x^() 得 `2^(□^4)`）依赖它，不能直接取消。正确处方是**边界唯一化**（见 5.6 / Phase 4）：base 末尾与 exp 起点合并为同一共享位置，`^` 不再独占偏移。

### 2.3 问题三：`doDel()` 是上帝函数

`doDel()` 同时处理：数字逐位删除、幂的三种删除策略、积分的跨槽回溯与拆壳、模板的槽间回溯、模板右缘退入、顶层 token 删除，内部还管理帧的推入/弹出/复用。函数规模与分支数已逼近可维护极限，且幂删除规则与输入/导航规则互为重复实现（问题一的删除侧）。

### 2.4 已知缺陷登记（代码走查发现，Phase 0 用例确认）

| 编号 | 描述 | 证据 |
|---|---|---|
| P1 | **NORMAL 上下文数字中间按 x^() 行为与代码内规格注释不符**。`handlePowerOperation` 头部注释规定 NUMBER_MIDDLE 下 x^() 应"左部为 base、右部为 exp 并进入指数"；但 `getPowerContext` 仅在指数槽内才返回 NUMBER_MIDDLE。顶层数字中间（如 `12\|3`）落入 NORMAL，`inputPow → takeOperand` 对 mid-number 取不到左操作数，最终生成**空 base 的 `□^□123`** | 静态走查 `getPowerContext / inputPow / takeOperand / insertIndex`，待测试坐实 |

---

## 3. 现状行为基线（重构兼容矩阵）

以下矩阵是重构的兼容性契约：**任何阶段完成后，本表所有 ✓ 行为必须逐字保持**。（`│` 表示光标位置）

### 3.1 输入

| # | 场景 | 操作 | 现状 |
|---|---|---|---|
| I1 | 基本幂 | `2 x^ 3` | ✓ `2^3`，光标指数末 |
| I2 | 幂塔 | `2 x^ 3 x^ 4` | ✓ `2^3^4`（右结合树） |
| I3 | EXP_END + x²/x³ | `2 x^ 3`（光标指数末）`x²` | ✓ **包层**：`2^(3²)`，光标留在指数内该幂之后 |
| I4 | EXP_END + x^() | 同上按 `x^()` | ✓ **包空层**：`2^(3^□)`，光标进入新空指数 |
| I5 | BASE_EXP_BOUNDARY | `2 x^ 4 ← ←`（光标 `2│^4`） | ✓ x²/x³ **忽略**；x^() 得 `2^(□^4)`，光标进内层 base |
| I6 | OUTSIDE_POWER | `2 x^ 4 →`（光标顶层、紧贴完整幂之后） | ✓ 三键均**忽略** |
| I7 | 括号幂 | `(2 x^ 4 ) x³` | ✓ NORMAL：` (2^4)^3 ` |
| I8 | 指数内数字中间 + x² | `2 x^ 1 2 3 ← ←`（`2^1│23`）`x²` | ✓ 左部升幂：`2^1²23` |
| I9 | 顶层数字中间 + x² | `1 2 3 ← ←`（`1│23`）`x²` | ✓ `1²23` |
| I10 | 顶层数字中间 + x^() | 同上按 `x^()` | ✗ **缺陷 P1**：得到空 base `□^□123`，应为 `1^(23)` 且光标进指数 |
| I11 | 负数/复合指数 | `2 x^ (−) 3`、`2 x^ 3 + 4` | ✓ 求值正确（`2^-3=0.125`） |

**勘误（对 v2.0）**：v2.0 称 EXP_END 下 x²/x³ "append to the right end of that exponent"（即 `2^32`）。实测 `opExpEnd` 是**把当前指数整体作为新幂的 base 包一层**（`2^(3²)`）。上表 I3/I4 以代码为准。

### 3.2 删除

| # | 场景（setExpr 构造） | 操作 | 现状 |
|---|---|---|---|
| D1 | `2^(3│)` | DEL | ✓ 删去 `3` → `2^□` |
| D2 | `2^(│)`（空盒） | DEL | ✓ 升层合并 → `2│` |
| D3 | `2^(│3)` | DEL | ✓ `2│3`（2 与 3 保持分 token） |
| D4 | `123^(│45)` | DEL | ✓ `123│45`（`splitBaseTokens` 只拆原 base，光标在原 base 之后） |
| D5 | `123^(│45^67)` | DEL | ✓ `123│45^67`（内层幂 base 并入、高层指数保留） |
| D6 | `123^(│^45)` | DEL | ✓ `123│^45`（无内容、仅高层指数） |
| D7 | `2^│`（base 右缘，指数空） | DEL | ✓ `detachExponent` → `2` |
| D8 | `2^│3`（caret 在 base 末） | DEL | ✓ 跨 `^` 删指数末位 → `2^□` |
| D9 | 模板右缘通用 | `12/34│` | ✓ 退入末槽删一位 → `12/3` |
| D10 | 积分跨槽 | 下限槽首 DEL | ✓ 回溯删 integrand 末位 |
| D11 | 积分拆壳 | integrand 槽首 DEL | ✓ 拆壳、内容留在父表达式 |

### 3.3 导航

| # | 场景 | 现状 |
|---|---|---|
| N1 | `2^3` 全链 LEFT/RIGHT | ✓ 可用，但边界区有三个等价停点（base 末 / `^` / exp 首），幂塔每层的历史"多按一次"即由此而来，现靠特判压制 |
| N2 | 空指数盒 | ✓ 可进入（base 末 RIGHT 进盒）；盒内 LEFT/RIGHT 直穿（`emptyExpRect`） |
| N3 | 顶层环绕 | ✓ 根表达式首/尾相接（有意行为），模板槽内不环绕 |
| N4 | UP/DOWN 跨槽 | ✓ 保持数字偏移（`12/34` 上下对齐）；无模板时回退历史浏览 |
| N5 | 答案后首键 | ✓ LEFT/DEL 落末端、RIGHT 落首端，仅作用一次（`afterAnswer`） |

### 3.4 渲染

| # | 场景 | 现状 |
|---|---|---|
| R1 | 幂塔显示 | ✓ 各层等大（绝对字号 = 根字号 × 0.70），每级恒定抬升 0.80em，不逐级缩小 |
| R2 | LCD 防溢出 | ✓ `calculateExpressionBounds + ensureCursorVisible`（垂直位移上限 60px） |
| R3 | 边界光标 | ✓ `renderNodeAt` 的 `at===bd` 分支把光标画在 `^` 处 |
| R4 | 结果/错误态 | ✓ `hideCaret` 统一抑制光标 |

### 3.5 求值与序列化

| # | 场景 | 现状 |
|---|---|---|
| V1 | 右结合 | ✓ `2^3^2 = 512`（非 64） |
| V2 | JSON 深拷贝 | ✓ 历史（`S.history`）、TABLE 函数（`t.f/t.g`）、CALC（`calcExpr`）、SOLVE（`solveExpr`）均依赖 `JSON.parse(JSON.stringify(...))`——**plain object 是硬约束** |

---

## 4. 设计约束（任何阶段不可违反）

- **C1 序列化约束**：表达式树必须保持 plain object，禁止类化（否则历史/表格/CALC 的 JSON 深拷贝失效）。
- **C2 渲染资产保护**：布局上下文（`powerDepth/fontMode/rootFont`、`EXP_FONT_RATIO=0.70`、`EXP_STEP_EM=0.80`）与 `ensureCursorVisible` 的显示规格不得回归。
- **C3 空槽语义三件套**：`slotDigits` 空槽最小占位 1；`emptyExpRect` 空盒直穿；`slotOrBox` 编辑中的空槽画光标而非占位框。
- **C4 导航不变量**：顶层环绕；`afterAnswer` 一次性落点；UP/DOWN 跨槽保持偏移并无模板时回退历史；DOWN 兼作"前进+下降"；积分导航序 integrand→lower→upper（与印刷序相反）；幂的 LEFT 从 base 出壳、RIGHT 从 base 末进 exp。
- **C5 行为兼容**：第 3 章矩阵全量保持，唯一例外是缺陷 P1 的修复。
- **C6 测试先行**：每个 Phase 以测试网全绿为通过标准，禁止"先改后补测"。

---

## 5. 重构方案

### 5.1 总原则：规则集中，而非模型替换

不重写光标底层模型（`arr/pos + node/slot` 帧保留），不做类化 AST。要做的只有两件事：

1. 让**幂上下文判定成为唯一事实来源**，输入/导航/删除/渲染全部只问它；
2. 把**删除与导航的按类型策略**从 `doDel/doLeft/doRight` 中拆出，主函数只做分发。

### 5.2 PowerContext：唯一解释者

将 `getPowerContext()` 及其判定族（`expFrames/inExponent/afterPower/atBaseExpBoundary`）提升为独立模块 `cursor/PowerContext.js`，对外只暴露：

```javascript
getPowerContext(stack)  // → {type, frame?}  五值之一，含义见 5.3 表
```

改造点：`inputPow/raisePower`（输入）、`doLeft/doRight`（导航）、`doDel`（删除）、`descendAtCursor/renderNodeAt`（定位与渲染）中所有内联幂特判改为调用它。**本阶段不改任何行为**，特判代码与集中判定并存交叉验证后删除特判。

### 5.3 PowerController：输入决策表（以实测为准的完整规格）

统一入口 `insertPower(kind)`，`kind ∈ {2, 3, null}`：

| 上下文 | 判定条件（集中判定） | x² / x³ | x^() |
|---|---|---|---|
| OUTSIDE_POWER | 顶层（栈深 1）且光标紧贴完整幂之后 | 忽略 | 忽略 |
| EXP_END | 光标在某 pow 的 exp 槽**最末端** | 当前指数整体作 base 包层：`2^3│ → 2^(3²)`，光标留在指数内 | 包空层：`2^3│ → 2^(3^□)`，光标进新指数 |
| BASE_EXP_BOUNDARY | 光标在 exp 非空的 pow 的 base 槽 | 忽略 | 内插空 base 幂：`2│^4 → 2^(□^4)`，光标进内层 base |
| NUMBER_MIDDLE | 光标在数字中间 | 左部升幂：`123│456 → 123²456` | 左 base 右 exp：`123│456 → 123^(456)`，光标进指数 |
| NORMAL | 其余 | 左侧因子为 base；数字先拆分：`1│23 → 1²23` | 左侧因子为 base，光标进空指数 |

同时在此阶段**修复缺陷 P1**：使 NORMAL 上下文的数字中间按 x^() 走 NUMBER_MIDDLE 语义（`12│3 → 12^(3)` 形态，以 Phase 0 坐实的实际规格为准），并令 `123│456 → 123^(456)` 在顶层与指数内行为一致。

### 5.4 Navigator：移动规则集中

`doLeft/doRight/doField/descendAtCursor` 迁入 `cursor/Navigator.js`，对外暴露 `moveLeft/moveRight/moveUp/moveDown`。C4 七条不变量逐条写成断言测试。导航中的幂判定一律改经 `PowerContext`；幂特判（LEFT 从 base 出壳等）保留**语义**、改为基于集中判定的实现。

### 5.5 DeleteController：按节点类型的策略拆分

```
DeleteController.delete(cursor)
  → 分派：
      deleteNumber()    数字逐位
      deletePower()     幂：D1~D8 全部策略（含 mergeExponentIntoBase/detachExponent）
      deleteIntegral()  积分：跨槽回溯 + 拆壳
      deleteTemplate()  通用模板：槽间回溯 / 右缘退入 / unwrap
      deleteToken()     顶层 token
```

D1~D11 每条行为对应一个测试用例；策略实现第一阶段**原样搬移**代码，不"顺手优化"。

### 5.6 边界唯一化（可选，Phase 4 规格预告）

原则：`digitsIn(pow)` 中 `^` 不再占用独立偏移；base 末尾与 exp 起点是**同一位置**，身份由所在帧区分。渲染上两帧画在同一 x（caret 在空 exp 帧时占位框由光标替代，显示不变）。验收标准：N1 中幂塔每层的光标停点数减少且全链无重复停点；`renderNodeAt` 的 `at===bd` 分支删除；矩阵 3.1~3.4 全绿。**若 Phase 2/3 后边界类 bug 不再出现，本阶段可跳过。**

### 5.7 渲染层

不重写。仅做两件事：抽为 `renderer/` 模块（`renderArr/renderNode/renderNodeAt/slotOrBox` 入 `Renderer.js`，`renderPow/renderExponent/expCtx/expStyle` 入 `PowerRenderer.js`，`hideCaret/ensureCursorVisible` 入 `CursorGuard.js`）；Phase 4 时随边界唯一化删除 `at===bd` 特判。

### 5.8 模块结构（在现有单文件基础上拆分，保持无构建步骤）

```
src/
  expression/   NodeFactory.js（T_* 工厂，plain object 不变）
  cursor/       Cursor.js（栈帧操作）· Navigator.js · PowerContext.js
  editor/       Editor.js（ins/split/take*）· InsertController.js
                · PowerController.js · DeleteController.js
  math/         Evaluator.js · Formatter.js        ← v2.0 漏掉的归属，最先抽取
  renderer/     Renderer.js · PowerRenderer.js · CursorGuard.js
  calculator/   State.js · Dispatch.js · History.js
```

以 classic script 按依赖顺序加载或 ES modules（`<script type="module">`）均可，二者都不引入构建步骤；不追求文件数量，追求"每个文件可被单独阅读"。

---

## 6. 迁移计划

| 阶段 | 内容 | 行为变更 | 通过标准 |
|---|---|---|---|
| **Phase 0** | 建测试网：利用已有钩子（URL `?keys=` 回放、`window.__calc` 的 `dispatch/getExpr/getCursor/setExpr/evalExpr`）把第 3 章矩阵固化为断言；P1 用例标记 expected-fail | 无 | 用例可运行；✓ 全绿 |
| **Phase 1** | 抽取 `math/`（Evaluator/Formatter，最纯、依赖最少） | 无 | 测试全绿 |
| **Phase 2** | `PowerContext` 唯一解释者改造 + `PowerController` 重组；修复 P1 | 仅 P1 | 全绿；P1 用例转正 |
| **Phase 3** | `DeleteController` 策略拆分 + `Navigator` 集中 | 无 | 全绿 |
| **Phase 4（可选）** | 边界唯一化（5.6） | 停点数减少，显示不变 | N1 停点断言 + 全绿 |

每阶段独立提交、独立可回滚；阶段之间禁止携带"顺手修改"。

---

## 7. 测试规格

### 7.1 基础设施

- 表达式断言（示意）：

```javascript
__calc.dispatch('2'); __calc.dispatch('POW'); __calc.dispatch('3');
assert.deepEqual(__calc.getExpr(),
  [{t:'pow', base:[{t:'num',v:'2'}], exp:[{t:'num',v:'3'}]}]);
```

- 光标断言：`getCursor()` 返回 `{depth, pos, slot, node, path}`，导航用例逐停点比对 `path`；
- 无头渲染核对：`?keys=...` 加载后截图比对 R1~R4；
- 删除用例优先用 `setExpr` 精确构造起始树，避免依赖导航链本身的正确性。

### 7.2 最小用例清单（对应矩阵编号）

- 输入：I1~I11（I10 = expected-fail 直至 Phase 2）
- 删除：D1~D11
- 导航：N1（`2^3` 与 `2^3^4` 全链逐停点）、N2~N5
- 渲染：R1~R4（截图）
- 求值/序列化：V1、V2（历史编辑不回写）

### 7.3 通过标准

任一 Phase 合并前：上述用例 100% 通过（P1 除外，Phase 2 后必须转正），且人工走查第 3 章矩阵无遗漏。

---

## 8. 不做清单（防止范围蔓延）

- 不类化 AST，不在节点上挂 evaluate/render/clone 方法（违反 C1）；
- 不引入 Command 模式 / undo / redo（fx-991 本体无此功能）；
- 不替换光标底层模型，不取消 node/slot 帧；
- 不拆分为数十个文件、不引入构建步骤与打包器；
- 不改变渲染视觉规格（字号比 0.70、抬升 0.80em、位移上限 60px）；
- 不改求值语义与角度/格式设置行为；
- 不处理矩阵/统计/方程等模式内部逻辑（其按键处理本就走独立通道，与幂链路无关）。

---

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| Phase 2 集中判定时漏改某处特判，行为漂移 | 交叉验证期新旧判定并存；矩阵用例全量跑 |
| `doDel` 搬移策略时改变帧操作顺序 | 策略函数第一阶段原样搬移代码，逐字符 diff 评审 |
| 边界唯一化（Phase 4）牵一发动全身 | 设为可选阶段；仅在测试网完备且痛点明确时启动；独立分支进行 |
| 拆分文件引入加载顺序问题 | Phase 1 先建立模块脚手架并验证；依赖顺序写进模块头注释 |
| 修复 P1 改变用户已习惯的行为 | P1 当前行为（空 base）属明显缺陷态而非可辩护的交互设计；修复规格以代码内自己的注释为准 |

---

## 10. 实施期增补（Phase 0 实测，于 `ds991.html` 工作树）

本章是对第 3 章基线的补充，全部结论来自 `tools/power_test.js` 驱动真实 `dispatch` 的运行结果，不改变第 4 章约束与第 6 章阶段划分。

### 10.1 新增缺陷 N6：UP/DOWN 在幂塔中不可逆（应加入 3.3 矩阵）

实测 `2 x^ 3 x^ 4`（起点为最内层指数末尾 `exp/exp@1`）：

```
UP   -> 23|4  [root/exp/base@1]
UP   -> 2|34  [root/exp@0]
UP   -> |234  [root/base@0]
UP   -> |234  [root@0]
DOWN -> 2|34  [root/exp@0]
DOWN -> 234|  [root@4]      <- 直接跳出整座塔，跳过内层 base/exp
DOWN -> 234|  [root@4]（此后停住）
```

归因：`doField()` 在槽列表末端只调用 `leaveField()`，不像 `doRight()` 那样在移动后调用 `descendAtCursor()`。因此 2.2 的"边界三表示"不仅污染 LEFT/RIGHT，也污染纵向导航。

- 期望行为：`exp@0` 处的 DOWN 应与 RIGHT 一致，下沉到内层 base（`exp/base@1`），使 `UP` 与 `DOWN` 可逆。
- 归属阶段：**Phase 3**（`Navigator` 集中时统一"进入槽后规范化"）。
- 测试：`tools/power_test.js` 的 `N6a` / `N6b`，当前为 `xfail`，Phase 3 后必须 XPASS 并转正。

### 10.2 机制勘误：`splitBaseTokens` 实际是死代码（修正 3.2 D4/D5 括注）

`mergeExponentIntoBase()` 的执行顺序是：

```javascript
var newBase=outerBase.concat(content);   /* 先复制引用 */
...
splitBaseTokens(outerBase);              /* 之后才原地拆 outerBase */
parent.arr.splice.apply(parent.arr,[idx,1].concat(newBase));
```

`concat` 生成的 `newBase` 仍持有原 `N123` 的引用，之后再拆 `outerBase` 对 `newBase` 没有影响。因此：

- 实测 D4 树为 `N123,N45`（**base 并未被拆分**），而 3.2 括注称"`splitBaseTokens` 只拆原 base"，与实现不符；
- 可观察行为仍然 ✓（`123│45`），因为 `parent.pos=arrDigits(outerBase)=3` 恰好落在 `N123` 与 `N45` 的 token 边界上，光标有合法落点；
- 影响：Phase 3 搬移 `DeleteController` 时，不要把"拆分原 base"当作必须保留的语义。该函数应删除，或单独立项修复（会改变 token 结构，需测试先行）。

### 10.3 N1 补充证据：两个方向的可达集不同（支撑 Phase 4）

`2^3^k` 同方向回到起点所需按键数（实测）：

| 表达式 | LEFT 闭环 | RIGHT 闭环 |
|---|---|---|
| `2^3` | 6 | 5 |
| `2^3^4` | 10 | 7 |
| `2^3^4^5` | 14 | 9 |

`2^3^4` 的 RIGHT 可达集是 LEFT 可达集的真子集：`root/base@0`、`root/base@1`、`exp/base@0` 只有 LEFT 能到达；同一 `2|34` 在偏移模型下有三个坐标（`exp/base@0`、`exp@0`、`base@1`），`23|4` 有两个。这比 3.3 N1 的"多按一次"更强，Phase 4 的验收判据相应提高为：

1. 同一表达式 LEFT 与 RIGHT 的闭环长度相等；
2. 两个方向的可达状态集合相同；
3. `renderNodeAt` 的 `at===bd` 分支可删除；
4. 3.1–3.4 矩阵全绿。

### 10.4 测试网落地位置

第 3 章矩阵已固化在 `tools/power_test.js`（已挂到 `tools/run_tests.js` 的 `suites` 数组）。约定：

- 用例编号与文档章节一一对应（`I1..I11`、`D1..D11`、`N1..N6`、`V1..V2`，外加 `R1..R4` 的源码级守护）；
- 已知缺陷用 `xfail` 标注，断言写的是**正确**行为：缺陷未修时报告 `xfail`，修好后报告 `XPASS` 并计为失败，提示删除标记、把用例转为正式断言；
- `N1` 的三行闭环长度按 10.3 表格固化，Phase 4 完成时改为"两方向相等"。

### 10.5 Phase 4（边界唯一化）实施记录与基线修订

Phase 2/3 完成后，实际使用仍报告"导航同一位置要按两三次、DEL 在指数里会整层消失"。经复现确认，问题正是 2.2 的边界三表示，因此启动了原定**可选**的 Phase 4，并顺带修复了由此暴露的两个 DEL 缺陷。

**新增缺陷（已修复，见 10.6）**

| 编号 | 描述 | 修复 |
|---|---|---|
| D-a | 嵌套指数末尾 DEL 整层消失：`2^3^4 \|` → `2^(□)` | `deleteAtTrailingEnd` / `enterDeepestTrailing`：沿 lastSlot 降到最深层，只删一位 |
| D-b | 边界态 DEL 不一致：`2\|3^4` 在 base-start 态删掉底数 2（甚至整个幂） | `powerBaseStart`：嵌套时塌一层；表达式最左端时 no-op |

**Phase 4 实现（`ds991.html`）**

最终采用的模型：**每个幂边界保留 2 个停点**——底数侧 `base@end`（`2|3`）与指数侧 `exp@0`（`2|3`）——且 **LEFT/RIGHT 互为镜像、闭环长度相等**。

关键前提：**恢复 `digitsIn(pow)` 里的 `^` 偏移**（`slotDigits(base)+1+slotDigits(exp)`）。此前 "temp pow 2" 用 `powExpStartsWithPower` 在嵌套时删掉该偏移，导致同一个屏幕位置在偏移→槽的映射里不唯一：RIGHT 会跳过底数侧、`|234` 处 LEFT→RIGHT 不可逆、左右闭环长度不等（8/6、10/7）。恢复后偏移 1:1 对应槽位（`bd`→底数侧，`bd+1`→指数侧），两个方向自然镜像。`powExpStartsWithPower` 仅保留给去第 3 态的折叠使用。

- 规范化族：`canonGapBeforePower`（父数组里"幂之前的间隙"与 `base@0` 同屏，合并为 `base@0`）/ `canonLeadingBaseIntoExp`（引导内层幂的 `base@0 → 外层 exp@0`，去掉第 3 态）/ `canonDeepestExpEnd`（尾随指数末尾 → 最深层）/ `climbOutOfNestedEnds`（RIGHT 从嵌套末尾一次爬出）；由 `moveLeft()/moveRight()` 在 `moveLeftRaw/moveRightRaw` 之后调用。
- `base@end` 保留为独立停点：LEFT 从 `exp@0` 先进入底数侧（屏幕不动，即"进入底数"那一次），再继续左移。
- **最外层底数起点（base@0）的 LEFT 一步跳出**：`leaveField(-1)` 落到的父数组间隙与 base@0 同屏，`moveLeftRaw` 再走一步，因此 `1+\|12^34` 直接到 `1\|+12^34`，不再多停一次（原先"最下面的 base 跳出多一步"）。
- RIGHT 在表达式最左端先"进入"第一个幂的 `base@0`（同样屏幕不动），使起点也左右可逆；`doRightRaw` 新增该步。
- `getPowerContext()`：`exp@0` 且 base/exp 均非空 → `BASE_EXP_BOUNDARY`；`opBaseExpBoundary(ctx,kind)` 支持从 exp 帧进入。
- `atBaseExpBoundary()` 收紧为 `pos>=arrDigits(base)`。
- 渲染：`renderPow()` 让两个边界态**外观可区分**——底数侧的 caret 画在底数高度、指数侧的 caret 画在抬升后的指数 span 内（`2|4` vs `2|4` 抬升），因此"同一 x 位置、两种编辑结果"不再难以判断（底数侧打字追加到底数，指数侧打字插入指数首）。

**基线修订（第 3 章矩阵）**

| 编号 | 旧基线 | 新基线 |
|---|---|---|
| I5 | `2 x^ 4 ← ←` 到 base@1 | 不变（`2 x^ 4 ← ←` 到 base@1）；x²/x³ 忽略、x^() 得 `2^(□^4)` **不变** |
| D5 | `LEFT×6` | `LEFT×5` |
| D6 | `LEFT×4` | `LEFT×2` |
| D7 | `2^\|`（`pre` 构造）`RIGHT DEL` | `RIGHT RIGHT DEL`（RIGHT 现在先进入 base@0） |
| D8 | `2^\|3` DEL → `2^□`（删指数末位） | **改为删底数末位**（`12\|34` DEL → `1^34`）；指数侧 `exp@0` 仍是塌层合并。第 3 章的 D8 现状已被本节取代 |
| N1 | 6/5、10/7、14/9 | **5/5、7/7、9/9**（LEFT=RIGHT，Phase 4 验收达成） |
| N7（新增） | — | 塔中同一屏幕位置**不得连续停 3 次**（实测最长 2 次） |

**停点序列实测**

```
2^3^4   LEFT : 23|4 → 23|4 → 2|34 → 2|34 → |234 → 234| → 234| →（回绕）
2^3^4   RIGHT: 234| → |234 → 2|34 → 2|34 → 23|4 → 23|4 → 234| →（回绕）
1+12^34 LEFT : 1+123|4 → 1+12|34 → 1+12|34 → 1+1|234 → 1+|1234 → 1|+1234 → |1+1234 →（回绕）
1+12^34 RIGHT: 1+1234| → |1+1234 → 1|+1234 → 1+|1234 → 1+1|234 → 1+12|34 → 1+12|34 →（回绕）
```

**与旧模型的差别**：旧模型在 `2|34` 有 3 个停点（`exp/base@0`、`exp@0`、`base@1`），现只保留 `base@1`（底数侧）与 `exp@0`（指数侧）；`234|` 旧有 3 个（最深层末尾、中间层末尾、塔外），现为最深层末尾 + 塔外 2 个。左右严格镜像，`RIGHT→LEFT` 在每个停点都回到原状。

### 10.6 新增测试用例（tools/power_test.js）

D12 `2^3^4` 塔外 DEL → `2^(3^(□))`；D13 最深层末尾 DEL → 同；D14 `2^3^4^5` 塔外 DEL → `2^(3^(4^(□)))`；D15 `|2^3^4` DEL no-op；D16 底数侧 DEL 删底数末位（内层 `2^(3|4)` → `2^(□|4)`）；D17 指数侧 DEL 塌一层；D18 `12|34` DEL → `1^34`；D19 `2|3^4` DEL → `□^3^4`；N1 左右闭环相等；N7 连续停点 ≤2。当前 `power_test` 56 passed / 0 failed / 0 expected-fail，六个套件全绿（ui_test 150）。
