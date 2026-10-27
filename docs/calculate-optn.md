# 模式 1（计算）的 OPTN 菜单

更新：2026-10-26。目标为 fx-991CN X 的计算模式。

## 手册依据

- [CN X 原版手册 PDF 镜像](https://manuals.plus/m/9c6b41d1f8e83c52eb602fd18a154beda8144dbb748a12661712ebc2dcaac12c.pdf)，RJA530830-001V01，印刷页 22、27：工程符号通过 OPTN 第 3 项输入；双曲函数通过第 1 项，角度附加符通过第 2 项。该 PDF 的文字层部分数字/按键字体提取不准确，结合下列资料核对。
- 用户提供的本地 `991-docs/manual casio fx-570_991EX_EN.pdf`，印刷页 11–12、14：[CASIO 官方同版文档](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf)。核对三类入口及工程词头编号；不移植其他型号独有菜单。
- [CASIO 官方 fx-991EX 快速指南](https://www.casio.com/content/dam/casio/local/us/cpd/pdf/Casio-fx-991EX-QSG.pdf)，印刷页 10：工程输入示例确认 `OPTN 3 6` 为 k，`OPTN 3 7` 为 M。
- [实机双曲函数菜单原始照片](https://www.a2life.info/w/wp-content/uploads/2020/10/20230815_104458-1024x1024.jpg)：EX 实机，作为两列三行、六项编号的交叉图示；不能据此声称完成了 CN X 逐像素验收。

上述 EX 手册、快速指南和照片现已统一保存在 `991-docs/`；另已下载官方 CN X V02。版本差异、本地入口和校验值见 [引用材料目录](../991-docs/reference-materials.md)。本说明保留原先 V01 页码。

## 实际菜单结构

```text
OPTN
  1 双曲函数 / Hyperbolic Func
      1 sinh       2 cosh
      3 tanh       4 sinh⁻¹
      5 cosh⁻¹     6 tanh⁻¹
  2 角度单位 / Angle Unit
      1 °          2 r          3 g
  3 工程符号 / Engineer Symbol
      1 m          2 μ          3 n
      4 p          5 f          6 k
      7 M          8 G          9 T
      A P          B E
```

三个入口按此顺序显示。Abs、积分、导数、求和、对数模板、Pol/Rec 和 FACT 不再混入计算模式的 OPTN。它们原有的面板按键不因本次菜单改动而重新分配。

根菜单单列；双曲函数两列三行，六个选项同时显示；角度附加符三个选项同时显示；工程符号十一项同时显示，不使用四项分页。因此 `OPTN 1 5` 直接选择反双曲余弦，`OPTN 3 6` 直接选择 k，不需要翻页。A、B 对应网页的 `ALPHA NEG`、`ALPHA DMS`。

菜单支持数字、触摸、聚焦后的 Enter、`=`/OK 确认。LEFT 返回父菜单并保留父菜单选择，AC 关闭且不改写表达式。中英菜单跟随语言设置。

## 输入和计算行为

**双曲函数**：选择后插入带参数槽的函数模板。正函数及反函数均使用现有求值器，角度设置不影响双曲函数。右括号关闭当前函数槽，嵌套时只退出最近一层，后面的加减在函数外执行。`acosh(0)`、`atanh(1)` 显示 Math ERROR。

**角度单位**：这里插入当前数值的角度附加符，与 SETUP 的全局角度设置分开。输入 `50g`、当前全局单位为 DEG 时，得到 45；`(π/2)r` 得到 90。全局 DEG/RAD/GRA 不会因插入附加符而改变。在三角函数参数内部也能使用，例如全局 RAD 下 `sin(30°)` 得到 0.5。

**工程符号**：按后缀比例因子计算。m、μ、n、p、f 分别乘 10⁻³、10⁻⁶、10⁻⁹、10⁻¹²、10⁻¹⁵；k、M、G、T、P、E 分别乘 10³、10⁶、10⁹、10¹²、10¹⁵、10¹⁸。这只是表达式输入，未把 SETUP 的工程符号自动输出开关宣称为已实现。

选择后缀时保留当前光标位置和模板槽。光标在数字中间时先拆分数字；在答案画面选择后缀则接在 Ans 后继续计算。无操作数的后缀返回 Syntax ERROR。DEL 可按一个 token 删除后缀。

## 可重现的按键路径

以下使用 `dispatch` 键 ID；在默认 DEG、计算模式执行：

| 操作 | 键序列 | 预期数值 |
|---|---|---|
| sinh(1) | `OPTN 1 1 1 RPAREN EQUALS` | 约 1.175201194 |
| 反双曲余弦(1) | `OPTN 1 5 1 RPAREN EQUALS` | 0 |
| 50 百分度转度 | `5 0 OPTN 2 3 EQUALS` | 45 |
| π/2 弧度转度 | `LPAREN SHIFT EXP DIV 2 RPAREN OPTN 2 2 EQUALS` | 90 |
| 500k | `5 0 0 OPTN 3 6 EQUALS` | 500000 |
| 999k + 25k | `9 9 9 OPTN 3 6 ADD 2 5 OPTN 3 6 EQUALS` | 1024000 |
| 3.75M ÷ 25k | `3 DOT 7 5 OPTN 3 7 DIV 2 5 OPTN 3 6 EQUALS` | 150 |
| 2E（exa） | `2 OPTN 3 ALPHA DMS EQUALS` | 2×10¹⁸ |

## 实现位置和验收

- `src/menus.js`：计算模式菜单、子菜单布局、后缀插入。
- `src/screen-renderer.js`：符号菜单按描述中的列数显示。
- `src/expression-renderer.js`：角度上标和工程词头显示。
- `src/expression-editor.js`：函数右括号退出；其余光标基线保留。
- `ds991.html`：角度/工程后缀的求值适配；`sync.sh` 同步为 `index.html`。

`node tools/calc_optn_test.js` 的 69 项检查通过，覆盖所有菜单项目、三种全局角度、11 个词头、手册算例、取消/返回、错误域、答案续算、数字中间及分数内插入和嵌套函数。

`node tools/run_tests.js` 十组套件通过（包括后续加入的复数 OPTN）。真实 Chrome 在 390/1280 宽度检查三类子菜单的数量、两列排列、边界、中英文及 pointer/click 计算路径。可用 `node tools/browser_test.js --screenshots /tmp/ds991-calc-optn-review` 生成截图；本次已人工查看中文入口、双曲函数及工程符号截图。

屏幕的字体、页眉/关闭提示和间距仍为网页样式；工程符号菜单保留紧凑三列排版。没有声称逐像素复刻。数值仍使用 JavaScript Number 和现有数学核心，极端输入范围/精度和实机内部实现不完全等同。其他模式的 OPTN 仍按 [菜单审计](menu-audit.md) 中的剩余差异处理。
