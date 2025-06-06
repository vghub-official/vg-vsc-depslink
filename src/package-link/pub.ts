/*
 * @Author: zdd dongdong@grizzlychina.com
 * @Date: 2025-06-03 22:10:06
 * @LastEditors: zdd dongdong@grizzlychina.com
 * @LastEditTime: 2025-06-06 11:12:12
 * @FilePath: pub.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { TextLine, workspace } from 'vscode';
import { BaseDependencyLinkProvider } from './baseProvider';

export default class PubDependencyLinkProvider extends BaseDependencyLinkProvider {
  protected isDependenciesBlockStart(line: TextLine) {
    return /(.*?)dependencies/i.test(line.text);
  }

  protected isDependenciesBlockEnd(line: TextLine) {
    return line.text.startsWith('flutter:');
  }

  protected extractPackageName(line: TextLine) {
    const matches = line.text.trim().match(/^(\w+): \^?\d+/);
    return matches?.[1] || null;
  }

  protected get registryUrl() {
    const registryUrl = this.configSection.dartRegistryUrl || 'https://pub.dev/';
    return `${registryUrl}packages/`;
  }
}
