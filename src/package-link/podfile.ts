/*
 * @Author: zdd
 * @Date: 2024-01-25 20:59:25
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-05 16:03:07
 * @FilePath: podfile.ts
 */
import { DocumentLink, Range, TextLine, Uri } from 'vscode';
import { BaseDependencyLinkProvider } from './baseProvider';

export default class PodfileDependencyLinkProvider extends BaseDependencyLinkProvider {
  protected extractPackageName(line: TextLine) {
    const lineText = line.text.trim();
    const podNames: string[] = [];

    // 匹配单引号和双引号中的 pod 名称
    const regex = /pod\s+(?:['"]([^'"]+)['"]|([^,]+)\s*,\s*['"][^'"]+['"])/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(lineText)) !== null) {
      const podName = match[1] || match[2];
      if (podName) {
        podNames.push(podName.trim());
      }
    }

    return podNames;
  }

  protected localDep(lineText: string): boolean {
    return lineText.includes(':path =>') && !lineText.includes(':git =>');
  }

  protected buildLinkPlugin(linkRange: Range, dependency: string, lineText: string): DocumentLink | null {
    if (!/:git\s*=>?\s*['"]/.test(lineText)) return null;
    const gitMatch = lineText.match(/:git\s*=>?\s*['"]([^'"]+)['"]/);

    let gitUrl = gitMatch?.[1];
    if (!gitUrl) return null;
    // 清理 Git URL (移除 .git 后缀和 https:// 前缀)
    let cleanUrl = gitUrl.replace(/\.git$/, '').replace(/^https?:\/\//, '');

    // 提取可能的引用 (tag, branch, commit)
    const tagMatch = lineText.match(/:tag\s*=>?\s*['"]([^'"]+)['"]/);
    const branchMatch = lineText.match(/:branch\s*=>?\s*['"]([^'"]+)['"]/);
    const commitMatch = lineText.match(/:commit\s*=>?\s*['"]([^'"]+)['"]/);

    if (tagMatch) {
      gitUrl = `https://${cleanUrl}/releases/tag/${tagMatch[1]}`;
    } else if (branchMatch) {
      gitUrl = `https://${cleanUrl}/tree/${branchMatch[1]}`;
    } else if (commitMatch) {
      gitUrl = `https://${cleanUrl}/commit/${commitMatch[1]}`;
    } else {
      gitUrl = `https://${cleanUrl}`;
    }

    return new DocumentLink(linkRange, Uri.parse(gitUrl));
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.podsRegistryUrl;
    return typeof registryUrl === 'string' ? registryUrl : 'https://cocoapods.org/pods/';
  }

  protected get registryUrlPattern() {
    const registryUrlPattern = this.configSection.podsRegistryUrlPattern;
    return typeof registryUrlPattern === 'string' ? registryUrlPattern : '';
  }
}
