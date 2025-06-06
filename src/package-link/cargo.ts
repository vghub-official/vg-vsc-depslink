/*
 * @Author: zdd
 * @Date: 2024-01-25 20:59:25
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-05 16:03:23
 * @FilePath: cargo.ts
 */
import { TextLine, workspace } from 'vscode';
import { BaseDependencyLinkProvider } from './baseProvider';
// Cargo.toml 依赖链接提供程序
export default class CargoDependencyLinker extends BaseDependencyLinkProvider {
  protected isDependenciesBlockStart(line: TextLine) {
    return /(.*?)dependencies/i.test(line.text);
  }

  protected extractPackageName(line: TextLine) {
    const dependencies: string[] = [];
    const lineText = line.text.trim();

    // 匹配普通格式: name = "version" 或 name = { ... }
    const basicMatch = lineText.match(/^([\w-]+)\s*=\s*(?:\{|["'])/);
    if (basicMatch && basicMatch[1]) {
      dependencies.push(basicMatch[1]);
    }

    // 匹配数组格式: [dep.name1, dep.name2]
    const arrayMatch = lineText.match(/\[([^\]]+)\]/);
    if (arrayMatch && arrayMatch[1]) {
      const deps = arrayMatch[1]
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.startsWith('dep.'))
        .map((d) => d.replace('dep.', ''));
      dependencies.push(...deps);
    }

    // 匹配特性中的依赖: feature = ["dep:name1", "dep:name2"]
    const featureMatch = lineText.match(/["']dep\:([^"']+)["']/g);
    if (featureMatch) {
      dependencies.push(...featureMatch.map((m) => m.replace(/["']dep\:|["']/g, '')));
    }

    return dependencies;
  }

  protected localDep(lineText: string): boolean {
    if (lineText.includes(`path = "`) || lineText.includes(`path='`)) {
      return true;
    }
    if (lineText.includes(`workspace = true`)) return true;
    return false;
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.rustRegistryUrl;
    return typeof registryUrl === 'string' ? registryUrl : 'https://crates.io/crates/';
  }

  protected get registryUrlPattern() {
    const registryUrlPattern = this.configSection.rustRegistryUrlPattern;
    return typeof registryUrlPattern === 'string' ? registryUrlPattern : '';
  }
}
