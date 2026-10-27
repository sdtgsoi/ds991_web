# 人工测试草案（历史参考）

本目录保存最初按模式整理的人工测试思路，不参与 CI。文档中的预期、按键序列、覆盖状态和历史成功率没有作为当前验收结论保留。新增自动化案例应放入 `tools/`。

| 文件 | 用途 |
|---|---|
| `matrix_tests.md` | 矩阵操作、维度和奇异输入测试草案 |
| `vector_tests.md` | 向量操作与退化输入草案 |
| `stat_tests.md` | 数据输入、统计量和回归草案 |
| `equation_ineq_tests.md` | 方程、不等式案例草案 |
| `ratio_base_table_tests.md` | 比例、进制和数表案例草案 |
| `TESTING_SUMMARY.md` | 当时的记录，未经当前工具复验 |

旧 `run_all_tests.js` 包含无条件成功断言、无效按键和对闭包状态的错误访问，继续作为本地忽略文件，不推荐执行，不应复制进浏览器当作验收。

可信入口： [测试说明](../docs/testing.md)、[工具说明](../tools/README.md)、[功能证据表](../991-docs/06_function_inventory.md)。
