# 节奏康复 · 前端视觉与交互

React 19 + TypeScript strict + Vite，普通 CSS / SVG / DOM，GSAP 负责游戏入口的退场和水晕加载。移动竖屏优先，兼顾桌面主题选择与治疗师工作台。

## 运行

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm check:production
```

本地开发默认 `http://localhost:5173`。应用使用 HashRouter：下列内部路由的访问地址需加 `#`，例如 `http://localhost:5173/#/themes`。

- `/`：暖米色极简启动页，仅图标、节奏康复标题、「开始」和「过往记录」。不自动跳过启动页。
- `/themes`：单主题选择舞台；左右滑动、方向按钮、指示点与左右方向键切换，首尾循环。「进入这个世界」经过原有水晕加载进入对应准备页。
- `/prepare/pet`：真实准备流程；`garden` / `space` 使用相同组件。
- `/design`：**仅开发环境可用**的视觉状态预览，可切换主题、加载、校准、教学、训练、结果和历史。训练面板可检查 Perfect / Good / Miss、丢手、找回、媒体等待、后台返回、暂停、退出。使用明确标注的模拟数据，不保存或上传记录。
- `/history`：IndexedDB 本机记录与打卡日历；初始为空。
- `/binding`：邀请码查询 → 治疗师预览 → 明确确认分享；未接服务时显示不可用状态。
- `/therapist/login`：治疗师登录；用户列表与详情由服务端权限控制。

基线已在 runtime 接口内接入 Google MediaPipe Hand Landmarker，用于准备页的本机手部定位、取景质量判断和三个基础手型识别。此次入口改版没有修改识别算法。项目内仍没有 B 的节拍判定/训练引擎，也没有 A 的正式 90 秒训练 MP4、专业审核教学视频和反馈音效。正式入口不会模拟真实成绩、绑定或云端同步。

### 主题选择与动效

主题资源沿用 `public/themes/`。560ms 双面立方体转场由作用域内 GSAP timeline 控制；转场期间锁定选择和进入操作，完成后提交主题。窗口宽度或减少动态效果偏好变化会取消转场，回到已确认主题；页面卸载时清理 timeline、ResizeObserver 和事件监听。

减少动态效果模式使用 120ms 淡入淡出。手势阈值为水平位移至少 48px 且大于等于垂直位移的 1.25 倍，保留正常垂直滚动。窄屏保持竖屏使用，文字放大时舞台增长，允许纵向滚动。返回主题与历史空状态均进入 `/themes`；历史的返回按钮回到启动页。公共页脚赛事署名已删除。

### 入口补丁验收

`pnpm test` 包含 5 项主题切换规则测试及原有 18 项测试。`scripts/entry-smoke.mjs` 检查入口、历史、三主题准备路由、连点锁、缩放/卸载恢复、手势、键盘、减少动态效果、海报失败以及窄屏和放大文字。结果与截图写入 `test-results/development/` 或 `test-results/production/`。

浏览器脚本支持 `APP_BASE_URL`、`PLAYWRIGHT_PACKAGE`（Playwright package.json 绝对路径，entry 脚本）和 `BROWSER_PATH`（浏览器绝对路径，entry 脚本）。默认运行环境沿用原脚本的开发机路径，异机使用时通过环境变量指定。脚本启动全新无头浏览器，不读取个人浏览器资料。

```powershell
# 先在另一个终端运行 pnpm dev，或指定对应的开发端口。
$env:APP_BASE_URL = 'http://localhost:5173/'
node scripts/entry-smoke.mjs
node scripts/browser-smoke.mjs
# pnpm build 后在另一个终端运行 pnpm preview --port 4173。
$env:APP_BASE_URL = 'http://localhost:4173/project_toturials/app/'
node scripts/entry-smoke.mjs
```

浏览器验收止于摄像头说明页；它不等于真实手机摄像头识别或完整训练判分验收。原有 MediaPipe 问题仍需单独诊断。

### 手部视觉识别

- 依赖固定为 `@mediapipe/tasks-vision@1.0.1`，模型为 Google 官方 Hand Landmarker float16 v1。
- WASM 与 `.task` 模型均从 `public/` 本地加载，摄像头帧不离开浏览器；首次进入准备页时才按需加载 JS 推理模块。
- 单手模式在主线程以 10 Hz 限频推理，优先 WebGL/GPU，初始化失败时自动回退 CPU；帧间空白超过 150ms 会中断稳定计时。
- 21 个关键点用于判断手是否完整入镜，并根据四指关节角区分伸直、钩拳与握拳；稳定 600ms 完成取景校准，教学中的每个目标动作需稳定约 2 秒才确认。
- 若模型文件需要重新获取，运行 `pnpm fetch:hand-model`。生产环境仍必须使用 HTTPS 才能申请摄像头权限。

## 你的水晕加载

入口动画位于 `src/components/RippleLoading.tsx`：

1. 页面元件向外轻移并淡出（约 560ms），留下浅黄 `#F5EDD9`。
2. 7 个棕色圆形的相位、直径、周期和透明度峰值各不相同。每一颗都由小到大、由淡到浓再淡出，并带一条很轻的外沿。
3. 动画只修改 transform / opacity，不使用 Canvas、持续旋转或屏幕模糊。
4. 所选海报与准备页面就绪后进入下一页；为入口动效保留约 2.9 秒展示窗口。图片失败或超过 10 秒会返回可重试状态。
5. `prefers-reduced-motion` 下维持圆圈位置与尺度，只改变透明度。

`rippleSeeds` 可分别调节 `size`、`duration`、`delay`、`rest`、`peak`；背景在 `tokens.css` 的 `--color-loading`。

## 接入真实核心

页面不判别手型、不重新判定节拍，也不更改保持阈值。共享类型位于 `src/contracts/index.ts`；DOM 类型通过泛型在 runtime 层绑定。

在 `src/main.tsx` 挂载应用之前调用：

```ts
import { installRuntime } from './services/runtime';

installRuntime({
  recognition,                     // 已接入 MediaPipe RecognitionController<MediaStream>
  preparationPolicy,               // 当前为取景 600ms / 教学手型 2000ms
  createEngine,                    // (onComplete) => TrainingEngine<HTMLVideoElement>
  subscribeAura,                   // 已映射到舞台坐标的中心、尺度、旋转与跟踪状态
  tutorialVideos,                  // 已审核的 STRAIGHT / HOOK / FIST 教学视频地址
  repository,                     // 可选，默认已实现 IndexedDB SessionRepository
  binding, sync, therapist,        // 可选云端服务
});
```

- 准备页跳过示范仍要求三个动作各自完成识别确认；成功时长由 B 的 policy 提供。
- `createEngine` 应负责视频时钟、倒数、暂停原因、丢手、重获追踪、重播当前任务、媒体阻塞和页面后台事件；`onComplete(summary)` 输出最终记录。
- `subscribeAura` 的 x/y 是前端舞台的 0–1 归一化坐标，已包含镜像/裁剪转换。仅视觉层做约 150ms 的位姿平滑；不得用平滑后数据评分。
- 摄像头在准备页显示为镜像，正式训练不显示真实画面。离开流程停止 tracks 和识别订阅。
- 成绩仅对已确认的 Perfect / Good / Miss 汇总：权重来自既定技术文档，不引入新判分窗口；未结算任务不补 Miss，零判定显示暂无成绩。
- 先保存本机再跳结果页；同步失败保留本机结果。SyncService 应将最终同步状态回写 SessionRepository 以刷新视图。
- 治疗师授权必须由服务端完成。用户会话与治疗师会话使用不同认证 storageKey，不能在前端依据 URL 中的用户 ID 放行访问。

## 素材

`public/themes/{pet,garden,space}/poster.jpg` 已生成并压缩，总计约 474KB，来源与完整提示词见 `public/themes/source-notes.md`。内置 image_gen 用于氛围海报，手势符号为代码 SVG，不能替代经过审核的教学素材。

每主题正式接入前需补充：

```text
training.mp4   # 540×960，H.264 / AAC，含唯一背景音乐
manifest.json  # 90 秒、60 BPM、15 个 6 秒任务、目标拍在第 2 秒
perfect.svg
perfect.mp3
good.mp3
```

教学视频通过 `tutorialVideos` 接口传入。不要用未经专业审核的 AI 手部画面作为动作标准。

## 验证与交付边界

- TypeScript strict 与生产构建已通过。
- Vitest 测试覆盖手部几何、manifest 无效任务拒绝、未完成结果、零节拍成绩、IndexedDB 本机提交/读取/同步失败保存。
- `check:production` 检查生产 JS/HTML 中没有开发模拟器、示例记录或 service role key 标记。开发路由和模拟器只经 `import.meta.env.DEV` 动态引入。
- 2026-09-12 入口改版：23 项 Vitest 测试、TypeScript/Vite 生产构建及 `check:production` 通过；原有浏览器回归与入口专项检查通过，包含 320/360/390/1440px、短视口、200% 文字与生产 HashRouter 子路径。截图已检查。尚无 iPhone Safari / Android Chrome 物理设备验收结论。
- `scripts/browser-smoke.mjs` 使用这台开发机自带的 Playwright / Edge 路径；换机器请替换为当地 Playwright 与 Chromium 路径。脚本在全新测试浏览器中访问 localhost，不读取个人浏览器资料，结果写入 `test-results`。
- 仍需 iPhone Safari / Android Chrome 真机验证摄像头、媒体自动播放许可、后台恢复与连续三轮训练；本次未取得真机测试结果。

生产托管必须使用 HTTPS，并将非静态资源路径回退到 `index.html`。手机通过普通局域网 HTTP 可以看页面，但浏览器通常不会开放摄像头；摄像头体验请使用 HTTPS 部署或可信的本地调试方案。

## 目录

```text
src/app/                 路由、错误边界
src/components/          通用布局、品牌、手势符号、水晕加载
src/pages/               首页、准备、训练、结果、历史、绑定、治疗师
src/features/training/   视频舞台、Aura、Hold、Cue、Grade、HUD、覆盖层
src/features/history/    结果与日历记录展示
src/contracts/           跨团队类型合同
src/services/            runtime 适配、manifest 校验、IndexedDB、结果汇总
src/theme/               基础 token、共享主题配置与响应式样式
src/dev/                 显式开启的开发模拟器与设计预览（不进入生产包）
```

采用技能：`gsap-react`、`gsap-timeline`、`gsap-core`、`imagegen`。新用户视觉规范优先于旧文档中已废止的训练摄像头小窗方案。
