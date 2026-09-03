# 安装、升级与恢复

## 首次安装

先确认 Node.js `>=18` 且 npm 可执行：

```sh
node --version
npm --version
```

保持单一安装进程并保留完整输出；安装完成后独立核验 binary：

```sh
npm install --global @77hub/cli@latest
qiqi --version
```

当前平台的 qiqi 可执行文件随官方 npm 的 `@77hub/cli` 与 `@77hub/cli-<platform>` 一起安装。沙箱只需访问 `registry.npmjs.org`。不要把无法访问 qiqi 服务地址解释为安装失败原因，也不要为此去调整服务连接。

执行满 30 秒仍未完成时开始诊断当前阶段：出现持续下载进度时继续观测；连续 30 秒无输出时报告当前状态、保留最后输出并停止等待。当前进程退出或被安全终止后，再执行对应诊断命令；同一时间保持一个全局安装进程。

## 正常升级

已可执行的 qiqi 通过自身升级命令更新；CLI 已损坏或无法启动时使用 npm 重装恢复：

```sh
qiqi upgrade --check
qiqi upgrade
qiqi --version
```

`upgrade --check` 只比较版本；`upgrade` 在有新版本时执行全局安装，并在 npm 包版本与当前平台 binary 可执行后才视为成功。最后在新进程执行 `qiqi --version`，核验实际启动的 binary 版本。

## npm 取包失败

安装失败时以 npm / postinstall 的原始输出为准。普通用户安装不把服务地址下载当作补偿路径：平台包应已随 npm 提供 qiqi 可执行文件。若输出仍出现 `fetching CLI binary from` 或 `binary installation failed`，属于极少数情况——原样保留脚本错误并停止，不要去诊断 qiqi 服务地址、业务对象服务、代理或证书，也不要用代理环境变量或 `curl` 为服务地址做补偿。

分别查询当前 npm 配置和官方 npm registry，确认主包与当前平台包是否可发现：

```sh
npm view @77hub/cli@latest version
npm view @77hub/cli@latest version --registry=https://registry.npmjs.org/
```

- 第一条失败而第二条成功：本次安装显式使用官方源，并保持全局 npm 配置原样：
  ```sh
  npm install --global @77hub/cli@latest --registry=https://registry.npmjs.org/
  ```
- 两条都失败：依据原始 DNS、连接超时、代理或 CA 错误修复网络，再重新查询。
- 两条都成功：继续检查当前平台 optional 包、本地安装权限，或按原始错误处理完整性 / 平台不支持问题。

网络或权限恢复后重跑安装并验证结果：

```sh
npm list --global @77hub/cli --depth=0
npm rebuild --global @77hub/cli
qiqi --version
```

全局包缺失时重新执行首次安装。

## PATH、沙箱可见性与不明确结果恢复

npm 显示安装成功但目标进程找不到 `qiqi` 时，分别在普通宿主终端和实际沙箱进程中检查命令解析、进程级 `PATH` 与 npm 全局目录。

PowerShell：

```powershell
Get-Command qiqi -All
$env:PATH
npm prefix --global
qiqi --version
```

POSIX Shell：

```sh
command -v qiqi
printf '%s\n' "$PATH"
npm prefix --global
qiqi --version
```

根据两侧结果区分根因：

1. 宿主终端和沙箱都无法解析，且 `npm list --global @77hub/cli --depth=0` 无记录：按首次安装恢复。
2. 宿主终端可以执行，沙箱的 `PATH` 缺少 npm 全局可执行目录：在目标进程配置中追加该目录，再启动新进程验证。
3. 沙箱的 `PATH` 已包含该目录，但目录或 binary 对沙箱不可见：在宿主的沙箱配置中为该精确目录增加读取与执行权限或挂载，再验证显式路径。
4. 显式绝对路径可以在沙箱中执行：为该目标进程配置 qiqi 的显式命令路径，或仅补充该进程的 `PATH`。

Windows 的全局命令通常位于 `npm prefix --global` 返回目录中的 `qiqi.cmd`；macOS 与 Linux 通常位于该 prefix 下的 `bin/qiqi`。以当前 npm 的实际输出和文件存在性为准。

验证顺序：先用宿主终端得到的绝对路径在沙箱中直接执行，再验证沙箱自身的命令解析。

```powershell
& '<qiqi.cmd 的绝对路径>' --version
qiqi --version
```

```sh
'/absolute/path/to/qiqi' --version
qiqi --version
```

优先调整目标进程的显式路径、进程级 `PATH` 或精确沙箱权限，保持系统级 `PATH` 和沙箱保护边界稳定。超时、断连或中断后的状态记为“状态未知”，根据全局包、宿主解析、沙箱解析、binary 版本和原始错误选择 `npm rebuild`、PATH/沙箱可见性修复或重新安装。
