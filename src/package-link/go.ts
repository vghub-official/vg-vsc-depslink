/*
 * @Author: zdd
 * @Date: 2024-01-25 20:59:25
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-05 21:08:11
 * @FilePath: go.ts
 */
import { DocumentLink, Range, TextLine, Uri } from 'vscode';
import { BaseDependencyLinkProvider } from './baseProvider';

// 处理 Go 模块依赖项的文档链接提供程序
export default class GoDependencyLinkProvider extends BaseDependencyLinkProvider {
  // 私有仓库映射配置（前缀 -> URL模板）
  private privateRepoMappings: Record<string, string> = {};

  constructor() {
    super();
    // 初始化时加载配置
    this.loadConfig();
  }

  // 加载配置
  private loadConfig() {
    this.privateRepoMappings = this.configSection.get<Record<string, string>>('goPrivateRepoMappings') || {};
  }

  protected isDependenciesBlockStart(line: TextLine) {
    return line.text.startsWith('require (') || line.text.startsWith('replace (');
  }

  protected extractPackageName(line: TextLine) {
    const dependencies: string[] = [];
    const lineText = line.text.trim();

    // 处理块内的依赖行

    // 匹配模块路径（可能包含版本信息）
    const matches = lineText.match(/^\s*([^\s]+)\s+v?[\d.]+/);
    if (matches && matches[1]) {
      dependencies.push(matches[1]);
    }

    // 处理单行 require
    if (lineText.startsWith('require ')) {
      // 提取所有依赖项
      const requireContent = lineText.substring(8).trim();
      const depRegex = /([^\s]+)\s+v?[\d.]+(?:\s+[^\s]+)?/g;
      let match: RegExpExecArray | null;

      while ((match = depRegex.exec(requireContent)) !== null) {
        if (match[1]) {
          dependencies.push(match[1]);
        }
      }
    }

    return dependencies;
  }

  protected buildLinkPlugin(linkRange: Range, dependency: string) {
    for (const [prefix, pattern] of Object.entries(this.privateRepoMappings)) {
      if (dependency.startsWith(prefix)) {
        const repoPath = dependency.substring(prefix.length);
        const repoUrl = pattern.replace('{{repo}}', repoPath).replace('{{pkg}}', dependency);
        return new DocumentLink(linkRange, Uri.parse(repoUrl));
      }
    }
    return null;
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.goRegistryUrl;
    return typeof registryUrl === 'string' ? registryUrl : 'https://pkg.go.dev/';
  }

  protected get registryUrlPattern() {
    const registryUrlPattern = this.configSection.goRegistryUrlPattern;
    return typeof registryUrlPattern === 'string' ? registryUrlPattern : '';
  }
}
