/*
 * @Author: zdd
 * @Date: 2024-01-25 20:59:25
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-06 11:09:16
 * @FilePath: gradle.ts
 */
import { DocumentLink, Range, TextLine, Uri } from 'vscode';
import { BaseDependencyLinkProvider } from './baseProvider';

// 处理 Gradle 依赖项的文档链接提供程序
export default class GradleDependencyLinkProvider extends BaseDependencyLinkProvider {
  protected get registryUrl() {
    const registryUrl = this.configSection.mavenRegistryUrl;
    return typeof registryUrl === 'string' ? registryUrl : 'https://search.maven.org/artifact/';
  }

  protected isDependenciesBlockStart(line: TextLine) {
    return /(.*?)dependencies/i.test(line.text);
  }

  protected extractPackageName(line: TextLine) {
    const dependencies: string[] = [];
    const lineText = line.text;

    // 尝试匹配简写格式: implementation 'group:module:version'
    const shorthandRegex = /(['"])([^:'"]+):([^:'"]+):[^'"]+\1/g;
    let match: RegExpExecArray | null;
    while ((match = shorthandRegex.exec(lineText)) !== null) {
      dependencies.push(`${match[2]}:${match[3]}`);
    }

    // 尝试匹配完整格式: implementation group: 'group', name: 'module'
    const fullFormatRegex = /group\s*:\s*(['"])([^'"]+)\1[^,]*,\s*name\s*:\s*(['"])([^'"]+)\3/g;
    while ((match = fullFormatRegex.exec(lineText)) !== null) {
      dependencies.push(`${match[2]}:${match[4]}`);
    }

    return dependencies;
  }

  protected buildLinkPlugin(linkRange: Range, dependency: string, lineText: string): DocumentLink | null {
    const isLocalDep = this.localDep(lineText);
    if (isLocalDep) return null;

    dependency = dependency.replace(':', '/'); // 移除引号

    if (!!this.registryUrlPattern) {
      const registryUrl = this.registryUrlPattern.replace('{{pkg}}', dependency);
      return new DocumentLink(linkRange, Uri.parse(registryUrl));
    }
    const registryUrl = this.registryUrl;
    return new DocumentLink(linkRange, Uri.parse(`${registryUrl}${dependency}`));
  }
}
