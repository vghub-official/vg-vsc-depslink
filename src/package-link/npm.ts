/*
 * @Author: zdd dongdong@grizzlychina.com
 * @Date: 2025-06-03 22:10:06
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-06 11:12:37
 * @FilePath: npm.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { TextLine, workspace } from 'vscode';
import { BaseDependencyLinkProvider } from './baseProvider';

export default class NpmDependencyLinkProvider extends BaseDependencyLinkProvider {
  protected isDependenciesBlockStart(line: TextLine) {
    return /"(.*?)dependencies"/i.test(line.text);
  }

  protected isDependenciesBlockEnd(line: TextLine) {
    return line.text.includes('}');
  }

  protected extractPackageName(line: TextLine) {
    const matches = line.text.match(/"(.*?)"/);
    return matches?.[1] || null;
  }

  protected localDep(lineText: string): boolean {
    return lineText.includes('"workspace:');
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.npmRegistryUrl || 'https://www.npmjs.com/';
    return `${registryUrl}package/`;
  }

  protected get registryUrlPattern() {
    const registryUrlPattern = workspace.getConfiguration(this.getConfigSection()).npmRegistryUrlPattern;
    return typeof registryUrlPattern === 'string' ? registryUrlPattern : '';
  }
}
