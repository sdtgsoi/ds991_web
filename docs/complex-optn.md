# 模式 2（复数）的 OPTN 菜单

更新：2026-10-26。目标为 fx-991CN X。

## 依据与原件

- [CN X 中文手册 V02](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-zh-cn/f/fx-991CN_X_B_CN.pdf)，RJA530830-001V02，印刷页 33–34（PDF 第 34–35 页）：四项函数的编号，以及 `OPTN ↓ 1/2` 两种输出命令。早先审计使用 V01，其对应印刷页为 34–35。
- [EX 英文手册](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991EX_EN.pdf)，印刷页 18（PDF 第 19 页）：交叉核对通用函数和输出命令，不移植 EX 独有模式。
- [CASIO 官方 EX 快速指南](https://www.casio.com/content/dam/casio/local/us/cpd/pdf/Casio-fx-991EX-QSG.pdf)，印刷页 11–12：有菜单截图，确认首页英文名称、单列四项及格式页两项。本地资料目录 `991-docs/` 不纳入 Git。

## 菜单结构

```text
OPTN — 第 1 页
  1 辐角       / Argument       → Arg(…)
  2 共轭       / Conjugate      → Conjg(…)
  3 实部提取   / Real Part      → ReP(…)
  4 虚部提取   / Imaginary Part → ImP(…)
↓ — 第 2 页
  1 ▶r∠θ
  2 ▶a+bi
```

移除误列的 Abs 和不可用的 ∠ 占位项。Abs 仍使用现有 `SHIFT LPAREN` 入口。每页重新从 1 编号；支持上下翻页、数字、OK/等号、pointer/click 和聚焦后的 Enter。AC 取消不改变表达式；中英标签随语言设置切换。

## 输入与结果

前四项插入函数参数槽，右括号退出当前一层。Arg 的结果使用当前 DEG/RAD/GRA；Conjg、ReP、ImP 保留原有复数求值逻辑。

两项转换是在**整个算式末尾**追加的输出命令，不是极坐标输入键，也不是双参数 Pol/Rec 函数。选择时从数字中间或嵌套参数槽回到算式末尾；重复选择替换已有的末尾转换命令。在答案页选择则以 Ans 开始新算式。

转换仅覆盖本次输出，SETUP 的 `S.complexFormat` 和角度设置不改变。Ans/历史保存数值，不保存显示字符串；下一条算式恢复全局复数格式。S⇔D、设置触发的结果重排和 CALC 代入保留本次输出格式。格式命令前无算式、放在参数槽内部或后面继续输入算术运算时，求值返回 Syntax ERROR。DEL 可整体删除该命令。

内部使用 `post: FORMAT:polar/rect`，表达式显示为 `▶r∠θ/▶a+bi`；`evaluateCalculation` 只在复数模式移除有效的顶层末尾命令，再交给普通解析器。`S.resultComplexFormat` 保存当前结果的临时格式，与 SETUP 分开。

## 可复现算例

以下为网页 `dispatch` 键 ID，先执行 `MENU 2`，角度设为 DEG。

| 目标 | 键序列 | 结果 |
|---|---|---|
| Arg(1+i) | `OPTN 1 1 ADD ALPHA ENG RPAREN EQUALS` | 45 |
| Conjg(2+3i) | `OPTN 2 2 ADD 3 ALPHA ENG RPAREN EQUALS` | 2−3i |
| ReP(2+3i) | `OPTN 3 2 ADD 3 ALPHA ENG RPAREN EQUALS` | 2 |
| ImP(2+3i) | `OPTN 4 2 ADD 3 ALPHA ENG RPAREN EQUALS` | 3 |
| 1+i 转极坐标 | `1 ADD ALPHA ENG OPTN DOWN 1 EQUALS` | 约 1.414213562∠45 |
| 2∠330 转直角坐标 | `2 SHIFT RPAREN 3 3 0 OPTN DOWN 2 EQUALS` | 约 1.732050808−i |
| 答案转直角坐标 | `OPTN DOWN 2 EQUALS` | 使用数值 Ans，不改变 SETUP |

`ALPHA ENG` 输入 i、`SHIFT RPAREN` 输入 ∠ 是项目现有映射；本次只修 OPTN，没有把所有面板键位认定为实机一致。

## 验证与边界

`node tools/complex_optn_test.js`：46 项检查，涵盖两页菜单、中英标签、四个函数、三种角度单位、整体算式转换、全局设置不变、Ans、历史、CALC、重排、编辑和错误路径。`node tools/run_tests.js` 十组套件全部通过。

`node tools/browser_test.js --screenshots /tmp/ds991-complex-optn-review` 在 Chrome 156、390/1280 宽度检查两页菜单的按钮数量、编号、边界、中英文、pointer/click/聚焦 Enter 及数值结果。本次人工查看中文首页和英文格式页截图。

网页仍使用现有字体、页眉、页脚和分页提示，没有逐像素复刻实机。复数输出是浮点小数，未实现精确根式；本次不覆盖复数域全部错误条件、输入范围、其他模式的 OPTN 或全部实体键映射。
