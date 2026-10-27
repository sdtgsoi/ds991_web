# 测试与发布检查

## 环境与命令

Node.js 22+；不需要 npm install。Chrome/Chromium 用于真实浏览器工具，`CHROME_PATH` 可覆盖自动发现路径。

在仓库根目录执行：

```bash
./sync.sh
./sync.sh --check
node tools/run_tests.js
node tools/sync_test.js
node tools/prepush_test.js
node tools/browser_lifecycle_test.js
node tools/browser_test.js
```

`sync.sh` 将 `src/` 中五个源码文件嵌入 `ds991.html` 后验证脚本语法，再复制成 `index.html`；`--check` 检查所有嵌入内容和发布副本，完全不写文件。缺少 Node 不能跳过验证。

## 分层验证

| 层级 | 入口 | 验证范围 |
|---|---|---|
| 纯数值 | `tools/math_test.js` | 不依赖 DOM 的实/复多项式根、缩放、奇次根及错误输入 |
| 页面逻辑 | `tools/run_tests.js` | 上项及九组菜单/编辑、导航、模式、渲染字符串、键盘事件模拟测试 |
| 源码同步保护 | `tools/sync_test.js` | 五个源码的漂移检测、只读检查、无效脚本/缺失标记不能覆盖发布副本 |
| 发布保护 | `tools/prepush_test.js` | 隔离假 Git 环境验证 fetch 失败、无 upstream、脏目录、落后、比较失败、Node 缺失等非零退出，以及显式跳过测试提示 |
| 浏览器生命周期 | `tools/browser_lifecycle_test.js` | 真实子进程正常退出和强制终止、临时目录清理重试及永久错误 |
| 真实浏览器 | `tools/browser_test.js` | 390/1280 宽度启动、按钮构建、奇次根、多项式、不等式可见符号、真实 DOM 键盘事件、计算器横向边界和未捕获脚本异常 |

浏览器检查使用合成键盘事件；尚不等同于系统 IME、真机触摸或全套视觉回归。DOM 模拟套件断言行为和生成字符串，不能证明 CSS 排版正确。

## 浏览器检查工具

```bash
node tools/computed.js '.key[data-key="MENU"] .sl.right'
node tools/rects.js --keys "INTG XKEY" '.lcd' '.bigop'
node tools/eval_page.js --keys "2 ADD 3 EQUALS" 'window.__calc.S.ans'
./tools/shot.sh /tmp/ds991.png "2 POW 3" 390 940
```

这些工具共用 `tools/browser.js`：现代 Headless、随机端口、临时配置、启动/命令超时和退出清理。Chrome 优先通过 CDP 正常关闭，超时再终止并等待进程关闭；删除临时配置时对短暂占用进行有限重试。操作和清理都失败时保留两个错误。默认使用浏览器沙箱；受限容器确需关闭时才设置 `CHROME_NO_SANDBOX=1`。

## 提交与发布

先运行同步和测试，审阅差异后提交，再运行：

```bash
./tools/prepush.sh
```

完整检查要求同步正确、测试通过、工作区干净、已配置 upstream、fetch 成功且远端没有本地缺少的提交。`--no-test` 是显式部分检查，输出会说明未运行测试。脚本不是自动安装的 Git hook。

`.github/workflows/checks.yml` 在 push / pull_request 上重复同步、回归、发布保护及浏览器检查。CI 不执行部署，也不改写发布文件；GitHub Pages 保留原有发布方式。工作流需推送后才能确认 GitHub 上的实际运行结果。

历史 `q-tests` 只保留人工案例，不属于 CI。其旧自动脚本包含无效按键及无条件通过断言，继续忽略，不使用其成功率作为验收结果。

## 本次本地验证记录（2026-10-26）

环境：macOS，Node.js v24.15.0，Chrome 156.0.8078.48。CI 配置使用 Node.js 22；本地没有声称已跑过 Node 22 或远端 Actions。

- 十组回归全部通过，其中复数 OPTN 专项 46 项、计算 OPTN 专项 69 项、菜单 134 项、纯数值 38 项、广泛页面回归 46 项；其余编辑/UI 套件保留原有基线。
- 五个源码文件的漂移检测、`--check` 无写入、错误脚本/缺失标记不得覆盖发布副本，全部通过。
- 发布保护 10 个场景通过；使用隔离假 Git，不代表已验证真实远端分支状态。
- Chrome 390/1280 宽度冒烟检查通过；手机宽度不等式截图已人工检查，小于号和区间正常显示。随后加入菜单分页、常数/换算选择、触摸点击和菜单边界验收，详见 [菜单审计](menu-audit.md)、[计算 OPTN](calculate-optn.md) 和 [复数 OPTN](complex-optn.md)。复数两页数量/编号、中英文本、pointer/click/聚焦 Enter 与转换结果均有浏览器断言。
- 源码及工具 JavaScript 语法检查、HTML 同步、维护文档本地链接和 `git diff --check` 通过。

本次没有提交或推送变更，没有执行线上部署。真实远端检查及 GitHub Actions 运行结果需在提交/推送后确认。

## 浏览器清理修复验证（2026-10-26）

针对 Actions 的 `ENOTEMPTY` 清理错误，新增 `browser_lifecycle_test.js`，使用真实子进程验证正常关闭与强制终止，使用临时目录及模拟删除错误验证短暂失败重试、重试耗尽和非重试错误。真实 Chrome 冒烟测试补充了动作抛错后的清理路径。本机 macOS、Node.js 24.15.0、Chrome 156 下上述检查、十组回归、同步保护和十个发布保护场景均通过；修改后的 Linux/Node 22 Actions 尚未运行。
