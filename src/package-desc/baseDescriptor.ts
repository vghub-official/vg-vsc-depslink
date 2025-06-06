/*
 * @Author: zdd
 * @Date: 2025-06-05 18:00:00
 * @Description: 包描述信息基类
 */
import * as vscode from 'vscode';

export interface PackageDetails {
  name: string;
  installedVersion?: string;
  latestVersion?: string;
  description?: string;
  license?: string;
  repository?: string;
}

export abstract class BasePackageDescriptor {
  protected getConfigSection() {
    return 'depslink';
  }

  protected get configSection(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.getConfigSection());
  }

  /**
   * 判断当前行是否是依赖项行
   * @param line 文档当前行文本
   */
  protected abstract isDependencyLine(line: string): boolean;

  /**
   * 从行文本中提取包名和已安装版本
   * @param line 依赖项行文本
   */
  protected abstract extractPackageInfo(line: string): { name: string; version: string } | null;

  /**
   * 获取包的详细信息（子类实现具体API调用）
   * @param packageName 包名
   */
  protected abstract fetchPackageDetails(packageName: string): Promise<PackageDetails | null>;

  /**
   * 构建悬停提示的Markdown内容
   */
  protected buildHoverMarkdown(details: PackageDetails): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    markdown.appendMarkdown(`**${details.name}**\n\n`);
    markdown.appendMarkdown(`- 📦 Installed: \`${details.installedVersion}\`\n`);

    if (details.latestVersion) {
      const updateFlag = details.installedVersion !== details.latestVersion ? ' (🔄 update available)' : '';
      markdown.appendMarkdown(`- 🚀 Latest: \`${details.latestVersion}\`${updateFlag}\n`);
    }
    if (details.license) markdown.appendMarkdown(`- 📜 License: \`${details.license}\`\n`);
    if (details.description) markdown.appendMarkdown(`\n${details.description}\n`);

    return markdown;
  }

  /**
   * 提供悬停提示的主方法
   */
  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    const line = document.lineAt(position).text;
    if (!this.isDependencyLine(line)) return;

    const packageInfo = this.extractPackageInfo(line);
    if (!packageInfo) return;

    const details = await this.fetchPackageDetails(packageInfo.name);
    if (!details) return;

    details.installedVersion = packageInfo.version; // 补充已安装版本
    const markdown = this.buildHoverMarkdown(details);
    return new vscode.Hover(markdown);
  }
}

export function cacheable(target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor | void {
  // 明确原方法类型（避免类型推断错误）
  const originalMethod = descriptor.value as (packageName: string) => Promise<PackageDetails | null>;
  const cache = new Map<string, { data: PackageDetails; expires: number }>();

  // 重写方法实现
  descriptor.value = async function (this: BasePackageDescriptor, packageName: string) {
    // 从配置获取缓存时间（默认5分钟，单位：毫秒）
    const cacheTTL = this.configSection.get<number>('cacheTTL', 300000);
    const currentTime = Date.now();
    const cacheKey = packageName;

    // 检查缓存是否有效
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry && currentTime < cachedEntry.expires) {
      return cachedEntry.data;
    }

    // 无有效缓存时调用原方法获取数据
    const result = await originalMethod.call(this, packageName);
    if (result) {
      // 缓存新数据（仅缓存有效数据）
      cache.set(cacheKey, {
        data: result,
        expires: currentTime + cacheTTL,
      });
    }

    return result;
  };

  return descriptor; // 返回修改后的属性描述符
}
